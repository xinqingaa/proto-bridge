import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const productFiles = new Set([
  "product.md",
  "logic-and-interactions.md",
  "ui-design.md",
]);
const posix = (value) => value.split(path.sep).join("/");
const digest = (value) => createHash("sha256").update(value).digest("hex");

export function documentLinks(text) {
  return [...text.matchAll(/\[[^\]\n]*\]\((<?[^)\n]+>?)\)/g)];
}

function localLink(value) {
  const raw = value.replace(/^<|>$/g, "");
  if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw))
    return null;
  const [, pathname, suffix] = raw.match(/^([^#?]*)(.*)$/);
  return { pathname: decodeURIComponent(pathname), suffix };
}

function rewriteLinks(text, resolve) {
  return text.replace(
    /(\[[^\]\n]*\]\()([^\n)]+)(\))/g,
    (match, before, value, after) => {
      const link = localLink(value);
      if (!link) return match;
      const target = resolve(link.pathname);
      return `${before}${encodeURI(target).replaceAll("#", "%23").replaceAll("?", "%3F")}${link.suffix}${after}`;
    },
  );
}

function safeRelative(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.split("/").some((part) => !part || part === "." || part === "..") ||
    path.posix.isAbsolute(value) ||
    /^[a-z]:/i.test(value)
  ) {
    throw new Error(`Invalid documentation path: ${value}`);
  }
  return value;
}

// Refuse symlinks at every level: an export list may only name ordinary local files.
async function localFile(root, relative) {
  if ((await lstat(root)).isSymbolicLink())
    throw new Error(`Documentation symlink: ${root}`);
  let current = root;
  for (const part of safeRelative(relative).split("/")) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink())
      throw new Error(`Documentation symlink: ${relative}`);
  }
  if (!(await lstat(current)).isFile())
    throw new Error(`Not a documentation file: ${relative}`);
  return current;
}

async function filesUnder(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const file of await filesUnder(path.join(root, entry.name)))
        files.push(`${entry.name}/${file}`);
    } else if (entry.isFile()) files.push(entry.name);
    else throw new Error(`Documentation symlink: ${entry.name}`);
  }
  return files.sort();
}

export async function planFlutterDocumentation({
  repoRoot,
  sourceRoot,
  targetRoot,
  prototype,
  displayName,
  packageName,
}) {
  const files = new Map();
  const docsRoot = path.join(sourceRoot, "docs");
  const commands = (text) =>
    text
      .replaceAll(
        "cd ../.. && pnpm ds:target-sync:verify",
        "node tool/ds-sync.mjs",
      )
      .replaceAll("cd ../.. && pnpm ds:theme:verify", "node tool/ds-theme.mjs")
      .replaceAll("pnpm ds:target-sync:verify", "node tool/ds-sync.mjs")
      .replaceAll("pnpm ds:theme:verify", "node tool/ds-theme.mjs");
  for (const name of await filesUnder(docsRoot)) {
    const sourceFile = path.join(docsRoot, name);
    if (!name.endsWith(".md")) {
      files.set(`docs/${name}`, await readFile(sourceFile));
      continue;
    }
    const targetFile = path.join(targetRoot, "docs", name);
    const content = rewriteLinks(
      commands(await readFile(sourceFile, "utf8")),
      (link) => {
        const absolute = path.resolve(path.dirname(sourceFile), link);
        const relative = path.relative(sourceRoot, absolute);
        const mapped =
          relative !== ".." &&
          !relative.startsWith(`..${path.sep}`) &&
          !path.isAbsolute(relative)
            ? path.join(targetRoot, relative)
            : absolute;
        return posix(path.relative(path.dirname(targetFile), mapped));
      },
    );
    files.set(`docs/${name}`, content);
  }

  let provenance = null;
  const imported = new Map();
  if (prototype !== undefined) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(prototype))
      throw new Error(`Invalid prototype id: ${prototype}`);
    const prototypeRoot = path.join(
      repoRoot,
      "apps/pbwork/src/prototypes",
      prototype,
    );
    await localFile(prototypeRoot, "prototype.ts");
    const root = path.join(prototypeRoot, "docs");
    const manifestFile = await localFile(root, "target-docs.json");
    const manifestBytes = await readFile(manifestFile);
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    if (
      manifest.schemaVersion !== 1 ||
      !Array.isArray(manifest.files) ||
      !manifest.files.length ||
      Object.keys(manifest).some(
        (key) => !["schemaVersion", "files"].includes(key),
      )
    ) {
      throw new Error(`Invalid target-docs.json for ${prototype}`);
    }
    const sources = new Map();
    const destinations = new Set();
    for (const item of manifest.files) {
      if (
        !item ||
        Object.keys(item).some((key) => !["source", "target"].includes(key))
      )
        throw new Error("Invalid document entry");
      const source = safeRelative(item.source);
      const target = safeRelative(item.target);
      if (source.endsWith(".md") !== target.endsWith(".md"))
        throw new Error(
          `Mismatched document extension: ${source} -> ${target}`,
        );
      if (
        (!productFiles.has(target) &&
          !target.startsWith("prototype/") &&
          !target.startsWith("product-assets/")) ||
        /(?:^|\/)(?:agents|agent|claude)\.md$/i.test(target)
      ) {
        throw new Error(`Reserved target document: ${target}`);
      }
      const key = target.toLowerCase();
      if (destinations.has(key) || sources.has(source))
        throw new Error(`Duplicate document export: ${source} -> ${target}`);
      destinations.add(key);
      const bytes = await readFile(await localFile(root, source));
      sources.set(source, { source, target, bytes });
    }
    // Check prefix collisions before writing any file (e.g. prototype/a and prototype/a/b).
    for (const key of destinations) {
      if ([...destinations].some((other) => other.startsWith(`${key}/`)))
        throw new Error(`Conflicting document paths: ${key}`);
    }
    for (const item of sources.values()) {
      let content = item.bytes;
      if (item.source.endsWith(".md")) {
        content = rewriteLinks(item.bytes.toString("utf8"), (link) => {
          const source = path.posix.normalize(
            path.posix.join(path.posix.dirname(item.source), link),
          );
          const dependency = sources.get(source);
          if (!dependency)
            throw new Error(
              `Unexported document dependency: ${item.source} -> ${link}`,
            );
          return path.posix.relative(
            path.posix.dirname(item.target),
            dependency.target,
          );
        });
      }
      imported.set(`docs/${item.target}`, content);
      item.sourceSha256 = digest(item.bytes);
      item.importedSha256 = digest(content);
    }
    let revision = null;
    let dirty = null;
    const relativeRoot = posix(path.relative(repoRoot, root));
    try {
      revision = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      dirty = Boolean(
        execFileSync("git", ["status", "--porcelain", "--", relativeRoot], {
          cwd: repoRoot,
          encoding: "utf8",
        }).trim(),
      );
    } catch {
      /* A source outside Git still has exact content digests. */
    }
    provenance = {
      prototype,
      sourceRoot: relativeRoot,
      revision,
      dirty,
      manifestSha256: digest(manifestBytes),
      files: [...sources.values()].map(
        ({ source, target, sourceSha256, importedSha256 }) => ({
          source,
          target: `docs/${target}`,
          sourceSha256,
          importedSha256,
        }),
      ),
    };
  }

  const context = {
    displayName,
    packageName,
    prototypeLinks: [...imported.keys()]
      .filter((key) => key.startsWith("docs/prototype/"))
      .map((key) => `- [原型来源：${key.slice(15)}](${key.slice(5)})`)
      .join("\n"),
    sourceSummary: provenance
      ? `初始化选定原型：\`${prototype}\`。源目录：\`${provenance.sourceRoot}\`。源 revision：\`${provenance.revision ?? "unknown"}\`；源文档工作区修改状态：\`${provenance.dirty ?? "unknown"}\`。导入包含相对链接重定位，正文不做产品语义替换。`
      : "初始化未选择原型。产品、逻辑和 UI 文档为空模板，尚无批准的业务设计。",
    sourceFiles: provenance
      ? [
          "| 源文件 | 本地副本 |",
          "| --- | --- |",
          ...provenance.files.map(
            (file) =>
              `| \`${file.source}\` | [${file.target.slice(5)}](${file.target.slice(5)}) |`,
          ),
        ].join("\n")
      : "按本工程需求补充产品文档；需要既有原型时先在临时目录使用 `--prototype <id>` 生成后比较。",
  };
  const templateRoot = path.join(repoRoot, "scripts/templates/flutter-target");
  for (const name of await filesUnder(templateRoot)) {
    if (!name.endsWith(".tpl"))
      throw new Error(`Unsupported documentation template: ${name}`);
    const text = await readFile(path.join(templateRoot, name), "utf8");
    const content = text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in context))
        throw new Error(`Unknown documentation template variable: ${key}`);
      return context[key];
    });
    files.set(name.slice(0, -4), content);
  }
  for (const [name, content] of imported) {
    if (files.has(name) && !productFiles.has(name.slice(5)))
      throw new Error(`Document collision: ${name}`);
    files.set(name, content);
  }
  // Validate the planned graph, including references to existing base code and Skills.
  for (const [name, content] of files) {
    if (!name.endsWith(".md")) continue;
    for (const match of documentLinks(String(content))) {
      const link = localLink(match[1]);
      if (!link) continue;
      const absolute = path.resolve(
        targetRoot,
        path.dirname(name),
        link.pathname,
      );
      const relative = posix(path.relative(targetRoot, absolute));
      if (files.has(relative)) continue;
      const inTarget =
        relative !== ".." &&
        !relative.startsWith("../") &&
        !path.isAbsolute(relative);
      const existing = inTarget ? path.join(sourceRoot, relative) : absolute;
      await lstat(existing).catch(() => {
        throw new Error(
          `Broken generated documentation link: ${name} -> ${match[1]}`,
        );
      });
    }
  }
  return { files, provenance };
}

export async function writeFlutterDocumentation(targetRoot, plan) {
  // Exclusive file writes also protect callers using this helper outside the generator.
  for (const [name, content] of plan.files) {
    const target = path.join(targetRoot, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }
}

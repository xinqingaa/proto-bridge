#!/usr/bin/env node
import { readdir, readFile, lstat, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const errors = [];

const markdownFiles = await collectMarkdown(repoRoot);
await verifyLinks(markdownFiles);
await verifyPbworkSymlink();
await verifySkills();
await verifyCliReference();
await verifyMcpReference();
await verifyComponentReferences();
await verifyTokenCatalog();
await verifyCurrentProductLanguage(markdownFiles);

if (errors.length > 0) {
  process.stderr.write(
    `Documentation verification failed (${errors.length}):\n${errors
      .map((error) => `- ${error}`)
      .join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Documentation verification passed (${markdownFiles.length} Markdown files).\n`,
  );
}

async function collectMarkdown(root) {
  const result = [];
  const ignored = new Set([
    ".git",
    ".dart_tool",
    "build",
    "dist",
    "node_modules",
    ".proto-bridge",
    "output",
  ]);

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        result.push(absolute);
      }
    }
  }

  await visit(root);
  return result.sort();
}

async function verifyLinks(files) {
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
      let target = match[1].trim();
      if (
        !target ||
        target.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(target)
      ) {
        continue;
      }
      target = target.replace(/^<|>$/g, "").split("#", 1)[0];
      if (!target) continue;
      try {
        target = decodeURIComponent(target);
      } catch {
        errors.push(`${relative(file)} has invalid encoded link: ${match[1]}`);
        continue;
      }
      const resolved = path.resolve(path.dirname(file), target);
      try {
        await access(resolved);
      } catch {
        errors.push(
          `${relative(file)} links to missing ${path.relative(repoRoot, resolved)}`,
        );
      }
    }
  }
}

async function verifyPbworkSymlink() {
  const link = path.join(repoRoot, "docs/pbwork");
  try {
    const stat = await lstat(link);
    if (!stat.isSymbolicLink()) {
      errors.push("docs/pbwork must remain a symbolic link");
    }
  } catch {
    errors.push("docs/pbwork symlink is missing");
  }
}

async function verifySkills() {
  const skillsRoot = path.join(repoRoot, "skills");
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(skillsRoot, entry.name);
    const files = await readdir(directory);
    if (!files.includes("SKILL.md")) {
      errors.push(`skills/${entry.name} is missing SKILL.md`);
      continue;
    }
    if (
      files.some(
        (file) => file !== "SKILL.md" && file.toLowerCase() === "skill.md",
      )
    ) {
      errors.push(
        `skills/${entry.name} contains a non-canonical skill filename`,
      );
    }
    const source = await readFile(path.join(directory, "SKILL.md"), "utf8");
    if (!/^---\nname: [a-z0-9-]+\ndescription:/u.test(source)) {
      errors.push(`skills/${entry.name}/SKILL.md has invalid frontmatter`);
    }
  }
}

async function verifyCliReference() {
  const source = await readFile(
    path.join(repoRoot, "packages/cli/src/cli.ts"),
    "utf8",
  );
  const readme = await readFile(
    path.join(repoRoot, "packages/cli/README.md"),
    "utf8",
  );
  const usage = source.match(
    /export function cliUsage\(\): string \{\s*return `([\s\S]*?)`;/u,
  )?.[1];
  if (!usage) {
    errors.push("Unable to read CLI usage from packages/cli/src/cli.ts");
    return;
  }
  for (const line of usage.split("\n").map((value) => value.trim())) {
    if (line.startsWith("proto-bridge ") && !readme.includes(line)) {
      errors.push(`CLI README is missing usage line: ${line}`);
    }
  }
}

async function verifyMcpReference() {
  const registry = await readFile(
    path.join(repoRoot, "packages/mcp-server/src/tools/registry.ts"),
    "utf8",
  );
  const prompts = await readFile(
    path.join(repoRoot, "packages/mcp-server/src/prompts/index.ts"),
    "utf8",
  );
  const resources = await readFile(
    path.join(repoRoot, "packages/mcp-server/src/resources/index.ts"),
    "utf8",
  );
  const readme = await readFile(
    path.join(repoRoot, "packages/mcp-server/README.md"),
    "utf8",
  );
  const consumerGuide = await readFile(
    path.join(repoRoot, "docs/guides/agent-consumption.md"),
    "utf8",
  );
  const reference = `${readme}\n${consumerGuide}`;

  for (const match of registry.matchAll(/\btool\('([^']+)'/g)) {
    if (!reference.includes(`\`${match[1]}\``)) {
      errors.push(`MCP documentation is missing tool ${match[1]}`);
    }
  }
  for (const match of prompts.matchAll(/^    name: '([^']+)'/gm)) {
    if (!reference.includes(`\`${match[1]}\``)) {
      errors.push(`MCP documentation is missing prompt ${match[1]}`);
    }
  }
  for (const match of resources.matchAll(/'(proto-bridge:\/\/[^']+)'/g)) {
    const uri = match[1];
    if (uri.includes("${")) continue;
    if (!reference.includes(uri)) {
      errors.push(`MCP documentation is missing resource ${uri}`);
    }
  }
}

async function verifyComponentReferences() {
  const contractRoot = path.join(
    repoRoot,
    "apps/pbwork/src/design-system/components/contracts",
  );
  const docsRoot = path.join(repoRoot, "apps/pbwork/docs/components");
  const contracts = (await readdir(contractRoot))
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const filename of contracts) {
    const contract = JSON.parse(
      await readFile(path.join(contractRoot, filename), "utf8"),
    );
    const docPath = path.join(docsRoot, contract.category, `${contract.id}.md`);
    let doc;
    try {
      doc = await readFile(docPath, "utf8");
    } catch {
      errors.push(`Component ${contract.id} is missing ${relative(docPath)}`);
      continue;
    }

    if (!doc.includes(`组件 id：\`${contract.id}\``)) {
      errors.push(
        `${relative(docPath)} does not declare component id ${contract.id}`,
      );
    }
    if (!doc.includes(`contracts/${contract.id}.json`)) {
      errors.push(
        `${relative(docPath)} must link or cite contracts/${contract.id}.json as SoT`,
      );
    }
    // Narrative docs: require state ids; props/token tables are Contract SoT (see alignment-protocol).
    for (const state of contract.states ?? []) {
      if (!doc.includes(`\`${state.id}\``)) {
        errors.push(`${relative(docPath)} is missing state ${state.id}`);
      }
    }
  }

  const documented = [];
  for (const category of [
    "action",
    "input",
    "display",
    "navigation",
    "data",
    "feedback",
  ]) {
    for (const file of await readdir(path.join(docsRoot, category))) {
      if (file.endsWith(".md")) documented.push(file.replace(/\.md$/u, ""));
    }
  }
  const contractIds = new Set(
    contracts.map((file) => file.replace(/\.json$/u, "")),
  );
  for (const id of documented) {
    if (!contractIds.has(id))
      errors.push(`Component documentation ${id} has no contract`);
  }
}

async function verifyTokenCatalog() {
  const tokens = JSON.parse(
    await readFile(
      path.join(repoRoot, "apps/pbwork/src/design-system/tokens/tokens.json"),
      "utf8",
    ),
  );
  const catalog = await readFile(
    path.join(repoRoot, "apps/pbwork/docs/tokens/catalog.md"),
    "utf8",
  );
  if (!catalog.includes(`共 ${tokens.length} 项`)) {
    errors.push(
      `Token catalog count does not match tokens.json (${tokens.length})`,
    );
  }
  const catalogTokenIds = new Set(
    catalog
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("| `"))
      .map((line) => line.split("|")[1]?.trim().replaceAll("`", ""))
      .filter(Boolean),
  );
  for (const token of tokens) {
    if (!catalogTokenIds.has(token.id)) {
      errors.push(`Token catalog is missing ${token.id}`);
    }
  }
}

async function verifyCurrentProductLanguage(files) {
  const historicalRoots = [
    path.join(repoRoot, "docs/history"),
    path.join(repoRoot, "docs/decisions"),
  ];
  const forbidden = [
    "proto-bridge.config.json",
    "reconstruct_page_context",
    "ui-build-plan.json",
    "ui-build-review.md",
    "阶段一完成",
    "阶段二完成",
    "阶段三完成",
    "阶段四完成",
    "阶段五完成",
    "阶段六完成",
    "阶段七完成",
  ];

  for (const file of files) {
    if (historicalRoots.some((root) => file.startsWith(`${root}${path.sep}`))) {
      continue;
    }
    const source = await readFile(file, "utf8");
    for (const phrase of forbidden) {
      if (source.includes(phrase)) {
        errors.push(
          `${relative(file)} contains historical product phrase: ${phrase}`,
        );
      }
    }
  }
}

function relative(file) {
  return path.relative(repoRoot, file);
}

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
await verifyPrototypeDesignDocs();
await verifyCliReference();
await verifyMcpReference();
await verifyComponentReferences();
await verifyTokenCatalog();
await verifyTargetMappingReference();
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
  const skillsRoot = path.join(repoRoot, ".agents/skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const actualSkills = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const expectedSkills = ["frontend-design", "pbwork", "proto-bridge"];
  if (actualSkills.join("\n") !== expectedSkills.join("\n")) {
    errors.push(
      `.agents/skills must contain exactly ${expectedSkills.join(", ")}; found ${actualSkills.join(", ")}`,
    );
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(skillsRoot, entry.name);
    const files = await readdir(directory);
    if (!files.includes("SKILL.md")) {
      errors.push(`.agents/skills/${entry.name} is missing SKILL.md`);
      continue;
    }
    if (
      files.some(
        (file) => file !== "SKILL.md" && file.toLowerCase() === "skill.md",
      )
    ) {
      errors.push(
        `.agents/skills/${entry.name} contains a non-canonical skill filename`,
      );
    }
    const source = await readFile(path.join(directory, "SKILL.md"), "utf8");
    const name = source.match(/^---\nname: ([a-z0-9-]+)\ndescription:/u)?.[1];
    if (!name) {
      errors.push(`.agents/skills/${entry.name}/SKILL.md has invalid frontmatter`);
    } else if (name !== entry.name) {
      errors.push(
        `.agents/skills/${entry.name}/SKILL.md declares mismatched name ${name}`,
      );
    }
  }

  try {
    const legacyEntries = await readdir(path.join(repoRoot, "skills"));
    if (legacyEntries.length > 0) {
      errors.push("Legacy root skills/ must not contain repository skills");
    }
  } catch {
    // The legacy directory is expected to be absent.
  }
}

async function verifyPrototypeDesignDocs() {
  const registry = await readFile(
    path.join(repoRoot, "apps/pbwork/src/prototypes/registry.ts"),
    "utf8",
  );
  const prototypeIds = new Set(
    [...registry.matchAll(/\bprototypeId:\s*"([^"]+)"/gu)].map(
      (match) => match[1],
    ),
  );
  const prototypesRoot = path.join(repoRoot, "apps/pbwork/src/prototypes");

  for (const entry of await readdir(prototypesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "project") continue;
    const prototypeRoot = path.join(prototypesRoot, entry.name);
    for (const child of await readdir(prototypeRoot, { withFileTypes: true })) {
      if (child.isFile() && child.name.toLowerCase().endsWith(".md")) {
        errors.push(
          `${relative(path.join(prototypeRoot, child.name))} must move under prototype docs/`,
        );
      }
    }
  }

  for (const prototypeId of prototypeIds) {
    const prototypeRoot = path.join(prototypesRoot, prototypeId);
    const designPath = path.join(prototypeRoot, "docs/design.md");
    let design;
    try {
      design = await readFile(designPath, "utf8");
    } catch {
      errors.push(
        `Registered prototype ${prototypeId} is missing ${relative(designPath)}`,
      );
      continue;
    }

    const frontmatter = design.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? "";
    if (!frontmatter.includes(`prototypeId: ${prototypeId}`)) {
      errors.push(`${relative(designPath)} has a mismatched prototypeId`);
    }
    if (!/^status: approved$/mu.test(frontmatter)) {
      errors.push(`${relative(designPath)} must have status: approved`);
    }
    if (!/^approvedAt: \d{4}-\d{2}-\d{2}$/mu.test(frontmatter)) {
      errors.push(`${relative(designPath)} must declare approvedAt as YYYY-MM-DD`);
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
    for (const heading of [
      "## 职责与边界",
      "## 行为要点",
      "## States",
      "## 用法与反例",
    ]) {
      if (!doc.includes(heading)) {
        errors.push(`${relative(docPath)} is missing required narrative section ${heading}`);
      }
    }
    for (const forbiddenHeading of ["## Props", "## Slots / Events", "## tokenBindings"]) {
      if (doc.includes(forbiddenHeading)) {
        errors.push(
          `${relative(docPath)} duplicates Contract-owned tables under ${forbiddenHeading}`,
        );
      }
    }
    if (!doc.includes("Props、Slots、Events、默认值与 Token 槽以")) {
      errors.push(`${relative(docPath)} does not declare the Contract-owned detail boundary`);
    }
    // Narrative docs still expose the complete state identity tuple without copying props/tokens.
    for (const state of contract.states ?? []) {
      const stateRow = `| \`${state.id}\` | ${state.label} | \`${state.kind}\` |`;
      if (!doc.includes(stateRow)) {
        errors.push(
          `${relative(docPath)} is missing state tuple ${state.id}/${state.label}/${state.kind}`,
        );
      }
    }
    if ((contract.states ?? []).length === 0 && !doc.includes("当前 Contract 不声明命名状态")) {
      errors.push(`${relative(docPath)} must explicitly state that its Contract has no named states`);
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

async function verifyTargetMappingReference() {
  const contractRoot = path.join(
    repoRoot,
    "apps/pbwork/src/design-system/components/contracts",
  );
  const contracts = await Promise.all(
    (await readdir(contractRoot))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map(async (file) =>
        JSON.parse(await readFile(path.join(contractRoot, file), "utf8")),
      ),
  );
  const targetRoot = path.join(repoRoot, "apps/flutter_pb_app");
  const mapping = JSON.parse(
    await readFile(path.join(targetRoot, "proto-bridge.target.json"), "utf8"),
  );
  const reference = await readFile(
    path.join(targetRoot, "docs/proto-bridge.md"),
    "utf8",
  );

  for (const contract of contracts) {
    const target = mapping.components?.[contract.id];
    if (!target?.symbol || !target?.import) {
      errors.push(`Flutter target mapping is missing documented component ${contract.id}`);
      continue;
    }
    const row = `| \`${contract.id}\` | \`${target.symbol}\` | \`${target.import}\` |`;
    if (!reference.includes(row)) {
      errors.push(
        `apps/flutter_pb_app/docs/proto-bridge.md is missing current mapping row for ${contract.id}`,
      );
    }
  }
  for (const id of Object.keys(mapping.components ?? {})) {
    if (!reference.includes(`\`${id}\``)) {
      errors.push(`Flutter legacy component mapping ${id} is undocumented`);
    }
  }
  for (const entrypoint of mapping.policyEntrypoints ?? []) {
    try {
      await access(path.join(targetRoot, entrypoint));
    } catch {
      errors.push(`Flutter target policy entrypoint is missing: ${entrypoint}`);
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
    "交付到 Agent",
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

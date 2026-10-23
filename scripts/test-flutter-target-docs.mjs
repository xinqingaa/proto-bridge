import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  planFlutterDocumentation,
  writeFlutterDocumentation,
} from "./lib/flutter-target-docs.mjs";
import { createPrototype } from "../apps/pbwork/scripts/new-prototype.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(t) {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "pb-flutter-docs-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const producer = path.join(root, "producer");
  const sourceRoot = path.join(producer, "apps/flutter_pb_app");
  const prototypeRoot = path.join(
    producer,
    "apps/pbwork/src/prototypes/sample",
  );
  const put = async (name, content) => {
    const file = path.join(producer, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  for (const name of [
    "architecture",
    "assets",
    "components",
    "proto-bridge",
    "routing",
    "testing",
    "theme",
    "workflow",
  ]) {
    await put(`apps/flutter_pb_app/docs/${name}.md`, `# ${name}\n`);
  }
  await put(
    "apps/flutter_pb_app/docs/architecture.md",
    "# Riverpod\n[Producer](../../../docs/reference.md)\n",
  );
  await put("docs/reference.md", "# Source reference\n");
  await cp(
    path.join(repo, "scripts/templates/flutter-target"),
    path.join(producer, "scripts/templates/flutter-target"),
    { recursive: true },
  );
  await put(
    "apps/pbwork/src/prototypes/sample/prototype.ts",
    "export default {id: 'sample'};\n",
  );
  const docs = {
    schemaVersion: 1,
    files: [
      { source: "product.md", target: "product.md" },
      { source: "design.md", target: "prototype/design.md" },
      { source: "known-gaps.md", target: "prototype/known-gaps.md" },
      { source: "images/diagram.png", target: "product-assets/diagram.png" },
    ],
  };
  await put(
    "apps/pbwork/src/prototypes/sample/docs/product.md",
    "# Product\n[Design](design.md) [Source gaps](known-gaps.md#limit) ![图](images/diagram.png)\n",
  );
  await put(
    "apps/pbwork/src/prototypes/sample/docs/design.md",
    "---\nstatus: draft\n---\n[Product](product.md)\n",
  );
  await put(
    "apps/pbwork/src/prototypes/sample/docs/known-gaps.md",
    "# Source only\n[Product](product.md)\n",
  );
  await put(
    "apps/pbwork/src/prototypes/sample/docs/images/diagram.png",
    Buffer.from([0, 1, 255, 3]),
  );
  const saveManifest = () =>
    put(
      "apps/pbwork/src/prototypes/sample/docs/target-docs.json",
      JSON.stringify(docs),
    );
  await saveManifest();
  const options = {
    repoRoot: producer,
    sourceRoot,
    targetRoot: path.join(root, "target"),
    prototype: "sample",
    displayName: "Sample",
    packageName: "sample",
  };
  return { root, producer, prototypeRoot, put, docs, saveManifest, options };
}

test("imports a complete local graph, preserves source meaning, and records exact content provenance", async (t) => {
  const { options, prototypeRoot } = await fixture(t);
  const plan = await planFlutterDocumentation(options);
  assert.match(plan.files.get("docs/product.md"), /\(prototype\/design\.md\)/);
  assert.match(
    plan.files.get("docs/product.md"),
    /\(prototype\/known-gaps\.md#limit\)/,
  );
  assert.match(
    plan.files.get("docs/product.md"),
    /\(product-assets\/diagram\.png\)/,
  );
  assert.match(plan.files.get("docs/prototype/design.md"), /status: draft/);
  assert.match(
    plan.files.get("docs/prototype/design.md"),
    /\(\.\.\/product\.md\)/,
  );
  assert.match(
    plan.files.get("docs/architecture.md"),
    /\.\.\/\.\.\/producer\/docs\/reference\.md/,
  );
  assert.doesNotMatch(plan.files.get("docs/known-gaps.md"), /Source only/);
  assert.match(plan.files.get("docs/known-gaps.md"), /业务页面.*尚未实现/);
  assert.ok(plan.files.get("AGENTS.md").split("\n").length < 12);
  assert.doesNotMatch(
    plan.files.get("AGENTS.md"),
    /flutter analyze|mandatoryRisks|Riverpod|等待.*批准/,
  );
  assert.doesNotMatch(plan.files.get("README.md"), /mcp\.mjs|--bind|Handoff/);
  assert.equal(plan.provenance.revision, null);
  assert.equal(plan.provenance.dirty, null);
  const receipt = plan.provenance.files.find(
    (file) => file.source === "product.md",
  );
  assert.equal(
    receipt.sourceSha256,
    hash(await readFile(path.join(prototypeRoot, "docs/product.md"))),
  );
  assert.equal(receipt.importedSha256, hash(plan.files.get("docs/product.md")));
  await writeFlutterDocumentation(options.targetRoot, plan);
  assert.deepEqual(
    await readFile(
      path.join(options.targetRoot, "docs/product-assets/diagram.png"),
    ),
    Buffer.from([0, 1, 255, 3]),
  );
  await writeFile(
    path.join(options.targetRoot, "docs/product.md"),
    "Target local edits",
  );
  await assert.rejects(
    writeFlutterDocumentation(options.targetRoot, plan),
    /EEXIST/,
  );
  assert.equal(
    await readFile(path.join(options.targetRoot, "docs/product.md"), "utf8"),
    "Target local edits",
  );
});

test("no prototype generates honest product placeholders without importing source state", async (t) => {
  const { options } = await fixture(t);
  const plan = await planFlutterDocumentation({
    ...options,
    prototype: undefined,
  });
  assert.equal(plan.provenance, null);
  assert.match(plan.files.get("docs/product.md"), /待补充/);
  assert.match(plan.files.get("docs/prototype-source.md"), /未选择原型/);
  assert.ok(
    ![...plan.files.keys()].some((name) => name.startsWith("docs/prototype/")),
  );
});

test("new PBWork skeleton exports its draft product graph without treating implementation notes as requirements", async (t) => {
  const { options, producer } = await fixture(t);
  createPrototype(
    "generated",
    path.join(producer, "apps/pbwork/src/prototypes"),
  );
  const plan = await planFlutterDocumentation({
    ...options,
    prototype: "generated",
  });
  assert.match(plan.files.get("docs/prototype/design.md"), /status: draft/);
  assert.match(plan.files.get("docs/product.md"), /待需求采访与批准/);
  assert.ok(!plan.files.has("docs/prototype/implementation.md"));
});

test("engineering document attachments remain local and byte-identical", async (t) => {
  const { options, put } = await fixture(t);
  const image = Buffer.from([0, 255, 3]);
  await put("apps/flutter_pb_app/docs/images/architecture.png", image);
  await put(
    "apps/flutter_pb_app/docs/architecture.md",
    "![Architecture](images/architecture.png)",
  );
  const plan = await planFlutterDocumentation(options);
  assert.deepEqual(plan.files.get("docs/images/architecture.png"), image);
});

test("rejects an unknown prototype and missing or invalid export declarations before writes", async (t) => {
  const { options, prototypeRoot, saveManifest } = await fixture(t);
  await assert.rejects(
    planFlutterDocumentation({ ...options, prototype: "../escape" }),
    /Invalid prototype/,
  );
  await assert.rejects(
    planFlutterDocumentation({ ...options, prototype: "unknown" }),
    /ENOENT/,
  );
  await rm(path.join(prototypeRoot, "docs/target-docs.json"));
  await assert.rejects(planFlutterDocumentation(options), /ENOENT/);
  await saveManifest();
  await rm(path.join(prototypeRoot, "docs/design.md"));
  await assert.rejects(planFlutterDocumentation(options), /ENOENT/);
  await assert.rejects(lstat(options.targetRoot), /ENOENT/);
});

test("rejects undeclared link dependencies rather than copying unrelated source docs", async (t) => {
  const { options, prototypeRoot } = await fixture(t);
  await writeFile(
    path.join(prototypeRoot, "docs/product.md"),
    "[unlisted](../../../../../../docs/reference.md)",
  );
  await assert.rejects(
    planFlutterDocumentation(options),
    /Unexported document dependency/,
  );
});

for (const [name, entry, message] of [
  [
    "escape",
    { source: "../prototype.ts", target: "product.md" },
    /Invalid documentation path/,
  ],
  [
    "engineering overwrite",
    { source: "product.md", target: "architecture.md" },
    /Reserved target document/,
  ],
  [
    "status overwrite",
    { source: "product.md", target: "known-gaps.md" },
    /Reserved target document/,
  ],
  [
    "instruction injection",
    { source: "product.md", target: "prototype/AGENTS.md" },
    /Reserved target document/,
  ],
  [
    "case collision",
    { source: "extra.md", target: "prototype/DESIGN.md" },
    /Duplicate document export/,
  ],
  [
    "directory collision",
    { source: "extra.md", target: "prototype/design.md/extra.md" },
    /Conflicting document paths/,
  ],
]) {
  test(`rejects ${name}`, async (t) => {
    const { options, docs, saveManifest, put } = await fixture(t);
    await put("apps/pbwork/src/prototypes/sample/docs/extra.md", "# Extra");
    if (
      name === "escape" ||
      name.endsWith("overwrite") ||
      name === "instruction injection"
    )
      docs.files[0] = entry;
    else docs.files.push(entry);
    await saveManifest();
    await assert.rejects(planFlutterDocumentation(options), message);
    await assert.rejects(lstat(options.targetRoot), /ENOENT/);
  });
}

test("rejects source symlinks, including directories", async (t) => {
  const { options, prototypeRoot, root } = await fixture(t);
  const file = path.join(prototypeRoot, "docs/product.md");
  await rm(file);
  await symlink(path.join(root, "outside.md"), file);
  await assert.rejects(
    planFlutterDocumentation(options),
    /Documentation symlink/,
  );
  await rm(file);
  await writeFile(file, "# Product");
  const images = path.join(prototypeRoot, "docs/images");
  await rm(images, { recursive: true });
  await symlink(root, images);
  await assert.rejects(
    planFlutterDocumentation(options),
    /Documentation symlink/,
  );
});

test("registered prototype declarations plan successfully with the real templates and base docs", async (t) => {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "pb-real-docs-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const prototypes = path.join(repo, "apps/pbwork/src/prototypes");
  let checked = 0;
  for (const entry of await readdir(prototypes, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      await lstat(path.join(prototypes, entry.name, "prototype.ts"));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const prototype = entry.name;
    checked++;
    const plan = await planFlutterDocumentation({
      repoRoot: repo,
      sourceRoot: path.join(repo, "apps/flutter_pb_app"),
      targetRoot: path.join(root, prototype),
      prototype,
      displayName: prototype,
      packageName: prototype,
    });
    assert.equal(plan.provenance.prototype, prototype);
    assert.ok(plan.files.has("docs/prototype/design.md"));
    if (prototype === "yike")
      assert.match(plan.files.get("docs/product.md"), /一刻/);
  }
  assert.ok(checked > 0);
});

test("CLI dry-run lists the selected documents without writing, and rejects unknown prototypes", async (t) => {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "pb-cli-docs-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  const run = (prototype) =>
    spawnSync(
      process.execPath,
      [
        path.join(repo, "scripts/pb-new-flutter-target.mjs"),
        "sample",
        "--parent",
        root,
        "--prototype",
        prototype,
        "--dry-run",
      ],
      { encoding: "utf8" },
    );
  const valid = run("yike");
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /Document: docs\/product.md/);
  assert.match(valid.stdout, /Document: docs\/prototype\/known-gaps.md/);
  const invalid = run("no-such-prototype");
  assert.notEqual(invalid.status, 0);
  await assert.rejects(lstat(path.join(root, "sample")), /ENOENT/);
  const target = path.join(root, "sample");
  await mkdir(target);
  await writeFile(path.join(target, "AGENTS.md"), "Local product instructions");
  const existing = spawnSync(
    process.execPath,
    [
      path.join(repo, "scripts/pb-new-flutter-target.mjs"),
      "sample",
      "--parent",
      root,
      "--prototype",
      "yike",
      "--yes",
      "--no-install",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(existing.status, 0);
  assert.match(existing.stderr, /not empty/);
  assert.deepEqual(await readdir(target), ["AGENTS.md"]);
  assert.equal(
    await readFile(path.join(target, "AGENTS.md"), "utf8"),
    "Local product instructions",
  );
});

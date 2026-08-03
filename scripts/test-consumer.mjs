#!/usr/bin/env node
import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { createInterface } from "node:readline";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fixtures } from "../packages/core/dist/v2/index.js";
import { createAgentHandoff } from "../packages/core/dist/v2/capture/index.js";
import { LocalFileStore } from "../packages/core/dist/v2/store/index.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pb-v2-consumer-"));
const storeRoot = path.join(tempRoot, "store");
const targetRoot = path.join(tempRoot, "target");
const reference = fixtures.ledgerPlanetTaskList;
let writer;
let client;

try {
  writer = new LocalFileStore({
    root: storeRoot,
    workspaceId: reference.WORKSPACE_ID,
  });
  await writer.init();
  const revision = {
    ...structuredClone(reference.PRIMARY_ACTIVE_REVISION),
    revisionId: "task-list-consumer-risk-rev1",
    facts: [
      ...structuredClone(reference.PRIMARY_ACTIVE_REVISION.facts),
      structuredClone(reference.UNKNOWN_FACT),
    ],
    requiredFactsTotal: 2,
    requiredFactsResolved: 1,
  };
  const run = structuredClone(reference.RUN_1);
  run.attempts[0].revisionId = revision.revisionId;
  const created = await writer.createBundle({
    bundleId: reference.BUNDLE_ID,
    prototypeId: reference.PROTOTYPE_ID,
    run,
    revisions: [revision],
    coverage: {
      ...structuredClone(run.coverage),
      factQuality: {
        ...structuredClone(run.coverage.factQuality),
        unknown: 1,
      },
    },
  });
  await writer.putBlob({
    bundleId: reference.BUNDLE_ID,
    kind: "screenshot",
    mediaType: "image/png",
    bytes: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
    ownerRefs: [{ kind: "revision", objectId: revision.revisionId }],
  });
  await writer.putIssue(reference.BUNDLE_ID, reference.UNKNOWN_ISSUE);
  const report = await writer.createStalenessReport({
    bundleId: reference.BUNDLE_ID,
    snapshotId: created.snapshot.snapshotId,
    inputVersion: "consumer-target-v1",
    currentDependencyDigests: {
      "registry:ledger-planet.task-list": "registry-task-list-v1",
      "source:ledger-planet.task-list": "source-task-list-v1",
    },
  });
  const handoff = await createAgentHandoff({
    store: writer,
    bundleId: reference.BUNDLE_ID,
    snapshotId: created.snapshot.snapshotId,
    selectedCases: run.selection.cases,
    stalenessReport: report,
    currentInputVersion: report.inputVersion,
    implementationIntent: "Implement the task-list page shell.",
    acknowledgedRiskKinds: [
      "required-unknown",
      "reconstruction-readiness",
    ],
  });
  await writer.close();
  writer = undefined;

  await mkdir(path.join(targetRoot, "lib"), { recursive: true });
  await writeFile(
    path.join(targetRoot, "pubspec.yaml"),
    "name: consumer_target\n\ndependencies:\n  flutter:\n    sdk: flutter\n",
    "utf8",
  );
  await execFileAsync("git", ["init", "-q", targetRoot]);
  await execFileAsync("git", ["-C", targetRoot, "add", "pubspec.yaml"]);
  await execFileAsync("git", [
    "-C",
    targetRoot,
    "-c",
    "user.name=ProtoBridge Test",
    "-c",
    "user.email=proto-bridge@example.invalid",
    "commit",
    "-qm",
    "target fixture baseline",
  ]);
  await assertMissing(path.join(targetRoot, "proto-bridge.config.json"));
  await assertMissing(path.join(targetRoot, "proto-bridge.json"));

  client = await startClient([
    "--store-root",
    storeRoot,
    "--workspace",
    reference.WORKSPACE_ID,
  ]);

  const resources = await client.request("resources/list", {});
  assert(
    resources.resources?.some(
      (item) => item.uri === "proto-bridge://guides/handoff-consumer",
    ),
    "Consumer guide resource is missing.",
  );
  const guide = await client.request("resources/read", {
    uri: "proto-bridge://guides/handoff-consumer",
  });
  assert(
    guide.contents?.[0]?.text?.includes("Never replace them with active/latest"),
    "Consumer guide does not preserve fixed-reference policy.",
  );
  const prompt = await client.request("prompts/get", {
    name: "consume_evidence_handoff",
    arguments: { handoffId: handoff.handoffId, targetRoot },
  });
  assert(
    prompt.messages?.[0]?.content?.text?.includes(handoff.handoffId),
    "Consumer prompt did not bind the Handoff.",
  );

  const consumedHandoff = parseToolJson(
    await client.request("tools/call", {
      name: "read_agent_handoff",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    consumedHandoff.mandatoryRiskReport?.some(
      (risk) => risk.kind === "required-unknown",
    ),
    "Consumer did not receive the Handoff's required unknown risk.",
  );

  const snapshot = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_snapshot",
      arguments: {
        bundleId: handoff.bundleId,
        snapshotId: handoff.snapshotId,
      },
    }),
  );
  const screenshotBlobId = snapshot.screenshotResources?.[0]?.blobId;
  const screenshotResult = await client.request("tools/call", {
    name: "read_evidence_screenshot",
    arguments: {
      bundleId: handoff.bundleId,
      snapshotId: handoff.snapshotId,
      blobId: screenshotBlobId,
    },
  });
  assert(
    screenshotResult.content?.some((item) => item.type === "image"),
    "Consumer could not view the fixed Screenshot as MCP ImageContent.",
  );
  const acceptance = parseToolJson(
    await client.request("tools/call", {
      name: "read_acceptance_contract",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    acceptance.policy === undefined &&
      acceptance.screenshots?.some((item) =>
        item.blobIds?.includes(screenshotBlobId),
      ),
    "Consumer did not receive the fixed non-scoring Review Contract.",
  );
  const revisionId = handoff.selectedCases[0].revisionId;
  const consumedRevision = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_revision",
      arguments: {
        bundleId: handoff.bundleId,
        snapshotId: handoff.snapshotId,
        revisionId,
      },
    }),
  );
  assert(
    snapshot.fixedSnapshotId === handoff.snapshotId &&
      consumedRevision.revisionId === revisionId,
    "Consumer drifted from fixed Snapshot/revision refs.",
  );
  const role = consumedRevision.facts.find((fact) =>
    fact.factId.endsWith(".root.role"),
  )?.effectiveValue;
  assert(role === "page", "Consumer could not read the target implementation fact.");

  await writeFile(
    path.join(targetRoot, "lib", "task_list_view.dart"),
    [
      "class TaskListView {",
      "  const TaskListView();",
      "",
      `  String get semanticRole => '${role}';`,
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  const validation = parseToolJson(
    await client.request("tools/call", {
      name: "validate_target_changes",
      arguments: {
        targetRoot,
        allowedPaths: ["lib"],
        expectedFiles: ["lib/task_list_view.dart"],
      },
    }),
  );
  assert(
    validation.status === "ok" &&
      validation.changedFiles?.includes("lib/task_list_view.dart"),
    `Independent Target validation did not verify the implemented task: ${JSON.stringify(validation)}`,
  );

  const invalid = await client.requestError("tools/call", {
    name: "read_evidence_revision",
    arguments: {
      bundleId: handoff.bundleId,
      snapshotId: handoff.snapshotId,
      revisionId: "missing-revision",
    },
  });
  assert(
    invalid.data?.errorCode === "unknown-reference",
    "Invalid fixed revision did not fail with a structured V2 error.",
  );

  process.stdout.write(
    `Consumer E2E passed: ${handoff.handoffId} -> lib/task_list_view.dart\n`,
  );
} finally {
  await client?.close();
  await writer?.close();
  await rm(tempRoot, { recursive: true, force: true });
}

async function assertMissing(file) {
  try {
    await access(file);
    throw new Error(`Target fixture unexpectedly contains ${file}.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function startClient(args) {
  const child = spawn(
    "node",
    [path.join(repoRoot, "packages/mcp-server/dist/index.js"), ...args],
    { cwd: repoRoot, env: process.env, stdio: ["pipe", "pipe", "pipe"] },
  );
  let nextId = 1;
  const pending = new Map();
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) slot.reject(message.error);
    else slot.resolve(message.result);
  });
  child.once("exit", (code) => {
    for (const slot of pending.values()) {
      slot.reject(
        new Error(`MCP exited ${code}: ${stderr || "no stderr"}`),
      );
    }
    pending.clear();
  });
  function request(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  }
  return {
    request,
    async requestError(method, params) {
      try {
        await request(method, params);
      } catch (error) {
        return error;
      }
      throw new Error("Expected MCP request to fail.");
    },
    close() {
      lines.close();
      child.stdin.end();
      return new Promise((resolve) => {
        if (child.exitCode !== null) resolve();
        else child.once("exit", resolve);
      });
    },
  };
}

function parseToolJson(result) {
  if (
    result.structuredContent === undefined ||
    result.structuredContent === null ||
    typeof result.structuredContent !== "object" ||
    Array.isArray(result.structuredContent)
  ) {
    throw new Error(
      "MCP tool advertised structured output but returned no structuredContent object.",
    );
  }
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool did not return text JSON in content.");
  const fromText = JSON.parse(text);
  if (JSON.stringify(fromText) !== JSON.stringify(result.structuredContent)) {
    throw new Error(
      "MCP tool content JSON does not match structuredContent.",
    );
  }
  return result.structuredContent;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

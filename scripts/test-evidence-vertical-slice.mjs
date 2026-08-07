#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createInterface } from "node:readline";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pb-evidence-slice-"));
const storeRoot = path.join(tempRoot, "store");
const resultPath = path.join(tempRoot, "browser-result.json");
const uiPort = 4300 + (process.pid % 500);
const servicePort = uiPort + 1;
let client;

try {
  await run("pnpm", ["--filter", "@proto-bridge/core", "build"]);
  await run("pnpm", ["--filter", "@proto-bridge/local-service", "build"]);
  await run("pnpm", ["--filter", "@proto-bridge/pbwork", "build"]);
  await run("pnpm", ["--filter", "@proto-bridge/mcp-server", "build"]);
  await run(
    "pnpm",
    [
      "--filter",
      "@proto-bridge/pbwork",
      "exec",
      "playwright",
      "test",
      "e2e/evidence-usability.spec.ts",
      "--grep",
      "evidence viewer can reopen deliver flow",
    ],
    {
      PBWORK_E2E_PORT: String(uiPort),
      PBWORK_E2E_SERVICE_PORT: String(servicePort),
      PBWORK_E2E_STORE_ROOT: storeRoot,
      PBWORK_E2E_RESULT_PATH: resultPath,
    },
  );

  const fixed = JSON.parse(await readFile(resultPath, "utf8"));
  assert(fixed.handoffId, "PBWork deliver result did not include handoffId.");
  client = await startMcpClient([
    "--store-root",
    storeRoot,
    "--workspace",
    "pbwork-local",
  ]);
  const index = parseToolJson(
    await client.request("tools/call", {
      name: "read_handoff_index",
      arguments: { handoffId: fixed.handoffId },
    }),
  );

  assert(
    index.fixedRefs?.bundleId === fixed.bundleId &&
      index.fixedRefs?.snapshotId === fixed.snapshotId,
    "MCP did not read the Handoff Snapshot shown by PBWork.",
  );
  assert(
    index.coverageStatus === "complete" || index.freshnessStatus === "fresh",
    "Handoff coverage/freshness did not meet the acceptance boundary.",
  );
  assert(
    index.screenshotGroups?.length > 0,
    "The shared Handoff does not contain a Screenshot group.",
  );
  const screenId = index.screens?.[0]?.screenId;
  assert(screenId, "Handoff index did not expose a Screen.");
  const packet = parseToolJson(
    await client.request("tools/call", {
      name: "read_screen_packet",
      arguments: { handoffId: fixed.handoffId, screenId },
    }),
  );
  assert(
    packet.baseline?.structure || packet.canonicalBrief,
    "Screen packet did not return baseline/canonicalBrief Facts.",
  );
  const blobId = packet.screenshotGroups?.[0]?.representativeBlobId;
  assert(blobId, "Screen packet did not expose a Screenshot blob.");
  const screenshot = await client.request("tools/call", {
    name: "read_evidence_screenshot",
    arguments: {
      bundleId: fixed.bundleId,
      snapshotId: fixed.snapshotId,
      blobId,
    },
  });
  assert(
    screenshot.content?.some((item) => item.type === "image"),
    "MCP Screenshot tool did not return ImageContent.",
  );

  process.stdout.write(
    `Evidence vertical slice passed: PBWork and MCP read ${fixed.bundleId}/${fixed.snapshotId} via ${fixed.handoffId}\n`,
  );
} finally {
  await client?.close();
  await rm(tempRoot, { recursive: true, force: true });
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}.`));
    });
  });
}

async function startMcpClient(args) {
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
    if (message.error) slot.reject(new Error(message.error.message));
    else slot.resolve(message.result);
  });
  child.once("exit", (code) => {
    for (const slot of pending.values()) {
      slot.reject(new Error(`MCP exited ${code}: ${stderr || "no stderr"}`));
    }
    pending.clear();
  });
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
        );
      });
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

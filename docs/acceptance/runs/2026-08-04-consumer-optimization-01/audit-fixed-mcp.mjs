#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, "../../../..");
const storeRoot = path.join(repoRoot, ".proto-bridge/store");
const targetRoot = path.join(repoRoot, "apps/flutter_pb_app");
const outputPath = path.join(runDir, "fixed-mcp-audit.json");

const fixed = {
  workspaceId: "pbwork-local",
  bundleId: "bundle-2026-08-03t095053078-241d3a74",
  snapshotId: "snapshot-2026-08-03t095114638-511379f3",
  handoffId: "handoff-2026-08-03t100731725-9a0121d7",
  targetBaselineCommit: "79780eb6962086affb9af8bcacd8006707517a67",
};

const client = await startClient();
try {
  const tools = await client.request("tools/list", {});
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  const workspace = json(await call("inspect_evidence_workspace", {}));
  assert(workspace.workspace?.workspaceId === fixed.workspaceId, "workspace drift");

  const indexCall = await call("read_handoff_index", { handoffId: fixed.handoffId });
  const index = json(indexCall);
  assert(index.fixedRefs?.snapshotId === fixed.snapshotId, "snapshot drift");
  assert(index.screens?.length === 3, "expected three screens");

  const componentIds = new Set();
  const tokenIds = new Set();
  const screenshotByDigest = new Map();
  const packets = [];
  let detailItemCount = 0;
  let detailPageCount = 0;
  let deltaCount = 0;
  let progressiveResponseBytes = byteLength(indexCall);

  for (const screen of index.screens) {
    const packetCall = await call("read_screen_packet", {
      handoffId: fixed.handoffId,
      screenId: screen.screenId,
    });
    progressiveResponseBytes += byteLength(packetCall);
    const packet = json(packetCall);
    for (const id of packet.componentIds ?? []) componentIds.add(id);
    for (const id of packet.tokenIds ?? []) tokenIds.add(id);
    for (const group of packet.screenshotGroups ?? []) {
      screenshotByDigest.set(group.digest, group.blobIds[0]);
    }
    for (const item of packet.cases ?? []) {
      const deltaCall = await call("read_case_delta", {
        handoffId: fixed.handoffId,
        screenId: screen.screenId,
        caseId: item.caseId,
      });
      progressiveResponseBytes += byteLength(deltaCall);
      json(deltaCall);
      deltaCount += 1;
    }
    for (const projection of [
      "structure",
      "components",
      "tokens",
      "interactions",
      "provenance",
    ]) {
      let cursor;
      do {
        const detailCall = await call("read_evidence_detail", {
          handoffId: fixed.handoffId,
          screenId: screen.screenId,
          projection,
          pageSize: 250,
          ...(cursor ? { cursor } : {}),
        });
        progressiveResponseBytes += byteLength(detailCall);
        const detail = json(detailCall);
        detailItemCount += detail.items?.length ?? 0;
        detailPageCount += 1;
        cursor = detail.continuation;
      } while (cursor);
    }
    packets.push({
      screenId: screen.screenId,
      baselineCaseId: packet.baselineCaseId,
      caseCount: packet.cases?.length ?? 0,
      screenshotDigestCount: packet.screenshotGroups?.length ?? 0,
      componentIdCount: packet.componentIds?.length ?? 0,
      tokenIdCount: packet.tokenIds?.length ?? 0,
    });
  }

  assert(deltaCount === 24, `expected 24 deltas, got ${deltaCount}`);
  assert(screenshotByDigest.size === 16, `expected 16 digests, got ${screenshotByDigest.size}`);

  const screenshots = [];
  for (const [digest, blobId] of [...screenshotByDigest].sort(([a], [b]) => a.localeCompare(b))) {
    const result = await call("read_evidence_screenshot", {
      bundleId: fixed.bundleId,
      snapshotId: fixed.snapshotId,
      blobId,
    });
    const image = result.content?.find((item) => item.type === "image");
    assert(image?.data, `missing ImageContent for ${digest}`);
    const bytes = Buffer.from(image.data, "base64");
    assert(`sha256:${createHash("sha256").update(bytes).digest("hex")}` === digest, `digest mismatch for ${blobId}`);
    screenshots.push({
      digest,
      blobId,
      bytes: bytes.length,
      mimeType: image.mimeType,
      width: result.structuredContent?.width,
      height: result.structuredContent?.height,
      viewedAs: result.structuredContent?.viewedAs,
    });
  }

  const componentCall = await call("resolve_target_components", {
    targetRoot,
    componentIds: [...componentIds].sort(),
    gitBase: fixed.targetBaselineCommit,
    candidateOutputRoot: "lib/features/cold_chain_ops",
  });
  const tokenCall = await call("resolve_target_tokens", {
    targetRoot,
    tokenIds: [...tokenIds].sort(),
    gitBase: fixed.targetBaselineCommit,
    candidateOutputRoot: "lib/features/cold_chain_ops",
  });
  const componentResolution = json(componentCall);
  const tokenResolution = json(tokenCall);

  const receipt = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    fixed,
    runtime: workspace.runtime,
    toolCount: toolNames.length,
    requiredToolsPresent: [
      "read_handoff_index",
      "read_screen_packet",
      "read_case_delta",
      "read_evidence_detail",
      "read_evidence_screenshot",
      "resolve_target_components",
      "resolve_target_tokens",
    ].every((name) => toolNames.includes(name)),
    projections: {
      screenCount: packets.length,
      caseDeltaCount: deltaCount,
      detailPageCount,
      detailItemCount,
      progressiveResponseBytes,
      screens: packets,
    },
    screenshots: {
      distinctDigestCount: screenshots.length,
      totalBytes: screenshots.reduce((sum, item) => sum + item.bytes, 0),
      allImageContent: screenshots.every((item) => item.viewedAs === "mcp-image-content"),
      items: screenshots,
    },
    targetResolution: {
      componentIdCount: componentIds.size,
      tokenIdCount: tokenIds.size,
      componentStatusCounts: countStatuses(componentResolution.resolutions),
      tokenStatusCounts: countStatuses(tokenResolution.resolutions),
      componentResolutions: compactResolutions(componentResolution.resolutions),
      tokenResolutions: compactResolutions(tokenResolution.resolutions),
    },
  };
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    outputPath,
    screenCount: packets.length,
    caseDeltaCount: deltaCount,
    screenshotCount: screenshots.length,
    progressiveResponseBytes,
    componentStatusCounts: receipt.targetResolution.componentStatusCounts,
    tokenStatusCounts: receipt.targetResolution.tokenStatusCounts,
  }, null, 2)}\n`);
} finally {
  await client.close();
}

function call(name, args) {
  return client.request("tools/call", { name, arguments: args });
}

function json(result) {
  assert(result.structuredContent && typeof result.structuredContent === "object", "missing structuredContent");
  return result.structuredContent;
}

function byteLength(result) {
  return Buffer.byteLength(JSON.stringify(result), "utf8");
}

function countStatuses(resolutions = []) {
  return Object.fromEntries(
    [...resolutions.reduce((counts, item) => {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([a], [b]) => a.localeCompare(b)),
  );
}

function compactResolutions(resolutions = []) {
  return resolutions.map((item) => ({
    id: item.id,
    status: item.status,
    reason: item.reason,
    nextQueries: item.nextQueries,
    candidate: item.candidates?.[0]
      ? {
          symbol: item.candidates[0].symbol,
          accessor: item.candidates[0].accessor,
          importPath: item.candidates[0].importPath,
          source: item.candidates[0].source,
        }
      : undefined,
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function startClient() {
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, "packages/mcp-server/dist/index.js"), "--store-root", storeRoot, "--workspace", fixed.workspaceId],
    { cwd: repoRoot, env: process.env, stdio: ["pipe", "pipe", "pipe"] },
  );
  let nextId = 1;
  let stderr = "";
  const pending = new Map();
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) slot.reject(Object.assign(new Error(message.error.message), { data: message.error.data }));
    else slot.resolve(message.result);
  });
  child.once("exit", (code) => {
    for (const slot of pending.values()) slot.reject(new Error(`MCP exited with code ${code}: ${stderr || "no stderr"}`));
    pending.clear();
  });
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
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

#!/usr/bin/env node

/**
 * Phase 5 Treatment progressive consumption audit.
 * Records tool calls / response bytes for fixed Handoff without reading Control outputs.
 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const fixed = {
  handoffId: 'handoff-2026-08-03t100731725-9a0121d7',
  bundleId: 'bundle-2026-08-03t095053078-241d3a74',
  snapshotId: 'snapshot-2026-08-03t095114638-511379f3',
  targetRoot: '/Users/lrq/work/proto-bridge-treatment-2026-08-05-01/apps/flutter_pb_app',
  gitBase: '79780eb6962086affb9af8bcacd8006707517a67',
  // Paths must resolve inside targetRoot (relative or under it).
  excludePaths: [
    'lib/features/cold_chain_ops',
  ],
  candidateOutputRoot: 'lib/features/cold_chain_ops',
};

const calls = [];
const client = await startClient();
try {
  const inspect = await tracked('inspect_evidence_workspace', {});
  const index = await tracked('read_handoff_index', { handoffId: fixed.handoffId });
  const screens = [];
  const componentIds = new Set();
  const tokenIds = new Set();
  for (const screen of index.screens) {
    const packet = await tracked('read_screen_packet', { handoffId: fixed.handoffId, screenId: screen.screenId });
    for (const id of packet.componentIds ?? []) componentIds.add(id);
    for (const id of packet.tokenIds ?? []) tokenIds.add(id);
    const deltas = [];
    for (const caseId of packet.caseMap?.map((item) => item.caseId) ?? screen.caseIds ?? []) {
      if (caseId === packet.baselineCaseId) continue;
      deltas.push(await tracked('read_case_delta', {
        handoffId: fixed.handoffId,
        screenId: screen.screenId,
        caseId,
      }));
    }
    const screenshots = [];
    for (const group of (index.screenshotGroups ?? []).filter((item) => item.screenIds.includes(screen.screenId))) {
      const shot = await tracked('read_evidence_screenshot', {
        bundleId: fixed.bundleId,
        snapshotId: fixed.snapshotId,
        blobId: group.representativeBlobId,
      });
      screenshots.push({
        digest: group.digest,
        blobId: group.representativeBlobId,
        imageReturned: Boolean(shot.content?.some((item) => item.type === 'image')),
        byteLength: Buffer.from(shot.content?.find((item) => item.type === 'image')?.data ?? '', 'base64').byteLength,
      });
    }
    screens.push({
      screenId: screen.screenId,
      baselineCaseId: packet.baselineCaseId,
      caseCount: screen.caseCount,
      componentIds: packet.componentIds ?? [],
      tokenIds: packet.tokenIds ?? [],
      omittedCategories: packet.omittedCategories ?? [],
      deltaCount: deltas.length,
      screenshots,
    });
  }

  const components = await tracked('resolve_target_components', {
    targetRoot: fixed.targetRoot,
    componentIds: [...componentIds].sort(),
    gitBase: fixed.gitBase,
    excludePaths: fixed.excludePaths,
    candidateOutputRoot: fixed.candidateOutputRoot,
  });
  const tokens = await tracked('resolve_target_tokens', {
    targetRoot: fixed.targetRoot,
    tokenIds: [...tokenIds].sort(),
    gitBase: fixed.gitBase,
    excludePaths: fixed.excludePaths,
    candidateOutputRoot: fixed.candidateOutputRoot,
  });

  const responseCharacterCountApprox = calls.reduce((sum, item) => sum + item.responseCharacters, 0);
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    arm: 'treatment-progressive-bootstrap',
    fixed,
    inspect: {
      generation: inspect.workspace?.generation,
      capabilities: inspect.runtime?.capabilities,
      fingerprint: inspect.runtime?.build?.fingerprint,
    },
    metrics: {
      toolCallCount: calls.length,
      responseCharacterCountApprox,
      progressiveToolCalls: calls.filter((item) => [
        'read_handoff_index', 'read_screen_packet', 'read_case_delta', 'read_evidence_detail', 'read_evidence_screenshot',
        'resolve_target_components', 'resolve_target_tokens', 'inspect_evidence_workspace',
      ].includes(item.tool)).length,
    },
    calls,
    screens,
    resolution: {
      componentStatusCounts: countStatuses(components.resolutions ?? components.results ?? components),
      tokenStatusCounts: countStatuses(tokens.resolutions ?? tokens.results ?? tokens),
    },
  };
  await writeFile(path.join(runDir, 'treatment-progressive-bootstrap.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ metrics: output.metrics, screens: screens.map((s) => ({ screenId: s.screenId, caseCount: s.caseCount, screenshotCount: s.screenshots.length })), resolution: output.resolution }, null, 2)}\n`);
} catch (error) {
  console.error(JSON.stringify({ failed: true, calls, error: error?.data ?? { message: error.message } }, null, 2));
  process.exitCode = 1;
} finally {
  await client.close();
}

function countStatuses(batch) {
  const items = Array.isArray(batch) ? batch : (batch?.items ?? batch?.results ?? []);
  const counts = {};
  for (const item of items) {
    const status = item.status ?? item.resolution?.status ?? 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

async function tracked(name, arguments_) {
  const started = Date.now();
  const result = await client.request('tools/call', { name, arguments: arguments_ });
  const encoded = JSON.stringify(result);
  calls.push({
    tool: name,
    args: arguments_,
    ms: Date.now() - started,
    responseCharacters: encoded.length,
    isError: Boolean(result?.isError),
  });
  if (result?.isError) {
    const error = new Error(result.content?.[0]?.text ?? 'tool error');
    error.data = result.structuredContent ?? result.content;
    throw error;
  }
  return result.structuredContent ?? result;
}

async function startClient() {
  const child = spawn('node', [
    path.join(repoRoot, 'packages/mcp-server/dist/index.js'),
    '--store-root', path.join(repoRoot, '.proto-bridge/store'),
    '--workspace', 'pbwork-local',
    '--service-url', 'http://127.0.0.1:3988/api/v2',
    '--service-origin', 'http://127.0.0.1:3977',
  ], { cwd: repoRoot, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextId = 1;
  const pending = new Map();
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message);
      error.data = message.error.data;
      slot.reject(error);
    } else slot.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MCP startup timed out')), 15_000);
    pending.set(nextId, {
      resolve: (result) => { clearTimeout(timer); resolve(result); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: nextId++, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'phase5-treatment-bootstrap', version: '1' } },
    })}\n`);
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    close() {
      lines.close();
      child.stdin.end();
      return new Promise((resolve) => (child.exitCode !== null ? resolve() : child.once('exit', resolve)));
    },
  };
}

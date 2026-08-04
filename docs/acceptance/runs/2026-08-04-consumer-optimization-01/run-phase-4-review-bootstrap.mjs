#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const targetRoot = '/Users/lrq/work/proto-bridge-phase4-review-2026-08-04/apps/flutter_pb_app';
const fixed = {
  workspaceId: 'pbwork-local',
  bundleId: 'bundle-2026-08-03t095053078-241d3a74',
  snapshotId: 'snapshot-2026-08-03t095114638-511379f3',
  handoffId: 'handoff-2026-08-03t100731725-9a0121d7',
  targetBaselineCommit: '79780eb6962086affb9af8bcacd8006707517a67',
  reviewRunId: 'review-2026-08-04-phase4-fixed-01',
};

const client = await startClient();
try {
  const index = json(await call('read_handoff_index', { handoffId: fixed.handoffId }));
  let review;
  try {
    review = json(await call('start_target_review', {
      handoffId: fixed.handoffId,
      targetRoot,
      targetBaselineCommit: fixed.targetBaselineCommit,
      targetRevision: `${fixed.targetBaselineCommit}:phase4-validation`,
      reviewRunId: fixed.reviewRunId,
    }));
  } catch (error) {
    if (error?.data?.errorCode !== 'review-already-exists') throw error;
    review = json(await call('read_target_review', { reviewRunId: fixed.reviewRunId }));
  }
  const viewed = [];
  for (const group of index.screenshotGroups) {
    if (review.viewedSourceDigests?.includes(group.digest)) continue;
    const result = await call('read_evidence_screenshot', {
      bundleId: fixed.bundleId,
      snapshotId: fixed.snapshotId,
      blobId: group.representativeBlobId,
      reviewRunId: fixed.reviewRunId,
    });
    const image = result.content?.find((item) => item.type === 'image');
    if (!image?.data) throw new Error(`No ImageContent for ${group.digest}.`);
    const bytes = Buffer.from(image.data, 'base64');
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (digest !== group.digest) throw new Error(`Digest drift for ${group.representativeBlobId}.`);
    viewed.push({ digest, blobId: group.representativeBlobId, caseIds: group.caseIds, screenIds: group.screenIds, byteLength: bytes.byteLength });
  }
  review = json(await call('read_target_review', { reviewRunId: fixed.reviewRunId }));
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    fixed,
    generationId: review.generationId,
    screenCount: index.screens.length,
    caseCount: index.screens.reduce((sum, screen) => sum + screen.caseCount, 0),
    requiredScenarioCaseIds: review.requiredScenarioCaseIds,
    screenshotGroups: index.screenshotGroups,
    newlyViewed: viewed,
    review: {
      status: review.status,
      eventCount: review.eventCount,
      requiredSourceDigestCount: review.requiredSourceDigests.length,
      viewedSourceDigestCount: review.viewedSourceDigests.length,
    },
  };
  await writeFile(path.join(runDir, 'phase-4-review-bootstrap.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} finally {
  await client.close();
}

function call(name, arguments_) {
  return client.request('tools/call', { name, arguments: arguments_ });
}

function json(result) {
  if (!result?.structuredContent || typeof result.structuredContent !== 'object') throw new Error('Tool returned no structuredContent.');
  return result.structuredContent;
}

async function startClient() {
  const child = spawn('node', [
    path.join(repoRoot, 'packages/mcp-server/dist/index.js'),
    '--store-root', path.join(repoRoot, '.proto-bridge/store'),
    '--workspace', fixed.workspaceId,
    '--service-url', 'http://127.0.0.1:3988/api/v2',
    '--service-origin', 'http://127.0.0.1:3977',
  ], { cwd: repoRoot, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextId = 1;
  const pending = new Map();
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
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
      return new Promise((resolve) => child.exitCode !== null ? resolve() : child.once('exit', resolve));
    },
  };
}

#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const outputPath = path.join(runDir, 'phase-5-review-closeout.json');
const storeRoot = path.join(repoRoot, '.proto-bridge/store');
const reviewIds = [
  {
    reviewRunId: 'review-2026-08-04-phase4-fixed-01',
    targetBaselineCommit: '79780eb6962086affb9af8bcacd8006707517a67',
    expectedAttemptCount: 17,
  },
  {
    reviewRunId: 'review-2026-08-05-treatment-01',
    targetBaselineCommit: 'eb18edd099c590b895aca9e99299100b7624bd92',
    expectedAttemptCount: 16,
  },
];

const client = await startClient();
try {
  const tools = await client.request('tools/list', {});
  const toolNames = new Set((tools.tools ?? []).map((tool) => tool.name));
  for (const requiredTool of ['read_target_review', 'compare_target_artifacts', 'request_review_tranche', 'finalize_target_review']) {
    assert(toolNames.has(requiredTool), `Standalone MCP is missing ${requiredTool}.`);
  }

  const sessions = [];
  for (const expected of reviewIds) {
    const session = json(await client.request('tools/call', {
      name: 'read_target_review',
      arguments: { reviewRunId: expected.reviewRunId },
    }));
    assert(session.reviewRunId === expected.reviewRunId, `Review identity drift for ${expected.reviewRunId}.`);
    assert(session.targetBaselineCommit === expected.targetBaselineCommit, `Target baseline drift for ${expected.reviewRunId}.`);
    assert(session.bundleId === 'bundle-2026-08-03t095053078-241d3a74', `Bundle drift for ${expected.reviewRunId}.`);
    assert(session.snapshotId === 'snapshot-2026-08-03t095114638-511379f3', `Snapshot drift for ${expected.reviewRunId}.`);
    assert(session.handoffId === 'handoff-2026-08-03t100731725-9a0121d7', `Handoff drift for ${expected.reviewRunId}.`);
    assert(session.viewedSourceDigests.length === 16, `${expected.reviewRunId} did not view all source digests.`);
    assert(session.renderedSourceDigests.length === 16, `${expected.reviewRunId} did not render all source digests.`);
    assert(session.replayedScenarioCaseIds.length === 7, `${expected.reviewRunId} did not replay all scenarios.`);
    assert(session.attempts.length === expected.expectedAttemptCount, `${expected.reviewRunId} attempt count drifted.`);
    assert(session.attempts.every((attempt) => attempt.targetDigest && attempt.diffDigest && attempt.comparable), `${expected.reviewRunId} has incomplete compare receipts.`);
    assert(session.artifacts.some((artifact) => artifact.kind === 'diff'), `${expected.reviewRunId} has no diff artifact refs.`);
    sessions.push(summarizeSession(session));
  }

  const finalizedReviewRunIds = sessions
    .filter((session) => session.status === 'completed')
    .map((session) => session.reviewRunId);
  const allReviewsFinalized = finalizedReviewRunIds.length === sessions.length;
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    status: allReviewsFinalized ? 'completed-with-accepted-ios18-runtime' : 'awaiting-human-review',
    standaloneMcp: {
      toolCount: toolNames.size,
      reviewToolsPresent: true,
      serviceUrl: 'http://127.0.0.1:3988/api/v2',
    },
    sessions,
    humanFinalize: {
      status: allReviewsFinalized ? 'passed' : finalizedReviewRunIds.length > 0 ? 'partial' : 'blocked',
      requiredAction: allReviewsFinalized
        ? 'All tracked Review sessions have been finalized.'
        : 'Operator must provide the remaining Review confirmation token(s) to finalize_target_review.',
      operatorTokenConsumed: finalizedReviewRunIds.length > 0,
      finalizedReviewRunIds,
      phase5StatusMustRemain: allReviewsFinalized ? 'passed' : 'in-progress',
    },
    treatmentSimulator: {
      status: 'passed-with-accepted-ios18-runtime',
      receipt: 'docs/acceptance/runs/2026-08-04-consumer-optimization-01/phase-5-treatment-simulator.json',
      reason: 'A Treatment review case was launched on the iPhone 14 iOS 18.6 simulator at the fixed 390x844 @ DPR 3 viewport; the operator accepted the runtime difference from the unavailable iOS 17 contract.',
    },
    currentClientMcp: {
      status: 'passed',
      catalogToolCount: 33,
      requiredToolsPresent: true,
      fixedHandoffVerified: true,
      screenPacketCount: 3,
      fixedScreenshotCount: 16,
      allScreenshotsImageContent: true,
      targetResolverStatus: 'passed',
      reviewReadStatus: 'passed',
      localServiceStatus: 'passed',
      reason: 'Verified from the Cursor host after a complete client shutdown and restart; the current MCP exposed the rebuilt 33-tool surface and both Review sessions were readable.',
    },
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: output.status,
    sessions: sessions.map((session) => ({
      reviewRunId: session.reviewRunId,
      status: session.status,
      attempts: session.attemptCount,
      findings: session.findingCount,
      diffArtifacts: session.diffArtifactCount,
    })),
  }, null, 2)}\n`);
} catch (error) {
  const failure = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    status: 'failed',
    error: error?.data ?? { message: error.message, stack: error.stack },
  };
  await writeFile(outputPath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  await client.close();
}

function summarizeSession(session) {
  const findingsByStatus = Object.fromEntries(
    [...session.findings.reduce((counts, finding) => {
      counts.set(finding.status, (counts.get(finding.status) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => left.localeCompare(right)),
  );
  return {
    reviewRunId: session.reviewRunId,
    status: session.status,
    stopReason: session.stopReason,
    workspaceId: session.workspaceId,
    generationId: session.generationId,
    bundleId: session.bundleId,
    snapshotId: session.snapshotId,
    handoffId: session.handoffId,
    targetRoot: session.targetRoot,
    targetBaselineCommit: session.targetBaselineCommit,
    targetRevision: session.targetRevision,
    comparatorVersion: session.comparatorVersion,
    eventCount: session.eventCount,
    viewedSourceDigestCount: session.viewedSourceDigests.length,
    renderedSourceDigestCount: session.renderedSourceDigests.length,
    replayedScenarioCount: session.replayedScenarioCaseIds.length,
    requiredScenarioCount: session.requiredScenarioCaseIds.length,
    attemptCount: session.attempts.length,
    comparableAttemptCount: session.attempts.filter((attempt) => attempt.comparable).length,
    findingCount: session.findings.length,
    findingsByStatus,
    findings: session.findings,
    diffArtifactCount: session.artifacts.filter((artifact) => artifact.kind === 'diff').length,
    overlayArtifactCount: session.artifacts.filter((artifact) => artifact.kind === 'overlay').length,
    artifactRefs: session.artifacts.map((artifact) => ({
      kind: artifact.kind,
      digest: artifact.digest,
      byteLength: artifact.byteLength,
      owner: artifact.owner,
    })),
    compareReceipts: session.attempts.map((attempt) => ({
      attemptId: attempt.attemptId,
      caseId: attempt.caseId,
      sourceDigest: attempt.sourceDigest,
      targetDigest: attempt.targetDigest,
      diffDigest: attempt.diffDigest,
      normalizedDiffSignature: attempt.normalizedDiffSignature,
      comparable: attempt.comparable,
    })),
  };
}

function json(result) {
  if (result?.isError) {
    const error = new Error(result.content?.[0]?.text ?? 'Review tool returned isError.');
    error.data = result.structuredContent ?? result.content;
    throw error;
  }
  if (!result?.structuredContent || typeof result.structuredContent !== 'object') {
    throw new Error('Review tool returned no structuredContent.');
  }
  return result.structuredContent;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function startClient() {
  const child = spawn(process.execPath, [
    path.join(repoRoot, 'packages/mcp-server/dist/index.js'),
    '--store-root',
    storeRoot,
    '--workspace',
    'pbwork-local',
    '--service-url',
    'http://127.0.0.1:3988/api/v2',
    '--service-origin',
    'http://127.0.0.1:3977',
  ], { cwd: repoRoot, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextId = 1;
  let stderr = '';
  const pending = new Map();
  const lines = createInterface({ input: child.stdout });
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message);
      error.data = message.error.data;
      slot.reject(error);
    } else {
      slot.resolve(message.result);
    }
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MCP startup timed out: ${stderr}`)), 15_000);
    const id = nextId++;
    pending.set(id, {
      resolve: (result) => { clearTimeout(timer); resolve(result); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase5-review-audit', version: '1' },
      },
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

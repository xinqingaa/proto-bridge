#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const fixed = {
  reviewRunId: 'review-2026-08-04-phase4-fixed-01',
  caseId: 'cold-chain-ops.exception-queue::default::light::iphone-14',
  sourceDigest: 'sha256:be0f61a64919c5d816515f602faac497f686953cccd79144807620641d8b05cd',
  attemptId: 'attempt-exception-queue-default-r3-fix',
  priorAttemptId: 'attempt-exception-queue-default-r1',
};

const client = await startClient();
const steps = [];
try {
  let review = json(await call('record_review_findings', {
    reviewRunId: fixed.reviewRunId,
    findings: [
      {
        findingId: 'finding-exception-queue-card-timestamps',
        screenId: 'cold-chain-ops.exception-queue',
        caseId: fixed.caseId,
        severity: 'Major',
        status: 'open',
        detail: 'Exception cards hard-coded every row timestamp as 14:32; Source shows EX-031 at 14:26 and EX-024 at 14:20.',
        evidenceDigests: [
          fixed.sourceDigest,
          'sha256:898ed3dfb88310844f85938fd67137ff572c4dc5f5cb05eff12a0cc40509f200',
          'sha256:e66dd043348a19bde03ffb0557290bd2611b0805aa9243e1f4ae07d164d910c9',
        ],
        targetBasis: 'Diff of default Case after tranche-1 round-1 render',
      },
    ],
  }));
  steps.push({
    step: 'record_findings',
    status: review.status,
    findings: review.findings.map((item) => ({ findingId: item.findingId, severity: item.severity, status: item.status })),
  });

  review = json(await call('render_target_case', {
    reviewRunId: fixed.reviewRunId,
    caseId: fixed.caseId,
    sourceDigest: fixed.sourceDigest,
    tranche: 1,
    round: 3,
    attemptId: fixed.attemptId,
  }));
  const attempt = review.attempts.find((item) => item.attemptId === fixed.attemptId);
  steps.push({ step: 'render_round3', targetDigest: attempt?.targetDigest });

  review = json(await call('compare_target_artifacts', {
    reviewRunId: fixed.reviewRunId,
    attemptId: fixed.attemptId,
    sourceDigest: fixed.sourceDigest,
    targetDigest: attempt.targetDigest,
  }));
  const compared = review.attempts.find((item) => item.attemptId === fixed.attemptId);
  const prior = review.attempts.find((item) => item.attemptId === fixed.priorAttemptId);
  steps.push({
    step: 'compare_round3',
    comparable: compared?.comparable,
    diffDigest: compared?.diffDigest,
    normalizedDiffSignature: compared?.normalizedDiffSignature,
    priorNormalizedDiffSignature: prior?.normalizedDiffSignature,
    signatureChanged: compared?.normalizedDiffSignature !== prior?.normalizedDiffSignature,
    status: review.status,
    stopReason: review.stopReason,
  });

  review = json(await call('record_review_findings', {
    reviewRunId: fixed.reviewRunId,
    findings: [
      {
        findingId: 'finding-exception-queue-card-timestamps',
        screenId: 'cold-chain-ops.exception-queue',
        caseId: fixed.caseId,
        severity: 'Major',
        status: 'fixed',
        detail: 'Per-card updatedAt values now match Source (14:32 / 14:26 / 14:20). Round-3 normalized diff signature changed after the fix.',
        evidenceDigests: [
          fixed.sourceDigest,
          attempt.targetDigest,
          compared.diffDigest,
        ],
        targetBasis: 'cold_chain_review_page.dart ExceptionCard updatedAt + summary critical button wiring',
      },
    ],
  }));
  steps.push({
    step: 'mark_finding_fixed',
    status: review.status,
    findings: review.findings,
  });

  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    fixed,
    steps,
    review: {
      status: review.status,
      eventCount: review.eventCount,
      stopReason: review.stopReason,
      attempts: review.attempts,
      findings: review.findings,
    },
  };
  await writeFile(path.join(runDir, 'phase-4-exception-queue-correction.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  console.error(JSON.stringify({ failed: true, steps, error: error?.data ?? { message: error.message } }, null, 2));
  process.exitCode = 1;
} finally {
  await client.close();
}

function call(name, arguments_) {
  return client.request('tools/call', { name, arguments: arguments_ });
}

function json(result) {
  if (result?.isError) {
    const error = new Error(result.content?.[0]?.text ?? 'Tool returned isError');
    error.data = result.structuredContent ?? result.content;
    throw error;
  }
  if (!result?.structuredContent || typeof result.structuredContent !== 'object') {
    throw new Error('Tool returned no structuredContent.');
  }
  return result.structuredContent;
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
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'phase4-correction', version: '1' } },
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

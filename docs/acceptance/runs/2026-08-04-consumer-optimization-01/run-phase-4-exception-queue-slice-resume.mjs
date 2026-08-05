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
  screenId: 'cold-chain-ops.exception-queue',
  defaultCaseId: 'cold-chain-ops.exception-queue::default::light::iphone-14',
  defaultSourceDigest: 'sha256:be0f61a64919c5d816515f602faac497f686953cccd79144807620641d8b05cd',
  defaultAttemptId: 'attempt-exception-queue-default-r1',
  stateCaseId: 'cold-chain-ops.exception-queue::loading::light::iphone-14',
  stateSourceDigest: 'sha256:48f514c68f73852475945a655a594e5e1306bf46c0b0cab11e11f0098451fc36',
  stateAttemptId: 'attempt-exception-queue-loading-r1',
  scenarioCaseId: 'cold-chain-ops.exception-queue::critical-only::light::iphone-14::scenario=cold-chain-ops.exception-queue.focus-critical@critical-filtered',
};

const client = await startClient();
const steps = [];
try {
  let review = json(await call('read_target_review', { reviewRunId: fixed.reviewRunId }));
  const defaultAttempt = review.attempts.find((item) => item.attemptId === fixed.defaultAttemptId);
  if (!defaultAttempt?.targetDigest) throw new Error('Default render attempt missing; rerun full slice.');

  if (defaultAttempt.diffDigest === undefined) {
    review = json(await call('compare_target_artifacts', {
      reviewRunId: fixed.reviewRunId,
      attemptId: fixed.defaultAttemptId,
      sourceDigest: fixed.defaultSourceDigest,
      targetDigest: defaultAttempt.targetDigest,
    }));
  }
  const comparedDefault = review.attempts.find((item) => item.attemptId === fixed.defaultAttemptId);
  steps.push({
    step: 'compare_default',
    comparable: comparedDefault?.comparable,
    diffDigest: comparedDefault?.diffDigest,
    normalizedDiffSignature: comparedDefault?.normalizedDiffSignature,
    status: review.status,
    stopReason: review.stopReason,
  });

  if (!review.attempts.some((item) => item.attemptId === fixed.stateAttemptId)) {
    review = json(await call('render_target_case', {
      reviewRunId: fixed.reviewRunId,
      caseId: fixed.stateCaseId,
      sourceDigest: fixed.stateSourceDigest,
      tranche: 1,
      round: 2,
      attemptId: fixed.stateAttemptId,
    }));
  }
  const stateAttempt = review.attempts.find((item) => item.attemptId === fixed.stateAttemptId);
  steps.push({ step: 'render_state', targetDigest: stateAttempt?.targetDigest });

  if (stateAttempt && stateAttempt.diffDigest === undefined) {
    review = json(await call('compare_target_artifacts', {
      reviewRunId: fixed.reviewRunId,
      attemptId: fixed.stateAttemptId,
      sourceDigest: fixed.stateSourceDigest,
      targetDigest: stateAttempt.targetDigest,
    }));
  }
  const comparedState = review.attempts.find((item) => item.attemptId === fixed.stateAttemptId);
  steps.push({
    step: 'compare_state',
    comparable: comparedState?.comparable,
    diffDigest: comparedState?.diffDigest,
    status: review.status,
    stopReason: review.stopReason,
  });

  if (!review.replayedScenarioCaseIds.includes(fixed.scenarioCaseId)) {
    review = json(await call('replay_target_scenario', {
      reviewRunId: fixed.reviewRunId,
      caseId: fixed.scenarioCaseId,
    }));
  }
  steps.push({
    step: 'replay_scenario',
    replayedScenarioCaseIds: review.replayedScenarioCaseIds,
  });

  review = json(await call('read_target_review', { reviewRunId: fixed.reviewRunId }));
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    fixed,
    steps,
    review: {
      status: review.status,
      eventCount: review.eventCount,
      stopReason: review.stopReason,
      authorizedTranches: review.authorizedTranches,
      renderedSourceDigests: review.renderedSourceDigests,
      replayedScenarioCaseIds: review.replayedScenarioCaseIds,
      attempts: review.attempts,
      findingCount: review.findings.length,
    },
  };
  await writeFile(path.join(runDir, 'phase-4-exception-queue-slice.json'), `${JSON.stringify(output, null, 2)}\n`);
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
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'phase4-slice-resume', version: '1' } },
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

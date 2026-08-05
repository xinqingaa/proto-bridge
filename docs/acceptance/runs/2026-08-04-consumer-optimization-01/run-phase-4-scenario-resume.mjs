#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const reviewRunId = 'review-2026-08-04-phase4-fixed-01';
const scenarios = [
  'cold-chain-ops.shipment-detail::action-sheet-open::light::iphone-14::scenario=cold-chain-ops.shipment-detail.reveal-response-options@response-sheet-visible',
  'cold-chain-ops.resolution-form::ready-to-submit::light::iphone-14::scenario=cold-chain-ops.shipment-detail.start-resolution@resolution-ready',
  'cold-chain-ops.resolution-form::validation-error::light::iphone-14::scenario=cold-chain-ops.resolution-form.reject-incomplete-resolution@required-fields-visible',
  'cold-chain-ops.resolution-form::approval-validation-error::light::iphone-14::scenario=cold-chain-ops.resolution-form.reject-missing-supervisor-approval@supervisor-required-visible',
  'cold-chain-ops.resolution-form::confirm-dialog-open::light::iphone-14::scenario=cold-chain-ops.resolution-form.confirm-complete-resolution@confirmation-visible',
];

const client = await startClient();
const steps = [];
try {
  let review = json(await call('read_target_review', { reviewRunId }));
  for (const caseId of scenarios) {
    if (review.replayedScenarioCaseIds.includes(caseId)) {
      steps.push({ step: 'skip', caseId });
      continue;
    }
    review = json(await call('replay_target_scenario', { reviewRunId, caseId }));
    steps.push({ step: 'replayed', caseId });
  }
  review = json(await call('read_target_review', { reviewRunId }));
  const missingScenarios = review.requiredScenarioCaseIds.filter(
    (caseId) => !review.replayedScenarioCaseIds.includes(caseId),
  );
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    steps,
    coverage: {
      renderedSourceDigestCount: review.renderedSourceDigests.length,
      requiredSourceDigestCount: review.requiredSourceDigests.length,
      replayedScenarioCount: review.replayedScenarioCaseIds.length,
      requiredScenarioCount: review.requiredScenarioCaseIds.length,
      missingScenarios,
    },
    review: { status: review.status, eventCount: review.eventCount, findings: review.findings },
  };
  await writeFile(path.join(runDir, 'phase-4-scenario-resume.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (missingScenarios.length) process.exitCode = 2;
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
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'phase4-scenarios', version: '1' } },
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

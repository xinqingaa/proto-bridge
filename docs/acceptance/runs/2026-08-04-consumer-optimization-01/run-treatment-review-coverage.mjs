#!/usr/bin/env node

/**
 * Phase 5 Treatment authoritative Review:
 * start session → view all source digests → authorize tranches → render/compare → scenarios.
 */
import { spawn as spawnChild } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const targetRoot = '/Users/lrq/work/proto-bridge-treatment-2026-08-05-01/apps/flutter_pb_app';
const treatmentHead = 'eb18edd099c590b895aca9e99299100b7624bd92';
const reviewRunId = 'review-2026-08-05-treatment-01';
const fixed = {
  workspaceId: 'pbwork-local',
  bundleId: 'bundle-2026-08-03t095053078-241d3a74',
  snapshotId: 'snapshot-2026-08-03t095114638-511379f3',
  handoffId: 'handoff-2026-08-03t100731725-9a0121d7',
  targetBaselineCommit: treatmentHead,
  experimentBaselineCommit: '79780eb6962086affb9af8bcacd8006707517a67',
  reviewRunId,
};

// One representative Case per distinct source digest (16 total).
const renderPlan = [
  {
    screenId: 'cold-chain-ops.exception-queue',
    tranche: 1,
    items: [
      { round: 1, caseId: 'cold-chain-ops.exception-queue::default::light::iphone-14', sourceDigest: 'sha256:be0f61a64919c5d816515f602faac497f686953cccd79144807620641d8b05cd' },
      { round: 2, caseId: 'cold-chain-ops.exception-queue::loading::light::iphone-14', sourceDigest: 'sha256:48f514c68f73852475945a655a594e5e1306bf46c0b0cab11e11f0098451fc36' },
      { round: 3, caseId: 'cold-chain-ops.exception-queue::critical-only::light::iphone-14', sourceDigest: 'sha256:3de0fa853a905167155516e45186a9a34f5e3d8eb899afaa4cbfb0ac67490a26' },
    ],
  },
  {
    screenId: 'cold-chain-ops.exception-queue',
    tranche: 2,
    items: [
      { round: 1, caseId: 'cold-chain-ops.exception-queue::empty::light::iphone-14', sourceDigest: 'sha256:dd41372d7cdce0926c2be8178b435438b00add796536c184b297af58e003ccd0' },
      { round: 2, caseId: 'cold-chain-ops.exception-queue::error::light::iphone-14', sourceDigest: 'sha256:046d0c0c23851252e13e61a34146133b40c63b9e728f58f66149c0a171bd995f' },
    ],
  },
  {
    screenId: 'cold-chain-ops.shipment-detail',
    tranche: 1,
    items: [
      { round: 1, caseId: 'cold-chain-ops.shipment-detail::default::light::iphone-14', sourceDigest: 'sha256:a948335715fa013e7855b1b9a5afaf24e0e866f64e9db0032b42b94c26468493' },
      { round: 2, caseId: 'cold-chain-ops.shipment-detail::active-excursion::light::iphone-14', sourceDigest: 'sha256:53d2837d4b7daf60cbef70632fba079fc638ed7074b6c18d38f71cc07c25c2eb' },
      { round: 3, caseId: 'cold-chain-ops.shipment-detail::sensor-offline::light::iphone-14', sourceDigest: 'sha256:9b12c12d9db2734623ef042650551da1c55fa0636a9221cc6612bea2c325185f' },
    ],
  },
  {
    screenId: 'cold-chain-ops.shipment-detail',
    tranche: 2,
    items: [
      { round: 1, caseId: 'cold-chain-ops.shipment-detail::action-sheet-open::light::iphone-14', sourceDigest: 'sha256:856a487590600361e95c3a94d588cce9eeb17dc07c09fbea997a1c73ad7a5154' },
      { round: 2, caseId: 'cold-chain-ops.shipment-detail::acknowledge-dialog-open::light::iphone-14', sourceDigest: 'sha256:c3d4af22adca71330ba968835b21aa8f75ba77cbab011440c05876df3b3e6757' },
    ],
  },
  {
    screenId: 'cold-chain-ops.resolution-form',
    tranche: 1,
    items: [
      { round: 1, caseId: 'cold-chain-ops.resolution-form::default::light::iphone-14', sourceDigest: 'sha256:f35c6dc6063b22fddecca1434efbaa12d3311c157b35f520285d2e364c38441c' },
      { round: 2, caseId: 'cold-chain-ops.resolution-form::ready-to-submit::light::iphone-14', sourceDigest: 'sha256:74fe26bbfd37940e75bbd4ee0591162185d06c4dc3950fc4c6b205863bffce6f' },
      { round: 3, caseId: 'cold-chain-ops.resolution-form::validation-error::light::iphone-14', sourceDigest: 'sha256:8195915d09401219d9209bd1972d7e0b65464e06a5fbbc5b36f6fe3932627311' },
    ],
  },
  {
    screenId: 'cold-chain-ops.resolution-form',
    tranche: 2,
    items: [
      { round: 1, caseId: 'cold-chain-ops.resolution-form::approval-validation-error::light::iphone-14', sourceDigest: 'sha256:fb952778397b03a506651f84d18222c22d408649ac055240519aef795fb4450d' },
      { round: 2, caseId: 'cold-chain-ops.resolution-form::confirm-dialog-open::light::iphone-14', sourceDigest: 'sha256:080f611562c25c5d718df576e592db254600cb95d7bea0d80a3561a311a8029f' },
      { round: 3, caseId: 'cold-chain-ops.resolution-form::submitted::light::iphone-14', sourceDigest: 'sha256:c99c24a0dd54e8cbfdeaf93d49055ca8893aff6c17769cf0212a09ae9c55e159' },
    ],
  },
];

const scenarios = [
  'cold-chain-ops.exception-queue::critical-only::light::iphone-14::scenario=cold-chain-ops.exception-queue.focus-critical@critical-filtered',
  'cold-chain-ops.shipment-detail::active-excursion::light::iphone-14::scenario=cold-chain-ops.exception-queue.inspect-primary-exception@shipment-opened',
  'cold-chain-ops.shipment-detail::action-sheet-open::light::iphone-14::scenario=cold-chain-ops.shipment-detail.reveal-response-options@response-sheet-visible',
  'cold-chain-ops.resolution-form::ready-to-submit::light::iphone-14::scenario=cold-chain-ops.shipment-detail.start-resolution@resolution-ready',
  'cold-chain-ops.resolution-form::validation-error::light::iphone-14::scenario=cold-chain-ops.resolution-form.reject-incomplete-resolution@required-fields-visible',
  'cold-chain-ops.resolution-form::approval-validation-error::light::iphone-14::scenario=cold-chain-ops.resolution-form.reject-missing-supervisor-approval@supervisor-required-visible',
  'cold-chain-ops.resolution-form::confirm-dialog-open::light::iphone-14::scenario=cold-chain-ops.resolution-form.confirm-complete-resolution@confirmation-visible',
];

const client = await startClient();
const steps = [];
try {
  const index = json(await call('read_handoff_index', { handoffId: fixed.handoffId }));
  let review;
  try {
    review = json(await call('start_target_review', {
      handoffId: fixed.handoffId,
      targetRoot,
      targetBaselineCommit: fixed.targetBaselineCommit,
      targetRevision: `${fixed.targetBaselineCommit}:treatment-2026-08-05`,
      reviewRunId,
    }));
    steps.push({ step: 'start_target_review', status: review.status });
  } catch (error) {
    if (error?.data?.errorCode !== 'review-already-exists') throw error;
    review = json(await call('read_target_review', { reviewRunId }));
    steps.push({ step: 'resume_target_review', status: review.status });
  }

  const viewed = [];
  for (const group of index.screenshotGroups) {
    if (review.viewedSourceDigests?.includes(group.digest)) continue;
    const result = await call('read_evidence_screenshot', {
      bundleId: fixed.bundleId,
      snapshotId: fixed.snapshotId,
      blobId: group.representativeBlobId,
      reviewRunId,
    });
    const image = result.content?.find((item) => item.type === 'image');
    if (!image?.data) throw new Error(`No ImageContent for ${group.digest}.`);
    const bytes = Buffer.from(image.data, 'base64');
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (digest !== group.digest) throw new Error(`Digest drift for ${group.representativeBlobId}.`);
    viewed.push({ digest, byteLength: bytes.byteLength });
  }
  review = json(await call('read_target_review', { reviewRunId }));
  steps.push({
    step: 'view_sources',
    newlyViewed: viewed.length,
    viewedSourceDigestCount: review.viewedSourceDigests.length,
    requiredSourceDigestCount: review.requiredSourceDigests.length,
  });

  for (const group of renderPlan) {
    const authorized = review.authorizedTranches.some(
      (item) => item.screenId === group.screenId && item.tranche === group.tranche,
    );
    if (!authorized) {
      const approval = await approveTranche(group.screenId, group.tranche);
      review = json(await call('request_review_tranche', {
        reviewRunId,
        approvalToken: approval.token,
      }));
      steps.push({ step: 'authorize', screenId: group.screenId, tranche: group.tranche });
    }
    for (const item of group.items) {
      if (review.renderedSourceDigests.includes(item.sourceDigest)) {
        steps.push({ step: 'skip-render', caseId: item.caseId, reason: 'digest-already-rendered' });
        continue;
      }
      const attemptId = `attempt-${slug(item.caseId)}-t${group.tranche}-r${item.round}`;
      review = json(await call('render_target_case', {
        reviewRunId,
        caseId: item.caseId,
        sourceDigest: item.sourceDigest,
        tranche: group.tranche,
        round: item.round,
        attemptId,
      }));
      const attempt = review.attempts.find((entry) => entry.attemptId === attemptId);
      review = json(await call('compare_target_artifacts', {
        reviewRunId,
        attemptId,
        sourceDigest: item.sourceDigest,
        targetDigest: attempt.targetDigest,
      }));
      const compared = review.attempts.find((entry) => entry.attemptId === attemptId);
      steps.push({
        step: 'render-compare',
        caseId: item.caseId,
        targetDigest: attempt.targetDigest,
        comparable: compared?.comparable,
        normalizedDiffSignature: compared?.normalizedDiffSignature,
        status: review.status,
        stopReason: review.stopReason,
      });
    }
  }

  for (const caseId of scenarios) {
    if (review.completedScenarioCaseIds?.includes(caseId)) {
      steps.push({ step: 'skip-scenario', caseId, reason: 'already-completed' });
      continue;
    }
    review = json(await call('replay_target_scenario', { reviewRunId, caseId }));
    steps.push({
      step: 'scenario',
      caseId,
      completedScenarioCount: review.completedScenarioCaseIds?.length,
      status: review.status,
      stopReason: review.stopReason,
    });
  }

  review = json(await call('read_target_review', { reviewRunId }));
  const output = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    arm: 'treatment-authoritative-review',
    fixed,
    steps,
    review: {
      status: review.status,
      stopReason: review.stopReason,
      eventCount: review.eventCount,
      requiredSourceDigestCount: review.requiredSourceDigests.length,
      viewedSourceDigestCount: review.viewedSourceDigests.length,
      renderedSourceDigestCount: review.renderedSourceDigests.length,
      completedScenarioCaseIds: review.completedScenarioCaseIds,
      requiredScenarioCaseIds: review.requiredScenarioCaseIds,
      findings: review.findings,
      authorizedTranches: review.authorizedTranches,
      attemptCount: review.attempts?.length,
      comparableAttemptCount: review.attempts?.filter((item) => item.comparable).length,
    },
  };
  await writeFile(path.join(runDir, 'treatment-review-coverage.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: output.review.status,
    stopReason: output.review.stopReason,
    rendered: output.review.renderedSourceDigestCount,
    required: output.review.requiredSourceDigestCount,
    scenarios: output.review.completedScenarioCaseIds?.length,
    requiredScenarios: output.review.requiredScenarioCaseIds?.length,
    comparable: output.review.comparableAttemptCount,
    attempts: output.review.attemptCount,
  }, null, 2)}\n`);
} catch (error) {
  console.error(JSON.stringify({ failed: true, steps, error: error?.data ?? { message: error.message, stack: error.stack } }, null, 2));
  process.exitCode = 1;
} finally {
  await client.close();
}

function slug(value) {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
}

function approveTranche(screenId, tranche) {
  return new Promise((resolve, reject) => {
    const child = spawnChild('node', [
      path.join(repoRoot, 'packages/cli/dist/index.js'),
      'review', 'approve-tranche',
      '--review', reviewRunId,
      '--screen', screenId,
      '--tranche', String(tranche),
      '--approval-ref', `operator-treatment-${screenId}-tranche-${tranche}`,
      '--json',
    ], { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`approve-tranche failed: ${stderr || stdout}`));
      resolve(JSON.parse(stdout));
    });
  });
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
  const child = spawnChild('node', [
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
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'phase5-treatment-review', version: '1' } },
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

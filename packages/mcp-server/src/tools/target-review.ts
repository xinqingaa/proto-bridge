import { createHash, randomUUID } from 'node:crypto';
import {
  buildHandoffIndex,
  buildScreenPacket,
  V2ContractError,
  type AcceptanceDimension,
} from '@proto-bridge/core/v2';
import {
  compileReconstructionObligations,
  RECONSTRUCTION_OBLIGATION_CONTRACT_VERSION,
  projectReviewObligations,
  projectReviewSession,
  type ReviewFinding,
  type ReviewObligationFilterStatus,
  type ReviewObligationAssessment,
  type ReviewSession,
  type ReviewSessionProjection,
  type ReviewSessionSeed,
} from '@proto-bridge/core/review';
import {
  comparePngArtifacts,
  FLUTTER_COMPARATOR_VERSION,
  renderFlutterTargetCase,
  replayFlutterTargetScenario,
} from '@proto-bridge/core/target/flutter-app/review';
import type { JsonObject, ToolContext } from '../types.js';
import { readNumber, readString } from '../utils/args.js';

export async function recordScreenshotViewedTool(
  context: ToolContext,
  args: JsonObject,
  screenshot: { metadata: JsonObject; data: string; mimeType: string },
): Promise<void> {
  const reviewRunId = readString(args, 'reviewRunId');
  if (!reviewRunId) return;
  const session = await readTargetReviewSession(context, reviewRunId);
  const input = await context.evidence.readConsumerProjectionInput(session.handoffId);
  const index = buildHandoffIndex(input);
  const digest = String(screenshot.metadata.digest);
  const group = index.screenshotGroups.find((item) => item.digest === digest && item.blobIds.includes(required(args, 'blobId')));
  const screenId = group?.screenIds[0];
  if (!group || !screenId || session.bundleId !== required(args, 'bundleId') || session.snapshotId !== required(args, 'snapshotId')) {
    throw new V2ContractError('unknown-reference', 'Screenshot is not reachable from this Review fixed Handoff.');
  }
  const bytes = Buffer.from(screenshot.data, 'base64');
  await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/viewed`, {
    method: 'POST',
    body: {
      screenId, caseIds: group.caseIds,
      artifact: {
        kind: 'source', digest, mimeType: screenshot.mimeType, byteLength: bytes.byteLength,
        ...(typeof screenshot.metadata.width === 'number' ? { width: screenshot.metadata.width } : {}),
        ...(typeof screenshot.metadata.height === 'number' ? { height: screenshot.metadata.height } : {}),
        owner: { screenId },
      },
      bytesBase64: screenshot.data,
    },
  });
}

export async function startTargetReviewTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const handoffId = required(args, 'handoffId');
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  const index = buildHandoffIndex(input);
  const workspace = await context.evidence.workspace();
  const scenarioCaseIds = index.screens.flatMap((screen) => buildScreenPacket(input, screen.screenId).scenarioMap.map((item) => item.caseId));
  const seed: ReviewSessionSeed = {
    reviewRunId: readString(args, 'reviewRunId') ?? `review-${randomUUID()}`,
    workspaceId: index.fixedRefs.workspaceId,
    generationId: workspace.generation,
    bundleId: index.fixedRefs.bundleId,
    snapshotId: index.fixedRefs.snapshotId,
    handoffId,
    targetRoot: required(args, 'targetRoot'),
    targetBaselineCommit: required(args, 'targetBaselineCommit'),
    targetRevision: required(args, 'targetRevision'),
    selectedCaseIds: index.screens.flatMap((screen) => screen.caseIds),
    requiredSourceDigests: index.screenshotGroups.flatMap((group) => group.digest ? [group.digest] : []),
    requiredScenarioCaseIds: [...new Set(scenarioCaseIds)].sort(),
    obligationContractVersion: RECONSTRUCTION_OBLIGATION_CONTRACT_VERSION,
    requiredObligations: compileReconstructionObligations(input.acceptance),
    comparatorVersion: FLUTTER_COMPARATOR_VERSION,
    createdAt: new Date().toISOString(),
  };
  if (seed.requiredSourceDigests.length !== index.screenshotGroups.length) {
    throw new V2ContractError('unknown-reference', 'Authoritative Review cannot start while a selected Screenshot digest is missing.');
  }
  return projectReviewSession(await context.reviews.call('/reviews', { method: 'POST', body: { seed } }));
}

export async function readTargetReviewTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  return projectReviewSession(await readTargetReviewSession(context, required(args, 'reviewRunId')));
}

export async function readReviewObligationsTool(context: ToolContext, args: JsonObject) {
  const reviewRunId = required(args, 'reviewRunId');
  const session = await readTargetReviewSession(context, reviewRunId);
  const dimension = readString(args, 'dimension') as AcceptanceDimension | undefined;
  const status = readString(args, 'status') as ReviewObligationFilterStatus | undefined;
  return projectReviewObligations(session, {
    reviewRunId,
    ...(readString(args, 'screenId') ? { screenId: readString(args, 'screenId')! } : {}),
    ...(dimension ? { dimension } : {}),
    ...(status ? { status } : {}),
    ...(readNumber(args, 'pageSize') !== undefined ? { pageSize: readNumber(args, 'pageSize')! } : {}),
    ...(readString(args, 'cursor') ? { cursor: readString(args, 'cursor')! } : {}),
  });
}

export async function renderTargetCaseTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const reviewRunId = required(args, 'reviewRunId');
  const session = await readTargetReviewSession(context, reviewRunId);
  const caseId = required(args, 'caseId');
  const sourceDigest = required(args, 'sourceDigest');
  const attemptId = readString(args, 'attemptId') ?? `attempt-${randomUUID()}`;
  const receipt = await renderFlutterTargetCase({ targetRoot: session.targetRoot, caseId, attemptId, expectedTargetHead: session.targetBaselineCommit });
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/render`, {
    method: 'POST',
    body: {
      screenId: receipt.artifact.owner.screenId, caseId, sourceDigest,
      tranche: requiredInteger(args, 'tranche'), round: requiredInteger(args, 'round'), attemptId,
      targetRevision: session.targetRevision, receiptTool: 'flutter-review-runner-v1',
      artifact: receipt.artifact, bytesBase64: Buffer.from(receipt.bytes).toString('base64'),
    },
  }));
}

export async function replayTargetScenarioTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const reviewRunId = required(args, 'reviewRunId');
  const session = await readTargetReviewSession(context, reviewRunId);
  const caseId = required(args, 'caseId');
  const receipt = await replayFlutterTargetScenario({ targetRoot: session.targetRoot, caseId, expectedTargetHead: session.targetBaselineCommit });
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/replay`, {
    method: 'POST',
    body: { screenId: receipt.screenId, caseId, scenarioId: receipt.scenarioId, receiptDigest: receipt.receiptDigest, targetRevision: session.targetRevision, receiptTool: 'flutter-review-scenario-v1' },
  }));
}

export async function compareTargetArtifactsTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const reviewRunId = required(args, 'reviewRunId');
  const session = await readTargetReviewSession(context, reviewRunId);
  const sourceDigest = required(args, 'sourceDigest');
  const targetDigest = required(args, 'targetDigest');
  const attemptId = required(args, 'attemptId');
  const attempt = session.attempts.find((item) => item.attemptId === attemptId);
  if (!attempt) throw new V2ContractError('unknown-reference', `Unknown Review attempt ${attemptId}.`);
  const compared = comparePngArtifacts({
    source: await context.reviews.readArtifact(reviewRunId, sourceDigest),
    target: await context.reviews.readArtifact(reviewRunId, targetDigest),
    owner: { screenId: attempt.screenId, caseId: attempt.caseId, attemptId },
  });
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/compare`, {
    method: 'POST',
    body: {
      screenId: attempt.screenId, caseId: attempt.caseId, attemptId, sourceDigest, targetDigest,
      diff: compared.diff ? { artifact: compared.diff.artifact, bytesBase64: Buffer.from(compared.diff.bytes).toString('base64') } : unavailableArtifact(attempt),
      ...(compared.overlay ? { overlay: { artifact: compared.overlay.artifact, bytesBase64: Buffer.from(compared.overlay.bytes).toString('base64') } } : {}),
      comparable: compared.comparable,
      ...(compared.normalizedDiffSignature ? { normalizedDiffSignature: compared.normalizedDiffSignature } : {}),
      ...(compared.reason ? { reason: compared.reason } : {}),
      receiptTool: FLUTTER_COMPARATOR_VERSION,
    },
  }));
}

export async function recordReviewFindingsTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const findings = args.findings;
  if (!Array.isArray(findings)) throw new V2ContractError('invalid-schema', 'findings must be an array.');
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(required(args, 'reviewRunId'))}/findings`, { method: 'POST', body: { actor: 'agent', findings: findings as unknown as ReviewFinding[] } }));
}

export async function recordReviewAssessmentsTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const assessments = args.assessments;
  if (!Array.isArray(assessments)) throw new V2ContractError('invalid-schema', 'assessments must be an array.');
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(required(args, 'reviewRunId'))}/assessments`, {
    method: 'POST',
    body: { assessments: assessments as unknown as ReviewObligationAssessment[] },
  }));
}

export async function requestReviewTrancheTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(required(args, 'reviewRunId'))}/tranches`, { method: 'POST', body: { approvalToken: required(args, 'approvalToken') } }));
}

export async function finalizeTargetReviewTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(required(args, 'reviewRunId'))}/finalize`, { method: 'POST', body: { approvalToken: required(args, 'confirmationToken') } }));
}

function readTargetReviewSession(context: ToolContext, reviewRunId: string): Promise<ReviewSession> {
  return context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}`);
}

function unavailableArtifact(attempt: ReviewSession['attempts'][number]) {
  const bytes = Buffer.from('not-comparable');
  return {
    artifact: { kind: 'diff' as const, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`, mimeType: 'application/octet-stream', byteLength: bytes.byteLength, owner: { screenId: attempt.screenId, caseId: attempt.caseId, attemptId: attempt.attemptId } },
    bytesBase64: bytes.toString('base64'),
  };
}

function required(args: JsonObject, key: string): string {
  const value = readString(args, key);
  if (!value) throw new V2ContractError('invalid-schema', `${key} is required.`);
  return value;
}

function requiredInteger(args: JsonObject, key: string): number {
  const value = readNumber(args, key);
  if (!Number.isInteger(value)) throw new V2ContractError('invalid-schema', `${key} must be an integer.`);
  return value!;
}

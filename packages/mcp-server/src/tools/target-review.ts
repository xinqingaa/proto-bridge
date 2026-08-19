/**
 * @experimental Retained for the deferred Flutter MCP Roadmap. These handlers
 * are intentionally not registered by the default MCP tool registry.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  buildHandoffIndex,
  buildStructureIR,
  V2ContractError,
  type AcceptanceDimension,
} from '@proto-bridge/core/v2';
import {
  RECONSTRUCTION_OBLIGATION_CONTRACT_VERSION,
  projectReviewObligations,
  projectReviewSession,
  selectReviewProfileForConsumer,
  type ReviewCoverageProfile,
  type ReviewFinding,
  type ReviewObligationFilterStatus,
  type ReviewObligationAssessment,
  type ReviewSession,
  type ReviewSessionProjection,
  type ReviewSessionSeed,
} from '@proto-bridge/core/review';
import {
  compareTargetArtifacts,
  detectTargetAdapter,
  FLUTTER_COMPARATOR_VERSION,
  readTargetIdentity,
  verifyTargetClaims,
  type TargetImplementationClaim,
} from '@proto-bridge/core/target';
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
  const targetRoot = required(args, 'targetRoot');
  const requestedProfile = optionalReviewProfile(args, 'requestedProfile');
  const selected = selectReviewProfileForConsumer(input, requestedProfile);
  const selectedSet = new Set(selected.selectedCaseIds);
  const targetIdentity = await readTargetIdentity(targetRoot);
  const targetBaselineCommit = required(args, 'targetBaselineCommit');
  if (targetIdentity.head !== targetBaselineCommit) {
    throw new V2ContractError('invalid-schema', `Target commit drifted before Review start: expected ${targetBaselineCommit}, received ${targetIdentity.head}.`);
  }
  const adapter = await detectTargetAdapter(targetRoot);
  const selectedGroups = index.screenshotGroups.filter((group) => group.caseIds.some((caseId) => selectedSet.has(caseId)));
  const requiredSourceDigests = [...new Set(selectedGroups.flatMap((group) => group.digest ? [group.digest] : []))].sort();
  if (adapter.adapterId === 'flutter') {
    const coveredCases = new Set(selectedGroups.filter((group) => group.digest).flatMap((group) => group.caseIds));
    const missingCases = selected.selectedCaseIds.filter((caseId) => !coveredCases.has(caseId));
    if (missingCases.length > 0) throw new V2ContractError('unknown-reference', `Flutter Runtime Review requires fixed Source Screenshot evidence for selected Cases: ${missingCases.join(', ')}.`);
  }
  const seed: ReviewSessionSeed = {
    reviewRunId: readString(args, 'reviewRunId') ?? `review-${randomUUID()}`,
    workspaceId: index.fixedRefs.workspaceId,
    generationId: workspace.generation,
    bundleId: index.fixedRefs.bundleId,
    snapshotId: index.fixedRefs.snapshotId,
    handoffId,
    targetRoot,
    targetBaselineCommit,
    targetRevision: required(args, 'targetRevision'),
    targetContentDigest: targetIdentity.contentDigest,
    selectedCaseIds: selected.selectedCaseIds,
    requiredSourceDigests,
    requiredScenarioCaseIds: selected.selectedScenarioCaseIds,
    obligationContractVersion: RECONSTRUCTION_OBLIGATION_CONTRACT_VERSION,
    requiredObligations: selected.selectedObligations,
    verificationContractVersion: 1,
    reviewProfile: selected.profile,
    runtimeProvider: adapter.adapterId === 'flutter'
      ? { required: true, providerId: 'dart-flutter-mcp' }
      : { required: false },
    comparatorVersion: FLUTTER_COMPARATOR_VERSION,
    createdAt: new Date().toISOString(),
  };
  if (selectedGroups.some((group) => !group.digest)) {
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
  await readTargetReviewSession(context, reviewRunId);
  const caseId = required(args, 'caseId');
  const sourceDigest = required(args, 'sourceDigest');
  const attemptId = readString(args, 'attemptId') ?? `attempt-${randomUUID()}`;
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/render`, {
    method: 'POST',
    body: {
      caseId, sourceDigest, tranche: requiredInteger(args, 'tranche'), round: requiredInteger(args, 'round'), attemptId,
    },
  }));
}

export async function replayTargetScenarioTool(context: ToolContext, args: JsonObject): Promise<ReviewSessionProjection> {
  const reviewRunId = required(args, 'reviewRunId');
  await readTargetReviewSession(context, reviewRunId);
  const caseId = required(args, 'caseId');
  return projectReviewSession(await context.reviews.call(`/reviews/${encodeURIComponent(reviewRunId)}/replay`, {
    method: 'POST',
    body: { caseId },
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
  const compared = compareTargetArtifacts({
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

export async function verifyTargetClaimsTool(context: ToolContext, args: JsonObject) {
  const reviewRunId = required(args, 'reviewRunId');
  const session = await readTargetReviewSession(context, reviewRunId);
  const claims = parseTargetClaims(args.claims);
  const input = await context.evidence.readConsumerProjectionInput(session.handoffId);
  const expectedStructures = [...new Map(claims.flatMap((claim) => {
    if (claim.dimension !== 'structure') return [];
    const obligation = session.requiredObligations.find((item) => item.obligationId === claim.obligationId);
    if (!obligation || !obligation.caseIds.includes(claim.caseId)) {
      throw new V2ContractError('unknown-reference', `Structure claim ${claim.obligationId} is not applicable to ${claim.caseId}.`);
    }
    return [[`${obligation.screenId}:${claim.caseId}`, {
      screenId: obligation.screenId,
      caseId: claim.caseId,
      structure: buildStructureIR(input, obligation.screenId, claim.caseId),
    }] as const];
  })).values()];
  const receipt = await verifyTargetClaims({
    targetRoot: session.targetRoot,
    expectedTargetHead: session.targetBaselineCommit,
    targetRevision: session.targetRevision,
    obligations: session.requiredObligations,
    claims,
    expectedStructures,
    runtimeStructures: session.runtimeStructureObservations,
    runtimeStates: session.runtimeStateObservations,
    runtimeTransitions: session.runtimeScenarioTransitions,
  });
  const updated = await context.reviews.call<ReviewSession>(`/reviews/${encodeURIComponent(reviewRunId)}/claims`, {
    method: 'POST',
    body: { receipt, receiptTool: receipt.verifierId },
  });
  return { receipt, review: projectReviewSession(updated) };
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

function optionalReviewProfile(args: JsonObject, key: string): ReviewCoverageProfile | undefined {
  const value = readString(args, key);
  if (value === undefined) return undefined;
  if (!['l1-quick', 'l2-focused', 'l3-full'].includes(value)) throw new V2ContractError('invalid-schema', `${key} must be l1-quick, l2-focused, or l3-full.`);
  return value as ReviewCoverageProfile;
}

function parseTargetClaims(value: unknown): TargetImplementationClaim[] {
  if (!Array.isArray(value) || value.length === 0) throw new V2ContractError('invalid-schema', 'claims must be a non-empty array.');
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new V2ContractError('invalid-schema', 'Each Target claim must be an object.');
    const claim = item as Record<string, unknown>;
    if (typeof claim.obligationId !== 'string') throw new V2ContractError('invalid-schema', 'Target claim obligationId is required.');
    if (claim.dimension === 'structure' && typeof claim.caseId === 'string') {
      return { obligationId: claim.obligationId, dimension: 'structure', caseId: claim.caseId };
    }
    if ((claim.dimension === 'states' || claim.dimension === 'interactions') && typeof claim.caseId === 'string') {
      return { obligationId: claim.obligationId, dimension: claim.dimension, caseId: claim.caseId };
    }
    const occurrence = parseOccurrence(claim.occurrence);
    if (claim.dimension === 'components' && typeof claim.symbol === 'string') {
      return {
        obligationId: claim.obligationId,
        dimension: 'components',
        symbol: claim.symbol,
        occurrence,
        ...(typeof claim.ownerSymbol === 'string' ? { ownerSymbol: claim.ownerSymbol } : {}),
        ...(typeof claim.targetSlot === 'string' ? { targetSlot: claim.targetSlot } : {}),
      };
    }
    if (claim.dimension === 'tokens' && typeof claim.accessor === 'string' && typeof claim.ownerSymbol === 'string' && typeof claim.targetSlot === 'string') {
      return { obligationId: claim.obligationId, dimension: 'tokens', accessor: claim.accessor, ownerSymbol: claim.ownerSymbol, targetSlot: claim.targetSlot, occurrence };
    }
    throw new V2ContractError('invalid-schema', `Unsupported or incomplete Target claim ${claim.obligationId}.`);
  });
}

function parseOccurrence(value: unknown): { path: string; line: number; column?: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new V2ContractError('invalid-schema', 'Target claim occurrence is required.');
  const occurrence = value as Record<string, unknown>;
  if (typeof occurrence.path !== 'string' || !Number.isInteger(occurrence.line)) throw new V2ContractError('invalid-schema', 'Target claim occurrence requires path and integer line.');
  return {
    path: occurrence.path,
    line: occurrence.line as number,
    ...(Number.isInteger(occurrence.column) ? { column: occurrence.column as number } : {}),
  };
}

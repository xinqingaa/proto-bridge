import { ACCEPTANCE_DIMENSIONS, type AcceptanceDimension } from '../v2/acceptance-contract.js';
import { sha1Hex } from '../v2/contracts/hash-sha1.js';
import { V2ContractError } from '../v2/contracts/errors.js';
import type {
  ReviewAssessmentStatus,
  ReviewObligationAssessment,
  ReviewSession,
} from './contracts.js';
import type { ReconstructionObligation } from './obligations.js';

export const REVIEW_PROJECTION_VERSION = 1 as const;
export type ReviewObligationFilterStatus = ReviewAssessmentStatus | 'unassessed';

export type ReviewSessionProjection = {
  projectionVersion: typeof REVIEW_PROJECTION_VERSION;
  reviewRunId: string;
  workspaceId: string;
  generationId: ReviewSession['generationId'];
  bundleId: string;
  snapshotId: string;
  handoffId: string;
  targetRevision: string;
  verificationContractVersion: ReviewSession['verificationContractVersion'];
  status: ReviewSession['status'];
  selectedCaseIds: string[];
  requiredSourceDigests: string[];
  requiredScenarioCaseIds: string[];
  viewedSourceDigests: string[];
  renderedSourceDigests: string[];
  replayedScenarioCaseIds: string[];
  authorizedTranches: ReviewSession['authorizedTranches'];
  attempts: ReviewSession['attempts'];
  findings: ReviewSession['findings'];
  obligationSummary: {
    required: number;
    assessed: number;
    unassessed: number;
    byDimension: Record<AcceptanceDimension, { required: number; assessed: number }>;
    byStatus: Record<ReviewObligationFilterStatus, number>;
  };
  obligationQueryHints: Array<{ screenId: string; dimension: AcceptanceDimension }>;
  verifierSummary: {
    receipts: number;
    results: number;
    matched: number;
    deviation: number;
    unverified: number;
  };
  verifierTargetContentDigest?: string;
  stopReason?: string;
  completedAt?: string;
};

export type ReviewObligationProjectionInput = {
  reviewRunId: string;
  screenId?: string;
  dimension?: AcceptanceDimension;
  status?: ReviewObligationFilterStatus;
  pageSize?: number;
  cursor?: string;
};

export type ReviewObligationProjectionItem = {
  obligation: ReconstructionObligation;
  assessment?: ReviewObligationAssessment;
};

export type ReviewObligationProjection = {
  projectionVersion: typeof REVIEW_PROJECTION_VERSION;
  reviewRunId: string;
  snapshotId: string;
  screenId?: string;
  dimension?: AcceptanceDimension;
  status?: ReviewObligationFilterStatus;
  items: ReviewObligationProjectionItem[];
  total: number;
  complete: boolean;
  continuation?: string;
};

type ReviewCursor = {
  version: typeof REVIEW_PROJECTION_VERSION;
  reviewRunId: string;
  snapshotId: string;
  queryDigest: string;
  nextKey: string;
};

export function projectReviewSession(session: ReviewSession): ReviewSessionProjection {
  const assessmentById = new Map(session.obligationAssessments.map((item) => [item.obligationId, item]));
  const byDimension = Object.fromEntries(ACCEPTANCE_DIMENSIONS.map((dimension) => [dimension, {
    required: session.requiredObligations.filter((item) => item.dimension === dimension).length,
    assessed: session.requiredObligations.filter((item) => item.dimension === dimension && assessmentById.has(item.obligationId)).length,
  }])) as ReviewSessionProjection['obligationSummary']['byDimension'];
  const byStatus: ReviewSessionProjection['obligationSummary']['byStatus'] = {
    unassessed: 0,
    matched: 0,
    deviation: 0,
    unverified: 0,
    'not-applicable': 0,
  };
  for (const obligation of session.requiredObligations) {
    const status = assessmentById.get(obligation.obligationId)?.status ?? 'unassessed';
    byStatus[status] += 1;
  }
  const verifierReceipts = session.verifierReceipts ?? [];
  const verifierResults = verifierReceipts.flatMap((item) => item.results);
  return {
    projectionVersion: REVIEW_PROJECTION_VERSION,
    reviewRunId: session.reviewRunId,
    workspaceId: session.workspaceId,
    generationId: session.generationId,
    bundleId: session.bundleId,
    snapshotId: session.snapshotId,
    handoffId: session.handoffId,
    targetRevision: session.targetRevision,
    verificationContractVersion: session.verificationContractVersion ?? 'legacy-unavailable',
    status: session.status,
    selectedCaseIds: [...session.selectedCaseIds],
    requiredSourceDigests: [...session.requiredSourceDigests],
    requiredScenarioCaseIds: [...session.requiredScenarioCaseIds],
    viewedSourceDigests: [...session.viewedSourceDigests],
    renderedSourceDigests: [...session.renderedSourceDigests],
    replayedScenarioCaseIds: [...session.replayedScenarioCaseIds],
    authorizedTranches: session.authorizedTranches.map((item) => ({ ...item })),
    attempts: session.attempts.map((item) => ({ ...item })),
    findings: session.findings.map((item) => ({ ...item, evidenceDigests: [...item.evidenceDigests] })),
    obligationSummary: {
      required: session.requiredObligations.length,
      assessed: session.obligationAssessments.length,
      unassessed: session.requiredObligations.length - session.obligationAssessments.length,
      byDimension,
      byStatus,
    },
    obligationQueryHints: uniqueQueries(session.requiredObligations),
    verifierSummary: {
      receipts: verifierReceipts.length,
      results: verifierResults.length,
      matched: verifierResults.filter((item) => item.status === 'matched').length,
      deviation: verifierResults.filter((item) => item.status === 'deviation').length,
      unverified: verifierResults.filter((item) => item.status === 'unverified').length,
    },
    ...(session.verifierTargetContentDigest ? { verifierTargetContentDigest: session.verifierTargetContentDigest } : {}),
    ...(session.stopReason ? { stopReason: session.stopReason } : {}),
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
  };
}

export function projectReviewObligations(
  session: ReviewSession,
  query: ReviewObligationProjectionInput,
): ReviewObligationProjection {
  if (query.reviewRunId !== session.reviewRunId) throw new V2ContractError('unknown-reference', 'Review obligation query is bound to another Review run.');
  if (query.dimension !== undefined && !ACCEPTANCE_DIMENSIONS.includes(query.dimension)) throw new V2ContractError('unsafe-input', 'Unknown Review obligation dimension.');
  const statuses: ReviewObligationFilterStatus[] = ['unassessed', 'matched', 'deviation', 'unverified', 'not-applicable'];
  if (query.status !== undefined && !statuses.includes(query.status)) throw new V2ContractError('unsafe-input', 'Unknown Review obligation assessment status.');
  if (query.pageSize !== undefined && (!Number.isInteger(query.pageSize) || query.pageSize <= 0 || query.pageSize > 100)) throw new V2ContractError('unsafe-input', 'pageSize must be an integer from 1 through 100.');
  const normalizedQuery = {
    reviewRunId: query.reviewRunId,
    ...(query.screenId ? { screenId: query.screenId } : {}),
    ...(query.dimension ? { dimension: query.dimension } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const queryDigest = sha1Hex(canonical(normalizedQuery));
  const assessmentById = new Map(session.obligationAssessments.map((item) => [item.obligationId, item]));
  const all = session.requiredObligations.filter((item) => {
    const status = assessmentById.get(item.obligationId)?.status ?? 'unassessed';
    return (!query.screenId || item.screenId === query.screenId)
      && (!query.dimension || item.dimension === query.dimension)
      && (!query.status || status === query.status);
  });
  const cursor = query.cursor ? decodeCursor(query.cursor, { reviewRunId: session.reviewRunId, snapshotId: session.snapshotId, queryDigest }) : undefined;
  const start = cursor
    ? (() => {
        const index = all.findIndex((item) => item.obligationId === cursor.nextKey);
        if (index < 0) throw invalidCursor('Review continuation no longer resolves within the fixed query.');
        return index;
      })()
    : 0;
  const pageSize = query.pageSize ?? 50;
  const obligations = all.slice(start, start + pageSize);
  const next = all[start + obligations.length];
  const continuation = next ? encodeCursor({ version: REVIEW_PROJECTION_VERSION, reviewRunId: session.reviewRunId, snapshotId: session.snapshotId, queryDigest, nextKey: next.obligationId }) : undefined;
  return {
    projectionVersion: REVIEW_PROJECTION_VERSION,
    reviewRunId: session.reviewRunId,
    snapshotId: session.snapshotId,
    ...(query.screenId ? { screenId: query.screenId } : {}),
    ...(query.dimension ? { dimension: query.dimension } : {}),
    ...(query.status ? { status: query.status } : {}),
    items: obligations.map((obligation) => ({ obligation, ...(assessmentById.get(obligation.obligationId) ? { assessment: assessmentById.get(obligation.obligationId)! } : {}) })),
    total: all.length,
    complete: continuation === undefined,
    ...(continuation ? { continuation } : {}),
  };
}

function uniqueQueries(obligations: ReconstructionObligation[]): Array<{ screenId: string; dimension: AcceptanceDimension }> {
  return [...new Map(obligations.map((item) => [`${item.screenId}:${item.dimension}`, { screenId: item.screenId, dimension: item.dimension }])).values()]
    .sort((a, b) => a.screenId.localeCompare(b.screenId) || a.dimension.localeCompare(b.dimension));
}

function encodeCursor(payload: ReviewCursor): string {
  const json = canonical(payload);
  return `pbrp1.${sha1Hex(json)}.${encodeURIComponent(json).replaceAll('.', '%2E')}`;
}

function decodeCursor(value: string, expected: Pick<ReviewCursor, 'reviewRunId' | 'snapshotId' | 'queryDigest'>): ReviewCursor {
  const [prefix, checksum, encoded, ...rest] = value.split('.');
  if (prefix !== 'pbrp1' || !checksum || !encoded || rest.length > 0) throw invalidCursor('Review continuation format is invalid.');
  let parsed: unknown;
  try { parsed = JSON.parse(decodeURIComponent(encoded)); } catch { throw invalidCursor('Review continuation payload is invalid.'); }
  if (sha1Hex(canonical(parsed)) !== checksum) throw invalidCursor('Review continuation checksum is invalid.');
  const payload = parsed as Partial<ReviewCursor>;
  if (payload.version !== REVIEW_PROJECTION_VERSION || typeof payload.reviewRunId !== 'string' || typeof payload.snapshotId !== 'string' || typeof payload.queryDigest !== 'string' || typeof payload.nextKey !== 'string') throw invalidCursor('Review continuation fields are invalid.');
  if (payload.reviewRunId !== expected.reviewRunId || payload.snapshotId !== expected.snapshotId || payload.queryDigest !== expected.queryDigest) throw invalidCursor('Review continuation is bound to another fixed query.');
  return payload as ReviewCursor;
}

function invalidCursor(message: string): V2ContractError {
  return new V2ContractError('invalid-continuation', message);
}

function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  return value;
}

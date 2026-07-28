import type { ActiveSlot, BundleSnapshot, LatestAttemptRef } from '../contracts/snapshot.js';
import { findActiveSlot, findLatestAttemptRef } from '../contracts/snapshot.js';
import type { AttemptId, CaseEvidenceRevisionId, CaseId, ScopeKey } from '../contracts/ids.js';
import type { NormalizedCaptureScope } from '../contracts/scope.js';
import { computeScopeKey, isFullCaseScope, scopeCovers } from '../contracts/scope.js';
import type { AttemptResult } from '../contracts/vocabulary.js';

export type ActiveRefResolution =
  | { outcome: 'exact'; slot: ActiveSlot }
  | { outcome: 'primary'; slot: ActiveSlot }
  | { outcome: 'covering'; slot: ActiveSlot }
  | { outcome: 'ambiguous'; candidates: ActiveSlot[] }
  | { outcome: 'missing' };

export type ResolveActiveRefInput = {
  snapshot: Pick<BundleSnapshot, 'activeSlots'>;
  caseId: CaseId;
  requestedScope: NormalizedCaptureScope;
  /** Looks up the actual captured NormalizedCaptureScope behind a revision id, e.g. from Store or fixtures. */
  revisionScopeOf: (revisionId: CaseEvidenceRevisionId) => NormalizedCaptureScope;
};

/**
 * Implements the exact -> primary -> minimal-covering -> ambiguity order
 * from pb-v2-spec.md "Capture Scope 与 active ref 解析". PBWork, CLI, MCP
 * and Handoff creation must all call this single resolver; none of them may
 * reimplement exact/primary/covering selection or fall back to "latest".
 */
export function resolveActiveRef(input: ResolveActiveRefInput): ActiveRefResolution {
  const { snapshot, caseId, requestedScope, revisionScopeOf } = input;
  const requestedIsFull = isFullCaseScope(requestedScope);
  const requestedScopeKey = computeScopeKey(requestedScope);

  if (!requestedIsFull) {
    const exact = findActiveSlot(snapshot, caseId, { kind: 'scoped', scopeKey: requestedScopeKey });
    if (exact) return { outcome: 'exact', slot: exact };
  }

  const primary = findActiveSlot(snapshot, caseId, { kind: 'primary' });
  if (primary && scopeCovers(revisionScopeOf(primary.revisionId), requestedScope)) {
    return { outcome: 'primary', slot: primary };
  }

  const scopedCandidates = snapshot.activeSlots.filter(
    (slot) => slot.caseId === caseId && slot.kind === 'scoped' && slot.scopeKey !== requestedScopeKey,
  );
  const covering = scopedCandidates.filter((slot) => scopeCovers(revisionScopeOf(slot.revisionId), requestedScope));
  if (covering.length === 0) return { outcome: 'missing' };

  const minimal = covering.filter((candidate) => {
    const candidateScope = revisionScopeOf(candidate.revisionId);
    return !covering.some((other) => {
      if (other === candidate) return false;
      const otherScope = revisionScopeOf(other.revisionId);
      const otherIsStrictSubset = scopeCovers(candidateScope, otherScope) && !scopeCovers(otherScope, candidateScope);
      return otherIsStrictSubset;
    });
  });

  if (minimal.length === 1) return { outcome: 'covering', slot: minimal[0] as ActiveSlot };
  return { outcome: 'ambiguous', candidates: minimal.length > 0 ? minimal : covering };
}

/**
 * Relevant latest Attempt prefers the Attempt for the requested `scopeKey`
 * itself; only falls back to the resolved active slot's own scope when no
 * Attempt exists for the exact request.
 */
export function resolveRelevantAttempt(input: {
  snapshot: Pick<BundleSnapshot, 'latestAttempts'>;
  caseId: CaseId;
  requestedScopeKey: ScopeKey;
  resolvedSlot?: ActiveSlot | undefined;
}): LatestAttemptRef | undefined {
  const exact = findLatestAttemptRef(input.snapshot, input.caseId, input.requestedScopeKey);
  if (exact) return exact;
  if (!input.resolvedSlot) return undefined;
  return findLatestAttemptRef(input.snapshot, input.caseId, input.resolvedSlot.scopeKey);
}

export type CaseEvidenceResolution = {
  activeRef: ActiveRefResolution;
  relevantAttempt: LatestAttemptRef | undefined;
  /**
   * `true` only when an active revision was found for the request AND its
   * relevant Attempt is `captured`/`reused`. A resolved `primary`/`covering`
   * active ref alone is not enough: an exact-scope failed retry must make
   * this `false` even though a wider active revision still exists
   * (pb-v2-spec.md "因此，失败的 Fragment retry 会使该 Fragment Handoff 为
   * partial，但不会清除 full Case primary").
   */
  isComplete: boolean;
};

/**
 * Combines active-ref resolution with relevant-Attempt resolution into the
 * single per-request signal Coverage/Handoff computation must use. Callers
 * must not compute `coverageStatus` from the active ref alone: an exact
 * scoped Attempt can fail while a wider `primary` active ref still exists.
 */
export function resolveCaseEvidence(
  input: ResolveActiveRefInput & {
    snapshotAttempts: Pick<BundleSnapshot, 'latestAttempts'>;
    /** Looks up the recorded outcome (`captured`/`reused`/`failed`/...) of an Attempt id. */
    attemptResultOf: (attemptId: AttemptId) => AttemptResult;
  },
): CaseEvidenceResolution {
  const activeRef = resolveActiveRef(input);
  const requestedScopeKey = computeScopeKey(input.requestedScope);
  const resolvedSlot = 'slot' in activeRef ? activeRef.slot : undefined;
  const relevantAttempt = resolveRelevantAttempt({
    snapshot: input.snapshotAttempts,
    caseId: input.caseId,
    requestedScopeKey,
    resolvedSlot,
  });
  const hasActiveRef = activeRef.outcome === 'exact' || activeRef.outcome === 'primary' || activeRef.outcome === 'covering';
  const attemptIsSuccessful =
    relevantAttempt !== undefined && ['captured', 'reused'].includes(input.attemptResultOf(relevantAttempt.attemptId));
  return { activeRef, relevantAttempt, isComplete: hasActiveRef && attemptIsSuccessful };
}

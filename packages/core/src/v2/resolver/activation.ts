import type { CaseEvidenceRevisionId, CaseId, ScopeKey } from '../contracts/ids.js';
import type { NormalizedCaptureScope } from '../contracts/scope.js';
import { computeScopeKey, isFullCaseScope } from '../contracts/scope.js';
import type { ActiveSlot } from '../contracts/snapshot.js';
import { AttemptResult, EvidenceLevel, evidenceLevelRank } from '../contracts/vocabulary.js';
import { V2ContractError } from '../contracts/errors.js';

export type ActivationCandidate = {
  revisionId: CaseEvidenceRevisionId;
  captureScope: NormalizedCaptureScope;
  evidenceLevel: EvidenceLevel;
  /** `evidenceQualityScore()` or an equivalent required-fact/provenance quality measure. */
  qualityScore: number;
  inputDigest: string;
};

export type ExistingActiveRevision = ActivationCandidate;

export type ActivationDecision =
  | { action: 'promote-primary'; slot: ActiveSlot }
  | { action: 'promote-scoped'; slot: ActiveSlot }
  | { action: 'reuse-existing'; revisionId: CaseEvidenceRevisionId }
  | { action: 'store-only'; error: V2ContractError };

function dominance(candidate: ActivationCandidate, existing: ExistingActiveRevision): 'reuse' | 'promote' | 'reject' {
  const sameInput = candidate.inputDigest === existing.inputDigest;
  const sameLevel = candidate.evidenceLevel === existing.evidenceLevel;
  const sameQuality = candidate.qualityScore === existing.qualityScore;
  if (sameInput && sameLevel && sameQuality) return 'reuse';

  const levelNotLower = evidenceLevelRank(candidate.evidenceLevel) >= evidenceLevelRank(existing.evidenceLevel);
  const qualityNotLower = candidate.qualityScore >= existing.qualityScore;
  const improves = evidenceLevelRank(candidate.evidenceLevel) > evidenceLevelRank(existing.evidenceLevel) || candidate.qualityScore > existing.qualityScore;
  if (levelNotLower && qualityNotLower && improves) return 'promote';
  return 'reject';
}

/**
 * Conservative Phase 1/2 dominance strategy from pb-v2-implementation-guide.md
 * "Evidence 激活": a candidate can only ever become/replace the `primary`
 * slot when it covers the full Case Scope; narrower (e.g. Fragment-only)
 * candidates can only ever create or refresh their own `scoped` slot, no
 * matter how high their Evidence Level is. Within either slot, the new
 * revision must not shrink scope, lower Evidence Level, or lower quality,
 * and must improve at least one dimension unless it is a pure re-run of an
 * identical input (which reuses the existing revision instead).
 */
export function decideActivation(input: {
  caseId: CaseId;
  existingPrimary?: ExistingActiveRevision | undefined;
  existingScoped?: ExistingActiveRevision | undefined;
  candidate: ActivationCandidate;
}): ActivationDecision {
  const { caseId, existingPrimary, existingScoped, candidate } = input;
  const candidateScopeKey = computeScopeKey(candidate.captureScope);

  if (isFullCaseScope(candidate.captureScope)) {
    if (!existingPrimary) {
      return { action: 'promote-primary', slot: { caseId, kind: 'primary', scopeKey: candidateScopeKey, revisionId: candidate.revisionId } };
    }
    const verdict = dominance(candidate, existingPrimary);
    if (verdict === 'reuse') return { action: 'reuse-existing', revisionId: existingPrimary.revisionId };
    if (verdict === 'promote') {
      return { action: 'promote-primary', slot: { caseId, kind: 'primary', scopeKey: candidateScopeKey, revisionId: candidate.revisionId } };
    }
    return {
      action: 'store-only',
      error: new V2ContractError(
        'downgrade-rejected',
        `candidate revision ${candidate.revisionId} would downgrade the primary active revision for case ${caseId}; storing without activation`,
      ),
    };
  }

  // Fragment-only / narrower-scope candidates may only ever affect their own scoped slot, never `primary`.
  if (!existingScoped) {
    return { action: 'promote-scoped', slot: { caseId, kind: 'scoped', scopeKey: candidateScopeKey, revisionId: candidate.revisionId } };
  }
  const verdict = dominance(candidate, existingScoped);
  if (verdict === 'reuse') return { action: 'reuse-existing', revisionId: existingScoped.revisionId };
  if (verdict === 'promote') {
    return { action: 'promote-scoped', slot: { caseId, kind: 'scoped', scopeKey: candidateScopeKey, revisionId: candidate.revisionId } };
  }
  return {
    action: 'store-only',
    error: new V2ContractError(
      'downgrade-rejected',
      `candidate revision ${candidate.revisionId} would downgrade the scoped active revision ${candidateScopeKey} for case ${caseId}; storing without activation`,
    ),
  };
}

export type CaseActiveState = {
  primary?: ExistingActiveRevision | undefined;
  /** Keyed by `scopeKey`. */
  scoped: Map<ScopeKey, ExistingActiveRevision>;
};

export type ApplyAttemptResult = {
  nextState: CaseActiveState;
  decision?: ActivationDecision | undefined;
};

/**
 * Only a `captured` Attempt can ever change active revisions. `reused`
 * reaffirms without mutation, and `failed`/`skipped`/`unsupported`/
 * `cancelled`/`interrupted` must leave `nextState` referentially untouched:
 * a failed retry must never clear a Case's last successful active Evidence
 * (pb-v2-spec.md "Run、Attempt、Revision 与 Snapshot").
 */
export function applyAttemptToActiveRevisions(input: {
  caseId: CaseId;
  state: CaseActiveState;
  attemptResult: AttemptResult;
  candidate?: ActivationCandidate | undefined;
}): ApplyAttemptResult {
  if (input.attemptResult !== 'captured') {
    return { nextState: input.state };
  }
  const candidate = input.candidate;
  if (!candidate) throw new Error("a 'captured' attempt must supply the resulting candidate revision");

  const decision = decideActivation({
    caseId: input.caseId,
    existingPrimary: input.state.primary,
    existingScoped: isFullCaseScope(candidate.captureScope)
      ? undefined
      : input.state.scoped.get(computeScopeKey(candidate.captureScope)),
    candidate,
  });

  const nextState: CaseActiveState = { primary: input.state.primary, scoped: new Map(input.state.scoped) };
  if (decision.action === 'promote-primary') nextState.primary = candidate;
  if (decision.action === 'promote-scoped') nextState.scoped.set(computeScopeKey(candidate.captureScope), candidate);
  return { nextState, decision };
}
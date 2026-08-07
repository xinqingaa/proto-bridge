import type { CaseAttempt } from '../../contracts/attempt.js';
import type { ActivationCandidate, CaseActiveState } from '../../resolver/activation.js';
import type { AttemptId, CaseEvidenceRevisionId } from '../../contracts/ids.js';
import type { CaptureScopeInput, NormalizedCaptureScope } from '../../contracts/scope.js';
import { computeScopeKey, normalizeCaptureScope } from '../../contracts/scope.js';
import type { ActiveSlot, BundleSnapshot, LatestAttemptRef } from '../../contracts/snapshot.js';
import type { AttemptResult } from '../../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../../contracts/version.js';
import { FULL_CASE_SCOPE, FULL_CASE_SCOPE_KEY, LIST_FRAGMENT_SCOPE, LIST_FRAGMENT_SCOPE_KEY, T2, TASK_LIST_CASE_ID, TASK_LIST_LIST_FRAGMENT } from './shared.js';
import { ATTEMPT_1_ID, FRAGMENT_REVISION_ID, PRIMARY_REVISION_ID, RUN_1_ID, SNAPSHOT } from './valid.js';

/**
 * Resolver-behaviour negative fixtures from pb-v2-implementation-guide.md
 * "第一批可直接开工的任务" §4. These are structurally *valid* objects: the
 * point is that the resolver must reach the safe outcome even though a
 * naive "pick the newest thing" implementation would not.
 */

// #4 -- multiple active revisions exist for one Case; a request for the
// full Case Scope must resolve to `primary`, never to the Fragment-scoped
// revision just because it has a later capturedAt/Attempt.
export function buildLatestFallbackTrap(): {
  snapshot: Pick<BundleSnapshot, 'activeSlots'>;
  revisionScopeOf: (revisionId: CaseEvidenceRevisionId) => NormalizedCaptureScope;
  requestedScope: NormalizedCaptureScope;
  correctRevisionId: CaseEvidenceRevisionId;
  wrongRevisionIdIfPickedByRecency: CaseEvidenceRevisionId;
} {
  return {
    snapshot: SNAPSHOT,
    revisionScopeOf: (revisionId) => (revisionId === PRIMARY_REVISION_ID ? FULL_CASE_SCOPE : LIST_FRAGMENT_SCOPE),
    requestedScope: FULL_CASE_SCOPE,
    correctRevisionId: PRIMARY_REVISION_ID,
    // The Fragment-scoped revision was captured later (Run 2, T2 > T1); a
    // "most recent wins" implementation would wrongly return this one.
    wrongRevisionIdIfPickedByRecency: FRAGMENT_REVISION_ID,
  };
}

// #5 -- the exact Fragment Attempt fails; Coverage for that exact Fragment
// scope must be `partial` even though the wider `primary` active revision
// (from an earlier, successful Run) still resolves and stays intact.
const FAILED_RETRY_ATTEMPT_ID = 'attempt-run-2026-07-28t1100-fragment-retry-failed';
const FAILED_RETRY_RUN_ID = 'run-2026-07-28t1100';

export const FAILED_FRAGMENT_RETRY_ATTEMPT: CaseAttempt = {
  schemaVersion: V2_SCHEMA_MAJOR,
  attemptId: FAILED_RETRY_ATTEMPT_ID,
  runId: FAILED_RETRY_RUN_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: LIST_FRAGMENT_SCOPE,
  scopeKey: LIST_FRAGMENT_SCOPE_KEY,
  result: 'failed',
  reason: 'Runtime timed out waiting for the list Fragment to stabilize.',
  startedAt: T2,
  endedAt: T2,
};

export function buildExactFragmentAttemptFailedScenario(): {
  snapshot: Pick<BundleSnapshot, 'activeSlots' | 'latestAttempts'>;
  revisionScopeOf: (revisionId: CaseEvidenceRevisionId) => NormalizedCaptureScope;
  attemptResultOf: (attemptId: AttemptId) => AttemptResult;
  requestedScope: NormalizedCaptureScope;
} {
  const activeSlots: ActiveSlot[] = [{ caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID }];
  const latestAttempts: LatestAttemptRef[] = [
    { caseId: TASK_LIST_CASE_ID, scopeKey: FULL_CASE_SCOPE_KEY, attemptId: ATTEMPT_1_ID, runId: RUN_1_ID },
    { caseId: TASK_LIST_CASE_ID, scopeKey: LIST_FRAGMENT_SCOPE_KEY, attemptId: FAILED_RETRY_ATTEMPT_ID, runId: FAILED_RETRY_RUN_ID },
  ];
  return {
    snapshot: { activeSlots, latestAttempts },
    revisionScopeOf: (revisionId) => {
      if (revisionId === PRIMARY_REVISION_ID) return FULL_CASE_SCOPE;
      throw new Error(`no active revision expected for ${revisionId} in this scenario`);
    },
    attemptResultOf: (attemptId) => {
      if (attemptId === ATTEMPT_1_ID) return 'captured';
      if (attemptId === FAILED_RETRY_ATTEMPT_ID) return 'failed';
      throw new Error(`unknown attemptId: ${attemptId}`);
    },
    requestedScope: LIST_FRAGMENT_SCOPE,
  };
}

// #6 -- two scoped active revisions cover the same narrower request but
// neither is a subset of the other; resolution must report ambiguity
// instead of picking one by capture time.
const SCOPE_A_INPUT: CaptureScopeInput = {
  fragments: [TASK_LIST_LIST_FRAGMENT],
  screenshots: { mode: 'all' },
  sourcePolicy: false,
  debugPolicy: false,
  evidenceInputMode: 'instrumented',
  minEvidenceLevel: 'instrumented-runtime',
};
const SCOPE_B_INPUT: CaptureScopeInput = {
  fragments: [TASK_LIST_LIST_FRAGMENT],
  screenshots: { mode: 'none' },
  sourcePolicy: true,
  debugPolicy: false,
  evidenceInputMode: 'instrumented',
  minEvidenceLevel: 'instrumented-runtime',
};
const REQUEST_INPUT: CaptureScopeInput = {
  fragments: [TASK_LIST_LIST_FRAGMENT],
  screenshots: { mode: 'none' },
  sourcePolicy: false,
  debugPolicy: false,
  evidenceInputMode: 'instrumented',
  minEvidenceLevel: 'instrumented-runtime',
};

export const AMBIGUOUS_SCOPE_A = normalizeCaptureScope(SCOPE_A_INPUT);
export const AMBIGUOUS_SCOPE_B = normalizeCaptureScope(SCOPE_B_INPUT);
export const AMBIGUOUS_REQUEST_SCOPE = normalizeCaptureScope(REQUEST_INPUT);
const AMBIGUOUS_REVISION_A_ID = 'task-list-default-list-scope-a-rev1';
const AMBIGUOUS_REVISION_B_ID = 'task-list-default-list-scope-b-rev1';

export function buildAmbiguousCoveringScopeScenario(): {
  snapshot: Pick<BundleSnapshot, 'activeSlots'>;
  revisionScopeOf: (revisionId: CaseEvidenceRevisionId) => NormalizedCaptureScope;
  requestedScope: NormalizedCaptureScope;
  candidateRevisionIds: CaseEvidenceRevisionId[];
} {
  const activeSlots: ActiveSlot[] = [
    { caseId: TASK_LIST_CASE_ID, kind: 'scoped', scopeKey: computeScopeKey(AMBIGUOUS_SCOPE_A), revisionId: AMBIGUOUS_REVISION_A_ID },
    // Captured strictly later than A, to prove the resolver does not break the tie by recency.
    { caseId: TASK_LIST_CASE_ID, kind: 'scoped', scopeKey: computeScopeKey(AMBIGUOUS_SCOPE_B), revisionId: AMBIGUOUS_REVISION_B_ID },
  ];
  return {
    snapshot: { activeSlots },
    revisionScopeOf: (revisionId) => {
      if (revisionId === AMBIGUOUS_REVISION_A_ID) return AMBIGUOUS_SCOPE_A;
      if (revisionId === AMBIGUOUS_REVISION_B_ID) return AMBIGUOUS_SCOPE_B;
      throw new Error(`unknown revisionId: ${revisionId}`);
    },
    requestedScope: AMBIGUOUS_REQUEST_SCOPE,
    candidateRevisionIds: [AMBIGUOUS_REVISION_A_ID, AMBIGUOUS_REVISION_B_ID],
  };
}

// #7 -- a failed Attempt must never clear the Case's existing active
// successful Evidence.
export function buildFailedAttemptClearsActiveScenario(): {
  existingState: CaseActiveState;
  attemptResult: AttemptResult;
} {
  const existingPrimary: ActivationCandidate = {
    revisionId: PRIMARY_REVISION_ID,
    captureScope: FULL_CASE_SCOPE,
    evidenceLevel: 'instrumented-source-runtime',
    qualityScore: 1,
    inputDigest: 'registry-rev-2026-07-28',
  };
  return {
    existingState: { primary: existingPrimary, scoped: new Map() },
    attemptResult: 'failed',
  };
}

// #8 -- a higher-Evidence-Level but Fragment-only revision must never
// replace the full Case Scope `primary` active revision.
export function buildFragmentOnlyCannotReplacePrimaryScenario(): {
  existingPrimary: ActivationCandidate;
  higherLevelFragmentCandidate: ActivationCandidate;
} {
  const existingPrimary: ActivationCandidate = {
    revisionId: 'task-list-default-primary-lower-level-rev1',
    captureScope: FULL_CASE_SCOPE,
    evidenceLevel: 'instrumented-runtime',
    qualityScore: 0.8,
    inputDigest: 'registry-rev-2026-07-28',
  };
  const higherLevelFragmentCandidate: ActivationCandidate = {
    revisionId: 'task-list-default-list-fragment-higher-level-rev1',
    captureScope: LIST_FRAGMENT_SCOPE,
    evidenceLevel: 'instrumented-source-runtime',
    qualityScore: 1,
    inputDigest: 'registry-rev-2026-07-28',
  };
  return { existingPrimary, higherLevelFragmentCandidate };
}

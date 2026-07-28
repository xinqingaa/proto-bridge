import { describe, expect, it } from 'vitest';
import { fixtures, resolveActiveRef, resolveCaseEvidence, resolveRelevantAttempt } from '../../src/v2/index.js';

const f = fixtures.ledgerPlanetTaskList;

describe('resolveActiveRef: baseline exact / primary / covering / missing', () => {
  it('resolves the full Case request to the primary active slot', () => {
    const result = resolveActiveRef({
      snapshot: f.SNAPSHOT,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: f.FULL_CASE_SCOPE,
      revisionScopeOf: f.revisionScopeOf,
    });
    expect(result).toMatchObject({ outcome: 'primary', slot: { revisionId: f.PRIMARY_REVISION_ID } });
  });

  it('resolves an exact Fragment scope request to its own scoped slot, not primary', () => {
    const result = resolveActiveRef({
      snapshot: f.SNAPSHOT,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: f.LIST_FRAGMENT_SCOPE,
      revisionScopeOf: f.revisionScopeOf,
    });
    expect(result).toMatchObject({ outcome: 'exact', slot: { revisionId: f.FRAGMENT_REVISION_ID } });
  });

  it('reports missing when no active slot exists for the Case at all', () => {
    const result = resolveActiveRef({
      snapshot: { activeSlots: [] },
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: f.FULL_CASE_SCOPE,
      revisionScopeOf: f.revisionScopeOf,
    });
    expect(result).toEqual({ outcome: 'missing' });
  });
});

describe('resolveRelevantAttempt', () => {
  it('prefers the Attempt recorded for the exact requested scopeKey', () => {
    const ref = resolveRelevantAttempt({
      snapshot: f.SNAPSHOT,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScopeKey: f.LIST_FRAGMENT_SCOPE_KEY,
    });
    expect(ref?.attemptId).toBe(f.ATTEMPT_2_ID);
  });

  it('falls back to the resolved active slot scope only when no exact-scope Attempt exists', () => {
    const ref = resolveRelevantAttempt({
      snapshot: { latestAttempts: [{ caseId: f.TASK_LIST_CASE_ID, scopeKey: f.FULL_CASE_SCOPE_KEY, attemptId: f.ATTEMPT_1_ID, runId: f.RUN_1_ID }] },
      caseId: f.TASK_LIST_CASE_ID,
      requestedScopeKey: 'scope_ffffffffffffffff',
      resolvedSlot: { caseId: f.TASK_LIST_CASE_ID, kind: 'primary', scopeKey: f.FULL_CASE_SCOPE_KEY, revisionId: f.PRIMARY_REVISION_ID },
    });
    expect(ref?.attemptId).toBe(f.ATTEMPT_1_ID);
  });
});

describe('negative fixture #4: must not fall back to "most recent" instead of primary/exact/covering resolution', () => {
  it('a full Case request resolves to primary even though a narrower revision was captured later', () => {
    const trap = f.buildLatestFallbackTrap();
    const result = resolveActiveRef({
      snapshot: trap.snapshot,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: trap.requestedScope,
      revisionScopeOf: trap.revisionScopeOf,
    });
    expect(result).toMatchObject({ outcome: 'primary', slot: { revisionId: trap.correctRevisionId } });
    if ('slot' in result) {
      expect(result.slot.revisionId).not.toBe(trap.wrongRevisionIdIfPickedByRecency);
    }
  });
});

describe('negative fixture #5: an exact Fragment Attempt failure must not be masked by a wider complete primary', () => {
  it('resolveCaseEvidence reports isComplete=false for the failed exact Fragment scope', () => {
    const scenario = f.buildExactFragmentAttemptFailedScenario();
    const resolution = resolveCaseEvidence({
      snapshot: scenario.snapshot,
      snapshotAttempts: scenario.snapshot,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: scenario.requestedScope,
      revisionScopeOf: scenario.revisionScopeOf,
      attemptResultOf: scenario.attemptResultOf,
    });
    // The primary active revision still structurally covers the Fragment scope...
    expect(resolution.activeRef.outcome).toBe('primary');
    // ...but the exact-scope Attempt that actually ran for this Fragment failed, so it must not read as complete.
    expect(resolution.relevantAttempt?.attemptId).toBe('attempt-run-2026-07-28t1100-fragment-retry-failed');
    expect(resolution.isComplete).toBe(false);
  });

  it('the full Case primary itself remains resolvable and complete, unaffected by the Fragment retry failure', () => {
    const scenario = f.buildExactFragmentAttemptFailedScenario();
    const resolution = resolveCaseEvidence({
      snapshot: scenario.snapshot,
      snapshotAttempts: scenario.snapshot,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: f.FULL_CASE_SCOPE,
      revisionScopeOf: scenario.revisionScopeOf,
      attemptResultOf: scenario.attemptResultOf,
    });
    expect(resolution.activeRef).toMatchObject({ outcome: 'primary', slot: { revisionId: f.PRIMARY_REVISION_ID } });
    expect(resolution.isComplete).toBe(true);
  });
});

describe('negative fixture #6: incomparable covering scopes must return ambiguity, not a time-based pick', () => {
  it('resolveActiveRef returns ambiguous with both incomparable candidates', () => {
    const scenario = f.buildAmbiguousCoveringScopeScenario();
    const result = resolveActiveRef({
      snapshot: scenario.snapshot,
      caseId: f.TASK_LIST_CASE_ID,
      requestedScope: scenario.requestedScope,
      revisionScopeOf: scenario.revisionScopeOf,
    });
    expect(result.outcome).toBe('ambiguous');
    if (result.outcome === 'ambiguous') {
      const resolvedIds = result.candidates.map((c) => c.revisionId).sort();
      expect(resolvedIds).toEqual([...scenario.candidateRevisionIds].sort());
    }
  });
});

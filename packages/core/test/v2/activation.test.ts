import { describe, expect, it } from 'vitest';
import { applyAttemptToActiveRevisions, decideActivation, fixtures, type ActivationCandidate } from '../../src/v2/index.js';

const f = fixtures.projectTaskList;

function primaryCandidate(overrides: Partial<ActivationCandidate> = {}): ActivationCandidate {
  return {
    revisionId: 'task-list-default-primary-rev1',
    captureScope: f.FULL_CASE_SCOPE,
    evidenceLevel: 'instrumented-source-runtime',
    qualityScore: 1,
    inputDigest: 'digest-a',
    ...overrides,
  };
}

describe('decideActivation: baseline dominance rules', () => {
  it('promotes the first ever full-Case capture to primary', () => {
    const decision = decideActivation({ caseId: f.TASK_LIST_CASE_ID, candidate: primaryCandidate() });
    expect(decision.action).toBe('promote-primary');
  });

  it('reuses the existing primary when the candidate is a pure re-run of an identical input', () => {
    const existingPrimary = primaryCandidate();
    const decision = decideActivation({ caseId: f.TASK_LIST_CASE_ID, existingPrimary, candidate: { ...existingPrimary, revisionId: 'a-new-but-identical-rev' } });
    expect(decision).toEqual({ action: 'reuse-existing', revisionId: existingPrimary.revisionId });
  });

  it('promotes when the candidate strictly improves Evidence Level with no regression elsewhere', () => {
    const existingPrimary = primaryCandidate({ evidenceLevel: 'instrumented-runtime', qualityScore: 0.5, inputDigest: 'digest-a' });
    const decision = decideActivation({
      caseId: f.TASK_LIST_CASE_ID,
      existingPrimary,
      candidate: { ...existingPrimary, evidenceLevel: 'instrumented-source-runtime', qualityScore: 0.5, inputDigest: 'digest-b', revisionId: 'better-rev' },
    });
    expect(decision.action).toBe('promote-primary');
  });

  it('rejects (store-only) a candidate that would lower Evidence Level or quality', () => {
    const existingPrimary = primaryCandidate({ evidenceLevel: 'instrumented-source-runtime', qualityScore: 1 });
    const decision = decideActivation({
      caseId: f.TASK_LIST_CASE_ID,
      existingPrimary,
      candidate: { ...existingPrimary, evidenceLevel: 'generic-runtime', inputDigest: 'digest-b', revisionId: 'worse-rev' },
    });
    expect(decision.action).toBe('store-only');
  });
});

describe('negative fixture #7: a failed Attempt must never clear active Evidence', () => {
  it('applyAttemptToActiveRevisions leaves the primary slot untouched on failure', () => {
    const scenario = f.buildFailedAttemptClearsActiveScenario();
    const { nextState, decision } = applyAttemptToActiveRevisions({
      caseId: f.TASK_LIST_CASE_ID,
      state: scenario.existingState,
      attemptResult: scenario.attemptResult,
    });
    expect(decision).toBeUndefined();
    expect(nextState.primary).toBe(scenario.existingState.primary);
    expect(nextState.primary?.revisionId).toBe(f.PRIMARY_REVISION_ID);
  });

  it('the same holds for skipped, unsupported, cancelled and interrupted attempts', () => {
    const scenario = f.buildFailedAttemptClearsActiveScenario();
    for (const attemptResult of ['skipped', 'unsupported', 'cancelled', 'interrupted'] as const) {
      const { nextState } = applyAttemptToActiveRevisions({ caseId: f.TASK_LIST_CASE_ID, state: scenario.existingState, attemptResult });
      expect(nextState.primary).toBe(scenario.existingState.primary);
    }
  });
});

describe('negative fixture #8: a higher-Level Fragment-only revision must never replace primary', () => {
  it('decideActivation returns promote-scoped, never promote-primary, for a narrower-scope candidate', () => {
    const scenario = f.buildFragmentOnlyCannotReplacePrimaryScenario();
    const decision = decideActivation({
      caseId: f.TASK_LIST_CASE_ID,
      existingPrimary: scenario.existingPrimary,
      candidate: scenario.higherLevelFragmentCandidate,
    });
    expect(decision.action).not.toBe('promote-primary');
    expect(decision.action).toBe('promote-scoped');
  });

  it('applyAttemptToActiveRevisions leaves the primary slot referencing its original revision', () => {
    const scenario = f.buildFragmentOnlyCannotReplacePrimaryScenario();
    const { nextState } = applyAttemptToActiveRevisions({
      caseId: f.TASK_LIST_CASE_ID,
      state: { primary: scenario.existingPrimary, scoped: new Map() },
      attemptResult: 'captured',
      candidate: scenario.higherLevelFragmentCandidate,
    });
    expect(nextState.primary?.revisionId).toBe(scenario.existingPrimary.revisionId);
    expect(nextState.scoped.size).toBe(1);
  });
});

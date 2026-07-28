import { describe, expect, it } from 'vitest';
import { buildNextSnapshot } from '../../../src/v2/store/snapshot-builder.js';
import { ledgerPlanetTaskList } from '../../../src/v2/fixtures/index.js';
import type { CaseEvidenceRevision } from '../../../src/v2/contracts/evidence.js';

const {
  RUN_1,
  RUN_2,
  PRIMARY_ACTIVE_REVISION,
  FRAGMENT_SCOPED_ACTIVE_REVISION,
  PRIMARY_REVISION_ID,
  FRAGMENT_REVISION_ID,
  SNAPSHOT,
  SNAPSHOT_ID,
  TASK_LIST_CASE_ID,
  FULL_CASE_SCOPE_KEY,
  LIST_FRAGMENT_SCOPE_KEY,
  ATTEMPT_1_ID,
  ATTEMPT_2_ID,
  RUN_1_ID,
  RUN_2_ID,
} = ledgerPlanetTaskList;

function revisionsMap(...revisions: CaseEvidenceRevision[]): Map<string, CaseEvidenceRevision> {
  return new Map(revisions.map((revision) => [revision.revisionId, revision]));
}

describe('buildNextSnapshot', () => {
  it('builds the first Snapshot for a Bundle from a single primary-capture Run', () => {
    const snapshot = buildNextSnapshot({
      previousSnapshot: undefined,
      run: RUN_1,
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION),
      snapshotId: 'snapshot-interim',
      committedAt: RUN_1.endedAt,
      coverage: RUN_1.coverage,
    });

    expect(snapshot.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);
    expect(snapshot.latestAttempts).toEqual([
      { caseId: TASK_LIST_CASE_ID, scopeKey: FULL_CASE_SCOPE_KEY, attemptId: ATTEMPT_1_ID, runId: RUN_1_ID },
    ]);
  });

  it('reproduces the golden fixture Snapshot exactly by folding Run 1 then Run 2', () => {
    const snapshotAfterRun1 = buildNextSnapshot({
      previousSnapshot: undefined,
      run: RUN_1,
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION),
      snapshotId: 'snapshot-interim',
      committedAt: RUN_1.endedAt,
      coverage: RUN_1.coverage,
    });

    const snapshotAfterRun2 = buildNextSnapshot({
      previousSnapshot: snapshotAfterRun1,
      run: RUN_2,
      // Must resolve both the already-active primary revision (to re-run dominance) and the newly captured Fragment revision.
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION, FRAGMENT_SCOPED_ACTIVE_REVISION),
      snapshotId: SNAPSHOT_ID,
      committedAt: RUN_2.endedAt,
      coverage: SNAPSHOT.coverage,
    });

    expect(snapshotAfterRun2).toEqual(SNAPSHOT);
  });

  it('carries forward the primary active revision when the exact Fragment retry fails, and records the failure as the Fragment scope latest Attempt', () => {
    const snapshotAfterRun1 = buildNextSnapshot({
      previousSnapshot: undefined,
      run: RUN_1,
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION),
      snapshotId: 'snapshot-interim',
      committedAt: RUN_1.endedAt,
      coverage: RUN_1.coverage,
    });

    const failedRun = {
      ...RUN_2,
      runId: 'run-failed-retry',
      attempts: [
        {
          ...RUN_2.attempts[0]!,
          runId: 'run-failed-retry',
          attemptId: 'attempt-failed-retry',
          result: 'failed' as const,
          revisionId: undefined,
          reason: 'Runtime timed out waiting for the list Fragment to stabilize.',
        },
      ],
    };

    const snapshotAfterFailure = buildNextSnapshot({
      previousSnapshot: snapshotAfterRun1,
      run: failedRun,
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION),
      snapshotId: 'snapshot-after-failure',
      committedAt: '2026-07-28T11:00:00.000Z',
      coverage: RUN_1.coverage,
    });

    // The primary active revision must survive untouched: a failed narrow-scope retry never clears wider active Evidence.
    expect(snapshotAfterFailure.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);
    // But the Fragment scope's latest Attempt must now point at the failed attempt, not silently keep pointing at a stale success.
    expect(snapshotAfterFailure.latestAttempts).toEqual([
      { caseId: TASK_LIST_CASE_ID, scopeKey: FULL_CASE_SCOPE_KEY, attemptId: ATTEMPT_1_ID, runId: RUN_1_ID },
      { caseId: TASK_LIST_CASE_ID, scopeKey: LIST_FRAGMENT_SCOPE_KEY, attemptId: 'attempt-failed-retry', runId: 'run-failed-retry' },
    ]);
  });

  it('throws unknown-reference instead of silently building a Snapshot when a captured Attempt references an unresolvable revision', () => {
    const brokenRun = {
      ...RUN_1,
      attempts: [{ ...RUN_1.attempts[0]!, revisionId: 'does-not-exist' }],
    };
    expect(() =>
      buildNextSnapshot({
        previousSnapshot: undefined,
        run: brokenRun,
        revisionsById: revisionsMap(), // deliberately empty
        snapshotId: 'snapshot-broken',
        committedAt: RUN_1.endedAt,
        coverage: RUN_1.coverage,
      }),
    ).toThrowError(/unknown-reference|does not resolve/);
  });

  it('carries forward Cases untouched by the current Run unchanged', () => {
    const otherCaseSlot = { caseId: 'other.case', kind: 'primary' as const, scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID };
    const previousSnapshot = {
      ...SNAPSHOT,
      activeSlots: [...SNAPSHOT.activeSlots, otherCaseSlot],
    };

    const failedRun = {
      ...RUN_2,
      runId: 'run-unrelated-failure',
      attempts: [
        {
          ...RUN_2.attempts[0]!,
          runId: 'run-unrelated-failure',
          attemptId: 'attempt-unrelated-failure',
          result: 'failed' as const,
          revisionId: undefined,
          reason: 'unrelated failure',
        },
      ],
    };

    const next = buildNextSnapshot({
      previousSnapshot,
      run: failedRun,
      revisionsById: revisionsMap(PRIMARY_ACTIVE_REVISION, FRAGMENT_SCOPED_ACTIVE_REVISION),
      snapshotId: 'snapshot-carry-forward',
      committedAt: '2026-07-28T12:00:00.000Z',
      coverage: RUN_1.coverage,
    });

    expect(next.activeSlots).toContainEqual(otherCaseSlot);
  });
});

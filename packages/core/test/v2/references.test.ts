import { describe, expect, it } from 'vitest';
import {
  assertBundleConsumable,
  assertEvidenceGraphReferences,
  assertHandoffReferences,
  assertRunReferences,
  assertSelectionReferences,
  assertSnapshotReferences,
  assertStalenessReportReferences,
  fixtures,
  type CaseEvidenceRevision,
} from '../../src/v2/index.js';

const f = fixtures.referenceCaseSlice;

const COMPLETE_CONTEXT = {
  workspace: f.WORKSPACE,
  bundle: f.BUNDLE,
  snapshot: f.SNAPSHOT,
  runs: [f.RUN_1, f.RUN_2],
  revisions: [f.PRIMARY_ACTIVE_REVISION, f.FRAGMENT_SCOPED_ACTIVE_REVISION],
  stalenessReport: f.STALENESS_REPORT,
  handoff: f.HANDOFF,
};

describe('V2 shared cross-reference assertions', () => {
  it('accepts the complete fixed Snapshot/Handoff graph', () => {
    expect(() => assertEvidenceGraphReferences(COMPLETE_CONTEXT)).not.toThrow();
  });

  it('accepts explicit partial and stale Handoff graphs', () => {
    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        snapshot: f.PARTIAL_SNAPSHOT,
        runs: [...COMPLETE_CONTEXT.runs, f.PARTIAL_RUN],
        stalenessReport: f.PARTIAL_STALENESS_REPORT,
        handoff: f.PARTIAL_HANDOFF,
      }),
    ).not.toThrow();

    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        handoff: f.MISSING_PARTIAL_HANDOFF,
      }),
    ).not.toThrow();

    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        stalenessReport: f.STALE_STALENESS_REPORT,
        handoff: f.STALE_HANDOFF,
      }),
    ).not.toThrow();
  });

  it('rejects a selected caseId that was not computed from its CaseKey', () => {
    const invalidSelection = {
      ...f.RUN_1.selection,
      cases: [{ ...f.RUN_1.selection.cases[0]!, caseId: 'sample.task-list::wrong::light::iphone-14' }],
    };
    expect(() => assertSelectionReferences(invalidSelection)).toThrow(/computeCaseId/);
    expect(() =>
      assertSelectionReferences({
        ...f.RUN_1.selection,
        acceptedWarningIds: ['warning-capacity', 'warning-capacity'],
      }),
    ).toThrow(/duplicate identity/);
  });

  it('rejects an Attempt whose Scope does not match its selected Case Scope', () => {
    const invalidRun = {
      ...f.RUN_1,
      attempts: [
        {
          ...f.PRIMARY_CAPTURE_ATTEMPT,
          captureScope: f.LIST_FRAGMENT_SCOPE,
          scopeKey: f.LIST_FRAGMENT_SCOPE_KEY,
        },
      ],
    };
    expect(() => assertRunReferences(invalidRun)).toThrow(/selected Capture Scope/);
  });

  it('rejects consuming a Bundle without an active Snapshot', () => {
    expect(() => assertBundleConsumable(f.BUNDLE, undefined)).toThrow(/active Snapshot/);
  });

  it('rejects Snapshot refs to an unknown source Run, revision or Attempt', () => {
    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        snapshot: { ...f.SNAPSHOT, sourceRunId: 'unknown-run' },
      }),
    ).toThrow(/source Run/);

    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        revisions: [f.PRIMARY_ACTIVE_REVISION],
      }),
    ).toThrow(/Evidence revision|active revision/);

    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        snapshot: {
          ...f.SNAPSHOT,
          latestAttempts: [
            { ...f.SNAPSHOT.latestAttempts[0]!, attemptId: 'unknown-attempt' },
            f.SNAPSHOT.latestAttempts[1]!,
          ],
        },
      }),
    ).toThrow(/Latest Attempt/);
  });

  it('rejects cross-Workspace, cross-Bundle and cross-Prototype ownership', () => {
    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        workspace: { ...f.WORKSPACE, workspaceId: 'foreign-workspace' },
      }),
    ).toThrow(/ownership mismatch/);

    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        workspace: { ...f.WORKSPACE, prototypeIds: ['foreign-prototype'] },
      }),
    ).toThrow(/Workspace Prototype/);

    const foreignRevision = {
      ...f.PRIMARY_ACTIVE_REVISION,
      workspaceId: 'foreign-workspace',
    } as CaseEvidenceRevision;
    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        revisions: [foreignRevision, f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      }),
    ).toThrow(/ownership mismatch/);

    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        snapshot: { ...f.SNAPSHOT, bundleId: 'foreign-bundle' },
      }),
    ).toThrow(/ownership mismatch/);

    expect(() =>
      assertSnapshotReferences({
        ...COMPLETE_CONTEXT,
        snapshot: { ...f.SNAPSHOT, prototypeId: 'foreign-prototype' },
      }),
    ).toThrow(/ownership mismatch/);
  });

  it('rejects a Staleness Report entry outside the fixed Snapshot', () => {
    const report = {
      ...f.STALENESS_REPORT,
      perRevision: [
        ...f.STALENESS_REPORT.perRevision,
        {
          revisionId: 'unknown-revision',
          caseId: f.TASK_LIST_CASE_ID,
          scopeKey: f.FULL_CASE_SCOPE_KEY,
          stale: false,
        },
      ],
    };
    expect(() => assertStalenessReportReferences(report, f.SNAPSHOT)).toThrow(/active revision/);
  });

  it('rejects Handoffs that drift to a wrong Attempt or hide partial/stale state', () => {
    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        handoff: {
          ...f.HANDOFF,
          selectedCases: [{ ...f.HANDOFF.selectedCases[0]!, relevantAttemptId: f.ATTEMPT_2_ID }],
        },
      }),
    ).toThrow(/relevant Attempt/);

    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        handoff: {
          ...f.HANDOFF,
          selectedCases: [
            {
              caseId: f.TASK_LIST_CASE_ID,
              captureScope: f.LIST_FRAGMENT_SCOPE,
              scopeKey: f.LIST_FRAGMENT_SCOPE_KEY,
              resolution: 'resolved',
              revisionId: f.PRIMARY_REVISION_ID,
              relevantAttemptId: f.ATTEMPT_2_ID,
            },
          ],
        },
      }),
    ).toThrow(/not the Core resolver result/);

    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        snapshot: f.PARTIAL_SNAPSHOT,
        runs: [...COMPLETE_CONTEXT.runs, f.PARTIAL_RUN],
        stalenessReport: f.PARTIAL_STALENESS_REPORT,
        handoff: { ...f.PARTIAL_HANDOFF, coverageStatus: 'complete' },
      }),
    ).toThrow(/coverageStatus/);

    expect(() =>
      assertHandoffReferences({
        ...COMPLETE_CONTEXT,
        stalenessReport: f.STALE_STALENESS_REPORT,
        handoff: { ...f.STALE_HANDOFF, freshnessStatus: 'fresh' },
      }),
    ).toThrow(/freshnessStatus/);
  });
});

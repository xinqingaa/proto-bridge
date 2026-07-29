import { describe, expect, it } from 'vitest';
import {
  AgentHandoff,
  Bundle,
  BundleSnapshot,
  CaseAttempt,
  CaseEvidenceRevision,
  CaseKey,
  Fact,
  Issue,
  Run,
  StalenessReport,
  Workspace,
  fixtures,
} from '../../src/v2/index.js';

const f = fixtures.ledgerPlanetTaskList;

describe('ledger-planet.task-list valid fixtures parse against their schemas', () => {
  it('Base Case', () => {
    expect(CaseKey.safeParse(f.BASE_CASE)).toMatchObject({ success: true });
  });

  it('Bundle', () => {
    expect(Bundle.safeParse(f.BUNDLE)).toMatchObject({ success: true });
  });

  it('Workspace', () => {
    expect(Workspace.safeParse(f.WORKSPACE)).toMatchObject({ success: true });
  });

  it('full Case primary active revision', () => {
    const result = CaseEvidenceRevision.safeParse(f.PRIMARY_ACTIVE_REVISION);
    expect(result.success).toBe(true);
  });

  it('Fragment scoped active revision', () => {
    const result = CaseEvidenceRevision.safeParse(f.FRAGMENT_SCOPED_ACTIVE_REVISION);
    expect(result.success).toBe(true);
  });

  it('Case Attempts', () => {
    expect(CaseAttempt.safeParse(f.PRIMARY_CAPTURE_ATTEMPT).success).toBe(true);
    expect(CaseAttempt.safeParse(f.FRAGMENT_CAPTURE_ATTEMPT).success).toBe(true);
  });

  it('Runs', () => {
    expect(Run.safeParse(f.RUN_1).success).toBe(true);
    expect(Run.safeParse(f.RUN_2).success).toBe(true);
  });

  it('Snapshot referencing both the primary and scoped active revisions plus their latest Attempts', () => {
    const result = BundleSnapshot.safeParse(f.SNAPSHOT);
    expect(result.success).toBe(true);
    expect(f.SNAPSHOT.activeSlots).toHaveLength(2);
    expect(f.SNAPSHOT.latestAttempts).toHaveLength(2);
  });

  it('Staleness Report', () => {
    expect(StalenessReport.safeParse(f.STALENESS_REPORT).success).toBe(true);
  });

  it('Handoff with coverageStatus=complete, freshnessStatus=fresh and no required risk', () => {
    const result = AgentHandoff.safeParse(f.HANDOFF);
    expect(result.success).toBe(true);
    expect(f.HANDOFF.coverageStatus).toBe('complete');
    expect(f.HANDOFF.freshnessStatus).toBe('fresh');
    expect(f.HANDOFF.risks).toHaveLength(0);
  });

  it('explicit unknown and unresolved-conflict Facts', () => {
    expect(Fact.safeParse(f.UNKNOWN_FACT).success).toBe(true);
    expect(Fact.safeParse(f.CONFLICT_FACT).success).toBe(true);
    expect(f.UNKNOWN_FACT.resolution).toBe('unknown');
    expect(f.CONFLICT_FACT.resolution).toBe('unresolved-conflict');
    expect(Issue.safeParse(f.UNKNOWN_ISSUE).success).toBe(true);
  });

  it('partial and stale Handoff examples remain explicit and acknowledged', () => {
    expect(AgentHandoff.safeParse(f.PARTIAL_HANDOFF).success).toBe(true);
    expect(f.PARTIAL_HANDOFF.coverageStatus).toBe('partial');
    expect(f.PARTIAL_HANDOFF.risks.map((risk) => risk.kind)).toContain('partial-coverage');
    expect(AgentHandoff.safeParse(f.MISSING_PARTIAL_HANDOFF).success).toBe(true);
    expect(f.MISSING_PARTIAL_HANDOFF.selectedCases.some((selectedCase) => selectedCase.resolution === 'missing')).toBe(true);

    expect(AgentHandoff.safeParse(f.STALE_HANDOFF).success).toBe(true);
    expect(f.STALE_HANDOFF.freshnessStatus).toBe('stale');
    expect(f.STALE_HANDOFF.risks.map((risk) => risk.kind)).toContain('stale-evidence');
  });
});

describe('cross-reference integrity across the fixture bundle', () => {
  it('every Snapshot active slot revisionId resolves to a known revision', () => {
    const knownRevisionIds = new Set([f.PRIMARY_ACTIVE_REVISION.revisionId, f.FRAGMENT_SCOPED_ACTIVE_REVISION.revisionId]);
    for (const slot of f.SNAPSHOT.activeSlots) {
      expect(knownRevisionIds.has(slot.revisionId)).toBe(true);
    }
  });

  it('every Snapshot latest Attempt ref resolves to a known Attempt in a known Run', () => {
    const knownAttempts = new Map([
      [f.PRIMARY_CAPTURE_ATTEMPT.attemptId, f.PRIMARY_CAPTURE_ATTEMPT.runId],
      [f.FRAGMENT_CAPTURE_ATTEMPT.attemptId, f.FRAGMENT_CAPTURE_ATTEMPT.runId],
    ]);
    const knownRunIds = new Set([f.RUN_1.runId, f.RUN_2.runId]);
    for (const ref of f.SNAPSHOT.latestAttempts) {
      expect(knownAttempts.has(ref.attemptId)).toBe(true);
      expect(knownAttempts.get(ref.attemptId)).toBe(ref.runId);
      expect(knownRunIds.has(ref.runId)).toBe(true);
    }
  });

  it('every Staleness Report entry resolves to a revision that the Snapshot actually references', () => {
    const activeRevisionIds = new Set(f.SNAPSHOT.activeSlots.map((slot) => slot.revisionId));
    for (const entry of f.STALENESS_REPORT.perRevision) {
      expect(activeRevisionIds.has(entry.revisionId)).toBe(true);
    }
    expect(f.STALENESS_REPORT.snapshotId).toBe(f.SNAPSHOT.snapshotId);
  });

  it('the Handoff only references the fixed Snapshot, a resolvable revision and a resolvable Staleness Report', () => {
    expect(f.HANDOFF.snapshotId).toBe(f.SNAPSHOT.snapshotId);
    expect(f.HANDOFF.stalenessReportId).toBe(f.STALENESS_REPORT.reportId);
    const activeRevisionIds = new Set(f.SNAPSHOT.activeSlots.map((slot) => slot.revisionId));
    for (const ref of f.HANDOFF.selectedCases) {
      if (ref.resolution === 'resolved') expect(activeRevisionIds.has(ref.revisionId)).toBe(true);
    }
  });

  it('Run attempts only reference caseIds that are part of that Run\'s own selection', () => {
    for (const run of [f.RUN_1, f.RUN_2]) {
      const selectedCaseIds = new Set(run.selection.cases.map((c) => c.caseId));
      for (const attempt of run.attempts) {
        expect(selectedCaseIds.has(attempt.caseId)).toBe(true);
      }
    }
  });
});

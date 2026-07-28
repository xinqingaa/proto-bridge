import { describe, expect, it } from 'vitest';
import {
  AgentHandoff,
  BundleSnapshot,
  CaseAttempt,
  CaseEvidenceRevision,
  CaseKey,
  Run,
  StalenessReport,
  fixtures,
} from '../../src/v2/index.js';

const f = fixtures.ledgerPlanetTaskList;

describe('ledger-planet.task-list valid fixtures parse against their schemas', () => {
  it('Base Case', () => {
    expect(CaseKey.safeParse(f.BASE_CASE)).toMatchObject({ success: true });
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
      expect(activeRevisionIds.has(ref.revisionId)).toBe(true);
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

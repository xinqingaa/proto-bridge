import type { Bundle } from '../contracts/bundle.js';
import { computeCaseId } from '../contracts/case.js';
import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import { ambiguousReferenceError, V2ContractError, unknownReferenceError } from '../contracts/errors.js';
import type { AgentHandoff } from '../contracts/handoff.js';
import type { CaseEvidenceRevisionId, CaseId, RunId } from '../contracts/ids.js';
import type { Run, NormalizedSelection, SelectedCase } from '../contracts/run.js';
import { computeScopeKey, isFullCaseScope } from '../contracts/scope.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { StalenessReport } from '../contracts/staleness.js';
import type { Workspace } from '../contracts/workspace.js';
import { resolveActiveRef, resolveRelevantAttempt } from './active-ref-resolver.js';

function ownershipMismatch(kind: string, detail: string, details?: unknown): never {
  throw new V2ContractError('workspace-mismatch', `${kind} ownership mismatch: ${detail}.`, details);
}

function requireUnique(values: readonly string[], kind: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new V2ContractError('invalid-schema', `${kind} contains duplicate identity ${value}.`, value);
    }
    seen.add(value);
  }
}

function selectedCaseMap(selection: NormalizedSelection): Map<CaseId, SelectedCase> {
  assertSelectionReferences(selection);
  return new Map(selection.cases.map((selectedCase) => [selectedCase.caseId, selectedCase]));
}

/**
 * Cross-field invariants for a normalized Selection. These cannot be
 * represented by field schemas alone and must be shared by Preflight,
 * Store and every producer boundary.
 */
export function assertSelectionReferences(selection: NormalizedSelection): void {
  requireUnique(selection.cases.map((selectedCase) => selectedCase.caseId), 'NormalizedSelection.cases');
  requireUnique(selection.acceptedWarningIds, 'NormalizedSelection.acceptedWarningIds');
  for (const selectedCase of selection.cases) {
    const expectedCaseId = computeCaseId(selectedCase.caseKey);
    if (selectedCase.caseId !== expectedCaseId) {
      throw new V2ContractError(
        'invalid-schema',
        `Selected Case ${selectedCase.caseId} does not match computeCaseId(caseKey): expected ${expectedCaseId}.`,
        { actual: selectedCase.caseId, expected: expectedCaseId },
      );
    }
  }
}

/**
 * A Run may have zero Attempts after an early fatal interruption, but each
 * Attempt it does contain must resolve to the exact selected Case + Scope.
 */
export function assertRunReferences(run: Run): void {
  const selectedCases = selectedCaseMap(run.selection);
  requireUnique(run.attempts.map((attempt) => attempt.attemptId), `Run ${run.runId} attempts`);

  for (const attempt of run.attempts) {
    if (attempt.runId !== run.runId) {
      ownershipMismatch('CaseAttempt', `runId ${attempt.runId} does not match Run ${run.runId}`, attempt);
    }
    const selectedCase = selectedCases.get(attempt.caseId);
    if (!selectedCase) throw unknownReferenceError('Selected Case', attempt.caseId);
    const expectedScopeKey = computeScopeKey(selectedCase.captureScope);
    if (attempt.scopeKey !== expectedScopeKey || attempt.scopeKey !== computeScopeKey(attempt.captureScope)) {
      throw new V2ContractError(
        'invalid-schema',
        `Attempt ${attempt.attemptId} scope does not match the selected Capture Scope.`,
        { attemptScopeKey: attempt.scopeKey, selectedScopeKey: expectedScopeKey },
      );
    }
  }
}

export function assertBundleConsumable(bundle: Bundle, activeSnapshot: BundleSnapshot | undefined): asserts activeSnapshot is BundleSnapshot {
  if (!activeSnapshot) {
    throw unknownReferenceError('Bundle active Snapshot', { bundleId: bundle.bundleId });
  }
  assertSnapshotOwnership(bundle, activeSnapshot);
}

export function assertSnapshotOwnership(bundle: Bundle, snapshot: BundleSnapshot): void {
  if (snapshot.workspaceId !== bundle.workspaceId) {
    ownershipMismatch('BundleSnapshot', `workspace ${snapshot.workspaceId} does not match Bundle workspace ${bundle.workspaceId}`, snapshot);
  }
  if (snapshot.bundleId !== bundle.bundleId) {
    ownershipMismatch('BundleSnapshot', `bundle ${snapshot.bundleId} does not match Bundle ${bundle.bundleId}`, snapshot);
  }
  if (snapshot.prototypeId !== bundle.prototypeId) {
    ownershipMismatch('BundleSnapshot', `prototype ${snapshot.prototypeId} does not match Bundle prototype ${bundle.prototypeId}`, snapshot);
  }
}

export type SnapshotReferenceContext = {
  workspace: Workspace;
  bundle: Bundle;
  snapshot: BundleSnapshot;
  runs: readonly Run[];
  revisions: readonly CaseEvidenceRevision[];
};

/**
 * Validates every transitive ref needed to consume one Snapshot. Extra
 * historical Runs/revisions may be supplied; only referenced objects are
 * required to be reachable from the Snapshot.
 */
export function assertSnapshotReferences(context: SnapshotReferenceContext): void {
  const { workspace, bundle, snapshot, runs, revisions } = context;
  if (bundle.workspaceId !== workspace.workspaceId) {
    ownershipMismatch('Bundle', `workspace ${bundle.workspaceId} does not match Workspace ${workspace.workspaceId}`, bundle);
  }
  if (!workspace.prototypeIds.includes(bundle.prototypeId)) {
    throw unknownReferenceError('Workspace Prototype', bundle.prototypeId);
  }
  assertBundleConsumable(bundle, snapshot);

  const runsById = new Map<RunId, Run>();
  for (const run of runs) {
    assertRunReferences(run);
    if (run.workspaceId !== bundle.workspaceId || run.bundleId !== bundle.bundleId) {
      ownershipMismatch('Run', `${run.runId} does not belong to Bundle ${bundle.bundleId}`, run);
    }
    if (run.selection.prototypeId !== bundle.prototypeId) {
      ownershipMismatch('Run', `${run.runId} selects prototype ${run.selection.prototypeId}, not ${bundle.prototypeId}`, run);
    }
    if (runsById.has(run.runId)) {
      throw new V2ContractError('invalid-schema', `Snapshot context contains duplicate Run ${run.runId}.`);
    }
    runsById.set(run.runId, run);
  }

  const revisionsById = new Map<CaseEvidenceRevisionId, CaseEvidenceRevision>();
  for (const revision of revisions) {
    if (revision.workspaceId !== bundle.workspaceId || revision.bundleId !== bundle.bundleId) {
      ownershipMismatch('CaseEvidenceRevision', `${revision.revisionId} does not belong to Bundle ${bundle.bundleId}`, revision);
    }
    if (revisionsById.has(revision.revisionId)) {
      throw new V2ContractError('invalid-schema', `Snapshot context contains duplicate revision ${revision.revisionId}.`);
    }
    revisionsById.set(revision.revisionId, revision);
  }

  if (!runsById.has(snapshot.sourceRunId)) throw unknownReferenceError('Snapshot source Run', snapshot.sourceRunId);

  for (const run of runs) {
    for (const attempt of run.attempts) {
      if (attempt.result !== 'captured' && attempt.result !== 'reused') continue;
      const revision = revisionsById.get(attempt.revisionId!);
      if (!revision) throw unknownReferenceError('Attempt Evidence revision', attempt.revisionId);
      if (
        revision.caseId !== attempt.caseId ||
        revision.scopeKey !== attempt.scopeKey ||
        computeScopeKey(revision.captureScope) !== computeScopeKey(attempt.captureScope)
      ) {
        ownershipMismatch('CaseAttempt', `${attempt.attemptId} does not match revision ${revision.revisionId}`, {
          attempt,
          revision,
        });
      }
    }
  }

  for (const slot of snapshot.activeSlots) {
    const revision = revisionsById.get(slot.revisionId);
    if (!revision) throw unknownReferenceError('Snapshot active revision', slot.revisionId);
    if (revision.caseId !== slot.caseId || revision.scopeKey !== slot.scopeKey) {
      ownershipMismatch('ActiveSlot', `${slot.caseId}/${slot.scopeKey} does not match revision ${slot.revisionId}`, { slot, revision });
    }
    const fullCase = isFullCaseScope(revision.captureScope);
    if ((slot.kind === 'primary') !== fullCase) {
      throw new V2ContractError(
        'invalid-schema',
        `Active slot ${slot.caseId}/${slot.scopeKey} kind ${slot.kind} does not match its revision Capture Scope.`,
        { slot, revisionId: revision.revisionId },
      );
    }
  }

  for (const ref of snapshot.latestAttempts) {
    const run = runsById.get(ref.runId);
    if (!run) throw unknownReferenceError('Latest Attempt Run', ref.runId);
    const attempt = run.attempts.find((candidate) => candidate.attemptId === ref.attemptId);
    if (!attempt) throw unknownReferenceError('Latest Attempt', ref.attemptId);
    if (attempt.caseId !== ref.caseId || attempt.scopeKey !== ref.scopeKey) {
      ownershipMismatch('LatestAttemptRef', `${ref.attemptId} does not match ${ref.caseId}/${ref.scopeKey}`, { ref, attempt });
    }
  }
}

export function assertStalenessReportReferences(report: StalenessReport, snapshot: BundleSnapshot): void {
  if (report.snapshotId !== snapshot.snapshotId) {
    ownershipMismatch('StalenessReport', `snapshot ${report.snapshotId} does not match ${snapshot.snapshotId}`, report);
  }
  requireUnique(report.perRevision.map((entry) => entry.revisionId), `StalenessReport ${report.reportId} revisions`);
  for (const entry of report.perRevision) {
    const slot = snapshot.activeSlots.find(
      (candidate) =>
        candidate.revisionId === entry.revisionId &&
        candidate.caseId === entry.caseId &&
        candidate.scopeKey === entry.scopeKey,
    );
    if (!slot) throw unknownReferenceError('StalenessReport active revision', entry);
  }
}

export type HandoffReferenceContext = SnapshotReferenceContext & {
  handoff: AgentHandoff;
  stalenessReport: StalenessReport;
};

export function assertHandoffReferences(context: HandoffReferenceContext): void {
  const { workspace, bundle, snapshot, runs, revisions, handoff, stalenessReport } = context;
  assertSnapshotReferences({ workspace, bundle, snapshot, runs, revisions });
  assertStalenessReportReferences(stalenessReport, snapshot);

  if (handoff.workspaceId !== bundle.workspaceId || handoff.bundleId !== bundle.bundleId) {
    ownershipMismatch('AgentHandoff', `${handoff.handoffId} does not belong to Bundle ${bundle.bundleId}`, handoff);
  }
  if (handoff.snapshotId !== snapshot.snapshotId) {
    ownershipMismatch('AgentHandoff', `snapshot ${handoff.snapshotId} does not match ${snapshot.snapshotId}`, handoff);
  }
  if (handoff.stalenessReportId !== stalenessReport.reportId) {
    ownershipMismatch(
      'AgentHandoff',
      `Staleness Report ${handoff.stalenessReportId} does not match ${stalenessReport.reportId}`,
      handoff,
    );
  }

  const attemptsById = new Map(runs.flatMap((run) => run.attempts.map((attempt) => [attempt.attemptId, attempt] as const)));
  const revisionsById = new Map(revisions.map((revision) => [revision.revisionId, revision] as const));
  const staleByRevision = new Map(stalenessReport.perRevision.map((entry) => [entry.revisionId, entry.stale] as const));
  let anyStale = false;
  let anyIncomplete = false;

  for (const selected of handoff.selectedCases) {
    const activeResolution = resolveActiveRef({
      snapshot,
      caseId: selected.caseId,
      requestedScope: selected.captureScope,
      revisionScopeOf: (revisionId) => {
        const revision = revisionsById.get(revisionId);
        if (!revision) throw unknownReferenceError('Handoff Evidence revision', revisionId);
        return revision.captureScope;
      },
    });
    if (activeResolution.outcome === 'ambiguous') {
      throw ambiguousReferenceError('Handoff active revision', activeResolution.candidates);
    }
    if (activeResolution.outcome === 'missing') {
      if (selected.resolution !== 'missing') throw unknownReferenceError('Handoff active revision', selected);
      const relevantAttemptRef = resolveRelevantAttempt({
        snapshot,
        caseId: selected.caseId,
        requestedScopeKey: selected.scopeKey,
      });
      if (relevantAttemptRef?.attemptId !== selected.relevantAttemptId) {
        throw unknownReferenceError('Handoff missing-Case relevant Attempt', selected.relevantAttemptId);
      }
      anyIncomplete = true;
      continue;
    }
    if (selected.resolution !== 'resolved') {
      throw new V2ContractError(
        'invalid-schema',
        `Handoff marks ${selected.caseId}/${selected.scopeKey} missing even though the Core resolver found active Evidence.`,
        { selected, resolvedSlot: activeResolution.slot },
      );
    }
    if (activeResolution.slot.revisionId !== selected.revisionId) {
      throw new V2ContractError(
        'invalid-schema',
        `Handoff revision ${selected.revisionId} is not the Core resolver result for requested Scope ${selected.scopeKey}.`,
        { selected, resolvedSlot: activeResolution.slot },
      );
    }

    const relevantAttemptRef = resolveRelevantAttempt({
      snapshot,
      caseId: selected.caseId,
      requestedScopeKey: selected.scopeKey,
      resolvedSlot: activeResolution.slot,
    });
    if (!relevantAttemptRef || relevantAttemptRef.attemptId !== selected.relevantAttemptId) {
      throw unknownReferenceError('Handoff relevant Attempt', selected.relevantAttemptId);
    }
    const attempt = attemptsById.get(selected.relevantAttemptId);
    if (!attempt) throw unknownReferenceError('Handoff Attempt object', selected.relevantAttemptId);
    if (attempt.result !== 'captured' && attempt.result !== 'reused') anyIncomplete = true;

    const stale = staleByRevision.get(selected.revisionId);
    if (stale === undefined) throw unknownReferenceError('Handoff Staleness entry', selected.revisionId);
    anyStale ||= stale;
  }

  const expectedCoverage = anyIncomplete ? 'partial' : 'complete';
  if (handoff.coverageStatus !== expectedCoverage) {
    throw new V2ContractError(
      'invalid-schema',
      `Handoff coverageStatus ${handoff.coverageStatus} does not match fixed relevant Attempts (${expectedCoverage}).`,
    );
  }
  const expectedFreshness = anyStale ? 'stale' : 'fresh';
  if (handoff.freshnessStatus !== expectedFreshness) {
    throw new V2ContractError(
      'invalid-schema',
      `Handoff freshnessStatus ${handoff.freshnessStatus} does not match its Staleness Report (${expectedFreshness}).`,
    );
  }

  const riskKinds = new Set(handoff.risks.map((risk) => risk.kind));
  if (anyIncomplete && !riskKinds.has('partial-coverage')) {
    throw new V2ContractError('invalid-schema', 'A partial Handoff must disclose a partial-coverage risk.');
  }
  if (anyStale && !riskKinds.has('stale-evidence')) {
    throw new V2ContractError('invalid-schema', 'A stale Handoff must disclose a stale-evidence risk.');
  }
}

export function assertEvidenceGraphReferences(context: HandoffReferenceContext): void {
  assertHandoffReferences(context);
}

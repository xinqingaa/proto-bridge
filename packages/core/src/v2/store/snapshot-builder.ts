import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import { evidenceQualityScore } from '../contracts/evidence.js';
import type { CaseEvidenceRevisionId, CaseId, ScopeKey, SnapshotId } from '../contracts/ids.js';
import type { Run } from '../contracts/run.js';
import type { CaseAttempt } from '../contracts/attempt.js';
import { CoverageSummary } from '../contracts/coverage.js';
import type { EvidenceLevel } from '../contracts/vocabulary.js';
import { Issue } from '../contracts/issue.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import type { ActiveSlot, BundleSnapshot, LatestAttemptRef, SnapshotCatalogRef } from '../contracts/snapshot.js';
import { unknownReferenceError } from '../contracts/errors.js';
import type { ActivationCandidate, CaseActiveState, ExistingActiveRevision } from '../resolver/activation.js';
import { applyAttemptToActiveRevisions } from '../resolver/activation.js';
import { computeScopeKey } from '../contracts/scope.js';

export type BuildNextSnapshotInput = {
  /** `undefined` when this Run produces the Bundle's first-ever Snapshot. */
  previousSnapshot?: BundleSnapshot | undefined;
  run: Run;
  /**
   * Must resolve every revision id this computation needs: every
   * `captured`/`reused` attempt's `revisionId` in `run.attempts`, plus the
   * revision behind every `previousSnapshot.activeSlots` entry for a Case
   * this Run's attempts touch (needed to re-run the dominance comparison).
   * Kept as an explicit input so this function stays a pure, I/O-free
   * computation that `LocalFileStore` can unit test and reuse.
   */
  revisionsById: ReadonlyMap<CaseEvidenceRevisionId, CaseEvidenceRevision>;
  snapshotId: SnapshotId;
  committedAt: string;
  /**
   * Snapshot Coverage is computed by the caller (Phase 3's capture
   * orchestrator owns turning Facts into `traceable`/`heuristic`/`unknown`/
   * `conflict` counts); the Store only persists it alongside the activation
   * result it derives here.
   */
  coverage: CoverageSummary;
  /** Fixed Catalog set for this commit; omitted to carry the previous set. */
  catalogRefs?: SnapshotCatalogRef[];
};

function toActivationCandidate(revision: CaseEvidenceRevision): ActivationCandidate {
  return {
    revisionId: revision.revisionId,
    captureScope: revision.captureScope,
    evidenceLevel: revision.evidenceLevel,
    qualityScore: evidenceQualityScore(revision),
    inputDigest: revision.inputDigest,
  };
}

function lookupRevision(
  revisionsById: ReadonlyMap<CaseEvidenceRevisionId, CaseEvidenceRevision>,
  revisionId: CaseEvidenceRevisionId,
): CaseEvidenceRevision {
  const revision = revisionsById.get(revisionId);
  if (!revision) throw unknownReferenceError('CaseEvidenceRevision', revisionId);
  return revision;
}

function activeStateFor(
  caseId: CaseId,
  activeSlots: readonly ActiveSlot[],
  revisionsById: ReadonlyMap<CaseEvidenceRevisionId, CaseEvidenceRevision>,
): CaseActiveState {
  const primarySlot = activeSlots.find((slot) => slot.caseId === caseId && slot.kind === 'primary');
  const scoped = new Map<ScopeKey, ExistingActiveRevision>();
  for (const slot of activeSlots) {
    if (slot.caseId !== caseId || slot.kind !== 'scoped') continue;
    scoped.set(slot.scopeKey, toActivationCandidate(lookupRevision(revisionsById, slot.revisionId)));
  }
  return {
    primary: primarySlot ? toActivationCandidate(lookupRevision(revisionsById, primarySlot.revisionId)) : undefined,
    scoped,
  };
}

function stateToSlots(caseId: CaseId, state: CaseActiveState): ActiveSlot[] {
  const slots: ActiveSlot[] = [];
  if (state.primary) {
    slots.push({ caseId, kind: 'primary', scopeKey: computeScopeKey(state.primary.captureScope), revisionId: state.primary.revisionId });
  }
  for (const candidate of state.scoped.values()) {
    slots.push({ caseId, kind: 'scoped', scopeKey: computeScopeKey(candidate.captureScope), revisionId: candidate.revisionId });
  }
  return slots;
}

/**
 * Applies one completed Run's Attempts on top of the previous Snapshot's
 * active state to produce the next Bundle Snapshot's `activeSlots` and
 * `latestAttempts` (pb-v2-spec.md "Run、Attempt、Revision 与 Snapshot").
 * Every Case not touched by this Run's attempts is carried forward
 * unchanged; only `captured` attempts can move an active slot, and the
 * dominance rules in `resolver/activation.ts` decide whether they do.
 *
 * This is a pure function: it never touches the filesystem and never
 * mutates its inputs, so `LocalFileStore.commitRun` can validate its
 * output (referential integrity, schema) before committing anything, and
 * a failed validation leaves the previous Snapshot's active pointer alone.
 */
/**
 * Run/Snapshot Coverage for one set of Attempts: Attempt results become
 * counts, and Fact quality is taken from the revisions those Attempts made
 * active. Shared by the capture orchestrator and restart recovery so both
 * paths report the same partial/complete truth.
 */
export function computeAttemptCoverage(
  attempts: readonly CaseAttempt[],
  revisions: readonly CaseEvidenceRevision[],
): CoverageSummary {
  const counts: CoverageSummary['counts'] = {
    selected: attempts.length,
    captured: 0,
    reused: 0,
    failed: 0,
    skipped: 0,
    unsupported: 0,
    cancelled: 0,
    interrupted: 0,
    missing: 0,
    stale: 0,
  };
  for (const attempt of attempts) counts[attempt.result] += 1;
  const evidenceLevelBreakdown: Partial<Record<EvidenceLevel, number>> = {};
  let traceable = 0;
  let heuristic = 0;
  let unknown = 0;
  let conflict = 0;
  for (const revision of revisions) {
    evidenceLevelBreakdown[revision.evidenceLevel] =
      (evidenceLevelBreakdown[revision.evidenceLevel] ?? 0) + 1;
    for (const fact of revision.facts) {
      if (fact.resolution === 'unknown') unknown += 1;
      else if (fact.resolution === 'unresolved-conflict') conflict += 1;
      else if (
        fact.candidates.some(
          (candidate) =>
            candidate.provenance.source === 'heuristic' ||
            candidate.provenance.confidence === 'low',
        )
      ) {
        heuristic += 1;
      } else {
        traceable += 1;
      }
    }
  }
  return CoverageSummary.parse({
    counts,
    evidenceLevelBreakdown,
    factQuality: { traceable, heuristic, unknown, conflict },
    denominator: attempts.length,
  });
}

/** Immutable Issues for required unknown/conflict Facts in newly captured revisions. */
export function issuesForCapturedRevisions(
  revisions: readonly CaseEvidenceRevision[],
): Issue[] {
  const issues = new Map<string, Issue>();
  for (const revision of revisions) {
    for (const fact of revision.facts) {
      if (
        !fact.issueRef ||
        (fact.resolution !== 'unknown' &&
          fact.resolution !== 'unresolved-conflict')
      ) {
        continue;
      }
      const existing = issues.get(fact.issueRef);
      if (existing) {
        issues.set(fact.issueRef, {
          ...existing,
          affectedCaseIds: [...new Set([...existing.affectedCaseIds, revision.caseId])].sort(),
          evidenceRefs: [...new Set([...existing.evidenceRefs, fact.factId])].sort(),
        });
        continue;
      }
      issues.set(
        fact.issueRef,
        Issue.parse({
          schemaVersion: V2_SCHEMA_MAJOR,
          issueId: fact.issueRef,
          severity: 'warning',
          reason:
            fact.resolution === 'unknown'
              ? `Fact ${fact.factId} is required but remains unknown.`
              : `Fact ${fact.factId} has an unresolved conflict.`,
          affectedCaseIds: [revision.caseId],
          evidenceRefs: [fact.factId],
          nextAction:
            'Add an explicit Variant, Scenario Checkpoint or higher-level Evidence source, then recapture.',
        }),
      );
    }
  }
  return [...issues.values()];
}

export function buildNextSnapshot(input: BuildNextSnapshotInput): BundleSnapshot {
  const { previousSnapshot, run, revisionsById, snapshotId, committedAt, coverage } = input;

  const activeStateByCase = new Map<CaseId, CaseActiveState>();
  const latestAttemptByKey = new Map<string, LatestAttemptRef>();
  for (const ref of previousSnapshot?.latestAttempts ?? []) {
    latestAttemptByKey.set(`${ref.caseId}#${ref.scopeKey}`, ref);
  }

  const touchedCaseIds = new Set(run.attempts.map((attempt) => attempt.caseId));
  for (const caseId of touchedCaseIds) {
    activeStateByCase.set(caseId, activeStateFor(caseId, previousSnapshot?.activeSlots ?? [], revisionsById));
  }

  for (const attempt of run.attempts) {
    const state = activeStateByCase.get(attempt.caseId);
    if (!state) throw new Error(`internal error: no active state prepared for case ${attempt.caseId}`);

    const candidate = attempt.revisionId ? toActivationCandidate(lookupRevision(revisionsById, attempt.revisionId)) : undefined;
    const { nextState } = applyAttemptToActiveRevisions({
      caseId: attempt.caseId,
      state,
      attemptResult: attempt.result,
      candidate,
    });
    activeStateByCase.set(attempt.caseId, nextState);

    latestAttemptByKey.set(`${attempt.caseId}#${attempt.scopeKey}`, {
      caseId: attempt.caseId,
      scopeKey: attempt.scopeKey,
      attemptId: attempt.attemptId,
      runId: attempt.runId,
    });
  }

  const carriedForwardCaseIds = new Set((previousSnapshot?.activeSlots ?? []).map((slot) => slot.caseId));
  for (const caseId of touchedCaseIds) carriedForwardCaseIds.delete(caseId);

  const activeSlots: ActiveSlot[] = [
    ...[...carriedForwardCaseIds].flatMap((caseId) =>
      (previousSnapshot?.activeSlots ?? []).filter((slot) => slot.caseId === caseId),
    ),
    ...[...activeStateByCase.entries()].flatMap(([caseId, state]) => stateToSlots(caseId, state)),
  ];

  return {
    schemaVersion: run.schemaVersion,
    snapshotId,
    workspaceId: run.workspaceId,
    bundleId: run.bundleId,
    prototypeId: run.selection.prototypeId,
    sourceRunId: run.runId,
    committedAt,
    activeSlots,
    latestAttempts: [...latestAttemptByKey.values()],
    catalogRefs: input.catalogRefs ?? previousSnapshot?.catalogRefs ?? [],
    coverage,
  };
}

import { AgentHandoff, type Risk } from '../contracts/handoff.js';
import type { BundleId, SnapshotId } from '../contracts/ids.js';
import type { SelectedCase } from '../contracts/run.js';
import { computeScopeKey } from '../contracts/scope.js';
import type { StalenessReport } from '../contracts/staleness.js';
import type {
  CoverageStatus,
  FreshnessStatus,
  RiskKind,
} from '../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import {
  ambiguousReferenceError,
  unknownReferenceError,
  V2ContractError,
} from '../contracts/errors.js';
import { resolveCaseEvidence } from '../resolver/active-ref-resolver.js';
import type { V2Store } from '../store/types.js';
import { generateOperationalId } from '../store/id-generator.js';
import type { SnapshotCatalogRef } from '../contracts/snapshot.js';

export type HandoffEvaluation = {
  selectedCases: AgentHandoff['selectedCases'];
  coverageStatus: CoverageStatus;
  freshnessStatus: FreshnessStatus;
  risks: Risk[];
  catalogRefs: SnapshotCatalogRef[];
  interactionCoverage?: NonNullable<AgentHandoff['interactionCoverage']>;
};

export type EvaluateHandoffInput = {
  store: V2Store;
  bundleId: BundleId;
  snapshotId: SnapshotId;
  selectedCases?: SelectedCase[];
  stalenessReport: StalenessReport;
  interactionCoverage?: NonNullable<AgentHandoff['interactionCoverage']>;
};

function uniqueRisks(risks: Risk[]): Risk[] {
  const seen = new Set<string>();
  return risks.filter((risk) => {
    const key = `${risk.kind}:${risk.message}:${risk.refs.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function evaluateAgentHandoff(
  input: EvaluateHandoffInput,
): Promise<HandoffEvaluation> {
  const bundle = await input.store.getBundle(input.bundleId);
  if (!bundle) throw unknownReferenceError('Handoff Bundle', input.bundleId);
  const snapshot = await input.store.getSnapshot(
    input.bundleId,
    input.snapshotId,
  );
  if (!snapshot)
    throw unknownReferenceError('Handoff Snapshot', input.snapshotId);
  if (
    input.stalenessReport.bundleId !== bundle.bundleId ||
    input.stalenessReport.snapshotId !== snapshot.snapshotId
  ) {
    throw new V2ContractError(
      'workspace-mismatch',
      'Handoff Staleness Report does not match the selected Bundle Snapshot.',
    );
  }
  const runs = await input.store.listRuns(input.bundleId);
  const revisions = await input.store.listEvidenceRevisions(input.bundleId);
  const blobs = await input.store.listBlobRecords(input.bundleId);
  const revisionsWithScreenshots = new Set(
    blobs
      .filter((blob) => blob.kind === 'screenshot')
      .flatMap((blob) =>
        blob.ownerRefs
          .filter((owner) => owner.kind === 'revision')
          .map((owner) => owner.objectId),
      ),
  );
  const sourceRun = runs.find((run) => run.runId === snapshot.sourceRunId);
  if (!sourceRun)
    throw unknownReferenceError('Handoff source Run', snapshot.sourceRunId);
  const selectedCases = input.selectedCases ?? sourceRun.selection.cases;
  const revisionsById = new Map(
    revisions.map((revision) => [revision.revisionId, revision] as const),
  );
  const attemptsById = new Map(
    runs.flatMap((run) =>
      run.attempts.map((attempt) => [attempt.attemptId, attempt] as const),
    ),
  );
  const staleByRevision = new Map(
    input.stalenessReport.perRevision.map(
      (entry) => [entry.revisionId, entry.stale] as const,
    ),
  );
  let incomplete = false;
  let attemptIncomplete = false;
  let stale = false;
  const selectedRefs: AgentHandoff['selectedCases'] = [];
  const risks: Risk[] = [];
  const requiredCatalogKinds = new Set<'component' | 'token'>();

  for (const selected of selectedCases) {
    const resolution = resolveCaseEvidence({
      snapshot,
      snapshotAttempts: snapshot,
      caseId: selected.caseId,
      requestedScope: selected.captureScope,
      revisionScopeOf: (revisionId) => {
        const revision = revisionsById.get(revisionId);
        if (!revision)
          throw unknownReferenceError('Handoff revision', revisionId);
        return revision.captureScope;
      },
      attemptResultOf: (attemptId) => {
        const attempt = attemptsById.get(attemptId);
        if (!attempt) throw unknownReferenceError('Handoff Attempt', attemptId);
        return attempt.result;
      },
    });
    if (resolution.activeRef.outcome === 'ambiguous') {
      throw ambiguousReferenceError(
        'Handoff active Evidence',
        resolution.activeRef.candidates,
      );
    }
    const scopeKey = computeScopeKey(selected.captureScope);
    if (
      resolution.activeRef.outcome === 'missing' ||
      !resolution.relevantAttempt
    ) {
      incomplete = true;
      attemptIncomplete = true;
      selectedRefs.push({
        caseId: selected.caseId,
        captureScope: selected.captureScope,
        scopeKey,
        resolution: 'missing',
        ...(resolution.relevantAttempt
          ? { relevantAttemptId: resolution.relevantAttempt.attemptId }
          : {}),
      });
      continue;
    }
    const revision = revisionsById.get(resolution.activeRef.slot.revisionId);
    if (!revision) {
      throw unknownReferenceError(
        'Handoff revision',
        resolution.activeRef.slot.revisionId,
      );
    }
    selectedRefs.push({
      caseId: selected.caseId,
      captureScope: selected.captureScope,
      scopeKey,
      resolution: 'resolved',
      revisionId: revision.revisionId,
      relevantAttemptId: resolution.relevantAttempt.attemptId,
    });
    if (!resolution.isComplete) {
      incomplete = true;
      attemptIncomplete = true;
    }
    const revisionStale = staleByRevision.get(revision.revisionId);
    if (revisionStale === undefined) {
      throw unknownReferenceError(
        'Handoff Staleness entry',
        revision.revisionId,
      );
    }
    stale ||= revisionStale;
    if (revisionStale) {
      risks.push({
        kind: 'stale-evidence',
        message: `Evidence ${revision.revisionId} is stale for the current producer input.`,
        refs: [revision.revisionId],
      });
    }
    const unknownFacts = revision.facts.filter(
      (fact) => fact.resolution === 'unknown',
    );
    if (unknownFacts.length > 0) {
      risks.push({
        kind: 'required-unknown',
        message: `${unknownFacts.length} facts remain unknown in ${revision.revisionId}.`,
        refs: unknownFacts.map((fact) => fact.factId),
      });
    }
    const conflicts = revision.facts.filter(
      (fact) => fact.resolution === 'unresolved-conflict',
    );
    if (revision.facts.some((fact) => fact.factId.endsWith('.componentId'))) {
      requiredCatalogKinds.add('component');
    }
    if (revision.facts.some((fact) => fact.factId.endsWith('.tokenBindings'))) {
      requiredCatalogKinds.add('token');
    }
    if (conflicts.length > 0) {
      risks.push({
        kind: 'unresolved-conflict',
        message: `${conflicts.length} facts remain conflicted in ${revision.revisionId}.`,
        refs: conflicts.map((fact) => fact.factId),
      });
    }
    if (
      selected.captureScope.sourcePolicy &&
      revision.evidenceLevel !== 'instrumented-source-runtime'
    ) {
      risks.push({
        kind: 'evidence-level-limitation',
        message: `Source was requested but ${revision.revisionId} only provides ${revision.evidenceLevel}.`,
        refs: [revision.revisionId],
      });
    }
    if (
      selected.captureScope.screenshots.mode !== 'none' &&
      !revisionsWithScreenshots.has(revision.revisionId)
    ) {
      incomplete = true;
      risks.push({
        kind: 'partial-coverage',
        message: `Screenshot Evidence was requested but no screenshot Blob is stored for ${revision.revisionId}.`,
        refs: [revision.revisionId],
      });
    }
  }

  if (attemptIncomplete) {
    risks.unshift({
      kind: 'partial-coverage',
      message:
        'At least one selected Case/Scope lacks a successful relevant Attempt.',
      refs: selectedRefs
        .filter((selected) => selected.resolution === 'missing')
        .map((selected) => `${selected.caseId}/${selected.scopeKey}`),
    });
  }
  if (input.interactionCoverage?.missingScenarioIds.length) {
    risks.push({
      kind: 'interaction-coverage',
      message: `${input.interactionCoverage.missingScenarioIds.length} required interaction Scenario(s) have no Evidence.`,
      refs: input.interactionCoverage.missingScenarioIds,
    });
  }
  for (const kind of requiredCatalogKinds) {
    if (!snapshot.catalogRefs.some((reference) => reference.kind === kind)) {
      throw new V2ContractError(
        'unknown-reference',
        `Handoff Evidence uses ${kind} facts but fixed Snapshot ${snapshot.snapshotId} has no ${kind} Catalog revision.`,
        { snapshotId: snapshot.snapshotId, kind },
      );
    }
  }
  for (const reference of snapshot.catalogRefs) {
    if (
      !(await input.store.getCatalogRevision(
        input.bundleId,
        reference.catalogRevisionId,
      ))
    ) {
      throw unknownReferenceError('Handoff Catalog revision', reference);
    }
  }

  return {
    selectedCases: selectedRefs,
    coverageStatus: incomplete ? 'partial' : 'complete',
    freshnessStatus: stale ? 'stale' : 'fresh',
    risks: uniqueRisks(risks),
    catalogRefs: snapshot.catalogRefs,
    ...(input.interactionCoverage
      ? { interactionCoverage: input.interactionCoverage }
      : {}),
  };
}

export type CreateAgentHandoffInput = EvaluateHandoffInput & {
  currentInputVersion: string;
  implementationIntent?: string;
  acknowledgedRiskKinds: RiskKind[];
  persist?: boolean;
};

export async function createAgentHandoff(
  input: CreateAgentHandoffInput,
): Promise<AgentHandoff> {
  if (input.stalenessReport.inputVersion !== input.currentInputVersion) {
    throw new V2ContractError(
      'preflight-expired',
      'Producer input changed after the Staleness Report was generated.',
    );
  }
  const evaluation = await evaluateAgentHandoff(input);
  const createdAt = new Date().toISOString();
  const handoff = AgentHandoff.parse({
    schemaVersion: V2_SCHEMA_MAJOR,
    handoffId: generateOperationalId('handoff'),
    workspaceId: input.store.workspaceId,
    bundleId: input.bundleId,
    snapshotId: input.snapshotId,
    createdAt,
    ...(input.implementationIntent
      ? { implementationIntent: input.implementationIntent }
      : {}),
    selectedCases: evaluation.selectedCases,
    coverageStatus: evaluation.coverageStatus,
    ...(evaluation.interactionCoverage
      ? { interactionCoverage: evaluation.interactionCoverage }
      : {}),
    freshnessStatus: evaluation.freshnessStatus,
    stalenessReportId: input.stalenessReport.reportId,
    risks: evaluation.risks,
    ...(evaluation.risks.length > 0
      ? {
          riskAcknowledgement: {
            acknowledgedAt: createdAt,
            acknowledgedRiskKinds: input.acknowledgedRiskKinds,
          },
        }
      : {}),
    resourceRefs: [
      {
        kind: 'bundle-snapshot',
        ref: `pb://workspace/${input.store.workspaceId}/bundle/${input.bundleId}/snapshot/${input.snapshotId}`,
      },
      ...evaluation.catalogRefs.map((reference) => ({
        kind: `${reference.kind}-catalog`,
        ref: `pb://workspace/${input.store.workspaceId}/bundle/${input.bundleId}/snapshot/${input.snapshotId}/catalog/${reference.catalogRevisionId}`,
      })),
    ],
  });
  if (input.persist !== false) await input.store.putHandoff(handoff);
  return handoff;
}

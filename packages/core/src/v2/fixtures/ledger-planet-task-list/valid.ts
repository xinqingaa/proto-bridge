import type { CaseEvidenceRevision } from '../../contracts/evidence.js';
import type { Fact } from '../../contracts/evidence.js';
import type { CaseAttempt } from '../../contracts/attempt.js';
import type { Bundle } from '../../contracts/bundle.js';
import type { Workspace } from '../../contracts/workspace.js';
import type { Issue } from '../../contracts/issue.js';
import { computeCaseId, type CaseKey } from '../../contracts/case.js';
import type { Run } from '../../contracts/run.js';
import type { BundleSnapshot } from '../../contracts/snapshot.js';
import type { StalenessReport } from '../../contracts/staleness.js';
import type { AgentHandoff } from '../../contracts/handoff.js';
import type { AttemptId, CaseEvidenceRevisionId } from '../../contracts/ids.js';
import type { AttemptResult } from '../../contracts/vocabulary.js';
import type { NormalizedCaptureScope } from '../../contracts/scope.js';
import { V2_SCHEMA_MAJOR } from '../../contracts/version.js';
import {
  BUNDLE_ID,
  FULL_CASE_SCOPE,
  FULL_CASE_SCOPE_KEY,
  LIST_FRAGMENT_SCOPE,
  LIST_FRAGMENT_SCOPE_KEY,
  PROTOTYPE_ID,
  T0,
  T1,
  T2,
  TASK_LIST_CASE_ID,
  TASK_LIST_CASE_KEY,
  WORKSPACE_ID,
} from './shared.js';

const INPUT_VERSION = 'registry-rev-2026-07-28';

export const RUN_1_ID = 'run-2026-07-28t0900';
export const RUN_2_ID = 'run-2026-07-28t1000';
export const ATTEMPT_1_ID = 'attempt-run-2026-07-28t0900-primary';
export const ATTEMPT_2_ID = 'attempt-run-2026-07-28t1000-fragment';
export const PRIMARY_REVISION_ID = 'task-list-default-primary-rev1';
export const FRAGMENT_REVISION_ID = 'task-list-default-list-fragment-rev1';
export const SNAPSHOT_ID = 'snapshot-2026-07-28t1005';
export const STALENESS_REPORT_ID = 'staleness-2026-07-28t1010';
export const HANDOFF_ID = 'handoff-2026-07-28t1015';
export const PARTIAL_RUN_ID = 'run-2026-07-28t1100-fragment-retry';
export const PARTIAL_ATTEMPT_ID = 'attempt-run-2026-07-28t1100-fragment-retry';
export const PARTIAL_SNAPSHOT_ID = 'snapshot-2026-07-28t1105';
export const PARTIAL_STALENESS_REPORT_ID = 'staleness-2026-07-28t1110';
export const PARTIAL_HANDOFF_ID = 'handoff-2026-07-28t1115';
export const STALE_STALENESS_REPORT_ID = 'staleness-2026-07-28t1120';
export const STALE_HANDOFF_ID = 'handoff-2026-07-28t1125';
export const MISSING_PARTIAL_HANDOFF_ID = 'handoff-2026-07-28t1130-missing-case';

export const MISSING_CASE_KEY: CaseKey = { ...TASK_LIST_CASE_KEY, variantId: 'empty' };
export const MISSING_CASE_ID = computeCaseId(MISSING_CASE_KEY);

export const BUNDLE: Bundle = {
  schemaVersion: V2_SCHEMA_MAJOR,
  bundleId: BUNDLE_ID,
  workspaceId: WORKSPACE_ID,
  prototypeId: PROTOTYPE_ID,
  status: 'writable',
  createdAt: T0,
};

export const WORKSPACE: Workspace = {
  schemaVersion: V2_SCHEMA_MAJOR,
  workspaceId: WORKSPACE_ID,
  prototypeIds: [PROTOTYPE_ID],
  createdAt: T0,
};

/** Base Case for the reference vertical slice: `ledger-planet.task-list` × `default` × `light` × `iphone-14`, no Scenario. */
export const BASE_CASE = TASK_LIST_CASE_KEY;

export const PRIMARY_ACTIVE_REVISION: CaseEvidenceRevision = {
  schemaVersion: V2_SCHEMA_MAJOR,
  revisionId: PRIMARY_REVISION_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: FULL_CASE_SCOPE,
  scopeKey: FULL_CASE_SCOPE_KEY,
  evidenceLevel: 'instrumented-source-runtime',
  inputDigest: INPUT_VERSION,
  dependencyDigests: [
    { dependencyId: 'registry:ledger-planet.task-list', digest: 'registry-task-list-v1' },
    { dependencyId: 'source:ledger-planet.task-list', digest: 'source-task-list-v1' },
  ],
  capturedAt: T1,
  facts: [
    {
      factId: 'ledger-planet.task-list.root.role',
      candidates: [{ value: 'page', provenance: { source: 'data-pb', locator: 'ledger-planet.task-list.root#data-pb-role' } }],
      resolution: 'resolved',
      effectiveValue: 'page',
    },
  ],
  requiredFactsTotal: 1,
  requiredFactsResolved: 1,
};

export const FRAGMENT_SCOPED_ACTIVE_REVISION: CaseEvidenceRevision = {
  schemaVersion: V2_SCHEMA_MAJOR,
  revisionId: FRAGMENT_REVISION_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: LIST_FRAGMENT_SCOPE,
  scopeKey: LIST_FRAGMENT_SCOPE_KEY,
  evidenceLevel: 'instrumented-runtime',
  inputDigest: INPUT_VERSION,
  dependencyDigests: [
    { dependencyId: 'registry:ledger-planet.task-list', digest: 'registry-task-list-v1' },
    { dependencyId: 'runtime:ledger-planet.task-list.list', digest: 'runtime-task-list-list-v1' },
  ],
  capturedAt: T2,
  facts: [
    {
      factId: 'ledger-planet.task-list.list.role',
      candidates: [{ value: 'list', provenance: { source: 'data-pb', locator: 'ledger-planet.task-list.list#data-pb-role' } }],
      resolution: 'resolved',
      effectiveValue: 'list',
    },
  ],
  requiredFactsTotal: 1,
  requiredFactsResolved: 1,
};

export const PRIMARY_CAPTURE_ATTEMPT: CaseAttempt = {
  schemaVersion: V2_SCHEMA_MAJOR,
  attemptId: ATTEMPT_1_ID,
  runId: RUN_1_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: FULL_CASE_SCOPE,
  scopeKey: FULL_CASE_SCOPE_KEY,
  result: 'captured',
  revisionId: PRIMARY_REVISION_ID,
  startedAt: T0,
  endedAt: T1,
};

export const FRAGMENT_CAPTURE_ATTEMPT: CaseAttempt = {
  schemaVersion: V2_SCHEMA_MAJOR,
  attemptId: ATTEMPT_2_ID,
  runId: RUN_2_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: LIST_FRAGMENT_SCOPE,
  scopeKey: LIST_FRAGMENT_SCOPE_KEY,
  result: 'captured',
  revisionId: FRAGMENT_REVISION_ID,
  startedAt: T1,
  endedAt: T2,
};

export const RUN_1: Run = {
  schemaVersion: V2_SCHEMA_MAJOR,
  runId: RUN_1_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  selection: {
    prototypeId: PROTOTYPE_ID,
    cases: [{ caseId: TASK_LIST_CASE_ID, caseKey: TASK_LIST_CASE_KEY, captureScope: FULL_CASE_SCOPE }],
    acceptedWarningIds: [],
  },
  inputVersion: INPUT_VERSION,
  startedAt: T0,
  endedAt: T1,
  terminationReason: 'completed',
  attempts: [PRIMARY_CAPTURE_ATTEMPT],
  coverage: {
    counts: { selected: 1, captured: 1, reused: 0, failed: 0, skipped: 0, unsupported: 0, cancelled: 0, interrupted: 0, missing: 0, stale: 0 },
    evidenceLevelBreakdown: { 'instrumented-source-runtime': 1 },
    factQuality: { traceable: 1, heuristic: 0, unknown: 0, conflict: 0 },
    denominator: 1,
  },
};

export const RUN_2: Run = {
  schemaVersion: V2_SCHEMA_MAJOR,
  runId: RUN_2_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  selection: {
    prototypeId: PROTOTYPE_ID,
    cases: [{ caseId: TASK_LIST_CASE_ID, caseKey: TASK_LIST_CASE_KEY, captureScope: LIST_FRAGMENT_SCOPE }],
    acceptedWarningIds: [],
  },
  inputVersion: INPUT_VERSION,
  startedAt: T1,
  endedAt: T2,
  terminationReason: 'completed',
  attempts: [FRAGMENT_CAPTURE_ATTEMPT],
  coverage: {
    counts: { selected: 1, captured: 1, reused: 0, failed: 0, skipped: 0, unsupported: 0, cancelled: 0, interrupted: 0, missing: 0, stale: 0 },
    evidenceLevelBreakdown: { 'instrumented-runtime': 1 },
    factQuality: { traceable: 1, heuristic: 0, unknown: 0, conflict: 0 },
    denominator: 1,
  },
};

/**
 * Snapshot committed after Run 2: it carries forward Run 1's `primary`
 * active revision and adds Run 2's Fragment `scoped` active revision, plus
 * both Runs' latest Attempt refs at Fragment granularity
 * (pb-v2-spec.md "Run、Attempt、Revision 与 Snapshot").
 */
export const SNAPSHOT: BundleSnapshot = {
  schemaVersion: V2_SCHEMA_MAJOR,
  snapshotId: SNAPSHOT_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  prototypeId: PROTOTYPE_ID,
  sourceRunId: RUN_2_ID,
  committedAt: T2,
  activeSlots: [
    { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    { caseId: TASK_LIST_CASE_ID, kind: 'scoped', scopeKey: LIST_FRAGMENT_SCOPE_KEY, revisionId: FRAGMENT_REVISION_ID },
  ],
  latestAttempts: [
    { caseId: TASK_LIST_CASE_ID, scopeKey: FULL_CASE_SCOPE_KEY, attemptId: ATTEMPT_1_ID, runId: RUN_1_ID },
    { caseId: TASK_LIST_CASE_ID, scopeKey: LIST_FRAGMENT_SCOPE_KEY, attemptId: ATTEMPT_2_ID, runId: RUN_2_ID },
  ],
  catalogRefs: [],
  coverage: {
    counts: { selected: 2, captured: 2, reused: 0, failed: 0, skipped: 0, unsupported: 0, cancelled: 0, interrupted: 0, missing: 0, stale: 0 },
    evidenceLevelBreakdown: { 'instrumented-source-runtime': 1, 'instrumented-runtime': 1 },
    factQuality: { traceable: 2, heuristic: 0, unknown: 0, conflict: 0 },
    denominator: 2,
  },
};

export const STALENESS_REPORT: StalenessReport = {
  schemaVersion: V2_SCHEMA_MAJOR,
  reportId: STALENESS_REPORT_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  snapshotId: SNAPSHOT_ID,
  checkedAt: T2,
  inputVersion: INPUT_VERSION,
  perRevision: [
    { revisionId: PRIMARY_REVISION_ID, caseId: TASK_LIST_CASE_ID, scopeKey: FULL_CASE_SCOPE_KEY, stale: false },
    { revisionId: FRAGMENT_REVISION_ID, caseId: TASK_LIST_CASE_ID, scopeKey: LIST_FRAGMENT_SCOPE_KEY, stale: false },
  ],
};

/** `coverageStatus=complete`, `freshnessStatus=fresh`, no required risk. */
export const HANDOFF: AgentHandoff = {
  schemaVersion: V2_SCHEMA_MAJOR,
  handoffId: HANDOFF_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  snapshotId: SNAPSHOT_ID,
  createdAt: T2,
  implementationIntent: 'Implement the task list screen in the target Flutter app',
  selectedCases: [
    {
      caseId: TASK_LIST_CASE_ID,
      captureScope: FULL_CASE_SCOPE,
      scopeKey: FULL_CASE_SCOPE_KEY,
      resolution: 'resolved',
      revisionId: PRIMARY_REVISION_ID,
      relevantAttemptId: ATTEMPT_1_ID,
    },
  ],
  coverageStatus: 'complete',
  freshnessStatus: 'fresh',
  stalenessReportId: STALENESS_REPORT_ID,
  risks: [],
  resourceRefs: [{ kind: 'case', ref: TASK_LIST_CASE_ID }],
};

export const UNKNOWN_FACT: Fact = {
  factId: 'ledger-planet.task-list.hidden-state',
  candidates: [{ value: null, provenance: { source: 'runtime-observation', locator: 'task-list:hidden-state', confidence: 'low' } }],
  resolution: 'unknown',
  issueRef: 'issue-task-list-hidden-state',
};

export const UNKNOWN_ISSUE: Issue = {
  schemaVersion: V2_SCHEMA_MAJOR,
  issueId: 'issue-task-list-hidden-state',
  severity: 'warning',
  reason: 'The hidden task-list state cannot be proven from the current Evidence Level.',
  affectedCaseIds: [TASK_LIST_CASE_ID],
  evidenceRefs: [PRIMARY_REVISION_ID],
  nextAction: 'Capture the state through an explicit Variant or Scenario Checkpoint.',
};

export const CONFLICT_FACT: Fact = {
  factId: 'ledger-planet.task-list.title',
  candidates: [
    { value: '任务中心', provenance: { source: 'source', locator: 'TaskList.vue:title' } },
    { value: '福利任务', provenance: { source: 'runtime-observation', locator: 'ledger-planet.task-list.root:title' } },
  ],
  resolution: 'unresolved-conflict',
  issueRef: 'issue-task-list-title-conflict',
};

export const PARTIAL_FRAGMENT_ATTEMPT: CaseAttempt = {
  schemaVersion: V2_SCHEMA_MAJOR,
  attemptId: PARTIAL_ATTEMPT_ID,
  runId: PARTIAL_RUN_ID,
  caseId: TASK_LIST_CASE_ID,
  captureScope: LIST_FRAGMENT_SCOPE,
  scopeKey: LIST_FRAGMENT_SCOPE_KEY,
  result: 'failed',
  reason: 'Runtime timed out waiting for the list Fragment to stabilize.',
  startedAt: T2,
  endedAt: T2,
};

export const PARTIAL_RUN: Run = {
  schemaVersion: V2_SCHEMA_MAJOR,
  runId: PARTIAL_RUN_ID,
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  selection: {
    prototypeId: PROTOTYPE_ID,
    cases: [{ caseId: TASK_LIST_CASE_ID, caseKey: TASK_LIST_CASE_KEY, captureScope: LIST_FRAGMENT_SCOPE }],
    acceptedWarningIds: [],
  },
  inputVersion: INPUT_VERSION,
  startedAt: T2,
  endedAt: T2,
  terminationReason: 'completed',
  attempts: [PARTIAL_FRAGMENT_ATTEMPT],
  coverage: {
    counts: { selected: 1, captured: 0, reused: 0, failed: 1, skipped: 0, unsupported: 0, cancelled: 0, interrupted: 0, missing: 0, stale: 0 },
    evidenceLevelBreakdown: {},
    factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
    denominator: 1,
  },
};

export const PARTIAL_SNAPSHOT: BundleSnapshot = {
  ...SNAPSHOT,
  snapshotId: PARTIAL_SNAPSHOT_ID,
  sourceRunId: PARTIAL_RUN_ID,
  committedAt: T2,
  latestAttempts: [
    SNAPSHOT.latestAttempts[0]!,
    { caseId: TASK_LIST_CASE_ID, scopeKey: LIST_FRAGMENT_SCOPE_KEY, attemptId: PARTIAL_ATTEMPT_ID, runId: PARTIAL_RUN_ID },
  ],
  catalogRefs: [],
  coverage: {
    counts: { selected: 2, captured: 1, reused: 0, failed: 1, skipped: 0, unsupported: 0, cancelled: 0, interrupted: 0, missing: 0, stale: 0 },
    evidenceLevelBreakdown: { 'instrumented-source-runtime': 1, 'instrumented-runtime': 1 },
    factQuality: { traceable: 2, heuristic: 0, unknown: 0, conflict: 0 },
    denominator: 2,
  },
};

export const PARTIAL_STALENESS_REPORT: StalenessReport = {
  ...STALENESS_REPORT,
  reportId: PARTIAL_STALENESS_REPORT_ID,
  snapshotId: PARTIAL_SNAPSHOT_ID,
};

export const PARTIAL_HANDOFF: AgentHandoff = {
  ...HANDOFF,
  handoffId: PARTIAL_HANDOFF_ID,
  snapshotId: PARTIAL_SNAPSHOT_ID,
  selectedCases: [
    {
      caseId: TASK_LIST_CASE_ID,
      captureScope: LIST_FRAGMENT_SCOPE,
      scopeKey: LIST_FRAGMENT_SCOPE_KEY,
      resolution: 'resolved',
      revisionId: FRAGMENT_REVISION_ID,
      relevantAttemptId: PARTIAL_ATTEMPT_ID,
    },
  ],
  coverageStatus: 'partial',
  stalenessReportId: PARTIAL_STALENESS_REPORT_ID,
  risks: [{ kind: 'partial-coverage', message: 'The latest Fragment retry failed.', refs: [PARTIAL_ATTEMPT_ID] }],
  riskAcknowledgement: { acknowledgedAt: T2, acknowledgedRiskKinds: ['partial-coverage'] },
};

export const STALE_STALENESS_REPORT: StalenessReport = {
  ...STALENESS_REPORT,
  reportId: STALE_STALENESS_REPORT_ID,
  perRevision: STALENESS_REPORT.perRevision.map((entry) =>
    entry.revisionId === PRIMARY_REVISION_ID
      ? { ...entry, stale: true, reason: 'The task-list source dependency digest changed.' }
      : entry,
  ),
};

export const STALE_HANDOFF: AgentHandoff = {
  ...HANDOFF,
  handoffId: STALE_HANDOFF_ID,
  freshnessStatus: 'stale',
  stalenessReportId: STALE_STALENESS_REPORT_ID,
  risks: [{ kind: 'stale-evidence', message: 'The selected primary revision is stale.', refs: [PRIMARY_REVISION_ID] }],
  riskAcknowledgement: { acknowledgedAt: T2, acknowledgedRiskKinds: ['stale-evidence'] },
};

export const MISSING_PARTIAL_HANDOFF: AgentHandoff = {
  ...HANDOFF,
  handoffId: MISSING_PARTIAL_HANDOFF_ID,
  selectedCases: [
    HANDOFF.selectedCases[0]!,
    {
      caseId: MISSING_CASE_ID,
      captureScope: FULL_CASE_SCOPE,
      scopeKey: FULL_CASE_SCOPE_KEY,
      resolution: 'missing',
    },
  ],
  coverageStatus: 'partial',
  risks: [{ kind: 'partial-coverage', message: 'The empty Variant has no active Evidence or Attempt.', refs: [MISSING_CASE_ID] }],
  riskAcknowledgement: { acknowledgedAt: T2, acknowledgedRiskKinds: ['partial-coverage'] },
};

export function revisionScopeOf(revisionId: CaseEvidenceRevisionId): NormalizedCaptureScope {
  if (revisionId === PRIMARY_REVISION_ID) return PRIMARY_ACTIVE_REVISION.captureScope;
  if (revisionId === FRAGMENT_REVISION_ID) return FRAGMENT_SCOPED_ACTIVE_REVISION.captureScope;
  throw new Error(`unknown revisionId in fixtures: ${revisionId}`);
}

export function attemptResultOf(attemptId: AttemptId): AttemptResult {
  if (attemptId === ATTEMPT_1_ID) return PRIMARY_CAPTURE_ATTEMPT.result;
  if (attemptId === ATTEMPT_2_ID) return FRAGMENT_CAPTURE_ATTEMPT.result;
  throw new Error(`unknown attemptId in fixtures: ${attemptId}`);
}

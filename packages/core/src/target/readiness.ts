import type { AcceptanceDimension } from '../v2/acceptance-contract.js';
import type {
  TargetResolutionBatch,
  TargetResolutionStatus,
  TargetRevisionKey,
} from './types.js';

export const TARGET_READINESS_CONTRACT_VERSION = 1 as const;

export type TargetAuthorityFact = {
  available: boolean;
  authority: string;
  source?: string;
  reason: string;
};

export type TargetAdapterAuthorityInspection = {
  adapterId: string;
  supported: boolean;
  targetRevisionKey: TargetRevisionKey;
  authorities: Partial<Record<AcceptanceDimension, TargetAuthorityFact>>;
  declaredCaseIds?: string[];
  declaredScenarioIds?: string[];
  warnings: string[];
};

export type TargetReadinessInput = {
  adapter: {
    id: string;
    supported: boolean;
    confidence: 'high' | 'low';
    reason: string;
  };
  targetRevisionKey: TargetRevisionKey;
  components: TargetResolutionBatch;
  tokens: TargetResolutionBatch;
  authorities: Partial<Record<AcceptanceDimension, TargetAuthorityFact>>;
  requiredDimensions: AcceptanceDimension[];
  requiredCaseIds: string[];
  declaredCaseIds?: string[];
  requiredScenarioIds?: string[];
  declaredScenarioIds?: string[];
  warnings?: string[];
};

export type TargetResolutionCoverage = {
  required: number;
  byStatus: Record<TargetResolutionStatus, number>;
  resolvedIds: string[];
  candidateIds: string[];
  conflictIds: string[];
  staleIds: string[];
  unresolvedIds: string[];
  unsupportedIds: string[];
};

export type TargetReadinessBlocker = {
  code:
    | 'adapter-unsupported'
    | 'mapping-unresolved'
    | 'mapping-candidate'
    | 'mapping-conflict'
    | 'mapping-stale'
    | 'inspector-missing'
    | 'case-not-declared'
    | 'scenario-not-declared';
  dimension?: AcceptanceDimension;
  ids?: string[];
  detail: string;
};

export type TargetReadinessReport = {
  contractVersion: typeof TARGET_READINESS_CONTRACT_VERSION;
  adapter: TargetReadinessInput['adapter'];
  targetRevisionKey: TargetRevisionKey;
  mapping: {
    components: TargetResolutionCoverage;
    tokens: TargetResolutionCoverage;
  };
  dimensions: Record<AcceptanceDimension, TargetAuthorityFact & {
    required: boolean;
    status: 'authoritative' | 'unverified';
  }>;
  expectedReviewAuthority: Record<AcceptanceDimension, string>;
  blockers: TargetReadinessBlocker[];
  warnings: string[];
  implementationReady: boolean;
  authoritativeReviewReady: boolean;
};

const STATUS_ORDER: TargetResolutionStatus[] = [
  'resolved', 'candidate', 'stale', 'conflict', 'unresolved', 'unsupported',
];

const EXPECTED_AUTHORITY: Record<AcceptanceDimension, string> = {
  structure: 'target-structure-inspector',
  components: 'target-component-occurrence-verifier',
  tokens: 'target-token-slot-verifier',
  states: 'target-state-inspector',
  interactions: 'target-scenario-transition-inspector',
};

export function analyzeTargetReadiness(input: TargetReadinessInput): TargetReadinessReport {
  const componentCoverage = coverage(input.components);
  const tokenCoverage = coverage(input.tokens);
  const blockers: TargetReadinessBlocker[] = [];
  if (!input.adapter.supported) {
    blockers.push({ code: 'adapter-unsupported', detail: input.adapter.reason });
  }
  addMappingBlockers(blockers, 'components', componentCoverage);
  addMappingBlockers(blockers, 'tokens', tokenCoverage);

  const requiredCases = new Set(input.requiredCaseIds);
  const declaredCases = new Set(input.declaredCaseIds ?? []);
  if (input.declaredCaseIds) {
    const missing = [...requiredCases].filter((caseId) => !declaredCases.has(caseId)).sort();
    if (missing.length) blockers.push({ code: 'case-not-declared', ids: missing, detail: 'Required Cases are not declared by the Target contract.' });
  }
  if (input.requiredScenarioIds && input.declaredScenarioIds) {
    const declared = new Set(input.declaredScenarioIds);
    const missing = [...new Set(input.requiredScenarioIds)].filter((id) => !declared.has(id)).sort();
    if (missing.length) blockers.push({ code: 'scenario-not-declared', ids: missing, dimension: 'interactions', detail: 'Required Scenarios are not declared by the Target contract.' });
  }

  const dimensions = Object.fromEntries((Object.keys(EXPECTED_AUTHORITY) as AcceptanceDimension[]).map((dimension) => {
    const fact = input.authorities[dimension] ?? {
      available: false,
      authority: EXPECTED_AUTHORITY[dimension],
      reason: 'No Target authority was declared for this dimension.',
    };
    const required = input.requiredDimensions.includes(dimension);
    if (required && !fact.available) blockers.push({ code: 'inspector-missing', dimension, detail: fact.reason });
    return [dimension, { ...fact, required, status: fact.available ? 'authoritative' : 'unverified' }];
  })) as TargetReadinessReport['dimensions'];

  const warnings = [...new Set([
    ...(input.warnings ?? []),
    ...input.components.warnings,
    ...input.tokens.warnings,
  ])];
  const implementationReady = input.adapter.supported && !blockers.some((item) =>
    item.code === 'adapter-unsupported' || item.code.startsWith('mapping-') || item.code === 'case-not-declared');
  const authoritativeReviewReady = implementationReady && !blockers.length;
  return {
    contractVersion: TARGET_READINESS_CONTRACT_VERSION,
    adapter: input.adapter,
    targetRevisionKey: input.targetRevisionKey,
    mapping: { components: componentCoverage, tokens: tokenCoverage },
    dimensions,
    expectedReviewAuthority: EXPECTED_AUTHORITY,
    blockers,
    warnings,
    implementationReady,
    authoritativeReviewReady,
  };
}

function coverage(batch: TargetResolutionBatch): TargetResolutionCoverage {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<TargetResolutionStatus, number>;
  const ids = Object.fromEntries(STATUS_ORDER.map((status) => [status, []])) as unknown as Record<TargetResolutionStatus, string[]>;
  for (const resolution of batch.resolutions) {
    byStatus[resolution.status] += 1;
    ids[resolution.status].push(resolution.id);
  }
  return {
    required: batch.resolutions.length,
    byStatus,
    resolvedIds: ids.resolved,
    candidateIds: ids.candidate,
    conflictIds: ids.conflict,
    staleIds: ids.stale,
    unresolvedIds: ids.unresolved,
    unsupportedIds: ids.unsupported,
  };
}

function addMappingBlockers(
  blockers: TargetReadinessBlocker[],
  dimension: 'components' | 'tokens',
  item: TargetResolutionCoverage,
): void {
  for (const [code, ids, detail] of [
    ['mapping-unresolved', item.unresolvedIds, 'Resolver could not establish a Target mapping.'],
    ['mapping-candidate', item.candidateIds, 'Resolver found only a candidate mapping; authoritative Review cannot rely on heuristics.'],
    ['mapping-conflict', item.conflictIds, 'Target declarations conflict and require reconciliation.'],
    ['mapping-stale', item.staleIds, 'Declared mapping is stale against the current Target revision.'],
  ] as const) {
    if (ids.length) blockers.push({ code, dimension, ids: [...ids].sort(), detail });
  }
}

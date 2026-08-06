import { ACCEPTANCE_DIMENSIONS, type AcceptanceDimension } from './acceptance-contract.js';
import type { ConsumerProjectionInput } from './consumer-projection.js';
import { V2ContractError, unknownReferenceError } from './contracts/errors.js';
import { sha1Hex } from './contracts/hash-sha1.js';
import type { EvidenceCaseReadModel } from './evidence-read-model.js';
import {
  compileReconstructionObligations,
  type ReconstructionObligation,
} from './reconstruction-obligations.js';

export const IMPLEMENTATION_PLAN_VERSION = 1 as const;
export const SCREEN_TRANCHE_REGION_ID = '$screen' as const;

export type ImplementationTrancheSummary = {
  trancheId: string;
  regionId: string;
  roles: string[];
  parentRegionIds: string[];
  sequence: number;
  caseIndexes: number[];
  dependencies: {
    trancheIds: string[];
    allRegionTranches: boolean;
  };
  obligationCount: number;
  byDimension: Record<AcceptanceDimension, number>;
};

export type ImplementationPlanProjection = {
  planVersion: typeof IMPLEMENTATION_PLAN_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  cases: Array<{ caseId: string; variantId: string; scenario?: EvidenceCaseReadModel['scenario'] }>;
  tranches: ImplementationTrancheSummary[];
  canonicalObligationCount: number;
  complete: true;
};

export type ImplementationTrancheProjection = {
  planVersion: typeof IMPLEMENTATION_PLAN_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  tranche: ImplementationTrancheSummary;
  obligations: Record<AcceptanceDimension, ReconstructionObligation[]>;
  complete: true;
};

type PendingRegion = {
  regionId: string;
  roles: Set<string>;
  parentRegionIds: Set<string>;
  sequence: number;
};

type CompiledPlan = {
  projection: ImplementationPlanProjection;
  obligationsByTrancheId: Map<string, ReconstructionObligation[]>;
};

export function buildImplementationPlan(
  input: ConsumerProjectionInput,
  screenId: string,
): ImplementationPlanProjection {
  return compilePlan(input, screenId).projection;
}

export function buildImplementationTranche(
  input: ConsumerProjectionInput,
  screenId: string,
  trancheId: string,
): ImplementationTrancheProjection {
  const compiled = compilePlan(input, screenId);
  const tranche = compiled.projection.tranches.find((item) => item.trancheId === trancheId);
  if (!tranche) throw unknownReferenceError('Implementation tranche', { screenId, trancheId });
  const obligations = compiled.obligationsByTrancheId.get(trancheId) ?? [];
  return {
    planVersion: IMPLEMENTATION_PLAN_VERSION,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    screenId,
    tranche,
    obligations: Object.fromEntries(
      ACCEPTANCE_DIMENSIONS.map((dimension) => [
        dimension,
        obligations.filter((item) => item.dimension === dimension),
      ]),
    ) as ImplementationTrancheProjection['obligations'],
    complete: true,
  };
}

function compilePlan(input: ConsumerProjectionInput, screenId: string): CompiledPlan {
  assertFixedInput(input);
  const screen = input.evidence.screens.find((item) => item.screenId === screenId);
  const selectedCaseIds = new Set(
    input.handoff.selectedCases
      .filter((item) => item.resolution === 'resolved')
      .map((item) => item.caseId),
  );
  const cases = screen?.cases.filter((item) => selectedCaseIds.has(item.caseId)) ?? [];
  if (cases.length === 0) throw unknownReferenceError('Implementation Screen', { screenId });

  const regions = collectRegions(cases);
  regions.set(SCREEN_TRANCHE_REGION_ID, {
    regionId: SCREEN_TRANCHE_REGION_ID,
    roles: new Set(['screen']),
    parentRegionIds: new Set(),
    sequence: Number.MAX_SAFE_INTEGER,
  });
  const regionIds = [...regions.keys()].filter((item) => item !== SCREEN_TRANCHE_REGION_ID);
  const obligations = compileReconstructionObligations(input.acceptance)
    .filter((item) => item.screenId === screenId);
  const obligationsByRegion = new Map<string, ReconstructionObligation[]>();
  for (const obligation of obligations) {
    const regionId = obligationRegionId(obligation, regionIds);
    const current = obligationsByRegion.get(regionId) ?? [];
    current.push(obligation);
    obligationsByRegion.set(regionId, current);
  }

  const caseIndexById = new Map(cases.map((item, index) => [item.caseId, index]));
  const trancheIdByRegion = new Map(
    [...regions.keys()].map((regionId) => [regionId, trancheId(screenId, regionId)]),
  );
  const summaries = [...regions.values()]
    .map((region): ImplementationTrancheSummary => {
      const assigned = obligationsByRegion.get(region.regionId) ?? [];
      const parentDependencies = [...region.parentRegionIds]
        .flatMap((parentRegionId) => {
          const id = trancheIdByRegion.get(parentRegionId);
          return id ? [id] : [];
        })
        .sort();
      const caseIndexes = uniqueNumbers(
        assigned.flatMap((item) => item.caseIds.flatMap((caseId) => {
          const index = caseIndexById.get(caseId);
          return index === undefined ? [] : [index];
        })),
      );
      return {
        trancheId: trancheIdByRegion.get(region.regionId)!,
        regionId: region.regionId,
        roles: [...region.roles].sort(),
        parentRegionIds: [...region.parentRegionIds].sort(),
        sequence: region.sequence,
        caseIndexes,
        dependencies: {
          trancheIds: parentDependencies,
          allRegionTranches: region.regionId === SCREEN_TRANCHE_REGION_ID,
        },
        obligationCount: assigned.length,
        byDimension: Object.fromEntries(
          ACCEPTANCE_DIMENSIONS.map((dimension) => [
            dimension,
            assigned.filter((item) => item.dimension === dimension).length,
          ]),
        ) as Record<AcceptanceDimension, number>,
      };
    })
    .filter((item) => item.obligationCount > 0 || item.regionId !== SCREEN_TRANCHE_REGION_ID)
    .sort((a, b) =>
      a.sequence - b.sequence
      || a.regionId.localeCompare(b.regionId));
  const includedIds = new Set(summaries.map((item) => item.trancheId));
  for (const summary of summaries) {
    summary.dependencies.trancheIds = summary.dependencies.trancheIds
      .filter((item) => includedIds.has(item));
  }
  const obligationsByTrancheId = new Map<string, ReconstructionObligation[]>();
  for (const summary of summaries) {
    obligationsByTrancheId.set(
      summary.trancheId,
      obligationsByRegion.get(summary.regionId) ?? [],
    );
  }
  const assignedObligationIds = new Set(
    [...obligationsByTrancheId.values()].flatMap((items) => items.map((item) => item.obligationId)),
  );
  if (assignedObligationIds.size !== obligations.length) {
    throw new V2ContractError(
      'invalid-schema',
      'Implementation plan did not preserve the canonical obligation denominator.',
    );
  }
  return {
    projection: {
      planVersion: IMPLEMENTATION_PLAN_VERSION,
      handoffId: input.handoff.handoffId,
      snapshotId: input.handoff.snapshotId,
      screenId,
      cases: cases.map((item) => ({
        caseId: item.caseId,
        variantId: item.variantId,
        ...(item.scenario ? { scenario: { ...item.scenario } } : {}),
      })),
      tranches: summaries,
      canonicalObligationCount: obligations.length,
      complete: true,
    },
    obligationsByTrancheId,
  };
}

function collectRegions(cases: EvidenceCaseReadModel[]): Map<string, PendingRegion> {
  const regions = new Map<string, PendingRegion>();
  for (const evidenceCase of cases) {
    for (const region of evidenceCase.regions) {
      const current = regions.get(region.regionId) ?? {
        regionId: region.regionId,
        roles: new Set<string>(),
        parentRegionIds: new Set<string>(),
        sequence: Number.MAX_SAFE_INTEGER,
      };
      if (region.role) current.roles.add(region.role);
      const parentRegionId = fragmentRegionId(region.semanticParent);
      if (parentRegionId) current.parentRegionIds.add(parentRegionId);
      if (region.documentOrder !== undefined) {
        current.sequence = Math.min(current.sequence, region.documentOrder);
      }
      regions.set(region.regionId, current);
    }
  }
  return regions;
}

function obligationRegionId(
  obligation: ReconstructionObligation,
  regionIds: string[],
): string {
  if (obligation.dimension === 'states' || obligation.dimension === 'interactions') {
    return SCREEN_TRANCHE_REGION_ID;
  }
  const expected = objectValue(obligation.expected);
  const subject = obligation.dimension === 'tokens' && typeof expected?.slot === 'string'
    ? stripSlot(obligation.subject, expected.slot)
    : obligation.subject;
  return [...regionIds]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .find((regionId) => subject === regionId || subject.startsWith(`${regionId}.`))
    ?? SCREEN_TRANCHE_REGION_ID;
}

function stripSlot(subject: string, slot: string): string {
  const suffix = `.${slot}`;
  return subject.endsWith(suffix) ? subject.slice(0, -suffix.length) : subject;
}

function trancheId(screenId: string, regionId: string): string {
  return `tranche-sha1:${sha1Hex(JSON.stringify({ screenId, regionId }))}`;
}

function fragmentRegionId(value: unknown): string | undefined {
  const item = objectValue(value);
  if (typeof item?.pbId !== 'string') return undefined;
  return `${item.pbId}${typeof item.pbKey === 'string' ? `.${item.pbKey}` : ''}`;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function assertFixedInput(input: ConsumerProjectionInput): void {
  if (
    input.handoff.snapshotId !== input.evidence.snapshotId
    || input.handoff.snapshotId !== input.acceptance.snapshotId
    || input.handoff.handoffId !== input.acceptance.handoffId
  ) {
    throw new V2ContractError(
      'workspace-mismatch',
      'Implementation plan input identities do not match the fixed Handoff.',
    );
  }
}

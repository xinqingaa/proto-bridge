import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type AcceptanceRequirement,
  type ReconstructionAcceptanceContract,
} from './acceptance-contract.js';
import type { BlobRecord } from './contracts/blob.js';
import { V2ContractError, unknownReferenceError } from './contracts/errors.js';
import { sha1Hex } from './contracts/hash-sha1.js';
import type { AgentHandoff } from './contracts/handoff.js';
import type {
  EvidenceCaseReadModel,
  EvidenceReadModel,
  EvidenceReadableFact,
} from './evidence-read-model.js';
import {
  compileReconstructionObligations,
  type ReconstructionObligation,
} from './reconstruction-obligations.js';

export const CONSUMER_PROJECTION_VERSION = 2 as const;

export const CONSUMER_PROJECTION_CAPABILITIES = [
  'handoff-index',
  'screen-packet',
  'screen-implementation-packet',
  'case-delta',
  'evidence-detail',
  'reconstruction-obligations',
  'image-content-screenshot',
] as const;
export type ConsumerProjectionCapability =
  (typeof CONSUMER_PROJECTION_CAPABILITIES)[number];

export function assertConsumerCapabilities(
  available: readonly string[],
  required: readonly ConsumerProjectionCapability[] =
    CONSUMER_PROJECTION_CAPABILITIES,
): void {
  const availableSet = new Set(available);
  const missing = required.filter((capability) => !availableSet.has(capability));
  if (missing.length > 0) {
    throw new V2ContractError(
      'incompatible-consumer-capability',
      `Consumer is missing required capabilities: ${missing.join(', ')}.`,
      { available: [...available].sort(), missing },
    );
  }
}

export const EVIDENCE_DETAIL_PROJECTIONS = [
  'structure',
  'components',
  'tokens',
  'interactions',
  'provenance',
] as const;
export type EvidenceDetailProjection =
  (typeof EVIDENCE_DETAIL_PROJECTIONS)[number];

export type ConsumerProjectionInput = {
  handoff: AgentHandoff;
  evidence: EvidenceReadModel;
  acceptance: ReconstructionAcceptanceContract;
  blobs: BlobRecord[];
};

export type ConsumerScreenshotGroup = {
  digest?: string;
  representativeBlobId: string;
  blobIds: string[];
  caseIds: string[];
  screenIds: string[];
  mediaType?: string;
  byteLength?: number;
  image?: { width: number; height: number };
  metadataStatus: 'available' | 'missing';
};

export type HandoffIndexProjection = {
  projectionVersion: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  fixedRefs: {
    workspaceId: string;
    bundleId: string;
    snapshotId: string;
    stalenessReportId: string;
    revisionIds: string[];
  };
  mandatoryRisks: AgentHandoff['risks'];
  readiness: ReconstructionAcceptanceContract['readiness'];
  coverageStatus: AgentHandoff['coverageStatus'];
  freshnessStatus: AgentHandoff['freshnessStatus'];
  requiredCapabilities: ConsumerProjectionCapability[];
  screens: Array<{
    screenId: string;
    caseIds: string[];
    caseCount: number;
    scenarioCount: number;
    distinctScreenshotDigests: string[];
  }>;
  screenshotGroups: ConsumerScreenshotGroup[];
  availableProjections: Array<
    'screen-packet' | 'case-delta' | 'reconstruction-obligations' | EvidenceDetailProjection
  >;
  complete: true;
  omittedCategories: string[];
  warnings: string[];
};

export type ScreenPacketProjection = {
  projectionVersion: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  baselineCaseId: string;
  baselineSelectionReason:
    | 'default-non-scenario'
    | 'first-non-scenario'
    | 'first-selected-case';
  cases: Array<{
    caseId: string;
    revisionId: string;
    variantId: string;
    themeId: string;
    deviceId: string;
    scenario?: EvidenceCaseReadModel['scenario'];
    screenshotBlobIds: string[];
    screenshotDigests: string[];
    unknownCount: number;
    conflictCount: number;
  }>;
  scenarioMap: Array<{
    caseId: string;
    ownerScreenId: string;
    scenarioId: string;
    checkpointId: string;
  }>;
  shellContracts: Array<{
    caseId: string;
    subject: string;
    expected: unknown;
    evidenceRefs: string[];
  }>;
  baseline: {
    structure: StructureIR;
    state: StateSnapshot;
  };
  componentIds: string[];
  tokenIds: string[];
  screenshotGroups: ConsumerScreenshotGroup[];
  detailQueryHints: Array<{
    projection: EvidenceDetailProjection;
    screenId: string;
  }>;
  obligationQueryHints: Array<{
    dimension: AcceptanceDimension;
    screenId: string;
    count: number;
  }>;
  complete: true;
  omittedCategories: string[];
  warnings: string[];
};

export type StructureScrollOwner =
  | { kind: 'viewport' }
  | { kind: 'region'; regionId: string }
  | { kind: 'unknown' };

export type StructureBbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StructureRegion = {
  regionId: string;
  role?: string;
  parentRegionId?: string;
  ancestorRegionIds: string[];
  documentOrder: number | null;
  scrollOwner: StructureScrollOwner;
  positioning: 'flow' | 'sticky' | 'fixed' | 'overlay' | 'unknown';
  pinned: boolean;
  visible?: boolean;
  bbox?: StructureBbox;
  unknownFields: string[];
};

export type StructureSiblingRelation = {
  parentRegionId: string | null;
  regionId: string;
  nextRegionId: string;
  relation: 'above' | 'below' | 'left-of' | 'right-of' | 'overlap' | 'diagonal' | 'unknown';
};

export type StructureIR = {
  caseId: string;
  regions: StructureRegion[];
  rootRegionIds: string[];
  siblingGroups: Array<{ parentRegionId: string | null; childRegionIds: string[] }>;
  siblingRelations: StructureSiblingRelation[];
  scrollContainers: Array<{
    owner: StructureScrollOwner;
    memberRegionIds: string[];
    pinnedRegionIds: string[];
  }>;
  complete: boolean;
  unknownRegionIds: string[];
};

export type StateSnapshot = {
  caseId: string;
  variantId: string;
  scenario?: EvidenceCaseReadModel['scenario'];
  semanticCoverage: EvidenceCaseReadModel['semanticCoverage'];
  visibleRegionIds: string[];
  visibleContent: Array<{ regionId: string; role?: string; text: string }>;
  keyedCollections: Array<{
    itemBaseRegionId: string;
    keys: string[];
    itemRegionIds: string[];
  }>;
  requirements: Array<{
    subject: string;
    kind: string;
    expected: unknown;
    evidenceRefs: string[];
  }>;
};

export type StructureMismatch = {
  kind:
    | 'missing-region'
    | 'unexpected-region'
    | 'parent'
    | 'scroll-owner'
    | 'positioning'
    | 'sibling-order'
    | 'bbox-relation';
  regionId?: string;
  expected?: unknown;
  actual?: unknown;
};

export type CompactFactSnapshot = {
  resolution: EvidenceReadableFact['resolution'];
  value?: unknown;
  issueRef?: string;
};

export type FactDelta = {
  factId: string;
  before?: CompactFactSnapshot;
  after?: CompactFactSnapshot;
  changedFields: Array<'value' | 'resolution' | 'issueRef' | 'provenance'>;
};

export type CaseDeltaProjection = {
  projectionVersion: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  baselineCaseId: string;
  caseId: string;
  baselineUnavailable: false;
  scenario?: EvidenceCaseReadModel['scenario'];
  screenshotGroups: ConsumerScreenshotGroup[];
  sameScreenshotContentAsBaseline: boolean;
  added: FactDelta[];
  removed: FactDelta[];
  changed: FactDelta[];
  state: StateSnapshot;
  stateDelta: {
    visibleRegionIdsAdded: string[];
    visibleRegionIdsRemoved: string[];
    contentChanged: Array<{ regionId: string; before?: string; after?: string }>;
  };
  unresolved: Array<{ factId: string; resolution: EvidenceReadableFact['resolution']; issueRef?: string }>;
  complete: true;
  omittedCategories: string[];
};

export type ReconstructionObligationInput = {
  handoffId: string;
  screenId: string;
  dimension?: AcceptanceDimension;
  pageSize?: number;
  cursor?: string;
};

export type ReconstructionObligationProjection = {
  projectionVersion: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  dimension?: AcceptanceDimension;
  obligations: ReconstructionObligation[];
  total: number;
  complete: boolean;
  continuation?: string;
  omittedDimensions: AcceptanceDimension[];
};

export type EvidenceDetailInput = {
  handoffId: string;
  screenId: string;
  projection: EvidenceDetailProjection;
  caseId?: string;
  regionIds?: string[];
  componentIds?: string[];
  tokenIds?: string[];
  pageSize?: number;
  cursor?: string;
};

export type EvidenceDetailItem =
  | {
      itemKey: string;
      source: 'acceptance-requirement';
      requirement: AcceptanceRequirement;
    }
  | {
      itemKey: string;
      source: 'evidence-fact';
      caseId: string;
      revisionId: string;
      fact: EvidenceReadableFact;
    };

export type EvidenceDetailProjectionResult = {
  projectionVersion: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  projection: EvidenceDetailProjection;
  caseId?: string;
  items: EvidenceDetailItem[];
  complete: boolean;
  continuation?: string;
  omittedCategories: EvidenceDetailProjection[];
};

type PreparedProjection = ConsumerProjectionInput & {
  selectedScreens: Array<{
    screenId: string;
    cases: EvidenceCaseReadModel[];
  }>;
  blobById: Map<string, BlobRecord>;
};

type CursorPayload = {
  version: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  projection: EvidenceDetailProjection;
  queryDigest: string;
  nextKey: string;
};

type ObligationCursorPayload = {
  version: typeof CONSUMER_PROJECTION_VERSION;
  handoffId: string;
  snapshotId: string;
  screenId: string;
  dimension?: AcceptanceDimension;
  queryDigest: string;
  nextKey: string;
};

export function buildHandoffIndex(
  input: ConsumerProjectionInput,
): HandoffIndexProjection {
  const prepared = prepare(input);
  const screenshotGroups = buildScreenshotGroups(prepared);
  const warnings = screenshotGroups
    .filter((group) => group.metadataStatus === 'missing')
    .map(
      (group) =>
        `Screenshot metadata is missing for ${group.representativeBlobId}.`,
    );
  return {
    projectionVersion: CONSUMER_PROJECTION_VERSION,
    handoffId: input.handoff.handoffId,
    fixedRefs: {
      workspaceId: input.handoff.workspaceId,
      bundleId: input.handoff.bundleId,
      snapshotId: input.handoff.snapshotId,
      stalenessReportId: input.handoff.stalenessReportId,
      revisionIds: unique(
        input.handoff.selectedCases.flatMap((selected) =>
          selected.resolution === 'resolved' ? [selected.revisionId] : [],
        ),
      ).sort(),
    },
    mandatoryRisks: input.handoff.risks.map((risk) => ({
      ...risk,
      refs: [...risk.refs],
    })),
    readiness: {
      status: input.acceptance.readiness.status,
      blockers: [...input.acceptance.readiness.blockers],
    },
    coverageStatus: input.handoff.coverageStatus,
    freshnessStatus: input.handoff.freshnessStatus,
    requiredCapabilities: [...CONSUMER_PROJECTION_CAPABILITIES],
    screens: prepared.selectedScreens.map((screen) => {
      const caseIds = unique(screen.cases.map((item) => item.caseId));
      const digests = unique(
        screenshotGroups
          .filter((group) => group.screenIds.includes(screen.screenId))
          .flatMap((group) => (group.digest ? [group.digest] : [])),
      ).sort();
      return {
        screenId: screen.screenId,
        caseIds,
        caseCount: caseIds.length,
        scenarioCount: screen.cases.filter((item) => item.scenario).length,
        distinctScreenshotDigests: digests,
      };
    }),
    screenshotGroups,
    availableProjections: [
      'screen-packet',
      'case-delta',
      'reconstruction-obligations',
      ...EVIDENCE_DETAIL_PROJECTIONS,
    ],
    complete: true,
    omittedCategories: [
      'full-facts',
      'full-evidence-brief',
      'full-acceptance-dimensions',
    ],
    warnings,
  };
}

export function buildStructureIR(
  input: ConsumerProjectionInput,
  screenId: string,
  caseId: string,
): StructureIR {
  const prepared = prepare(input);
  const screen = requireScreen(prepared, screenId);
  if (!screen.cases.some((item) => item.caseId === caseId)) {
    throw unknownReferenceError('Screen Case', { screenId, caseId });
  }
  const requirements = input.acceptance.dimensions.structure.filter(
    (item) => item.screenId === screenId
      && item.caseId === caseId
      && item.kind === 'semantic-region-topology',
  );
  const regions: StructureRegion[] = requirements.map((requirement) => {
    const expected = objectValue(requirement.expected) ?? {};
    const parentRegionId = fragmentRegionId(expected.semanticParent);
    const ancestorRegionIds = Array.isArray(expected.semanticAncestors)
      ? expected.semanticAncestors.flatMap((item) => {
          const regionId = fragmentRegionId(item);
          return regionId ? [regionId] : [];
        })
      : [];
    const documentOrder = typeof expected.documentOrder === 'number'
      ? expected.documentOrder
      : null;
    const scrollOwner = structureScrollOwner(expected.scrollOwner);
    const positioning = isStructurePositioning(expected.positioning)
      ? expected.positioning
      : 'unknown';
    const bbox = structureBbox(expected.bbox);
    const unknownFields = [
      ...(documentOrder === null ? ['documentOrder'] : []),
      ...(scrollOwner.kind === 'unknown' ? ['scrollOwner'] : []),
      ...(positioning === 'unknown' ? ['positioning'] : []),
      ...(!('semanticAncestors' in expected) ? ['semanticAncestors'] : []),
    ];
    return {
      regionId: requirement.subject,
      ...(typeof expected.role === 'string' ? { role: expected.role } : {}),
      ...(parentRegionId ? { parentRegionId } : {}),
      ancestorRegionIds,
      documentOrder,
      scrollOwner,
      positioning,
      pinned: positioning === 'sticky' || positioning === 'fixed',
      ...(typeof expected.visible === 'boolean' ? { visible: expected.visible } : {}),
      ...(bbox ? { bbox } : {}),
      unknownFields,
    };
  }).sort(compareStructureRegionOrder);

  const groups = new Map<string, StructureRegion[]>();
  for (const region of regions) {
    const key = region.parentRegionId ?? '';
    const current = groups.get(key) ?? [];
    current.push(region);
    groups.set(key, current);
  }
  const siblingGroups = [...groups.entries()]
    .map(([parentRegionId, children]) => ({
      parentRegionId: parentRegionId || null,
      childRegionIds: [...children].sort(compareStructureRegionOrder).map((item) => item.regionId),
    }))
    .sort((a, b) => (a.parentRegionId ?? '').localeCompare(b.parentRegionId ?? ''));
  const regionById = new Map(regions.map((region) => [region.regionId, region]));
  const siblingRelations = siblingGroups.flatMap((group) =>
    group.childRegionIds.slice(0, -1).map((regionId, index) => {
      const nextRegionId = group.childRegionIds[index + 1]!;
      return {
        parentRegionId: group.parentRegionId,
        regionId,
        nextRegionId,
        relation: bboxRelation(regionById.get(regionId)?.bbox, regionById.get(nextRegionId)?.bbox),
      };
    }),
  );

  const scrollGroups = new Map<string, { owner: StructureScrollOwner; members: string[]; pinned: string[] }>();
  for (const region of regions) {
    if (region.scrollOwner.kind === 'unknown') continue;
    const key = canonical(region.scrollOwner);
    const current = scrollGroups.get(key) ?? { owner: region.scrollOwner, members: [], pinned: [] };
    current.members.push(region.regionId);
    if (region.pinned) current.pinned.push(region.regionId);
    scrollGroups.set(key, current);
  }
  const scrollContainers = [...scrollGroups.values()]
    .map((item) => ({
      owner: item.owner,
      memberRegionIds: item.members,
      pinnedRegionIds: item.pinned,
    }))
    .sort((a, b) => canonical(a.owner).localeCompare(canonical(b.owner)));
  const unknownRegionIds = regions.filter((item) => item.unknownFields.length > 0).map((item) => item.regionId);
  return {
    caseId,
    regions,
    rootRegionIds: siblingGroups.find((item) => item.parentRegionId === null)?.childRegionIds ?? [],
    siblingGroups,
    siblingRelations,
    scrollContainers,
    complete: unknownRegionIds.length === 0,
    unknownRegionIds,
  };
}

export function compareStructureIR(expected: StructureIR, actual: StructureIR): StructureMismatch[] {
  const mismatches: StructureMismatch[] = [];
  const expectedById = new Map(expected.regions.map((item) => [item.regionId, item]));
  const actualById = new Map(actual.regions.map((item) => [item.regionId, item]));
  for (const region of expected.regions) {
    const candidate = actualById.get(region.regionId);
    if (!candidate) {
      mismatches.push({ kind: 'missing-region', regionId: region.regionId });
      continue;
    }
    if (region.parentRegionId !== candidate.parentRegionId) {
      mismatches.push({ kind: 'parent', regionId: region.regionId, expected: region.parentRegionId ?? null, actual: candidate.parentRegionId ?? null });
    }
    if (canonical(region.scrollOwner) !== canonical(candidate.scrollOwner)) {
      mismatches.push({ kind: 'scroll-owner', regionId: region.regionId, expected: region.scrollOwner, actual: candidate.scrollOwner });
    }
    if (region.positioning !== candidate.positioning) {
      mismatches.push({ kind: 'positioning', regionId: region.regionId, expected: region.positioning, actual: candidate.positioning });
    }
  }
  for (const region of actual.regions) {
    if (!expectedById.has(region.regionId)) mismatches.push({ kind: 'unexpected-region', regionId: region.regionId });
  }
  const actualGroups = new Map(actual.siblingGroups.map((item) => [item.parentRegionId, item.childRegionIds]));
  for (const group of expected.siblingGroups) {
    const actualOrder = actualGroups.get(group.parentRegionId);
    if (actualOrder && canonical(group.childRegionIds) !== canonical(actualOrder)) {
      mismatches.push({ kind: 'sibling-order', expected: { parentRegionId: group.parentRegionId, childRegionIds: group.childRegionIds }, actual: { parentRegionId: group.parentRegionId, childRegionIds: actualOrder } });
    }
  }
  const actualRelations = new Map(actual.siblingRelations.map((item) => [
    canonical([item.parentRegionId, item.regionId, item.nextRegionId]),
    item,
  ]));
  for (const relation of expected.siblingRelations) {
    const candidate = actualRelations.get(canonical([
      relation.parentRegionId,
      relation.regionId,
      relation.nextRegionId,
    ]));
    if (candidate && relation.relation !== candidate.relation) {
      mismatches.push({
        kind: 'bbox-relation',
        regionId: relation.regionId,
        expected: relation,
        actual: candidate,
      });
    }
  }
  return mismatches;
}

function buildStateSnapshot(
  input: ConsumerProjectionInput,
  evidenceCase: EvidenceCaseReadModel,
): StateSnapshot {
  const visibleRegions = evidenceCase.regions
    .filter((region) => region.visible !== false)
    .sort((a, b) => (a.documentOrder ?? Number.MAX_SAFE_INTEGER) - (b.documentOrder ?? Number.MAX_SAFE_INTEGER) || a.regionId.localeCompare(b.regionId));
  const contentRegions = visibleRegions.filter((region) => {
    if (!region.text) return false;
    return !visibleRegions.some((candidate) =>
      candidate.regionId !== region.regionId
      && Boolean(candidate.text)
      && (candidate.semanticAncestors ?? []).some((ancestor) => fragmentRegionId(ancestor) === region.regionId));
  });
  const keyed = new Map<string, Map<string, string>>();
  for (const region of evidenceCase.regions) {
    for (const value of [region.semanticParent, ...(region.semanticAncestors ?? [])]) {
      const identity = fragmentIdentity(value);
      if (!identity?.pbKey) continue;
      const current = keyed.get(identity.pbId) ?? new Map<string, string>();
      current.set(identity.pbKey, fragmentRegionId(identity)!);
      keyed.set(identity.pbId, current);
    }
  }
  return {
    caseId: evidenceCase.caseId,
    variantId: evidenceCase.variantId,
    ...(evidenceCase.scenario ? { scenario: { ...evidenceCase.scenario } } : {}),
    semanticCoverage: evidenceCase.semanticCoverage,
    visibleRegionIds: visibleRegions.map((item) => item.regionId),
    visibleContent: contentRegions.flatMap((item) => item.text
      ? [{ regionId: item.regionId, ...(item.role ? { role: item.role } : {}), text: item.text }]
      : []),
    keyedCollections: [...keyed.entries()].map(([itemBaseRegionId, items]) => ({
      itemBaseRegionId,
      keys: [...items.keys()].sort(),
      itemRegionIds: [...items.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, regionId]) => regionId),
    })).sort((a, b) => a.itemBaseRegionId.localeCompare(b.itemBaseRegionId)),
    requirements: input.acceptance.dimensions.states
      .filter((item) => item.screenId === evidenceCase.screenId && item.caseId === evidenceCase.caseId)
      .map((item) => ({ subject: item.subject, kind: item.kind, expected: item.expected, evidenceRefs: [...item.evidenceRefs] }))
      .sort((a, b) => `${a.kind}:${a.subject}`.localeCompare(`${b.kind}:${b.subject}`)),
  };
}

export function buildScreenPacket(
  input: ConsumerProjectionInput,
  screenId: string,
): ScreenPacketProjection {
  const prepared = prepare(input);
  const screen = requireScreen(prepared, screenId);
  const baseline = selectBaseline(screen.cases);
  const structure = input.acceptance.dimensions.structure.filter(
    (requirement) => requirement.screenId === screenId,
  );
  const shellContracts = structure
    .filter(
      (requirement) =>
        requirement.kind === 'authored-structure-contract' &&
        requirement.subject.endsWith('.structure.shell'),
    )
    .map((requirement) => ({
      caseId: requirement.caseId,
      subject: requirement.subject,
      expected: requirement.expected,
      evidenceRefs: [...requirement.evidenceRefs],
    }))
    .sort((left, right) =>
      `${left.caseId}:${left.subject}`.localeCompare(
        `${right.caseId}:${right.subject}`,
      ),
    );
  const baselineStructure = buildStructureIR(input, screenId, baseline.caseModel.caseId);
  const baselineState = buildStateSnapshot(input, baseline.caseModel);
  const screenObligations = compileReconstructionObligations(input.acceptance).filter((item) => item.screenId === screenId);
  const componentIds = unique(
    input.acceptance.dimensions.components
      .filter((item) => item.screenId === screenId)
      .flatMap((item) => {
        const expected = objectValue(item.expected);
        return typeof expected?.componentId === 'string'
          ? [expected.componentId]
          : [];
      }),
  ).sort();
  const tokenIds = unique(
    input.acceptance.dimensions.tokens
      .filter((item) => item.screenId === screenId)
      .flatMap((item) => {
        const expected = objectValue(item.expected);
        return typeof expected?.tokenId === 'string' ? [expected.tokenId] : [];
      }),
  ).sort();
  const screenshotGroups = buildScreenshotGroups(prepared, screenId);
  const digestByBlob = new Map(
    screenshotGroups.flatMap((group) =>
      group.digest
        ? group.blobIds.map((blobId) => [blobId, group.digest!] as const)
        : [],
    ),
  );

  return {
    projectionVersion: CONSUMER_PROJECTION_VERSION,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    screenId,
    baselineCaseId: baseline.caseModel.caseId,
    baselineSelectionReason: baseline.reason,
    cases: screen.cases.map((item) => ({
      caseId: item.caseId,
      revisionId: item.revisionId,
      variantId: item.variantId,
      themeId: item.themeId,
      deviceId: item.deviceId,
      ...(item.scenario ? { scenario: { ...item.scenario } } : {}),
      screenshotBlobIds: [...item.screenshotBlobIds].sort(),
      screenshotDigests: unique(
        item.screenshotBlobIds.flatMap((blobId) => {
          const digest = digestByBlob.get(blobId);
          return digest ? [digest] : [];
        }),
      ).sort(),
      unknownCount: item.unknownCount,
      conflictCount: item.conflictCount,
    })),
    scenarioMap: screen.cases.flatMap((item) =>
      item.scenario
        ? [
            {
              caseId: item.caseId,
              ownerScreenId: item.scenario.ownerScreenId,
              scenarioId: item.scenario.scenarioId,
              checkpointId: item.scenario.checkpointId,
            },
          ]
        : [],
    ),
    shellContracts,
    baseline: {
      structure: baselineStructure,
      state: baselineState,
    },
    componentIds,
    tokenIds,
    screenshotGroups,
    detailQueryHints: EVIDENCE_DETAIL_PROJECTIONS.map((projection) => ({
      projection,
      screenId,
    })),
    obligationQueryHints: ACCEPTANCE_DIMENSIONS.map((dimension) => ({
      dimension,
      screenId,
      count: screenObligations.filter((item) => item.dimension === dimension).length,
    })).filter((item) => item.count > 0),
    complete: true,
    omittedCategories: [
      'non-baseline-region-trees',
      'full-token-bindings',
      'full-provenance',
      'other-screens',
    ],
    warnings: screenshotGroups
      .filter((group) => group.metadataStatus === 'missing')
      .map(
        (group) =>
          `Screenshot metadata is missing for ${group.representativeBlobId}.`,
      ),
  };
}

export function buildCaseDelta(
  input: ConsumerProjectionInput,
  screenId: string,
  caseId: string,
): CaseDeltaProjection {
  const prepared = prepare(input);
  const screen = requireScreen(prepared, screenId);
  const baseline = selectBaseline(screen.cases).caseModel;
  const selected = screen.cases.find((item) => item.caseId === caseId);
  if (!selected) {
    throw unknownReferenceError('Screen Case', { screenId, caseId });
  }
  const before = new Map(baseline.facts.map((fact) => [fact.factId, fact]));
  const after = new Map(selected.facts.map((fact) => [fact.factId, fact]));
  const added: FactDelta[] = [];
  const removed: FactDelta[] = [];
  const changed: FactDelta[] = [];
  const factIds = unique([...before.keys(), ...after.keys()]).sort();
  for (const factId of factIds) {
    const baselineFact = before.get(factId);
    const selectedFact = after.get(factId);
    if (!baselineFact && selectedFact) {
      added.push({ factId, after: compactFact(selectedFact), changedFields: factChangedFields(undefined, selectedFact) });
    } else if (baselineFact && !selectedFact) {
      removed.push({ factId, before: compactFact(baselineFact), changedFields: factChangedFields(baselineFact, undefined) });
    } else if (
      baselineFact &&
      selectedFact &&
      factChangedFields(baselineFact, selectedFact).length > 0
    ) {
      changed.push({ factId, before: compactFact(baselineFact), after: compactFact(selectedFact), changedFields: factChangedFields(baselineFact, selectedFact) });
    }
  }
  const baselineDigests = new Set(
    buildScreenshotGroupsForCases(prepared, [baseline]).flatMap((group) =>
      group.digest ? [group.digest] : [],
    ),
  );
  const screenshotGroups = buildScreenshotGroupsForCases(prepared, [selected]);
  const selectedDigests = screenshotGroups.flatMap((group) =>
    group.digest ? [group.digest] : [],
  );
  const baselineState = buildStateSnapshot(input, baseline);
  const selectedState = buildStateSnapshot(input, selected);
  const baselineContent = new Map(baselineState.visibleContent.map((item) => [item.regionId, item.text]));
  const selectedContent = new Map(selectedState.visibleContent.map((item) => [item.regionId, item.text]));
  return {
    projectionVersion: CONSUMER_PROJECTION_VERSION,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    screenId,
    baselineCaseId: baseline.caseId,
    caseId,
    baselineUnavailable: false,
    ...(selected.scenario ? { scenario: { ...selected.scenario } } : {}),
    screenshotGroups,
    sameScreenshotContentAsBaseline:
      selectedDigests.length > 0 &&
      selectedDigests.every((digest) => baselineDigests.has(digest)),
    added,
    removed,
    changed,
    state: selectedState,
    stateDelta: {
      visibleRegionIdsAdded: selectedState.visibleRegionIds.filter((item) => !baselineState.visibleRegionIds.includes(item)),
      visibleRegionIdsRemoved: baselineState.visibleRegionIds.filter((item) => !selectedState.visibleRegionIds.includes(item)),
      contentChanged: unique([...baselineContent.keys(), ...selectedContent.keys()]).sort().flatMap((regionId) => {
        const beforeText = baselineContent.get(regionId);
        const afterText = selectedContent.get(regionId);
        return beforeText !== afterText
          ? [{ regionId, ...(beforeText === undefined ? {} : { before: beforeText }), ...(afterText === undefined ? {} : { after: afterText }) }]
          : [];
      }),
    },
    unresolved: selected.facts.filter((fact) => fact.resolution !== 'resolved').map((fact) => ({
      factId: fact.factId,
      resolution: fact.resolution,
      ...(fact.issueRef ? { issueRef: fact.issueRef } : {}),
    })),
    complete: true,
    omittedCategories: ['unchanged-facts', 'other-cases', 'other-screens'],
  };
}

export function buildEvidenceDetail(
  input: ConsumerProjectionInput,
  query: EvidenceDetailInput,
): EvidenceDetailProjectionResult {
  const prepared = prepare(input);
  if (query.handoffId !== input.handoff.handoffId) {
    throw new V2ContractError(
      'workspace-mismatch',
      `Detail query Handoff ${query.handoffId} does not match ${input.handoff.handoffId}.`,
    );
  }
  const screen = requireScreen(prepared, query.screenId);
  if (query.caseId && !screen.cases.some((item) => item.caseId === query.caseId)) {
    throw unknownReferenceError('Screen Case', {
      screenId: query.screenId,
      caseId: query.caseId,
    });
  }
  if (
    query.pageSize !== undefined &&
    (!Number.isInteger(query.pageSize) || query.pageSize <= 0)
  ) {
    throw new V2ContractError(
      'unsafe-input',
      'pageSize must be a positive integer when supplied.',
    );
  }

  const normalizedQuery = {
    handoffId: query.handoffId,
    screenId: query.screenId,
    projection: query.projection,
    ...(query.caseId ? { caseId: query.caseId } : {}),
    regionIds: unique(query.regionIds ?? []).sort(),
    componentIds: unique(query.componentIds ?? []).sort(),
    tokenIds: unique(query.tokenIds ?? []).sort(),
  };
  const queryDigest = sha1Hex(canonical(normalizedQuery));
  const allItems = detailItems(input, screen.cases, query).sort((left, right) =>
    left.itemKey.localeCompare(right.itemKey),
  );
  const cursor = query.cursor
    ? decodeCursor(query.cursor, {
        handoffId: input.handoff.handoffId,
        snapshotId: input.handoff.snapshotId,
        projection: query.projection,
        queryDigest,
      })
    : undefined;
  const start = cursor
    ? (() => {
        const index = allItems.findIndex((item) => item.itemKey === cursor.nextKey);
        if (index < 0) {
          throw new V2ContractError(
            'invalid-continuation',
            'Continuation no longer resolves within the fixed projection.',
          );
        }
        return index;
      })()
    : 0;
  const pageSize = query.pageSize ?? allItems.length;
  const items = allItems.slice(start, start + pageSize);
  const next = allItems[start + items.length];
  const continuation = next
    ? encodeCursor({
        version: CONSUMER_PROJECTION_VERSION,
        handoffId: input.handoff.handoffId,
        snapshotId: input.handoff.snapshotId,
        projection: query.projection,
        queryDigest,
        nextKey: next.itemKey,
      })
    : undefined;
  return {
    projectionVersion: CONSUMER_PROJECTION_VERSION,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    screenId: query.screenId,
    projection: query.projection,
    ...(query.caseId ? { caseId: query.caseId } : {}),
    items,
    complete: continuation === undefined,
    ...(continuation ? { continuation } : {}),
    omittedCategories: EVIDENCE_DETAIL_PROJECTIONS.filter(
      (projection) => projection !== query.projection,
    ),
  };
}

export function buildReconstructionObligationProjection(
  input: ConsumerProjectionInput,
  query: ReconstructionObligationInput,
): ReconstructionObligationProjection {
  const prepared = prepare(input);
  if (query.handoffId !== input.handoff.handoffId) {
    throw new V2ContractError('workspace-mismatch', `Obligation query Handoff ${query.handoffId} does not match ${input.handoff.handoffId}.`);
  }
  requireScreen(prepared, query.screenId);
  if (query.dimension !== undefined && !ACCEPTANCE_DIMENSIONS.includes(query.dimension)) {
    throw new V2ContractError('unsafe-input', `Unknown Acceptance dimension ${String(query.dimension)}.`);
  }
  if (query.pageSize !== undefined && (!Number.isInteger(query.pageSize) || query.pageSize <= 0 || query.pageSize > 100)) {
    throw new V2ContractError('unsafe-input', 'pageSize must be an integer from 1 through 100.');
  }
  const normalizedQuery = {
    handoffId: query.handoffId,
    screenId: query.screenId,
    ...(query.dimension ? { dimension: query.dimension } : {}),
  };
  const queryDigest = sha1Hex(canonical(normalizedQuery));
  const all = compileReconstructionObligations(input.acceptance).filter(
    (item) => item.screenId === query.screenId && (!query.dimension || item.dimension === query.dimension),
  );
  const cursor = query.cursor
    ? decodeObligationCursor(query.cursor, {
        handoffId: input.handoff.handoffId,
        snapshotId: input.handoff.snapshotId,
        screenId: query.screenId,
        ...(query.dimension ? { dimension: query.dimension } : {}),
        queryDigest,
      })
    : undefined;
  const start = cursor
    ? (() => {
        const index = all.findIndex((item) => item.obligationId === cursor.nextKey);
        if (index < 0) throw invalidContinuation('Continuation no longer resolves within the fixed obligation projection.');
        return index;
      })()
    : 0;
  const pageSize = query.pageSize ?? 50;
  const obligations = all.slice(start, start + pageSize);
  const next = all[start + obligations.length];
  const continuation = next
    ? encodeObligationCursor({
        version: CONSUMER_PROJECTION_VERSION,
        handoffId: input.handoff.handoffId,
        snapshotId: input.handoff.snapshotId,
        screenId: query.screenId,
        ...(query.dimension ? { dimension: query.dimension } : {}),
        queryDigest,
        nextKey: next.obligationId,
      })
    : undefined;
  return {
    projectionVersion: CONSUMER_PROJECTION_VERSION,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    screenId: query.screenId,
    ...(query.dimension ? { dimension: query.dimension } : {}),
    obligations,
    total: all.length,
    complete: continuation === undefined,
    ...(continuation ? { continuation } : {}),
    omittedDimensions: query.dimension
      ? ACCEPTANCE_DIMENSIONS.filter((item) => item !== query.dimension)
      : [],
  };
}

function prepare(input: ConsumerProjectionInput): PreparedProjection {
  assertFixedIdentity(input);
  const selectedCaseIds = new Set(
    input.handoff.selectedCases.map((selected) => selected.caseId),
  );
  const handoffOrder = new Map(
    input.handoff.selectedCases.map((selected, index) => [selected.caseId, index]),
  );
  const selectedScreens = input.evidence.screens
    .map((screen) => ({
      screenId: screen.screenId,
      cases: screen.cases
        .filter((item) => selectedCaseIds.has(item.caseId))
        .sort((left, right) => {
          const bySelection =
            (handoffOrder.get(left.caseId) ?? Number.MAX_SAFE_INTEGER) -
            (handoffOrder.get(right.caseId) ?? Number.MAX_SAFE_INTEGER);
          return (
            bySelection ||
            left.caseId.localeCompare(right.caseId) ||
            left.revisionId.localeCompare(right.revisionId)
          );
        }),
    }))
    .filter((screen) => screen.cases.length > 0)
    .sort((left, right) => {
      const leftOrder = Math.min(
        ...left.cases.map(
          (item) => handoffOrder.get(item.caseId) ?? Number.MAX_SAFE_INTEGER,
        ),
      );
      const rightOrder = Math.min(
        ...right.cases.map(
          (item) => handoffOrder.get(item.caseId) ?? Number.MAX_SAFE_INTEGER,
        ),
      );
      return leftOrder - rightOrder || left.screenId.localeCompare(right.screenId);
    });
  return {
    ...input,
    selectedScreens,
    blobById: new Map(input.blobs.map((blob) => [blob.blobId, blob])),
  };
}

function assertFixedIdentity(input: ConsumerProjectionInput): void {
  const mismatches = [
    ['workspaceId', input.handoff.workspaceId, input.acceptance.workspaceId],
    ['bundleId/evidence', input.handoff.bundleId, input.evidence.bundleId],
    ['bundleId/acceptance', input.handoff.bundleId, input.acceptance.bundleId],
    ['snapshotId/evidence', input.handoff.snapshotId, input.evidence.snapshotId],
    [
      'snapshotId/acceptance',
      input.handoff.snapshotId,
      input.acceptance.snapshotId,
    ],
    ['handoffId', input.handoff.handoffId, input.acceptance.handoffId],
  ].filter(([, expected, actual]) => expected !== actual);
  if (mismatches.length > 0) {
    throw new V2ContractError(
      'workspace-mismatch',
      `Consumer projection fixed identity mismatch: ${mismatches
        .map(([label, expected, actual]) => `${label} ${expected} != ${actual}`)
        .join('; ')}.`,
      mismatches,
    );
  }
}

function requireScreen(
  prepared: PreparedProjection,
  screenId: string,
): PreparedProjection['selectedScreens'][number] {
  const screen = prepared.selectedScreens.find((item) => item.screenId === screenId);
  if (!screen) throw unknownReferenceError('Handoff Screen', screenId);
  return screen;
}

function selectBaseline(cases: EvidenceCaseReadModel[]): {
  caseModel: EvidenceCaseReadModel;
  reason: ScreenPacketProjection['baselineSelectionReason'];
} {
  const defaultCase = cases.find(
    (item) => !item.scenario && item.variantId === 'default',
  );
  if (defaultCase) {
    return { caseModel: defaultCase, reason: 'default-non-scenario' };
  }
  const nonScenario = cases.find((item) => !item.scenario);
  if (nonScenario) {
    return { caseModel: nonScenario, reason: 'first-non-scenario' };
  }
  const first = cases[0];
  if (!first) {
    throw new V2ContractError(
      'unknown-reference',
      'Cannot select a baseline from an empty Screen.',
    );
  }
  return { caseModel: first, reason: 'first-selected-case' };
}

function buildScreenshotGroups(
  prepared: PreparedProjection,
  screenId?: string,
): ConsumerScreenshotGroup[] {
  const cases = prepared.selectedScreens
    .filter((screen) => !screenId || screen.screenId === screenId)
    .flatMap((screen) => screen.cases);
  return buildScreenshotGroupsForCases(prepared, cases);
}

function buildScreenshotGroupsForCases(
  prepared: PreparedProjection,
  cases: EvidenceCaseReadModel[],
): ConsumerScreenshotGroup[] {
  const owners = new Map<
    string,
    { blobIds: Set<string>; caseIds: Set<string>; screenIds: Set<string> }
  >();
  for (const item of cases) {
    for (const blobId of item.screenshotBlobIds) {
      const blob = prepared.blobById.get(blobId);
      const key = blob?.digest ?? `missing:${blobId}`;
      const current = owners.get(key) ?? {
        blobIds: new Set<string>(),
        caseIds: new Set<string>(),
        screenIds: new Set<string>(),
      };
      current.blobIds.add(blobId);
      current.caseIds.add(item.caseId);
      current.screenIds.add(item.screenId);
      owners.set(key, current);
    }
  }
  return [...owners.entries()]
    .map(([key, owner]) => {
      const blobIds = [...owner.blobIds].sort();
      const representativeBlobId = blobIds[0]!;
      const blob = prepared.blobById.get(representativeBlobId);
      return {
        ...(key.startsWith('missing:') ? {} : { digest: key }),
        representativeBlobId,
        blobIds,
        // Sets preserve the fixed Handoff traversal order. Do not sort these IDs:
        // case aliases that share screenshot content still need to reflect the
        // consumer's selected-case order.
        caseIds: [...owner.caseIds],
        screenIds: [...owner.screenIds],
        ...(blob
          ? {
              mediaType: blob.mediaType,
              byteLength: blob.byteLength,
              ...(blob.image ? { image: { ...blob.image } } : {}),
            }
          : {}),
        metadataStatus: blob ? ('available' as const) : ('missing' as const),
      };
    })
    .sort((left, right) =>
      (left.digest ?? `missing:${left.representativeBlobId}`).localeCompare(
        right.digest ?? `missing:${right.representativeBlobId}`,
      ),
    );
}

function detailItems(
  input: ConsumerProjectionInput,
  screenCases: EvidenceCaseReadModel[],
  query: EvidenceDetailInput,
): EvidenceDetailItem[] {
  if (query.projection === 'provenance') {
    const regionIds = new Set(query.regionIds ?? []);
    return screenCases
      .filter((item) => !query.caseId || item.caseId === query.caseId)
      .flatMap((item) =>
        item.facts
          .filter(
            (fact) =>
              regionIds.size === 0 ||
              [...regionIds].some(
                (regionId) =>
                  fact.factId === regionId ||
                  fact.factId.startsWith(`${regionId}.`),
              ),
          )
          .map((fact) => ({
            itemKey: `${item.caseId}:${String(fact.sourceIndex).padStart(8, '0')}:${fact.factId}`,
            source: 'evidence-fact' as const,
            caseId: item.caseId,
            revisionId: item.revisionId,
            fact,
          })),
      );
  }
  const requirements = input.acceptance.dimensions[query.projection].filter(
    (requirement) =>
      requirement.screenId === query.screenId &&
      (!query.caseId || requirement.caseId === query.caseId) &&
      matchesSelectors(requirement, query),
  );
  return requirements.map((requirement) => ({
    itemKey: requirement.requirementId,
    source: 'acceptance-requirement' as const,
    requirement: {
      ...requirement,
      evidenceRefs: [...requirement.evidenceRefs],
    },
  }));
}

function matchesSelectors(
  requirement: AcceptanceRequirement,
  query: EvidenceDetailInput,
): boolean {
  const regionIds = query.regionIds ?? [];
  if (
    regionIds.length > 0 &&
    !regionIds.some(
      (regionId) =>
        requirement.subject === regionId ||
        requirement.subject.startsWith(`${regionId}.`) ||
        requirement.requirementId.includes(regionId),
    )
  ) {
    return false;
  }
  const expected = objectValue(requirement.expected);
  if (
    (query.componentIds?.length ?? 0) > 0 &&
    (!expected ||
      typeof expected.componentId !== 'string' ||
      !query.componentIds!.includes(expected.componentId))
  ) {
    return false;
  }
  if (
    (query.tokenIds?.length ?? 0) > 0 &&
    (!expected ||
      typeof expected.tokenId !== 'string' ||
      !query.tokenIds!.includes(expected.tokenId))
  ) {
    return false;
  }
  return true;
}

function fragmentIdentity(value: unknown): { screenId: string; pbId: string; pbKey?: string } | undefined {
  const object = objectValue(value);
  if (!object || typeof object.screenId !== 'string' || typeof object.pbId !== 'string') return undefined;
  return {
    screenId: object.screenId,
    pbId: object.pbId,
    ...(typeof object.pbKey === 'string' ? { pbKey: object.pbKey } : {}),
  };
}

function fragmentRegionId(value: unknown): string | undefined {
  const identity = fragmentIdentity(value);
  return identity ? `${identity.pbId}${identity.pbKey ? `.${identity.pbKey}` : ''}` : undefined;
}

function structureScrollOwner(value: unknown): StructureScrollOwner {
  if (value === 'viewport') return { kind: 'viewport' };
  const object = objectValue(value);
  if (object?.kind === 'viewport') return { kind: 'viewport' };
  if (object?.kind === 'fragment') {
    const regionId = fragmentRegionId(object.fragment);
    if (regionId) return { kind: 'region', regionId };
  }
  return { kind: 'unknown' };
}

function isStructurePositioning(value: unknown): value is StructureRegion['positioning'] {
  return value === 'flow' || value === 'sticky' || value === 'fixed' || value === 'overlay';
}

function structureBbox(value: unknown): StructureBbox | undefined {
  const object = objectValue(value);
  return object && ['x', 'y', 'width', 'height'].every((key) => typeof object[key] === 'number')
    ? { x: object.x as number, y: object.y as number, width: object.width as number, height: object.height as number }
    : undefined;
}

function compareStructureRegionOrder(a: StructureRegion, b: StructureRegion): number {
  return (a.documentOrder ?? Number.MAX_SAFE_INTEGER) - (b.documentOrder ?? Number.MAX_SAFE_INTEGER)
    || a.regionId.localeCompare(b.regionId);
}

function bboxRelation(a: StructureBbox | undefined, b: StructureBbox | undefined): StructureSiblingRelation['relation'] {
  if (!a || !b) return 'unknown';
  const epsilon = 0.5;
  const horizontalOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > epsilon;
  const verticalOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > epsilon;
  if (horizontalOverlap && verticalOverlap) return 'overlap';
  if (horizontalOverlap) return a.y + a.height <= b.y + epsilon ? 'above' : 'below';
  if (verticalOverlap) return a.x + a.width <= b.x + epsilon ? 'left-of' : 'right-of';
  return 'diagonal';
}

function compactFact(fact: EvidenceReadableFact): CompactFactSnapshot {
  return {
    resolution: fact.resolution,
    ...(fact.value !== undefined ? { value: fact.value } : {}),
    ...(fact.issueRef ? { issueRef: fact.issueRef } : {}),
  };
}

function factChangedFields(
  before: EvidenceReadableFact | undefined,
  after: EvidenceReadableFact | undefined,
): FactDelta['changedFields'] {
  const fields: FactDelta['changedFields'] = [];
  if (canonical(before?.value) !== canonical(after?.value)) fields.push('value');
  if (before?.resolution !== after?.resolution) fields.push('resolution');
  if (before?.issueRef !== after?.issueRef) fields.push('issueRef');
  if (canonical(before?.provenance) !== canonical(after?.provenance)) fields.push('provenance');
  return fields;
}

function encodeObligationCursor(payload: ObligationCursorPayload): string {
  const json = canonical(payload);
  return `pbop2.${sha1Hex(json)}.${encodeURIComponent(json).replaceAll('.', '%2E')}`;
}

function decodeObligationCursor(
  value: string,
  expected: Omit<ObligationCursorPayload, 'version' | 'nextKey'>,
): ObligationCursorPayload {
  const [prefix, checksum, encoded, ...rest] = value.split('.');
  if (prefix !== 'pbop2' || !checksum || !encoded || rest.length > 0) throw invalidContinuation('Obligation continuation format is invalid.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(encoded));
  } catch {
    throw invalidContinuation('Obligation continuation payload is invalid.');
  }
  if (sha1Hex(canonical(parsed)) !== checksum) throw invalidContinuation('Obligation continuation checksum is invalid.');
  const payload = parsed as Partial<ObligationCursorPayload>;
  if (
    payload.version !== CONSUMER_PROJECTION_VERSION
    || typeof payload.handoffId !== 'string'
    || typeof payload.snapshotId !== 'string'
    || typeof payload.screenId !== 'string'
    || (payload.dimension !== undefined && !ACCEPTANCE_DIMENSIONS.includes(payload.dimension))
    || typeof payload.queryDigest !== 'string'
    || typeof payload.nextKey !== 'string'
  ) throw invalidContinuation('Obligation continuation fields are invalid.');
  if (
    payload.handoffId !== expected.handoffId
    || payload.snapshotId !== expected.snapshotId
    || payload.screenId !== expected.screenId
    || payload.dimension !== expected.dimension
    || payload.queryDigest !== expected.queryDigest
  ) throw invalidContinuation('Obligation continuation is bound to a different fixed query.');
  return payload as ObligationCursorPayload;
}

function encodeCursor(payload: CursorPayload): string {
  const json = canonical(payload);
  // encodeURIComponent intentionally leaves periods unescaped. Escape them so
  // the period-delimited envelope remains unambiguous for IDs such as
  // "screen.detail" and logical item keys.
  const encoded = encodeURIComponent(json).replaceAll('.', '%2E');
  return `pbcp2.${sha1Hex(json)}.${encoded}`;
}

function decodeCursor(
  value: string,
  expected: Pick<
    CursorPayload,
    'handoffId' | 'snapshotId' | 'projection' | 'queryDigest'
  >,
): CursorPayload {
  const [prefix, checksum, encoded, ...rest] = value.split('.');
  if (prefix !== 'pbcp2' || !checksum || !encoded || rest.length > 0) {
    throw invalidContinuation('Continuation format is invalid.');
  }
  let json: string;
  let parsed: unknown;
  try {
    json = decodeURIComponent(encoded);
    parsed = JSON.parse(json);
  } catch {
    throw invalidContinuation('Continuation payload is invalid.');
  }
  if (sha1Hex(canonical(parsed)) !== checksum) {
    throw invalidContinuation('Continuation checksum is invalid.');
  }
  const payload = parsed as Partial<CursorPayload>;
  if (
    payload.version !== CONSUMER_PROJECTION_VERSION ||
    typeof payload.handoffId !== 'string' ||
    typeof payload.snapshotId !== 'string' ||
    !EVIDENCE_DETAIL_PROJECTIONS.includes(
      payload.projection as EvidenceDetailProjection,
    ) ||
    typeof payload.queryDigest !== 'string' ||
    typeof payload.nextKey !== 'string'
  ) {
    throw invalidContinuation('Continuation fields are invalid.');
  }
  if (
    payload.handoffId !== expected.handoffId ||
    payload.snapshotId !== expected.snapshotId ||
    payload.projection !== expected.projection ||
    payload.queryDigest !== expected.queryDigest
  ) {
    throw invalidContinuation(
      'Continuation is bound to a different Handoff, Snapshot, projection, or query.',
    );
  }
  return payload as CursorPayload;
}

function invalidContinuation(message: string): V2ContractError {
  return new V2ContractError('invalid-continuation', message);
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

import type { AcceptanceRequirement, ReconstructionAcceptanceContract } from './acceptance-contract.js';
import type { BlobRecord } from './contracts/blob.js';
import { V2ContractError, unknownReferenceError } from './contracts/errors.js';
import { sha1Hex } from './contracts/hash-sha1.js';
import type { AgentHandoff } from './contracts/handoff.js';
import type {
  EvidenceCaseReadModel,
  EvidenceReadModel,
  EvidenceReadableFact,
} from './evidence-read-model.js';

export const CONSUMER_PROJECTION_VERSION = 1 as const;

export const CONSUMER_PROJECTION_CAPABILITIES = [
  'handoff-index',
  'screen-packet',
  'case-delta',
  'evidence-detail',
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
    'screen-packet' | 'case-delta' | EvidenceDetailProjection
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
  scrollBoundarySummary: {
    regionCount: number;
    scrollOwners: unknown[];
    positionedRegionCount: number;
  };
  componentIds: string[];
  tokenIds: string[];
  screenshotGroups: ConsumerScreenshotGroup[];
  detailQueryHints: Array<{
    projection: EvidenceDetailProjection;
    screenId: string;
  }>;
  complete: true;
  omittedCategories: string[];
  warnings: string[];
};

export type FactDelta = {
  factId: string;
  before?: EvidenceReadableFact;
  after?: EvidenceReadableFact;
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
  unresolved: EvidenceReadableFact[];
  complete: true;
  omittedCategories: string[];
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
  const topology = structure.filter(
    (requirement) => requirement.kind === 'semantic-region-topology',
  );
  const scrollOwners = uniqueByCanonical(
    topology.flatMap((requirement) => {
      const expected = objectValue(requirement.expected);
      return expected && expected.scrollOwner !== undefined
        ? [expected.scrollOwner]
        : [];
    }),
  );
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
    scrollBoundarySummary: {
      regionCount: topology.length,
      scrollOwners,
      positionedRegionCount: topology.filter((requirement) => {
        const expected = objectValue(requirement.expected);
        return Boolean(expected?.positioning);
      }).length,
    },
    componentIds,
    tokenIds,
    screenshotGroups,
    detailQueryHints: EVIDENCE_DETAIL_PROJECTIONS.map((projection) => ({
      projection,
      screenId,
    })),
    complete: true,
    omittedCategories: [
      'full-region-facts',
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
      added.push({ factId, after: selectedFact });
    } else if (baselineFact && !selectedFact) {
      removed.push({ factId, before: baselineFact });
    } else if (
      baselineFact &&
      selectedFact &&
      canonical(baselineFact) !== canonical(selectedFact)
    ) {
      changed.push({ factId, before: baselineFact, after: selectedFact });
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
    unresolved: selected.facts.filter(
      (fact) => fact.resolution !== 'resolved',
    ),
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

function encodeCursor(payload: CursorPayload): string {
  const json = canonical(payload);
  // encodeURIComponent intentionally leaves periods unescaped. Escape them so
  // the period-delimited envelope remains unambiguous for IDs such as
  // "screen.detail" and logical item keys.
  const encoded = encodeURIComponent(json).replaceAll('.', '%2E');
  return `pbcp1.${sha1Hex(json)}.${encoded}`;
}

function decodeCursor(
  value: string,
  expected: Pick<
    CursorPayload,
    'handoffId' | 'snapshotId' | 'projection' | 'queryDigest'
  >,
): CursorPayload {
  const [prefix, checksum, encoded, ...rest] = value.split('.');
  if (prefix !== 'pbcp1' || !checksum || !encoded || rest.length > 0) {
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

function uniqueByCanonical(values: unknown[]): unknown[] {
  const seen = new Set<string>();
  return values
    .filter((value) => {
      const key = canonical(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => canonical(left).localeCompare(canonical(right)));
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

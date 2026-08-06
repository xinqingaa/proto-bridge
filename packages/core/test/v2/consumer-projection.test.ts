import { describe, expect, it } from 'vitest';
import {
  assertConsumerCapabilities,
  buildCaseDelta,
  buildEvidenceDetail,
  buildHandoffIndex,
  buildImplementationPlan,
  buildImplementationTranche,
  buildReconstructionObligationProjection,
  buildScreenPacket,
  buildStructureIR,
  compareStructureIR,
  fixtures,
  type AgentHandoff,
  type BlobRecord,
  type ConsumerProjectionInput,
  type EvidenceCaseReadModel,
  type EvidenceSemanticRegionReadModel,
  type EvidenceDetailProjection,
  type EvidenceDetailItem,
  type EvidenceReadModel,
  type EvidenceReadableFact,
  type ReconstructionAcceptanceContract,
  V2ContractError,
} from '../../src/v2/index.js';

const SCREEN = 'example.queue';
const OTHER_SCREEN = 'example.detail';
const THIRD_SCREEN = 'example.form';
const DEFAULT_CASE = `${SCREEN}::default::light::iphone-14`;
const EMPTY_CASE = `${SCREEN}::empty::light::iphone-14`;
const SCENARIO_CASE = `${SCREEN}::default::light::iphone-14::scenario=${SCREEN}.filter@applied`;
const OTHER_CASE = `${OTHER_SCREEN}::default::light::iphone-14`;
const THIRD_CASE = `${THIRD_SCREEN}::default::light::iphone-14`;
const DIGEST_DEFAULT = `sha256:${'1'.repeat(64)}`;
const DIGEST_EMPTY = `sha256:${'2'.repeat(64)}`;
const DIGEST_OTHER = `sha256:${'3'.repeat(64)}`;
const DIGEST_THIRD = `sha256:${'4'.repeat(64)}`;

describe('Consumer projection', () => {
  it('fails terminally instead of falling back when a required capability is missing', () => {
    expect(() =>
      assertConsumerCapabilities([
        'handoff-index',
        'screen-packet',
        'case-delta',
        'image-content-screenshot',
      ]),
    ).toThrowError(
      expect.objectContaining({ code: 'incompatible-consumer-capability' }),
    );
  });

  it('builds a closed Handoff index in fixed Handoff order without full Facts', () => {
    const input = projectionFixture();
    const index = buildHandoffIndex(input);

    expect(index.fixedRefs).toMatchObject({
      workspaceId: input.handoff.workspaceId,
      bundleId: input.handoff.bundleId,
      snapshotId: input.handoff.snapshotId,
    });
    expect(index.screens.map((screen) => screen.screenId)).toEqual([
      SCREEN,
      OTHER_SCREEN,
      THIRD_SCREEN,
    ]);
    expect(index.screens[0]).toMatchObject({
      caseIds: [DEFAULT_CASE, EMPTY_CASE, SCENARIO_CASE],
      caseCount: 3,
      scenarioCount: 1,
      distinctScreenshotDigests: [DIGEST_DEFAULT, DIGEST_EMPTY],
    });
    expect(index.screenshotGroups.find((group) => group.digest === DIGEST_EMPTY))
      .toMatchObject({
        caseIds: [EMPTY_CASE, SCENARIO_CASE],
        metadataStatus: 'available',
      });
    expect(index).not.toHaveProperty('facts');
    expect(JSON.stringify(index)).not.toContain('baseline-only-text');
    expect(index.omittedCategories).toContain('full-acceptance-dimensions');
  });

  it('builds one Screen packet with an explicit baseline and same-image semantics', () => {
    const input = projectionFixture();
    const packet = buildScreenPacket(input, SCREEN);

    expect(packet.baselineCaseId).toBe(DEFAULT_CASE);
    expect(packet.baselineSelectionReason).toBe('default-non-scenario');
    expect(packet.cases.map((item) => item.caseId)).toEqual([
      DEFAULT_CASE,
      EMPTY_CASE,
      SCENARIO_CASE,
    ]);
    expect(packet.scenarioMap).toEqual([
      {
        caseId: SCENARIO_CASE,
        ownerScreenId: SCREEN,
        scenarioId: 'filter',
        checkpointId: 'applied',
      },
    ]);
    expect(packet.projectionVersion).toBe(4);
    expect(packet.implementationInventory.resolverInput).toEqual({
      componentIds: ['app.card', 'app.page-shell'],
      tokenIds: ['color.surface', 'space.md'],
    });
    const inventory = packet.implementationInventory;
    expect(inventory.regions).toContainEqual({ regionId: `${SCREEN}.empty.one`, roles: ['empty-state'] });
    expect(inventory.regions).toContainEqual({ regionId: `${SCREEN}.root`, roles: ['page'] });
    expect(inventory.components).toEqual([
      {
        componentId: 'app.card',
        occurrenceCount: 1,
        occurrences: [{ regionId: `${SCREEN}.empty.one`, caseIds: [EMPTY_CASE] }],
      },
      {
        componentId: 'app.page-shell',
        occurrenceCount: 1,
        occurrences: [{ regionId: `${SCREEN}.root`, caseIds: [DEFAULT_CASE, SCENARIO_CASE] }],
      },
    ]);
    expect(inventory.tokens).toContainEqual({
      tokenId: 'color.surface',
      occurrenceCount: 1,
      occurrences: [{
        regionId: `${SCREEN}.root`,
        slot: 'color',
        caseIds: [DEFAULT_CASE, SCENARIO_CASE],
      }],
    });
    expect(inventory.tokens).toContainEqual({
      tokenId: 'space.md',
      occurrenceCount: 1,
      occurrences: [{
        regionId: `${SCREEN}.empty.one`,
        slot: 'gap',
        caseIds: [EMPTY_CASE],
      }],
    });
    expect(packet.canonicalBrief.primaryScroll.length).toBeGreaterThan(0);
    expect(packet.canonicalBrief.stateMatrix.map((item) => item.caseId)).toEqual([
      DEFAULT_CASE,
      EMPTY_CASE,
      SCENARIO_CASE,
    ]);
    expect(packet.canonicalBrief.highImpactConstraints.some((item) =>
      item.includes('not target component'))).toBe(true);
    expect(packet).not.toHaveProperty('componentIds');
    expect(packet).not.toHaveProperty('tokenIds');
    expect(packet).not.toHaveProperty('shellContracts');
    expect(packet.baseline.state).not.toHaveProperty('requirements');
    expect(packet.screenshotGroups.find((group) => group.digest === DIGEST_EMPTY)?.caseIds)
      .toEqual([EMPTY_CASE, SCENARIO_CASE]);
    expect(packet.baseline.structure.scrollContainers).toContainEqual({
      owner: { kind: 'region', regionId: `${SCREEN}.scroll-list` },
      memberRegionIds: [
        `${SCREEN}.summary`,
        `${SCREEN}.summary.metric.critical`,
        `${SCREEN}.summary.metric.unassigned`,
        `${SCREEN}.search`,
        `${SCREEN}.list`,
      ],
      pinnedRegionIds: [],
    });
    expect(packet.baseline.structure.siblingRelations).toContainEqual({
      parentRegionId: `${SCREEN}.summary`,
      regionId: `${SCREEN}.summary.metric.critical`,
      nextRegionId: `${SCREEN}.summary.metric.unassigned`,
      relation: 'left-of',
    });
    expect(packet.baseline.structure.regions[0]).not.toHaveProperty('bbox');
    expect(packet.baseline.structure.regions[0]).not.toHaveProperty('documentOrder');
    expect(packet.baseline.structure.regions[0]).not.toHaveProperty('ancestorRegionIds');
    expect(packet.baseline.structure.regions[0]).not.toHaveProperty('scrollOwner');
    expect(packet.baseline.state.visibleContent).toContainEqual({
      regionId: `${SCREEN}.summary.metric.critical`,
      role: 'status',
      text: '3 个严重异常',
    });
    expect(packet.obligationQueryHints).toContainEqual({
      screenId: SCREEN,
      dimension: 'structure',
      count: expect.any(Number),
    });
    expect(JSON.stringify(packet)).not.toContain(OTHER_SCREEN);
  });

  it('detects parent, scroll-owner, positioning, sibling-order and bbox-relation mutations as structure classes', () => {
    const expected = buildStructureIR(projectionFixture(), SCREEN, DEFAULT_CASE);
    const actual = structuredClone(expected);
    actual.regions.find((item) => item.regionId === `${SCREEN}.summary`)!.scrollOwner = { kind: 'viewport' };
    actual.regions.find((item) => item.regionId === `${SCREEN}.search`)!.parentRegionId = `${SCREEN}.root`;
    actual.regions.find((item) => item.regionId === `${SCREEN}.list`)!.positioning = 'fixed';
    const metricGroup = actual.siblingGroups.find((item) => item.parentRegionId === `${SCREEN}.summary`)!;
    metricGroup.childRegionIds.reverse();
    actual.siblingRelations.find((item) =>
      item.regionId === `${SCREEN}.summary.metric.critical`
      && item.nextRegionId === `${SCREEN}.summary.metric.unassigned`
    )!.relation = 'above';

    expect(new Set(compareStructureIR(expected, actual).map((item) => item.kind))).toEqual(new Set([
      'scroll-owner',
      'parent',
      'positioning',
      'sibling-order',
      'bbox-relation',
    ]));
  });

  it('returns semantic patches instead of fact-level deltas while preserving evidence signals', () => {
    const input = projectionFixture();
    const delta = buildCaseDelta(input, SCREEN, EMPTY_CASE);

    expect(delta.baselineCaseId).toBe(DEFAULT_CASE);
    expect(delta.patches).toContainEqual({
      kind: 'add',
      region: expect.objectContaining({
        regionId: `${SCREEN}.empty.one`,
        role: 'empty-state',
      }),
    });
    expect(delta.patches).toContainEqual({
      kind: 'content',
      regionId: `${SCREEN}.empty.one`,
      after: 'No records',
    });
    expect(delta.patches).toContainEqual({
      kind: 'value',
      regionId: `${SCREEN}.empty.one`,
      key: 'mode',
      after: 'empty',
    });
    expect(delta.patches).toContainEqual({
      kind: 'keyed-collection',
      collectionId: `${SCREEN}.empty`,
      addedKeys: ['one'],
      removedKeys: [],
    });
    expect(delta.patches).toContainEqual({
      kind: 'state',
      subject: 'shell',
      field: 'variantId',
      before: 'default',
      after: 'empty',
    });
    expect(delta.evidenceSignals).toContainEqual({
      subject: `${SCREEN}.empty.one`,
      unresolved: [{ field: 'role', resolution: 'unknown' }],
      provenanceChangedFields: [],
    });
    expect(delta.omittedCategories).toContain('fact-level-deltas');
    expect(delta).not.toHaveProperty('added');
    expect(delta).not.toHaveProperty('removed');
    expect(delta).not.toHaveProperty('changed');
    expect(delta).not.toHaveProperty('state');
    expect(JSON.stringify(delta)).not.toContain('runtime-observation');
  });

  it('groups topology, content and interaction changes into stable semantic patches', () => {
    const delta = buildCaseDelta(projectionFixture(), SCREEN, SCENARIO_CASE);
    const kinds = new Set(delta.patches.map((item) => item.kind));

    expect(kinds).toEqual(new Set([
      'content',
      'interaction',
      'order',
      'positioning',
      'relation',
      'reparent',
      'scroll-owner',
    ]));
    expect(delta.patches).toContainEqual({
      kind: 'reparent',
      regionId: `${SCREEN}.summary`,
      beforeRegionId: `${SCREEN}.scroll-list`,
      afterRegionId: `${SCREEN}.root`,
    });
    expect(delta.patches).toContainEqual(expect.objectContaining({
      kind: 'interaction',
      change: 'add',
      subject: `${SCREEN}.scenario.filter`,
    }));
  });

  it('aggregates provenance changes by semantic Region without returning provenance payloads', () => {
    const input = projectionFixture();
    const scenario = input.evidence.screens
      .flatMap((screen) => screen.cases)
      .find((item) => item.caseId === SCENARIO_CASE)!;
    scenario.facts[0]!.provenance = [{
      source: 'runtime-observation',
      locator: '#alternate-root',
      confidence: 'high',
    }];

    const delta = buildCaseDelta(input, SCREEN, SCENARIO_CASE);

    expect(delta.evidenceSignals).toContainEqual({
      subject: `${SCREEN}.root`,
      unresolved: [],
      provenanceChangedFields: ['role'],
    });
    expect(JSON.stringify(delta)).not.toContain('#alternate-root');
    expect(JSON.stringify(delta)).not.toContain('runtime-observation');
  });

  it('builds an ordered Region implementation plan without changing the canonical denominator', () => {
    const input = projectionFixture();
    const plan = buildImplementationPlan(input, SCREEN);

    expect(plan.planVersion).toBe(1);
    expect(plan.tranches[0]?.sequence).toBe(0);
    expect(plan.tranches.at(-1)?.regionId).toBe('$screen');
    expect(
      plan.tranches.reduce(
        (total, tranche) => total + Object.values(tranche.byDimension).reduce((sum, count) => sum + count, 0),
        0,
      ),
    ).toBe(plan.canonicalObligationCount);
    expect(plan.tranches.find((item) => item.regionId === '$screen')).toMatchObject({
      dependencies: { allRegionTranches: true },
      byDimension: { states: 1, interactions: 1 },
    });

    const root = plan.tranches.find((item) => item.regionId === `${SCREEN}.root`)!;
    expect(root.byDimension.components).toBe(1);
    expect(root.caseIds).toEqual([DEFAULT_CASE, SCENARIO_CASE, EMPTY_CASE]);
    const tranche = buildImplementationTranche(input, SCREEN, root.trancheId);
    expect(tranche.obligations.components).toHaveLength(1);
    expect(tranche.obligations.components[0]?.obligationId).toMatch(/^obligation-sha1:/);
  });

  it('traverses stable logical pages and rejects a cursor reused for another query', () => {
    const input = projectionFixture();
    const first = buildEvidenceDetail(input, {
      handoffId: input.handoff.handoffId,
      screenId: SCREEN,
      projection: 'tokens',
      pageSize: 1,
    });
    expect(first.complete).toBe(false);
    expect(first.items).toHaveLength(1);
    expect(first.continuation).toMatch(/^pbcp4\./);

    const second = buildEvidenceDetail(input, {
      handoffId: input.handoff.handoffId,
      screenId: SCREEN,
      projection: 'tokens',
      pageSize: 1,
      cursor: first.continuation,
    });
    expect(second.items[0]?.itemKey).not.toBe(first.items[0]?.itemKey);

    expect(() =>
      buildEvidenceDetail(input, {
        handoffId: input.handoff.handoffId,
        screenId: SCREEN,
        projection: 'tokens',
        caseId: EMPTY_CASE,
        cursor: first.continuation,
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid-continuation' }));
  });

  it('pages canonical obligations by Screen and dimension with a query-bound cursor', () => {
    const input = projectionFixture();
    const first = buildReconstructionObligationProjection(input, {
      handoffId: input.handoff.handoffId,
      screenId: SCREEN,
      dimension: 'structure',
      pageSize: 1,
    });
    expect(first.obligations).toHaveLength(1);
    expect(first.total).toBeGreaterThan(1);
    expect(first.continuation).toMatch(/^pbop4\./);
    const second = buildReconstructionObligationProjection(input, {
      handoffId: input.handoff.handoffId,
      screenId: SCREEN,
      dimension: 'structure',
      pageSize: 1,
      cursor: first.continuation,
    });
    expect(second.obligations[0]?.obligationId).not.toBe(first.obligations[0]?.obligationId);
    expect(() => buildReconstructionObligationProjection(input, {
      handoffId: input.handoff.handoffId,
      screenId: SCREEN,
      dimension: 'tokens',
      cursor: first.continuation,
    })).toThrowError(expect.objectContaining({ code: 'invalid-continuation' }));
  });

  it('preserves the Acceptance requirement set when every detail projection is traversed', () => {
    const input = projectionFixture();
    const dimensions: EvidenceDetailProjection[] = [
      'structure',
      'components',
      'tokens',
      'interactions',
    ];
    for (const projection of dimensions) {
      const actual: string[] = [];
      let cursor: string | undefined;
      do {
        const page = buildEvidenceDetail(input, {
          handoffId: input.handoff.handoffId,
          screenId: SCREEN,
          projection,
          pageSize: 1,
          ...(cursor ? { cursor } : {}),
        });
        actual.push(
          ...page.items.flatMap((item) =>
            item.source === 'acceptance-requirement'
              ? [item.requirement.requirementId]
              : [],
          ),
        );
        cursor = page.continuation;
      } while (cursor);

      const expected = input.acceptance.dimensions[projection]
        .filter((item) => item.screenId === SCREEN)
        .map((item) => item.requirementId)
        .sort((left, right) => left.localeCompare(right));
      expect(actual).toEqual(expected);
    }
  });

  it('is semantically equivalent to the fixed full read across all three Screens', () => {
    const input = projectionFixture();
    const index = buildHandoffIndex(input);
    const selectedCaseIds = input.handoff.selectedCases.map((item) => item.caseId);
    expect(index.screens.flatMap((screen) => screen.caseIds)).toEqual(
      selectedCaseIds,
    );

    const packets = index.screens.map((screen) =>
      buildScreenPacket(input, screen.screenId),
    );
    const projectedScenarios = packets
      .flatMap((packet) => packet.scenarioMap)
      .map((item) => `${item.caseId}:${item.scenarioId}:${item.checkpointId}`)
      .sort();
    const fullScenarios = input.evidence.screens
      .flatMap((screen) => screen.cases)
      .filter((item) => selectedCaseIds.includes(item.caseId) && item.scenario)
      .map(
        (item) =>
          `${item.caseId}:${item.scenario!.scenarioId}:${item.scenario!.checkpointId}`,
      )
      .sort();
    expect(projectedScenarios).toEqual(fullScenarios);

    const selectedBlobIds = new Set(
      input.acceptance.screenshots.flatMap((item) => item.blobIds),
    );
    const fullDigests = input.blobs
      .filter((blob) => selectedBlobIds.has(blob.blobId))
      .map((blob) => blob.digest)
      .sort();
    const projectedDigests = index.screenshotGroups
      .flatMap((group) => group.blobIds.map(() => group.digest!))
      .sort();
    expect(projectedDigests).toEqual(fullDigests);

    for (const projection of [
      'structure',
      'components',
      'tokens',
      'interactions',
    ] as const) {
      const projected = index.screens
        .flatMap((screen) =>
          traverseDetail(input, screen.screenId, projection).flatMap((item) =>
            item.source === 'acceptance-requirement'
              ? [item.requirement.requirementId]
              : [],
          ),
        )
        .sort((left, right) => left.localeCompare(right));
      const full = input.acceptance.dimensions[projection]
        .map((item) => item.requirementId)
        .sort((left, right) => left.localeCompare(right));
      expect(projected).toEqual(full);
    }

    const projectedFacts = index.screens
      .flatMap((screen) =>
        traverseDetail(input, screen.screenId, 'provenance').flatMap((item) =>
          item.source === 'evidence-fact'
            ? [`${item.caseId}:${item.fact.factId}:${JSON.stringify(item.fact.provenance)}`]
            : [],
        ),
      )
      .sort();
    const fullFacts = input.evidence.screens
      .flatMap((screen) => screen.cases)
      .filter((item) => selectedCaseIds.includes(item.caseId))
      .flatMap((item) =>
        item.facts.map(
          (fact) =>
            `${item.caseId}:${fact.factId}:${JSON.stringify(fact.provenance)}`,
        ),
      )
      .sort();
    expect(projectedFacts).toEqual(fullFacts);
  });

  it('fails terminally when Handoff, Evidence and Acceptance identities drift', () => {
    const input = projectionFixture();
    const drifted: ConsumerProjectionInput = {
      ...input,
      evidence: { ...input.evidence, snapshotId: 'snapshot-drifted' },
    };
    expect(() => buildHandoffIndex(drifted)).toThrowError(
      expect.objectContaining<V2ContractError>({ code: 'workspace-mismatch' }),
    );
  });
});

function projectionFixture(): ConsumerProjectionInput {
  const baseRef = fixtures.ledgerPlanetTaskList.HANDOFF.selectedCases[0]!;
  const resolved = (caseId: string, revisionId: string, attemptId: string) => ({
    ...baseRef,
    caseId,
    revisionId,
    relevantAttemptId: attemptId,
  });
  const handoff: AgentHandoff = {
    ...fixtures.ledgerPlanetTaskList.HANDOFF,
    selectedCases: [
      resolved(DEFAULT_CASE, 'revision-default', 'attempt-default'),
      resolved(EMPTY_CASE, 'revision-empty', 'attempt-empty'),
      resolved(SCENARIO_CASE, 'revision-scenario', 'attempt-scenario'),
      resolved(OTHER_CASE, 'revision-other', 'attempt-other'),
      resolved(THIRD_CASE, 'revision-third', 'attempt-third'),
    ],
  };
  const defaultCase = caseModel({
    caseId: DEFAULT_CASE,
    screenId: SCREEN,
    revisionId: 'revision-default',
    variantId: 'default',
    screenshotBlobIds: ['blob-default'],
    facts: [
      fact(`${SCREEN}.root.role`, 'page', 0),
      fact(`${SCREEN}.status.text`, 'baseline-only-text', 1),
    ],
    regions: baselineRegions(),
  });
  const emptyCase = caseModel({
    caseId: EMPTY_CASE,
    screenId: SCREEN,
    revisionId: 'revision-empty',
    variantId: 'empty',
    screenshotBlobIds: ['blob-empty'],
    facts: [
      fact(`${SCREEN}.root.role`, 'page', 0),
      {
        sourceIndex: 1,
        factId: `${SCREEN}.empty.one.role`,
        category: 'structure',
        label: '语义角色',
        resolution: 'unknown',
        value: 'empty-state',
        provenance: [
          {
            source: 'runtime-observation',
            locator: '#empty',
            confidence: 'high',
          },
        ],
      },
    ],
    regions: emptyRegions(),
  });
  const scenarioCase = caseModel({
    caseId: SCENARIO_CASE,
    screenId: SCREEN,
    revisionId: 'revision-scenario',
    variantId: 'default',
    screenshotBlobIds: ['blob-empty-alias'],
    scenario: {
      ownerScreenId: SCREEN,
      scenarioId: 'filter',
      checkpointId: 'applied',
    },
    facts: [
      fact(`${SCREEN}.root.role`, 'page', 0),
      fact(`${SCREEN}.summary.metric.critical.text`, '1 filtered result', 1),
    ],
    regions: scenarioRegions(),
  });
  const otherCase = caseModel({
    caseId: OTHER_CASE,
    screenId: OTHER_SCREEN,
    revisionId: 'revision-other',
    variantId: 'default',
    screenshotBlobIds: ['blob-other'],
    facts: [fact(`${OTHER_SCREEN}.root.role`, 'page', 0)],
  });
  const thirdCase = caseModel({
    caseId: THIRD_CASE,
    screenId: THIRD_SCREEN,
    revisionId: 'revision-third',
    variantId: 'default',
    screenshotBlobIds: ['blob-third'],
    facts: [fact(`${THIRD_SCREEN}.root.role`, 'form', 0)],
  });
  const evidence: EvidenceReadModel = {
    bundleId: handoff.bundleId,
    snapshotId: handoff.snapshotId,
    sourceRunId: 'run-projection',
    committedAt: handoff.createdAt,
    deliveryStatus: 'ready',
    coverageStatus: 'complete',
    semanticStatus: 'declared',
    evidenceLevels: [
      { level: 'instrumented-source-runtime', count: 5 },
    ],
    summary: {
      selected: 5,
      captured: 5,
      reused: 0,
      failed: 0,
      missing: 0,
      screenshots: 4,
      unknown: 1,
      conflicts: 0,
    },
    screens: [
      { screenId: OTHER_SCREEN, cases: [otherCase] },
      { screenId: THIRD_SCREEN, cases: [thirdCase] },
      { screenId: SCREEN, cases: [scenarioCase, emptyCase, defaultCase] },
    ],
    messages: [],
  };
  const acceptance = acceptanceContract(handoff);
  const blobs: BlobRecord[] = [
    blob('blob-default', DIGEST_DEFAULT, 'revision-default'),
    blob('blob-empty', DIGEST_EMPTY, 'revision-empty'),
    blob('blob-empty-alias', DIGEST_EMPTY, 'revision-scenario'),
    blob('blob-other', DIGEST_OTHER, 'revision-other'),
    blob('blob-third', DIGEST_THIRD, 'revision-third'),
  ];
  return { handoff, evidence, acceptance, blobs };
}

function caseModel(input: {
  caseId: string;
  screenId: string;
  revisionId: string;
  variantId: string;
  screenshotBlobIds: string[];
  scenario?: EvidenceCaseReadModel['scenario'];
  facts: EvidenceReadableFact[];
  regions?: EvidenceSemanticRegionReadModel[];
}): EvidenceCaseReadModel {
  return {
    caseId: input.caseId,
    screenId: input.screenId,
    variantId: input.variantId,
    themeId: 'light',
    deviceId: 'iphone-14',
    ...(input.scenario ? { scenario: input.scenario } : {}),
    revisionId: input.revisionId,
    evidenceLevel: 'instrumented-source-runtime',
    scopeKind: 'page',
    fragmentLabels: [],
    screenshotBlobIds: input.screenshotBlobIds,
    facts: input.facts,
    contextFacts: [],
    interactionFacts: [],
    regions: input.regions ?? [],
    unknownCount: input.facts.filter((item) => item.resolution === 'unknown')
      .length,
    conflictCount: input.facts.filter(
      (item) => item.resolution === 'unresolved-conflict',
    ).length,
    semanticCoverage: 'declared',
  };
}

function fact(
  factId: string,
  value: string,
  sourceIndex: number,
): EvidenceReadableFact {
  return {
    sourceIndex,
    factId,
    category: factId.endsWith('.text') ? 'content' : 'structure',
    label: factId.endsWith('.text') ? '可见内容' : '语义角色',
    resolution: 'resolved',
    value,
    provenance: [{ source: 'data-pb', locator: `#${factId}` }],
  };
}

function blob(blobId: string, digest: string, revisionId: string): BlobRecord {
  return {
    schemaVersion: 1,
    blobId,
    workspaceId: fixtures.ledgerPlanetTaskList.WORKSPACE_ID,
    bundleId: fixtures.ledgerPlanetTaskList.BUNDLE_ID,
    kind: 'screenshot',
    mediaType: 'image/png',
    byteLength: 10,
    digest,
    createdAt: '2026-08-04T00:00:00.000Z',
    image: { width: 1170, height: 2532 },
    ownerRefs: [{ kind: 'revision', objectId: revisionId }],
  };
}

function acceptanceContract(
  handoff: AgentHandoff,
): ReconstructionAcceptanceContract {
  const structure = [DEFAULT_CASE, EMPTY_CASE, SCENARIO_CASE].flatMap((caseId) => {
    const topology = caseId === DEFAULT_CASE
      ? baselineTopology(caseId)
      : caseId === EMPTY_CASE
        ? [
            topologyRequirement(caseId, `${SCREEN}.root`, 0, undefined, { kind: 'viewport' }, { x: 0, y: 0, width: 390, height: 844 }, 'page'),
            topologyRequirement(caseId, `${SCREEN}.empty.one`, 1, `${SCREEN}.root`, { kind: 'viewport' }, { x: 16, y: 120, width: 358, height: 160 }, 'empty-state'),
          ]
        : scenarioTopology(caseId);
    return [
      ...topology,
      {
        requirementId: `shell.${caseId}`,
        caseId,
        screenId: SCREEN,
        dimension: 'structure' as const,
        kind: 'authored-structure-contract',
        subject: `${SCREEN}.structure.shell`,
        expected: { appBar: true },
        evidenceRefs: [`${SCREEN}.structure.shell`],
      },
    ];
  });
  return {
    contractVersion: 1,
    handoffId: handoff.handoffId,
    workspaceId: handoff.workspaceId,
    bundleId: handoff.bundleId,
    snapshotId: handoff.snapshotId,
    readiness: { status: 'ready', blockers: [] },
    screenshots: [
      {
        caseId: DEFAULT_CASE,
        screenId: SCREEN,
        variantId: 'default',
        blobIds: ['blob-default'],
      },
      {
        caseId: EMPTY_CASE,
        screenId: SCREEN,
        variantId: 'empty',
        blobIds: ['blob-empty'],
      },
      {
        caseId: SCENARIO_CASE,
        screenId: SCREEN,
        variantId: 'default',
        scenario: {
          ownerScreenId: SCREEN,
          scenarioId: 'filter',
          checkpointId: 'applied',
        },
        blobIds: ['blob-empty-alias'],
      },
      {
        caseId: OTHER_CASE,
        screenId: OTHER_SCREEN,
        variantId: 'default',
        blobIds: ['blob-other'],
      },
      {
        caseId: THIRD_CASE,
        screenId: THIRD_SCREEN,
        variantId: 'default',
        blobIds: ['blob-third'],
      },
    ],
    dimensions: {
      structure,
      components: [
        requirement('component.page', DEFAULT_CASE, 'components', `${SCREEN}.root`, {
          componentId: 'app.page-shell',
        }),
        requirement('component.page.scenario', SCENARIO_CASE, 'components', `${SCREEN}.root`, {
          componentId: 'app.page-shell',
        }),
        requirement('component.card', EMPTY_CASE, 'components', `${SCREEN}.empty.one`, {
          componentId: 'app.card',
        }),
        requirement(
          'component.form',
          THIRD_CASE,
          'components',
          `${THIRD_SCREEN}.root`,
          { componentId: 'app.form-shell' },
          THIRD_SCREEN,
        ),
      ],
      tokens: [
        requirement('token.surface', DEFAULT_CASE, 'tokens', `${SCREEN}.root.color`, {
          slot: 'color',
          tokenId: 'color.surface',
        }),
        requirement('token.surface.scenario', SCENARIO_CASE, 'tokens', `${SCREEN}.root.color`, {
          slot: 'color',
          tokenId: 'color.surface',
        }),
        requirement('token.space', EMPTY_CASE, 'tokens', `${SCREEN}.empty.one.gap`, {
          slot: 'gap',
          tokenId: 'space.md',
        }),
        requirement(
          'token.form-surface',
          THIRD_CASE,
          'tokens',
          `${THIRD_SCREEN}.root.color`,
          { slot: 'color', tokenId: 'color.form-surface' },
          THIRD_SCREEN,
        ),
      ],
      states: [
        requirement('state.default', DEFAULT_CASE, 'states', 'default', {
          variantId: 'default',
        }),
      ],
      interactions: [
        requirement(
          'interaction.filter',
          SCENARIO_CASE,
          'interactions',
          `${SCREEN}.scenario.filter`,
          { action: 'filter' },
        ),
      ],
    },
  };
}

function baselineTopology(caseId: string) {
  const viewport = { kind: 'viewport' } as const;
  const scrollOwner = { kind: 'fragment', fragment: fragment(`${SCREEN}.scroll-list`) } as const;
  return [
    topologyRequirement(caseId, `${SCREEN}.app-bar`, 0, undefined, viewport, { x: 0, y: 0, width: 390, height: 65 }, 'app-bar'),
    topologyRequirement(caseId, `${SCREEN}.root`, 1, undefined, viewport, { x: 0, y: 65, width: 390, height: 779 }, 'page'),
    topologyRequirement(caseId, `${SCREEN}.scroll-list`, 2, `${SCREEN}.root`, viewport, { x: 0, y: 65, width: 390, height: 779 }, 'scroll-list'),
    topologyRequirement(caseId, `${SCREEN}.summary`, 3, `${SCREEN}.scroll-list`, scrollOwner, { x: 16, y: 81, width: 358, height: 190 }, 'summary'),
    topologyRequirement(caseId, `${SCREEN}.summary.metric.critical`, 4, `${SCREEN}.summary`, scrollOwner, { x: 33, y: 149, width: 102, height: 61 }, 'status'),
    topologyRequirement(caseId, `${SCREEN}.summary.metric.unassigned`, 5, `${SCREEN}.summary`, scrollOwner, { x: 144, y: 149, width: 102, height: 61 }, 'status'),
    topologyRequirement(caseId, `${SCREEN}.search`, 6, `${SCREEN}.scroll-list`, scrollOwner, { x: 16, y: 283, width: 358, height: 48 }, 'search'),
    topologyRequirement(caseId, `${SCREEN}.list`, 7, `${SCREEN}.scroll-list`, scrollOwner, { x: 16, y: 403, width: 358, height: 316 }, 'list'),
  ];
}

function scenarioTopology(caseId: string) {
  return baselineTopology(caseId).map((requirement) => {
    const expected = structuredClone(requirement.expected);
    if (requirement.subject === `${SCREEN}.summary`) {
      expected.semanticParent = fragment(`${SCREEN}.root`);
      expected.semanticAncestors = [fragment(`${SCREEN}.root`)];
      expected.scrollOwner = { kind: 'viewport' };
      expected.positioning = 'fixed';
    }
    if (requirement.subject === `${SCREEN}.summary.metric.unassigned`) {
      expected.bbox = { x: 33, y: 220, width: 102, height: 61 };
    }
    return { ...requirement, expected };
  });
}

function topologyRequirement(
  caseId: string,
  subject: string,
  documentOrder: number,
  parentRegionId: string | undefined,
  scrollOwner: unknown,
  bbox: { x: number; y: number; width: number; height: number },
  role = 'region',
) {
  const ancestors = parentRegionId ? [fragment(parentRegionId)] : [];
  return {
    requirementId: `structure.${caseId}.${subject}`,
    caseId,
    screenId: SCREEN,
    dimension: 'structure' as const,
    kind: 'semantic-region-topology',
    subject,
    expected: {
      role,
      ...(parentRegionId ? { semanticParent: fragment(parentRegionId) } : {}),
      semanticAncestors: ancestors,
      documentOrder,
      scrollOwner,
      positioning: 'flow',
      bbox,
    },
    evidenceRefs: [`${subject}.role`],
  };
}

function fragment(regionId: string, pbKey?: string) {
  return { screenId: SCREEN, pbId: regionId, ...(pbKey ? { pbKey } : {}) };
}

function baselineRegions(): EvidenceSemanticRegionReadModel[] {
  return [
    region(`${SCREEN}.app-bar`, 0, 'app-bar'),
    region(`${SCREEN}.root`, 1, 'page'),
    region(`${SCREEN}.scroll-list`, 2, 'scroll-list', `${SCREEN}.root`),
    region(`${SCREEN}.summary`, 3, 'summary', `${SCREEN}.scroll-list`),
    region(`${SCREEN}.summary.metric.critical`, 4, 'status', `${SCREEN}.summary`, '3 个严重异常'),
    region(`${SCREEN}.summary.metric.unassigned`, 5, 'status', `${SCREEN}.summary`, '2 个等待接手'),
    region(`${SCREEN}.search`, 6, 'search', `${SCREEN}.scroll-list`, '搜索运单'),
    region(`${SCREEN}.list`, 7, 'list', `${SCREEN}.scroll-list`),
  ];
}

function emptyRegions(): EvidenceSemanticRegionReadModel[] {
  const empty = region(
    `${SCREEN}.empty.one`,
    1,
    'empty-state',
    `${SCREEN}.root`,
    'No records',
  );
  empty.identity = {
    screenId: SCREEN,
    pbId: `${SCREEN}.empty`,
    pbKey: 'one',
  };
  empty.props = { mode: 'empty' };
  return [region(`${SCREEN}.root`, 0, 'page'), empty];
}

function scenarioRegions(): EvidenceSemanticRegionReadModel[] {
  const regions = baselineRegions().map((item) => structuredClone(item));
  const summary = regions.find((item) => item.regionId === `${SCREEN}.summary`)!;
  summary.semanticParent = fragment(`${SCREEN}.root`);
  summary.semanticAncestors = [fragment(`${SCREEN}.root`)];
  summary.scrollOwner = { kind: 'viewport' };
  summary.positioning = 'fixed';
  const critical = regions.find(
    (item) => item.regionId === `${SCREEN}.summary.metric.critical`,
  )!;
  critical.text = '1 filtered result';
  return regions;
}

function region(regionId: string, documentOrder: number, role: string, parentRegionId?: string, text?: string): EvidenceSemanticRegionReadModel {
  return {
    regionId,
    label: text ?? role,
    role,
    ...(text ? { text } : {}),
    visible: true,
    ...(parentRegionId ? { semanticParent: fragment(parentRegionId) } : {}),
    semanticAncestors: parentRegionId ? [fragment(parentRegionId)] : [],
    documentOrder,
    scrollOwner: parentRegionId === `${SCREEN}.scroll-list` || parentRegionId === `${SCREEN}.summary`
      ? { kind: 'fragment', fragment: fragment(`${SCREEN}.scroll-list`) }
      : { kind: 'viewport' },
    positioning: 'flow',
    firstSourceIndex: documentOrder,
    sourceFactIds: [`${regionId}.role`],
    facts: [],
  };
}

function requirement(
  requirementId: string,
  caseId: string,
  dimension: 'components' | 'tokens' | 'states' | 'interactions',
  subject: string,
  expected: unknown,
  screenId = SCREEN,
) {
  return {
    requirementId,
    caseId,
    screenId,
    dimension,
    kind: `${dimension}-fixture`,
    subject,
    expected,
    evidenceRefs: [subject],
  };
}

function traverseDetail(
  input: ConsumerProjectionInput,
  screenId: string,
  projection: EvidenceDetailProjection,
) {
  const items: EvidenceDetailItem[] = [];
  let cursor: string | undefined;
  do {
    const page = buildEvidenceDetail(input, {
      handoffId: input.handoff.handoffId,
      screenId,
      projection,
      pageSize: 1,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    cursor = page.continuation;
  } while (cursor);
  return items;
}

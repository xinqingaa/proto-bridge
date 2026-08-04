import { describe, expect, it } from 'vitest';
import {
  assertConsumerCapabilities,
  buildCaseDelta,
  buildEvidenceDetail,
  buildHandoffIndex,
  buildScreenPacket,
  fixtures,
  type AgentHandoff,
  type BlobRecord,
  type ConsumerProjectionInput,
  type EvidenceCaseReadModel,
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
    expect(packet.componentIds).toEqual(['app.card', 'app.page-shell']);
    expect(packet.tokenIds).toEqual(['color.surface', 'space.md']);
    expect(packet.screenshotGroups.find((group) => group.digest === DIGEST_EMPTY)?.caseIds)
      .toEqual([EMPTY_CASE, SCENARIO_CASE]);
    expect(JSON.stringify(packet)).not.toContain(OTHER_SCREEN);
  });

  it('returns only changed Facts while preserving unknown/conflict and provenance changes', () => {
    const input = projectionFixture();
    const delta = buildCaseDelta(input, SCREEN, EMPTY_CASE);

    expect(delta.baselineCaseId).toBe(DEFAULT_CASE);
    expect(delta.changed.map((item) => item.factId)).toEqual([
      `${SCREEN}.status.text`,
    ]);
    expect(delta.added.map((item) => item.factId)).toEqual([
      `${SCREEN}.empty.role`,
    ]);
    expect(delta.unresolved.map((item) => item.factId)).toEqual([
      `${SCREEN}.empty.role`,
    ]);
    expect(delta.removed).toEqual([]);
    expect(delta.omittedCategories).toContain('unchanged-facts');
    expect(delta.added[0]?.after?.provenance[0]).toEqual({
      source: 'runtime-observation',
      locator: '#empty',
      confidence: 'high',
    });
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
    expect(first.continuation).toMatch(/^pbcp1\./);

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
  });
  const emptyCase = caseModel({
    caseId: EMPTY_CASE,
    screenId: SCREEN,
    revisionId: 'revision-empty',
    variantId: 'empty',
    screenshotBlobIds: ['blob-empty'],
    facts: [
      fact(`${SCREEN}.root.role`, 'page', 0),
      fact(`${SCREEN}.status.text`, 'empty', 1),
      {
        sourceIndex: 2,
        factId: `${SCREEN}.empty.role`,
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
      fact(`${SCREEN}.status.text`, 'empty', 1),
    ],
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
    regions: [],
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
  const structure = [DEFAULT_CASE, EMPTY_CASE, SCENARIO_CASE].flatMap(
    (caseId) => [
      {
        requirementId: `structure.${caseId}.root`,
        caseId,
        screenId: SCREEN,
        dimension: 'structure' as const,
        kind: 'semantic-region-topology',
        subject: `${SCREEN}.root`,
        expected: {
          scrollOwner: 'viewport',
          positioning: 'flow',
        },
        evidenceRefs: [`${SCREEN}.root.role`],
      },
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
    ],
  );
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
        requirement('component.card', EMPTY_CASE, 'components', `${SCREEN}.card`, {
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
        requirement('token.space', EMPTY_CASE, 'tokens', `${SCREEN}.card.gap`, {
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

import type {
  EvidenceCaseReadModel,
  EvidenceReadModel,
} from './evidence-read-model.js';

export const ACCEPTANCE_DIMENSIONS = [
  'structure',
  'components',
  'tokens',
  'states',
  'interactions',
] as const;
export type AcceptanceDimension = (typeof ACCEPTANCE_DIMENSIONS)[number];

export type AcceptanceRequirement = {
  requirementId: string;
  caseId: string;
  screenId: string;
  dimension: AcceptanceDimension;
  kind: string;
  subject: string;
  expected: unknown;
  evidenceRefs: string[];
};

export type ReconstructionAcceptanceContract = {
  contractVersion: 1;
  handoffId: string;
  workspaceId: string;
  bundleId: string;
  snapshotId: string;
  readiness: {
    status: 'ready' | 'partial';
    blockers: string[];
  };
  screenshots: Array<{
    caseId: string;
    screenId: string;
    variantId: string;
    scenario?: EvidenceCaseReadModel['scenario'];
    blobIds: string[];
  }>;
  dimensions: Record<AcceptanceDimension, AcceptanceRequirement[]>;
};

export type StateScalar = string | number | boolean | null;

export type KeyedStateSnapshot = {
  shell: { screenId: string; variantId: string };
  semanticCoverage: EvidenceCaseReadModel['semanticCoverage'];
  visibleRegionIds: string[];
  keyedCollections: Array<{
    collectionId: string;
    keys: string[];
  }>;
  values: Array<{
    regionId: string;
    key: string;
    value: StateScalar;
  }>;
};

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

export function buildReconstructionAcceptanceContract(input: {
  handoffId: string;
  workspaceId: string;
  evidence: EvidenceReadModel;
}): ReconstructionAcceptanceContract {
  const dimensions: ReconstructionAcceptanceContract['dimensions'] = {
    structure: [],
    components: [],
    tokens: [],
    states: [],
    interactions: [],
  };
  const blockers: string[] = [];
  const screenshots: ReconstructionAcceptanceContract['screenshots'] = [];

  for (const screen of input.evidence.screens) {
    for (const evidenceCase of screen.cases) {
      screenshots.push({
        caseId: evidenceCase.caseId,
        screenId: evidenceCase.screenId,
        variantId: evidenceCase.variantId,
        ...(evidenceCase.scenario ? { scenario: evidenceCase.scenario } : {}),
        blobIds: evidenceCase.screenshotBlobIds,
      });
      if (evidenceCase.screenshotBlobIds.length === 0) {
        blockers.push(`${evidenceCase.caseId}: no Screenshot is attached.`);
      }
      if (evidenceCase.unknownCount > 0 || evidenceCase.conflictCount > 0) {
        blockers.push(
          `${evidenceCase.caseId}: ${evidenceCase.unknownCount} unknown and ${evidenceCase.conflictCount} conflicting facts.`,
        );
      }
      if (
        !evidenceCase.facts.some((fact) =>
          fact.factId.endsWith('.structure.shell'),
        )
      ) {
        blockers.push(
          `${evidenceCase.caseId}: no authored Variant shell contract was resolved.`,
        );
      }

      dimensions.states.push({
        requirementId: safeId(`state.${evidenceCase.caseId}`),
        caseId: evidenceCase.caseId,
        screenId: evidenceCase.screenId,
        dimension: 'states',
        kind: 'keyed-state-snapshot',
        subject: evidenceCase.scenario?.checkpointId ?? evidenceCase.variantId,
        expected: buildKeyedStateSnapshot(evidenceCase),
        evidenceRefs: [...evidenceCase.contextFacts, ...evidenceCase.interactionFacts]
          .map((fact) => fact.factId),
      });

      for (const region of evidenceCase.regions) {
        const topology = {
          role: region.role,
          semanticParent: region.semanticParent,
          semanticAncestors: region.semanticAncestors,
          documentOrder: region.documentOrder,
          scrollOwner: region.scrollOwner,
          positioning: region.positioning,
          bbox: region.bbox,
        };
        dimensions.structure.push({
          requirementId: safeId(
            `structure.${evidenceCase.caseId}.${region.regionId}`,
          ),
          caseId: evidenceCase.caseId,
          screenId: evidenceCase.screenId,
          dimension: 'structure',
          kind: 'semantic-region-topology',
          subject: region.regionId,
          expected: topology,
          evidenceRefs: region.sourceFactIds,
        });
        if (region.documentOrder === undefined || region.scrollOwner === undefined) {
          blockers.push(
            `${evidenceCase.caseId}/${region.regionId}: semantic topology is incomplete.`,
          );
        }

        if (region.componentId) {
          dimensions.components.push({
            requirementId: safeId(
              `component.${evidenceCase.caseId}.${region.regionId}`,
            ),
            caseId: evidenceCase.caseId,
            screenId: evidenceCase.screenId,
            dimension: 'components',
            kind: 'component-mapping',
            subject: region.regionId,
            expected: { componentId: region.componentId },
            evidenceRefs: region.facts
              .filter((fact) => fact.factId.endsWith('.componentId'))
              .map((fact) => fact.factId),
          });
        }

        for (const [slot, tokenId] of Object.entries(
          region.tokenBindings ?? {},
        )) {
          dimensions.tokens.push({
            requirementId: safeId(
              `token.${evidenceCase.caseId}.${region.regionId}.${slot}`,
            ),
            caseId: evidenceCase.caseId,
            screenId: evidenceCase.screenId,
            dimension: 'tokens',
            kind: 'token-mapping',
            subject: `${region.regionId}.${slot}`,
            expected: { slot, tokenId },
            evidenceRefs: region.facts
              .filter((fact) => fact.factId.endsWith('.tokenBindings'))
              .map((fact) => fact.factId),
          });
        }
      }

      for (const fact of evidenceCase.interactionFacts) {
        dimensions.interactions.push({
          requirementId: safeId(`interaction.${evidenceCase.caseId}.${fact.factId}`),
          caseId: evidenceCase.caseId,
          screenId: evidenceCase.screenId,
          dimension: 'interactions',
          kind: fact.factId.includes('.scenario.')
            ? 'scenario-checkpoint'
            : 'action',
          subject: fact.factId,
          expected: fact.value,
          evidenceRefs: [fact.factId],
        });
      }

      for (const fact of evidenceCase.facts.filter((item) =>
        item.factId.includes('.structure.'),
      )) {
        dimensions.structure.push({
          requirementId: safeId(`structure-contract.${evidenceCase.caseId}.${fact.factId}`),
          caseId: evidenceCase.caseId,
          screenId: evidenceCase.screenId,
          dimension: 'structure',
          kind: 'authored-structure-contract',
          subject: fact.factId,
          expected: fact.value,
          evidenceRefs: [fact.factId],
        });
      }
    }
  }

  return {
    contractVersion: 1,
    handoffId: input.handoffId,
    workspaceId: input.workspaceId,
    bundleId: input.evidence.bundleId,
    snapshotId: input.evidence.snapshotId,
    readiness: {
      status: blockers.length === 0 ? 'ready' : 'partial',
      blockers: [...new Set(blockers)].sort(),
    },
    screenshots,
    dimensions,
  };
}

function buildKeyedStateSnapshot(
  evidenceCase: EvidenceCaseReadModel,
): KeyedStateSnapshot {
  const collections = new Map<string, Set<string>>();
  for (const region of evidenceCase.regions) {
    if (region.identity?.pbKey) {
      const keys = collections.get(region.identity.pbId) ?? new Set<string>();
      keys.add(region.identity.pbKey);
      collections.set(region.identity.pbId, keys);
    }
    for (const identity of [region.semanticParent, ...(region.semanticAncestors ?? [])]) {
      const value = objectValue(identity);
      if (typeof value?.pbId !== 'string' || typeof value.pbKey !== 'string') continue;
      const keys = collections.get(value.pbId) ?? new Set<string>();
      keys.add(value.pbKey);
      collections.set(value.pbId, keys);
    }
  }
  const values = new Map<string, { regionId: string; key: string; value: StateScalar }>();
  for (const region of evidenceCase.regions) {
    for (const [key, value] of Object.entries(region.props ?? {})) {
      if (!isStateScalar(value)) continue;
      values.set(`${region.regionId}\0${key}`, { regionId: region.regionId, key, value });
    }
  }
  for (const fact of evidenceCase.interactionFacts) {
    const expected = objectValue(fact.value);
    const checkpoint = objectValue(expected?.checkpoint);
    const expectedStates = Array.isArray(checkpoint?.expectedStates) ? checkpoint.expectedStates : [];
    for (const state of expectedStates) {
      const item = objectValue(state);
      const fragment = objectValue(item?.fragment);
      if (typeof fragment?.pbId !== 'string' || typeof item?.key !== 'string' || !isStateScalar(item.value)) continue;
      const regionId = `${fragment.pbId}${typeof fragment.pbKey === 'string' ? `.${fragment.pbKey}` : ''}`;
      values.set(`${regionId}\0${item.key}`, { regionId, key: item.key, value: item.value });
    }
    const expectedCollections = Array.isArray(checkpoint?.expectedFragmentKeys) ? checkpoint.expectedFragmentKeys : [];
    for (const collection of expectedCollections) {
      const item = objectValue(collection);
      const fragment = objectValue(item?.fragment);
      if (typeof fragment?.pbId !== 'string' || !Array.isArray(item?.keys)) continue;
      const keys = collections.get(fragment.pbId) ?? new Set<string>();
      for (const key of item.keys) if (typeof key === 'string') keys.add(key);
      collections.set(fragment.pbId, keys);
    }
  }
  return {
    shell: { screenId: evidenceCase.screenId, variantId: evidenceCase.variantId },
    semanticCoverage: evidenceCase.semanticCoverage,
    visibleRegionIds: evidenceCase.regions
      .filter((region) => region.visible !== false)
      .sort((a, b) => (a.documentOrder ?? Number.MAX_SAFE_INTEGER) - (b.documentOrder ?? Number.MAX_SAFE_INTEGER) || a.regionId.localeCompare(b.regionId))
      .map((region) => region.regionId),
    keyedCollections: [...collections.entries()]
      .map(([collectionId, keys]) => ({ collectionId, keys: [...keys].sort() }))
      .sort((a, b) => a.collectionId.localeCompare(b.collectionId)),
    values: [...values.values()].sort((a, b) => `${a.regionId}:${a.key}`.localeCompare(`${b.regionId}:${b.key}`)),
  };
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isStateScalar(value: unknown): value is StateScalar {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

export function acceptanceChecklistMarkdown(
  contract: ReconstructionAcceptanceContract,
): string {
  const lines = [
    '# Reconstruction Review Checklist',
    '',
    `- Handoff: \`${contract.handoffId}\``,
    `- Snapshot: \`${contract.snapshotId}\``,
    `- Readiness: ${contract.readiness.status}`,
    '',
    '## Selected Case review',
    '',
    ...contract.screenshots.map(
      (item) =>
        `- [ ] \`${item.caseId}\`: Screenshot viewed; implementation addressed;${item.scenario ? ' Scenario replayed;' : ''} deviations and unverified details disclosed.`,
    ),
    '',
    '## Evidence guidance by dimension',
    '',
    '| Dimension | Evidence references |',
    '| --- | ---: |',
    ...ACCEPTANCE_DIMENSIONS.map(
      (dimension) =>
        `| ${dimension} | ${contract.dimensions[dimension].length} |`,
    ),
    '',
    'These requirements are compiled into canonical Reconstruction Obligations for authoritative Target Review. They are not weighted points or a substitute for Screenshot review; every obligation must receive an explicit assessment before completion.',
    '',
  ];
  if (contract.readiness.blockers.length > 0) {
    lines.push(
      '## Producer readiness blockers',
      '',
      ...contract.readiness.blockers.map((blocker) => `- ${blocker}`),
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

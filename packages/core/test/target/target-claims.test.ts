import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReconstructionObligation } from '../../src/review/index.js';
import {
  verifyTargetClaims,
  type TargetImplementationClaim,
} from '../../src/target/index.js';
import type { StructureIR } from '../../src/v2/index.js';

const execFileAsync = promisify(execFile);
const roots: string[] = [];
const CASE = 'sample.screen::default';
const SCENARIO_CASE = 'sample.screen::scenario';
const SCREEN = 'sample.screen';

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Target claim verifier', () => {
  it('binds component/token claims to exact Dart occurrences and rejects unrelated, import-only and wrong-slot mutations', async () => {
    const root = await targetFixture();
    const head = await commit(root);
    const obligations = fixtureObligations();
    const claims = fixtureClaims();

    const verified = await verify(root, head, obligations, claims);
    expect(verified.results.map((item) => item.status)).toEqual(['matched', 'matched']);
    expect(verified.receiptDigest).toMatch(/^sha256:/);

    await write(root, 'lib/features/page.dart', unrelatedComponentSource());
    const unrelated = await verify(root, head, obligations, [claims[0]!]);
    expect(unrelated.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('claimed occurrence') });
    expect(unrelated.targetContentDigest).not.toBe(verified.targetContentDigest);

    const importOnlyClaim: TargetImplementationClaim = {
      ...claims[0] as Extract<TargetImplementationClaim, { dimension: 'components' }>,
      occurrence: { path: 'lib/features/import_only.dart', line: 1 },
    };
    await write(root, 'lib/features/import_only.dart', "import '../common/widgets.dart';\n");
    const importOnly = await verify(root, head, obligations, [importOnlyClaim]);
    expect(importOnly.results[0]).toMatchObject({ status: 'deviation' });

    await write(root, 'lib/features/page.dart', wrongTokenSlotSource());
    const wrongSlot = await verify(root, head, obligations, [claims[1]!]);
    expect(wrongSlot.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('has no color') });
  });

  it('leaves Runtime semantic dimensions unverified until Flutter MCP receipts are recorded', async () => {
    const root = await targetFixture();
    const head = await commit(root);
    const obligations = fixtureObligations();
    const structureClaim: TargetImplementationClaim = {
      obligationId: 'obligation-structure',
      dimension: 'structure',
      caseId: CASE,
    };
    const stateClaim: TargetImplementationClaim = { obligationId: 'obligation-state', dimension: 'states', caseId: CASE };
    const actionClaim: TargetImplementationClaim = { obligationId: 'obligation-action', dimension: 'interactions', caseId: SCENARIO_CASE };
    const transitionClaim: TargetImplementationClaim = { obligationId: 'obligation-transition', dimension: 'interactions', caseId: SCENARIO_CASE };

    const result = await verify(root, head, obligations, [structureClaim, stateClaim, actionClaim, transitionClaim]);
    expect(result.results.map((item) => item.status)).toEqual(['unverified', 'unverified', 'unverified', 'unverified']);
    expect(result.results.map((item) => item.detail)).toEqual([
      expect.stringContaining('Runtime Structure receipt'),
      expect.stringContaining('Runtime observation receipt'),
      expect.stringContaining('Scenario receipt'),
      expect.stringContaining('Scenario receipt'),
    ]);
  });

  it('verifies Structure, State and Interaction only from fixed Flutter MCP observations', async () => {
    const root = await targetFixture();
    const head = await commit(root);
    const obligations = fixtureObligations();
    const claims: TargetImplementationClaim[] = [
      { obligationId: 'obligation-structure', dimension: 'structure', caseId: CASE },
      { obligationId: 'obligation-state', dimension: 'states', caseId: CASE },
      { obligationId: 'obligation-action', dimension: 'interactions', caseId: SCENARIO_CASE },
      { obligationId: 'obligation-transition', dimension: 'interactions', caseId: SCENARIO_CASE },
    ];
    const matched = await verify(root, head, obligations, claims, {
      runtimeStructures: [fixtureStructure()],
      runtimeStates: [fixtureState()],
      runtimeTransitions: [fixtureTransition()],
    });
    expect(matched.results.map((item) => item.status)).toEqual(['matched', 'matched', 'matched', 'matched']);

    const drifted = fixtureTransition();
    drifted.actions[0]!.targetRegionId = `${SCREEN}.unrelated`;
    const failed = await verify(root, head, obligations, [claims[2]!], { runtimeTransitions: [drifted] });
    expect(failed.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('action-target') });
  });
});

async function verify(
  root: string,
  head: string,
  obligations: ReconstructionObligation[],
  claims: TargetImplementationClaim[],
  runtime: Pick<Parameters<typeof verifyTargetClaims>[0], 'runtimeStructures' | 'runtimeStates' | 'runtimeTransitions'> = {},
) {
  return verifyTargetClaims({
    targetRoot: root,
    expectedTargetHead: head,
    targetRevision: 'revision-a',
    obligations,
    claims,
    expectedStructures: [{ screenId: SCREEN, caseId: CASE, structure: fixtureStructure() }],
    ...runtime,
  });
}

function fixtureClaims(): TargetImplementationClaim[] {
  return [
    {
      obligationId: 'obligation-component',
      dimension: 'components',
      symbol: 'CommonCard',
      occurrence: { path: 'lib/features/page.dart', line: 7 },
      ownerSymbol: 'PageShell',
      targetSlot: 'body',
    },
    {
      obligationId: 'obligation-token',
      dimension: 'tokens',
      accessor: 'TS.colors.surface',
      occurrence: { path: 'lib/features/page.dart', line: 8 },
      ownerSymbol: 'Container',
      targetSlot: 'color',
    },
  ];
}

function fixtureObligations(): ReconstructionObligation[] {
  return [
    {
      obligationId: 'obligation-structure', dimension: 'structure', screenId: SCREEN, caseIds: [CASE],
      kind: 'semantic-region-topology', subject: `${SCREEN}.content`,
      expected: {
        semanticParent: { screenId: SCREEN, pbId: `${SCREEN}.scroll` },
        semanticAncestors: [{ screenId: SCREEN, pbId: `${SCREEN}.scroll` }],
        documentOrder: 1,
        scrollOwner: { kind: 'fragment', fragment: { screenId: SCREEN, pbId: `${SCREEN}.scroll` } },
        positioning: 'flow',
        bbox: { x: 0, y: 80, width: 390, height: 600 },
      },
      evidenceRefs: ['fact.structure'],
    },
    {
      obligationId: 'obligation-component', dimension: 'components', screenId: SCREEN, caseIds: [CASE],
      kind: 'component-mapping', subject: `${SCREEN}.content`, expected: { componentId: 'page.card' }, evidenceRefs: ['fact.component'],
    },
    {
      obligationId: 'obligation-token', dimension: 'tokens', screenId: SCREEN, caseIds: [CASE],
      kind: 'token-mapping', subject: `${SCREEN}.content.surface`, expected: { tokenId: 'color.surface', slot: 'surface' }, evidenceRefs: ['fact.token'],
    },
    {
      obligationId: 'obligation-state', dimension: 'states', screenId: SCREEN, caseIds: [CASE],
      kind: 'keyed-state-snapshot', subject: 'default', expected: {
        shell: { screenId: SCREEN, variantId: 'default' }, semanticCoverage: 'declared',
        visibleRegionIds: [`${SCREEN}.scroll`, `${SCREEN}.content`, `${SCREEN}.filter`],
        keyedCollections: [{ collectionId: `${SCREEN}.row`, keys: ['row-1', 'row-2'] }],
        values: [{ regionId: `${SCREEN}.filter`, key: 'selected', value: 'all' }],
      }, evidenceRefs: ['fact.state'],
    },
    {
      obligationId: 'obligation-action', dimension: 'interactions', screenId: SCREEN, caseIds: [SCENARIO_CASE],
      kind: 'action', subject: `${SCREEN}.action.select-row`, expected: {
        actionId: 'select-row', kind: 'click', target: { screenId: SCREEN, pbId: `${SCREEN}.row`, pbKey: 'row-2' },
      }, evidenceRefs: ['fact.action'],
    },
    {
      obligationId: 'obligation-transition', dimension: 'interactions', screenId: SCREEN, caseIds: [SCENARIO_CASE],
      kind: 'scenario-checkpoint', subject: `${SCREEN}.scenario.select-row.selected`, expected: {
        scenarioId: 'select-row', ownerScreenId: SCREEN, initialVariantId: 'default', actionIds: ['select-row'],
        checkpoint: {
          checkpointId: 'selected', screenId: SCREEN, variantId: 'selected',
          requiredFragments: [{ screenId: SCREEN, pbId: `${SCREEN}.content` }],
          expectedStates: [{ fragment: { screenId: SCREEN, pbId: `${SCREEN}.row`, pbKey: 'row-2' }, key: 'selected', value: true }],
          expectedFragmentKeys: [{ fragment: { screenId: SCREEN, pbId: `${SCREEN}.row` }, keys: ['row-1', 'row-2'] }],
        },
      }, evidenceRefs: ['fact.scenario'],
    },
  ];
}

function fixtureState(caseId = CASE) {
  return {
    caseId,
    shell: { screenId: SCREEN, variantId: 'default' },
    visibleRegionIds: [`${SCREEN}.scroll`, `${SCREEN}.content`, `${SCREEN}.filter`],
    keyedCollections: [{ collectionId: `${SCREEN}.row`, keys: ['row-1', 'row-2'] }],
    values: [{ regionId: `${SCREEN}.filter`, key: 'selected', value: 'all' as string | boolean }],
    complete: true,
    unknownKeys: [],
  };
}

function fixtureTransition() {
  const preState = fixtureState(SCENARIO_CASE);
  const postState = {
    ...fixtureState(SCENARIO_CASE),
    shell: { screenId: SCREEN, variantId: 'selected' },
    values: [{ regionId: `${SCREEN}.row.row-2`, key: 'selected', value: true as string | boolean }],
  };
  return {
    caseId: SCENARIO_CASE,
    screenId: SCREEN,
    scenarioId: 'select-row',
    checkpointId: 'selected',
    preState,
    actions: [{ actionId: 'select-row', kind: 'click', targetRegionId: `${SCREEN}.row.row-2` }],
    postState,
    visibleResult: { visibleRegionIds: postState.visibleRegionIds, changedRegionIds: [`${SCREEN}.row.row-2`] },
  };
}

function fixtureStructure(): StructureIR {
  return {
    caseId: CASE,
    regions: [
      {
        regionId: `${SCREEN}.scroll`, ancestorRegionIds: [], documentOrder: 0,
        scrollOwner: { kind: 'viewport' }, positioning: 'flow', pinned: false, unknownFields: [],
        bbox: { x: 0, y: 0, width: 390, height: 760 },
      },
      {
        regionId: `${SCREEN}.content`, parentRegionId: `${SCREEN}.scroll`, ancestorRegionIds: [`${SCREEN}.scroll`], documentOrder: 1,
        scrollOwner: { kind: 'region', regionId: `${SCREEN}.scroll` }, positioning: 'flow', pinned: false, unknownFields: [],
        bbox: { x: 0, y: 80, width: 390, height: 600 },
      },
    ],
    rootRegionIds: [`${SCREEN}.scroll`],
    siblingGroups: [
      { parentRegionId: null, childRegionIds: [`${SCREEN}.scroll`] },
      { parentRegionId: `${SCREEN}.scroll`, childRegionIds: [`${SCREEN}.content`] },
    ],
    siblingRelations: [],
    scrollContainers: [
      { owner: { kind: 'viewport' }, memberRegionIds: [`${SCREEN}.scroll`], pinnedRegionIds: [] },
      { owner: { kind: 'region', regionId: `${SCREEN}.scroll` }, memberRegionIds: [`${SCREEN}.content`], pinnedRegionIds: [] },
    ],
    complete: true,
    unknownRegionIds: [],
  };
}

async function targetFixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pb-target-claims-'));
  roots.push(root);
  await write(root, 'pubspec.yaml', 'name: target_claim_fixture\ndependencies:\n  flutter:\n    sdk: flutter\n');
  await write(root, 'lib/common/widgets.dart', [
    'class PageShell { const PageShell({required this.body}); final Object body; }',
    'class CommonCard { const CommonCard({required this.child}); final Object child; }',
    'class Container { const Container({this.color, this.border}); final Object? color; final Object? border; }',
    'class TS { static final colors = AppColors(); }',
    'class AppColors { int get surface => 1; }',
  ].join('\n'));
  await write(root, 'lib/features/page.dart', validPageSource());
  await write(root, 'proto-bridge.target.json', `${JSON.stringify({
    version: 1,
    technology: 'flutter',
    components: { 'page.card': { symbol: 'CommonCard' } },
    tokens: { 'color.surface': { accessor: 'TS.colors.surface' } },
    review: {
      version: 2,
      provider: 'dart-flutter-mcp',
      runtime: {
        applicationIdentity: 'target-claim-fixture',
        identityServiceExtension: 'ext.protoBridge.identity',
        prepareServiceExtension: 'ext.protoBridge.prepare',
        observeServiceExtension: 'ext.protoBridge.observe',
        observationContractVersion: 1,
        reviewHarnessVersion: '1',
        textEntryEmulation: true,
      },
      cases: { [CASE]: { screenId: SCREEN }, [SCENARIO_CASE]: { screenId: SCREEN } },
      scenarios: {
        [SCENARIO_CASE]: {
          screenId: SCREEN, scenarioId: 'select-row', checkpointId: 'selected',
          actions: [{ actionId: 'select-row', kind: 'tap', targetRegionId: `${SCREEN}.row.row-2`, finder: { kind: 'value-key', value: 'row-2' } }],
        },
      },
    },
  }, null, 2)}\n`);
  return root;
}

function validPageSource(): string {
  return [
    "import '../common/widgets.dart';",
    '',
    'Object buildPage() {',
    '  final tokenUse = TS.colors.surface;',
    '  assert(tokenUse == 1);',
    '  return PageShell(',
    '    body: CommonCard(',
    '      child: Container(',
    '        color: TS.colors.surface,',
    '      ),',
    '    ),',
    '  );',
    '}',
  ].join('\n');
}

function unrelatedComponentSource(): string {
  return [
    "import '../common/widgets.dart';",
    '',
    'Object buildPage() {',
    '  final tokenUse = TS.colors.surface;',
    '  assert(tokenUse == 1);',
    '  return PageShell(',
    '    body: Container(',
    '      color: TS.colors.surface,',
    '    ),',
    '  );',
    '}',
    'final unrelated = CommonCard(child: Container());',
  ].join('\n');
}

function wrongTokenSlotSource(): string {
  return validPageSource().replace('color: TS.colors.surface', 'border: TS.colors.surface');
}

async function write(root: string, relativePath: string, content: string): Promise<void> {
  const file = path.join(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

async function commit(root: string): Promise<string> {
  await execFileAsync('git', ['init', '-q'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'claims@example.invalid'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Claims Test'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
}

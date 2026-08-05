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

  it('compares deterministic Target Structure IR and catches a scroll-owner mutation', async () => {
    const root = await targetFixture();
    const head = await commit(root);
    const obligations = fixtureObligations();
    const structureClaim: TargetImplementationClaim = {
      obligationId: 'obligation-structure',
      dimension: 'structure',
      caseId: CASE,
    };
    const matched = await verify(root, head, obligations, [structureClaim]);
    expect(matched.results[0]).toMatchObject({ status: 'matched' });

    const resized = fixtureStructure();
    resized.regions.find((item) => item.regionId === `${SCREEN}.content`)!.bbox = { x: 8, y: 96, width: 374, height: 580 };
    await write(root, 'structure.json', `${JSON.stringify(resized)}\n`);
    const semanticMatch = await verify(root, head, obligations, [structureClaim]);
    expect(semanticMatch.results[0]).toMatchObject({ status: 'matched' });

    const mutated = fixtureStructure();
    mutated.regions.find((item) => item.regionId === `${SCREEN}.content`)!.scrollOwner = { kind: 'viewport' };
    await write(root, 'structure.json', `${JSON.stringify(mutated)}\n`);
    const failed = await verify(root, head, obligations, [structureClaim]);
    expect(failed.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('scroll-owner') });
  });

  it('verifies typed state and transition receipts and rejects state/interaction mutations', async () => {
    const root = await targetFixture();
    const head = await commit(root);
    const obligations = fixtureObligations();
    const stateClaim: TargetImplementationClaim = { obligationId: 'obligation-state', dimension: 'states', caseId: CASE };
    const actionClaim: TargetImplementationClaim = { obligationId: 'obligation-action', dimension: 'interactions', caseId: SCENARIO_CASE };
    const transitionClaim: TargetImplementationClaim = { obligationId: 'obligation-transition', dimension: 'interactions', caseId: SCENARIO_CASE };

    const matched = await verify(root, head, obligations, [stateClaim, actionClaim, transitionClaim]);
    expect(matched.results.map((item) => item.status)).toEqual(['matched', 'matched', 'matched']);
    expect(matched.results[0]?.stateProof?.values).toContainEqual({ regionId: `${SCREEN}.filter`, key: 'selected', value: 'all' });
    expect(matched.results[2]?.transitionProof?.actions).toHaveLength(1);

    const wrongDefault = fixtureState();
    wrongDefault.values[0]!.value = 'delayed';
    await write(root, 'state.json', `${JSON.stringify(wrongDefault)}\n`);
    const defaultFailure = await verify(root, head, obligations, [stateClaim]);
    expect(defaultFailure.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('value:sample.screen.filter.selected') });

    const wrongObject = fixtureTransition();
    wrongObject.actions[0]!.targetRegionId = `${SCREEN}.unrelated`;
    await write(root, 'scenario.json', `${JSON.stringify(wrongObject)}\n`);
    const objectFailure = await verify(root, head, obligations, [actionClaim]);
    expect(objectFailure.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringContaining('action-target') });

    const unchanged = fixtureTransition();
    unchanged.postState.shell.variantId = 'default';
    unchanged.postState.values[0]!.value = false;
    await write(root, 'scenario.json', `${JSON.stringify(unchanged)}\n`);
    const transitionFailure = await verify(root, head, obligations, [transitionClaim]);
    expect(transitionFailure.results[0]).toMatchObject({ status: 'deviation', detail: expect.stringMatching(/postState\.variantId|value:/) });
  });
});

async function verify(
  root: string,
  head: string,
  obligations: ReconstructionObligation[],
  claims: TargetImplementationClaim[],
) {
  return verifyTargetClaims({
    targetRoot: root,
    expectedTargetHead: head,
    targetRevision: 'revision-a',
    obligations,
    claims,
    expectedStructures: [{ screenId: SCREEN, caseId: CASE, structure: fixtureStructure() }],
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
  await write(root, 'structure.json', `${JSON.stringify(fixtureStructure())}\n`);
  await write(root, 'structure.mjs', "import { readFileSync } from 'node:fs';\nprocess.stdout.write(readFileSync('structure.json', 'utf8'));\n");
  await write(root, 'state.json', `${JSON.stringify(fixtureState())}\n`);
  await write(root, 'state.mjs', "import { readFileSync } from 'node:fs';\nprocess.stdout.write(readFileSync('state.json', 'utf8'));\n");
  await write(root, 'scenario.json', `${JSON.stringify(fixtureTransition())}\n`);
  await write(root, 'scenario.mjs', "import { readFileSync } from 'node:fs';\nprocess.stdout.write(readFileSync('scenario.json', 'utf8'));\n");
  await write(root, 'docs/proto-bridge.target.json', `${JSON.stringify({
    version: 1,
    technology: 'flutter',
    components: { 'page.card': { symbol: 'CommonCard' } },
    tokens: { 'color.surface': { accessor: 'TS.colors.surface' } },
    review: {
      version: 1,
      platform: 'ios-simulator',
      launcher: { command: ['node', 'render.mjs'], structureCommand: ['node', 'structure.mjs'], stateCommand: ['node', 'state.mjs'], scenarioCommand: ['node', 'scenario.mjs'] },
      device: { udid: 'fixture', runtime: 'fixture', logicalWidth: 390, logicalHeight: 844, dpr: 3, locale: 'zh-CN', theme: 'light', textScale: 1, safeArea: 'fixture', settle: 'fixture' },
      cases: { [CASE]: { screenId: SCREEN }, [SCENARIO_CASE]: { screenId: SCREEN } },
      scenarios: { [SCENARIO_CASE]: { screenId: SCREEN, scenarioId: 'select-row' } },
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

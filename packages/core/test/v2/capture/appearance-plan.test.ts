import { describe, expect, it } from 'vitest';
import { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';
import { NormalizedSelection } from '../../../src/v2/contracts/run.js';
import { resolveSelectionMatrix, SelectionDraft } from '../../../src/v2/capture/selection.js';

function inputs() {
  const manifest = RuntimeCaptureManifest.parse({
    protocolVersion: 3, inputVersion: 'source-v1', sourceDigest: `sha256:${'a'.repeat(64)}`,
    theme: { packId: 'sample', packDigest: `sha1:${'a'.repeat(40)}`, keyCatalogDigest: `sha1:${'b'.repeat(40)}`,
      themes: ['mechanical', 'water', 'sundial'], modes: ['light', 'dark'], defaultTheme: 'mechanical', defaultMode: 'light' },
    clock: { now: '2026-10-22T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
    capabilities: ['describe', 'prepare', 'readiness', 'semantic-snapshot', 'reset'],
    screens: [{ prototypeId: 'sample', screenId: 'sample.main', screenSlug: 'main', path: '/prototype/sample/main',
      defaultVariantId: 'default', variants: [{ variantId: 'default', label: 'Default' }, { variantId: 'active', label: 'Active' }],
      actions: [{ actionId: 'activate', kind: 'click', target: { screenId: 'sample.main', pbId: 'sample.main.button' } }],
      scenarios: [{ scenarioId: 'activate', label: 'Activate', ownerScreenId: 'sample.main', initialVariantId: 'default',
        actionIds: ['activate'], checkpoints: [{ checkpointId: 'done', screenId: 'sample.main', variantId: 'active', requiredFragments: [] }] }],
      appearanceEvidence: { rules: [{ ruleId: 'main-usage', variantIds: ['default', 'active'], scenarioIds: ['activate'],
        dimensions: ['structure', 'components', 'bindings', 'resources', 'layout'], representativeVariantIds: ['active'],
        observations: [{ theme: 'water', mode: 'light' }], rationale: 'This component state family uses fixed slots; water shape is represented by active.' }] },
    }],
  });
  const draft = SelectionDraft.parse({ prototypeId: 'sample', themePack: { packId: manifest.theme.packId,
    packDigest: manifest.theme.packDigest, theme: 'mechanical', mode: 'light' }, screens: [{ screenId: 'sample.main',
    variants: { mode: 'explicit', variantIds: ['default', 'active'] }, scenarios: { mode: 'explicit', scenarioIds: ['activate'] },
    deviceIds: ['iphone-14'], captureScope: { screenshots: { mode: 'all' }, evidenceInputMode: 'instrumented', minEvidenceLevel: 'instrumented-runtime' },
  }] });
  return { manifest, draft };
}

describe('Core appearance observation planning', () => {
  it('retains every business state/action and observes the union of representative appearances', () => {
    const { manifest, draft } = inputs();
    const { selection, matrix } = resolveSelectionMatrix(draft, manifest);
    expect(matrix).toHaveLength(4);
    expect(selection.declaredThemeModes).toHaveLength(6);
    expect(selection.capturePlan?.fullCaseCount).toBe(18);
    expect(selection.capturePlan?.businessCases).toHaveLength(3);
    expect(selection.capturePlan?.businessCases.filter((item) => item.caseKey.scenario)).toHaveLength(1);
    expect(selection.capturePlan?.derivations).toHaveLength(14);
    expect(selection.capturePlan?.derivations.every((item) => item.pixels === 'unobserved')).toBe(true);
    expect(selection.capturePlan?.rules).toHaveLength(1);
    expect(selection.capturePlan?.rules[0]!.representatives).toHaveLength(1);
    expect(NormalizedSelection.safeParse(selection).success).toBe(true);
    const audit = resolveSelectionMatrix({ ...draft, capturePurpose: 'appearance-audit' }, manifest);
    expect(audit.matrix).toHaveLength(18);
    expect(audit.selection.capturePlan?.derivations).toEqual([]);
  });

  it('supports a single theme and derives pure paint changes without creating a second state matrix', () => {
    const { manifest, draft } = inputs();
    manifest.theme.themes = ['mechanical'];
    manifest.screens[0]!.appearanceEvidence!.rules[0]!.observations = [];
    expect(resolveSelectionMatrix(draft, manifest).matrix).toHaveLength(3);
  });

  it.each(['missing-rule', 'missing-source', 'partial-dimensions', 'fragment', 'screenshot-only'] as const)(
    'falls back locally when %s cannot prove a complete usage rule', (kind) => {
      const { manifest, draft } = inputs();
      if (kind === 'missing-rule') delete manifest.screens[0]!.appearanceEvidence;
      if (kind === 'missing-source') delete manifest.sourceDigest;
      if (kind === 'partial-dimensions') manifest.screens[0]!.appearanceEvidence!.rules[0]!.dimensions = ['bindings'];
      if (kind === 'fragment') draft.screens[0]!.captureScope.fragments = [{ screenId: 'sample.main', pbId: 'sample.main.button' }];
      if (kind === 'screenshot-only') draft.screens[0]!.captureScope.evidenceInputMode = 'screenshot-only';
      expect(resolveSelectionMatrix(draft, manifest).matrix).toHaveLength(18);
    });

  it('falls back only for uncovered states, and never imports a representative outside business selection', () => {
    const { manifest, draft } = inputs();
    manifest.screens[0]!.appearanceEvidence!.rules[0]!.scenarioIds = [];
    expect(resolveSelectionMatrix(draft, manifest).matrix).toHaveLength(9);
    draft.screens[0]!.variants.variantIds = ['default'];
    draft.screens[0]!.scenarios = { mode: 'none' };
    expect(resolveSelectionMatrix(draft, manifest).matrix).toHaveLength(6);
  });

  it('keeps explicit retry appearance identities exact', () => {
    const { manifest, draft } = inputs();
    draft.screens[0]!.themeModes = [{ theme: 'water', mode: 'dark' }];
    const result = resolveSelectionMatrix(draft, manifest);
    expect(result.matrix).toHaveLength(3);
    expect(result.selection.capturePlan).toBeUndefined();
    expect(result.matrix.every((item) => item.selectedCase.caseKey.themeId === 'dark')).toBe(true);
  });

  it('rejects ambiguous and unknown authored rule references', () => {
    const { manifest, draft } = inputs();
    const rule = manifest.screens[0]!.appearanceEvidence!.rules[0]!;
    rule.variantIds.push('missing');
    expect(() => resolveSelectionMatrix(draft, manifest)).toThrow('unknown Variant missing');
    rule.variantIds.pop();
    manifest.screens[0]!.appearanceEvidence!.rules.push({ ...rule, ruleId: 'duplicate' });
    expect(() => resolveSelectionMatrix(draft, manifest)).toThrow('ambiguous');
  });

  it('rejects a persisted plan with absent sources, hidden business states or fabricated audit coverage', () => {
    const { manifest, draft } = inputs();
    const { selection } = resolveSelectionMatrix(draft, manifest);
    const copy = () => structuredClone(selection);
    const noBaseline = copy(); noBaseline.capturePlan!.businessCases.pop();
    expect(NormalizedSelection.safeParse(noBaseline).success).toBe(false);
    const badReference = copy(); badReference.capturePlan!.derivations[0]!.baseline.caseId = 'missing';
    expect(NormalizedSelection.safeParse(badReference).success).toBe(false);
    const falseAudit = copy(); falseAudit.capturePlan!.purpose = 'appearance-audit';
    expect(NormalizedSelection.safeParse(falseAudit).success).toBe(false);
    const dropped = copy(); dropped.capturePlan!.derivations.pop(); dropped.capturePlan!.fullCaseCount--;
    expect(NormalizedSelection.safeParse(dropped).success).toBe(false);
  });
});

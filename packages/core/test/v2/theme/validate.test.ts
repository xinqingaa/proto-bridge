import { describe, expect, it } from 'vitest';
import type { ThemeExpression, ThemePackSource } from '../../../src/v2/theme/index.js';
import {
  find,
  makeBase,
  makeCatalog,
  makeChild,
  makeWaivedBase,
  packMap,
  validate,
} from './fixtures.js';

type Layer = 'semantic' | 'component';

function setValue(pack: ThemePackSource, layer: Layer, key: string, expression: ThemeExpression): void {
  const target = (pack[layer] ??= {});
  (target.values ??= {})[key] = expression;
}

function setModeValue(pack: ThemePackSource, layer: Layer, mode: string, key: string, expression: ThemeExpression): void {
  const target = (pack[layer] ??= {});
  ((target.modes ??= {})[mode] ??= {})[key] = expression;
}

const blocks = (diagnostics: ReturnType<typeof validate>) => diagnostics.filter((d) => d.severity === 'block');

describe('clean fixtures', () => {
  const brand = () =>
    makeChild({
      semantic: { values: { 'color.primary': '#a01c5a' }, modes: { dark: { 'color.primary': '#f0a0c0' } } },
    });

  it('base and a well-formed child produce no diagnostics', () => {
    expect(validate(packMap(makeBase(), brand()))).toEqual([]);
  });

  it('emits theme.inherited only when includeInfo is set', () => {
    const packs = packMap(makeBase(), brand());
    expect(validate(packs).some((d) => d.code === 'theme.inherited')).toBe(false);
    const info = validate(packs, { includeInfo: true });
    expect(find(info, 'theme.inherited', { packId: 'brand', key: 'color.surface', severity: 'info' })).toBeDefined();
    expect(find(info, 'theme.inherited', { packId: 'brand', key: 'color.primary' })).toBeUndefined();
  });
});

describe('schema', () => {
  it('reports malformed pack files as theme.schema', () => {
    const base = makeBase();
    (base.manifest as unknown as Record<string, unknown>).unexpected = true;
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.schema', { packId: 'base', severity: 'block' })).toBeDefined();
  });

  it('rejects an empty contrast waiver reason', () => {
    const base = makeBase();
    base.manifest.contrastWaivers = [{ pair: ['color.on-surface', 'color.surface'], reason: '   ' }];
    const diagnostics = validate(packMap(base));
    const issue = find(diagnostics, 'theme.schema', { packId: 'base' });
    expect(issue?.severity).toBe('block');
    expect(issue?.path).toContain('reason');
  });

  it('reports a pack registered under a different id', () => {
    const base = makeBase();
    const diagnostics = validate(new Map([['other', base]]));
    expect(find(diagnostics, 'theme.schema', { packId: 'other' })).toBeDefined();
  });

  it('validates the catalog', () => {
    const catalog = makeCatalog();
    catalog.keys.push({ ...catalog.keys[0]! });
    catalog.keys.push({ id: 'broken.enum', tier: 'semantic', valueType: 'enum', bindable: false, modeVariant: false, accentable: false });
    catalog.keys.push({
      id: 'broken.default',
      tier: 'semantic',
      valueType: 'color',
      bindable: true,
      modeVariant: false,
      accentable: false,
      default: '#fff',
    });
    catalog.contrastPairs.push({ foreground: 'missing.key', background: 'color.surface', level: 'text' });
    const diagnostics = validate(packMap(makeBase()), {}, catalog);
    const schema = diagnostics.filter((d) => d.code === 'theme.schema' && d.packId === '(catalog)');
    expect(schema.length).toBeGreaterThanOrEqual(4);
    expect(schema.every((d) => d.severity === 'block')).toBe(true);
  });
});

describe('keys, tiers and references', () => {
  it('base-incomplete: reports a missing base key on the base pack', () => {
    const base = makeBase();
    delete base.semantic!.values!['color.surface'];
    delete base.semantic!.modes!.dark!['color.surface'];
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.base-incomplete', { key: 'color.surface', packId: 'base', severity: 'block' })).toBeDefined();
  });

  it('base-incomplete is reported on the base even when a child resolves', () => {
    const base = makeBase();
    delete base.semantic!.values!['radius.control'];
    const diagnostics = validate(packMap(base, makeChild()));
    expect(find(diagnostics, 'theme.base-incomplete', { key: 'radius.control', packId: 'base' })).toBeDefined();
  });

  it('unknown-key', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'color.nope', '#fff');
    setValue(base, 'component', 'button.nope', '#fff');
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.unknown-key', { key: 'color.nope', packId: 'base', severity: 'block' })).toBeDefined();
    expect(find(diagnostics, 'theme.unknown-key', { key: 'button.nope', packId: 'base' })).toBeDefined();
  });

  describe('tier-violation', () => {
    it('Primitive referencing a semantic key', () => {
      const base = makeBase();
      base.primitives!.values['x.1'] = '{color.primary}';
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'x.1', packId: 'base', severity: 'block' })).toBeDefined();
    });

    it('semantic key referencing a component key', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'color.surface', '{button.primary-background}');
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'color.surface', packId: 'base', severity: 'block' })).toBeDefined();
    });

    it('semantic key switching on a component key', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'radius.control', {
        $switch: 'tabbar.treatment',
        cases: { solid: 1, outlined: 2, glass: 3 },
      });
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'radius.control', packId: 'base' })).toBeDefined();
    });

    it('overriding a constant', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'layout.fill', '50%');
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'layout.fill', packId: 'base', severity: 'block' })).toBeDefined();
    });

    it('referencing a constant', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'radius.control', '{layout.fill}');
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'radius.control', packId: 'base' })).toBeDefined();
    });

    it('Primitive with the same name as a catalog key or constant', () => {
      const base = makeBase();
      base.primitives!.values['color.primary'] = '#000000';
      base.primitives!.values['layout.fill'] = 1;
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'color.primary', packId: 'base', severity: 'block' })).toBeDefined();
      expect(find(diagnostics, 'theme.tier-violation', { key: 'layout.fill', packId: 'base' })).toBeDefined();
    });

    it('a component key in the semantic layer', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'button.radius', 4);
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.tier-violation', { key: 'button.radius', packId: 'base' })).toBeDefined();
    });
  });

  it('unresolved-reference: missing Primitive/key and missing extends target', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'color.surface', '{nope.1}');
    const diagnostics = validate(packMap(base, makeChild({}, 'brand', 'ghost')));
    expect(find(diagnostics, 'theme.unresolved-reference', { key: 'color.surface', packId: 'base', severity: 'block' })).toBeDefined();
    expect(find(diagnostics, 'theme.unresolved-reference', { packId: 'brand', severity: 'block' })).toBeDefined();
  });

  describe('reference-cycle', () => {
    it('direct cycle with the full path in the message', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'color.surface', '{color.on-surface}');
      setValue(base, 'semantic', 'color.on-surface', '{color.surface}');
      const cycle = find(validate(packMap(base)), 'theme.reference-cycle', { severity: 'block', packId: 'base' });
      expect(cycle).toBeDefined();
      expect(cycle?.message).toContain('→');
      expect(cycle?.message).toContain('color.surface');
      expect(cycle?.message).toContain('color.on-surface');
      expect(cycle?.path).toContain('→');
      expect(cycle?.key).toBeDefined();
    });

    it('cycle through a $switch selector key', () => {
      const base = makeBase();
      setValue(base, 'semantic', 'density', '{space.inset}');
      const cycle = find(validate(packMap(base)), 'theme.reference-cycle', { severity: 'block' });
      expect(cycle).toBeDefined();
      expect(cycle?.message).toContain('density');
      expect(cycle?.message).toContain('space.inset');
      expect(cycle?.message).toContain('→');
    });

    it('Primitive cycle', () => {
      const base = makeBase();
      base.primitives!.values['a.1'] = '{a.2}';
      base.primitives!.values['a.2'] = '{a.1}';
      const cycle = find(validate(packMap(base)), 'theme.reference-cycle', { key: 'a.1', packId: 'base' });
      expect(cycle?.severity).toBe('block');
      expect(cycle?.message).toContain('a.1 → a.2 → a.1');
    });
  });

  describe('extends-cycle', () => {
    it('inheritance cycle', () => {
      const a = makeChild({}, 'aaa', 'bbb');
      const b = makeChild({}, 'bbb', 'aaa');
      const diagnostics = validate(packMap(makeBase(), a, b));
      expect(find(diagnostics, 'theme.extends-cycle', { severity: 'block' })).toBeDefined();
      expect(diagnostics.filter((d) => d.code === 'theme.extends-cycle').map((d) => d.packId).sort()).toEqual(
        expect.arrayContaining(['aaa', 'bbb']),
      );
    });

    it('chain that does not end at a base pack', () => {
      const orphan = makeChild();
      delete orphan.manifest.extends;
      const diagnostics = validate(packMap(makeBase(), orphan));
      expect(find(diagnostics, 'theme.extends-cycle', { packId: 'brand', severity: 'block' })).toBeDefined();
    });

    it('a base pack must not extend', () => {
      const base = makeBase();
      base.manifest.extends = 'other';
      const diagnostics = validate(packMap(base));
      expect(find(diagnostics, 'theme.extends-cycle', { packId: 'base', severity: 'block' })).toBeDefined();
    });
  });
});

describe('value types', () => {
  it('invalid color', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'color.surface', 'not-a-color');
    expect(find(validate(packMap(base)), 'theme.value-type', { key: 'color.surface', packId: 'base', severity: 'block' })).toBeDefined();
  });

  it('invalid length', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'radius.control', '12 px');
    expect(find(validate(packMap(base)), 'theme.value-type', { key: 'radius.control', packId: 'base' })).toBeDefined();
  });

  it('enum out of range', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'density', 'dense');
    expect(find(validate(packMap(base)), 'theme.value-type', { key: 'density', packId: 'base' })).toBeDefined();
  });

  it('$switch cases must cover the enum exactly', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'space.inset', { $switch: 'density', cases: { compact: 12, regular: 16 } });
    const missing = find(validate(packMap(base)), 'theme.value-type', { key: 'space.inset', packId: 'base' });
    expect(missing?.message).toContain('comfortable');

    setValue(base, 'semantic', 'space.inset', {
      $switch: 'density',
      cases: { compact: 12, regular: 16, comfortable: 20, tight: 1 },
    });
    const extra = find(validate(packMap(base)), 'theme.value-type', { key: 'space.inset', packId: 'base' });
    expect(extra?.message).toContain('tight');
  });

  it('$switch selector must be an enum key', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'space.inset', { $switch: 'radius.control', cases: { a: 1 } });
    expect(find(validate(packMap(base)), 'theme.value-type', { key: 'space.inset', packId: 'base' })).toBeDefined();
  });

  it('referencing a key of another type', () => {
    const base = makeBase();
    setValue(base, 'semantic', 'color.surface', '{radius.control}');
    expect(find(validate(packMap(base)), 'theme.value-type', { key: 'color.surface', packId: 'base' })).toBeDefined();
  });
});

describe('modes and Accents', () => {
  it('mode-variant-forbidden for non-modeVariant keys in layer modes', () => {
    const base = makeBase();
    setModeValue(base, 'semantic', 'dark', 'radius.control', 8);
    setModeValue(base, 'component', 'dark', 'tabbar.height', 40);
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.mode-variant-forbidden', { key: 'radius.control', packId: 'base', severity: 'block' })).toBeDefined();
    expect(find(diagnostics, 'theme.mode-variant-forbidden', { key: 'tabbar.height', packId: 'base' })).toBeDefined();
  });

  it('mode-variant-forbidden for non-modeVariant keys in Accent modes', () => {
    const base = makeBase();
    base.accents!.accents.teal!.modes!.dark!['density'] = 'compact';
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.mode-variant-forbidden', { key: 'density', packId: 'base' })).toBeDefined();
  });

  it('accent-out-of-scope: key not in accentKeys', () => {
    const base = makeBase();
    base.manifest.accentKeys = ['color.primary', 'color.on-primary'];
    base.accents!.accents.teal!.values!['color.on-warning'] = '#222222';
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.accent-out-of-scope', { key: 'color.on-warning', packId: 'base', severity: 'block' })).toBeDefined();
  });

  it('accent-out-of-scope: key is not accentable', () => {
    const base = makeBase();
    base.accents!.accents.teal!.values!['color.surface'] = '#eeeeee';
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.accent-out-of-scope', { key: 'color.surface', packId: 'base' })).toBeDefined();
  });

  it('accent-out-of-scope: accentKeys lists a non-accentable key', () => {
    const base = makeBase();
    base.manifest.accentKeys = ['color.primary', 'color.surface'];
    expect(find(validate(packMap(base)), 'theme.accent-out-of-scope', { key: 'color.surface', packId: 'base' })).toBeDefined();
  });

  it('mode-undeclared: layer modes outside pack modes', () => {
    const base = makeBase();
    setModeValue(base, 'semantic', 'sepia', 'color.surface', '#f4ecd8');
    const diagnostic = find(validate(packMap(base)), 'theme.mode-undeclared', { packId: 'base', severity: 'block' });
    expect(diagnostic?.path).toBe('semantic.modes.sepia');
  });

  it('mode-undeclared: defaultMode is not in modes', () => {
    const base = makeBase();
    base.manifest.defaultMode = 'sepia';
    const diagnostic = find(validate(packMap(base)), 'theme.mode-undeclared', { packId: 'base' });
    expect(diagnostic?.path).toBe('manifest.defaultMode');
  });
});

describe('fonts and assets', () => {
  const font = (overrides: Record<string, unknown> = {}) => ({
    family: 'Brand Sans',
    files: ['fonts/brand-sans-600.woff2'],
    weights: [600],
    style: 'normal' as const,
    license: 'OFL-1.1',
    licenseFile: 'fonts/OFL.txt',
    ...overrides,
  });
  const files = { 'fonts/brand-sans-600.woff2': 'd'.repeat(40), 'fonts/OFL.txt': 'e'.repeat(40) };

  it('accepts a complete font declaration', () => {
    const child = makeChild({ files });
    child.manifest.fonts = [font()];
    expect(blocks(validate(packMap(makeBase(), child)))).toEqual([]);
  });

  it('font-license-missing for empty license or licenseFile', () => {
    const child = makeChild({ files });
    child.manifest.fonts = [font({ license: '' }), font({ licenseFile: '' })];
    const licenses = validate(packMap(makeBase(), child)).filter((d) => d.code === 'theme.font-license-missing');
    expect(licenses).toHaveLength(2);
    expect(licenses.every((d) => d.packId === 'brand' && d.severity === 'block')).toBe(true);
  });

  it('font-file-missing for font files and the license file', () => {
    const child = makeChild({ files: { 'fonts/OFL.txt': 'e'.repeat(40) } });
    child.manifest.fonts = [font()];
    const missingFont = find(validate(packMap(makeBase(), child)), 'theme.font-file-missing', { packId: 'brand', severity: 'block' });
    expect(missingFont?.message).toContain('brand-sans-600.woff2');

    const noLicenseFile = makeChild({ files: { 'fonts/brand-sans-600.woff2': 'd'.repeat(40) } });
    noLicenseFile.manifest.fonts = [font()];
    const missingLicense = find(validate(packMap(makeBase(), noLicenseFile)), 'theme.font-file-missing', { packId: 'brand' });
    expect(missingLicense?.message).toContain('OFL.txt');
  });

  it('asset-missing when the file is not in the pack files', () => {
    const child = makeChild({
      semantic: { values: { 'asset.brand-mark': { file: 'assets/logo.svg', mediaType: 'image/svg+xml', alt: 'Logo' } } },
    });
    const diagnostic = find(validate(packMap(makeBase(), child)), 'theme.asset-missing', { key: 'asset.brand-mark', packId: 'brand', severity: 'block' });
    expect(diagnostic).toBeDefined();
  });

  it('asset with a listed file is valid', () => {
    const child = makeChild({
      files: { 'assets/logo.svg': 'f'.repeat(40) },
      semantic: { values: { 'asset.brand-mark': { file: 'assets/logo.svg', mediaType: 'image/svg+xml', alt: 'Logo' } } },
    });
    expect(validate(packMap(makeBase(), child))).toEqual([]);
  });
});

describe('contrast', () => {
  it('contrast-insufficient blocks an unwaived failure', () => {
    const child = makeChild({ semantic: { values: { 'color.primary': '#ffee00' } } });
    const diagnostics = validate(packMap(makeBase(), child));
    const failure = find(diagnostics, 'theme.contrast-insufficient', {
      key: 'color.on-primary',
      packId: 'brand',
      severity: 'block',
      mode: 'light',
    });
    expect(failure).toBeDefined();
    expect(failure?.message).toMatch(/\d+\.\d\d:1/);
  });

  it('contrast-waived: own waiver is a warning with the ratio and reason', () => {
    const diagnostics = validate(packMap(makeWaivedBase()));
    expect(blocks(diagnostics)).toEqual([]);
    const waived = find(diagnostics, 'theme.contrast-waived', { key: 'color.on-warning', packId: 'base', severity: 'warning' });
    expect(waived?.message).toMatch(/\d+\.\d\d:1/);
    expect(waived?.message).toContain('brand amber on white');
    expect(find(diagnostics, 'theme.contrast-waiver-unused')).toBeUndefined();
  });

  it('a waiver restricted to light leaves dark blocking', () => {
    const base = makeWaivedBase();
    base.manifest.contrastWaivers![0]!.modes = ['light'];
    const diagnostics = validate(packMap(base));
    expect(find(diagnostics, 'theme.contrast-waived', { packId: 'base', mode: 'light' })).toBeDefined();
    expect(find(diagnostics, 'theme.contrast-insufficient', { packId: 'base', mode: 'dark', severity: 'block' })).toBeDefined();
  });

  it('contrast-waiver-unused: a waiver that matches no failing pair', () => {
    const base = makeBase();
    base.manifest.contrastWaivers = [{ pair: ['color.on-surface', 'color.surface'], reason: 'not needed' }];
    const unused = find(validate(packMap(base)), 'theme.contrast-waiver-unused', { key: 'color.on-surface', packId: 'base', severity: 'warning' });
    expect(unused).toBeDefined();
  });

  describe('waiver inheritance by resolved colors', () => {
    it('child with unchanged colors inherits the ancestor waiver (warning)', () => {
      const child = makeChild();
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      expect(blocks(diagnostics)).toEqual([]);
      const inherited = find(diagnostics, 'theme.contrast-waived', { key: 'color.on-warning', packId: 'brand', severity: 'warning' });
      expect(inherited?.message).toContain('inherited from "base"');
      expect(inherited?.message).toContain('继承自 base');
      // inheritance never counts as the child using an own waiver
      expect(find(diagnostics, 'theme.contrast-waiver-unused', { packId: 'brand' })).toBeUndefined();
    });

    it('child changing the foreground loses the waiver (block)', () => {
      const child = makeChild({ semantic: { values: { 'color.on-warning': '#fefefe' } } });
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      const failure = find(diagnostics, 'theme.contrast-insufficient', { key: 'color.on-warning', packId: 'brand', severity: 'block' });
      expect(failure).toBeDefined();
      expect(failure?.message).toContain('foreground');
      expect(failure?.message).toContain('"base"');
      expect(failure?.message).toContain('已改变');
      expect(find(diagnostics, 'theme.contrast-waived', { packId: 'brand' })).toBeUndefined();
      // the base itself stays waived
      expect(find(diagnostics, 'theme.contrast-waived', { packId: 'base' })).toBeDefined();
    });

    it('child changing the background loses the waiver (block)', () => {
      const child = makeChild({ semantic: { values: { 'color.warning': '#ffa000' } } });
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      const failure = find(diagnostics, 'theme.contrast-insufficient', { key: 'color.on-warning', packId: 'brand', severity: 'block' });
      expect(failure).toBeDefined();
      expect(failure?.message).toContain('background');
      expect(failure?.message).toContain('继承自 base');
    });

    it('equal colors in different notation still inherit', () => {
      const child = makeChild({ semantic: { values: { 'color.warning': 'rgb(255, 179, 0)', 'color.on-warning': '#fff' } } });
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      expect(blocks(diagnostics)).toEqual([]);
      expect(find(diagnostics, 'theme.contrast-waived', { packId: 'brand' })?.message).toContain('inherited from "base"');
    });

    it('child can declare its own waiver after changing a value (warning, not inherited)', () => {
      const child = makeChild({ semantic: { values: { 'color.on-warning': '#fefefe' } } });
      child.manifest.contrastWaivers = [{ pair: ['color.on-warning', 'color.warning'], reason: 'child amber' }];
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      expect(blocks(diagnostics)).toEqual([]);
      const waived = find(diagnostics, 'theme.contrast-waived', { packId: 'brand', severity: 'warning' });
      expect(waived?.message).toContain('child amber');
      expect(waived?.message).not.toContain('inherited');
    });

    it('an unused own waiver in the child is reported even if the ancestor waiver is inherited', () => {
      const child = makeChild();
      child.manifest.contrastWaivers = [{ pair: ['color.on-surface', 'color.surface'], reason: 'pointless' }];
      const diagnostics = validate(packMap(makeWaivedBase(), child));
      expect(find(diagnostics, 'theme.contrast-waiver-unused', { packId: 'brand', key: 'color.on-surface' })).toBeDefined();
    });

    it('inheritance reaches through an intermediate pack', () => {
      const middle = makeChild({}, 'middle');
      const top = makeChild({}, 'top', 'middle');
      const diagnostics = validate(packMap(makeWaivedBase(), middle, top));
      expect(blocks(diagnostics)).toEqual([]);
      expect(find(diagnostics, 'theme.contrast-waived', { packId: 'top' })?.message).toContain('inherited from "base"');
    });
  });
});

describe('scope', () => {
  const sample = (): ThemePackSource => {
    const pack = makeChild({}, 'sample');
    pack.manifest.scope = 'playground';
    delete pack.ownerPrototypeId;
    return pack;
  };

  it('prototype bound to a playground pack', () => {
    const diagnostics = validate(packMap(makeBase(), sample()), {
      prototypeBindings: [{ prototypeId: 'cold-chain-ops', packId: 'sample' }],
    });
    expect(find(diagnostics, 'theme.scope-violation', { packId: 'sample', severity: 'block' })).toBeDefined();
  });

  it('playground pack alone is valid when unbound', () => {
    expect(validate(packMap(makeBase(), sample()))).toEqual([]);
  });

  it('prototype pack id differing from its owner prototype', () => {
    const child = makeChild({ ownerPrototypeId: 'other-proto' });
    expect(find(validate(packMap(makeBase(), child)), 'theme.scope-violation', { packId: 'brand', severity: 'block' })).toBeDefined();
  });

  it('prototype pack bound by another prototype', () => {
    const diagnostics = validate(packMap(makeBase(), makeChild()), {
      prototypeBindings: [{ prototypeId: 'cold-chain-ops', packId: 'brand' }],
    });
    expect(find(diagnostics, 'theme.scope-violation', { packId: 'brand', severity: 'block' })).toBeDefined();
  });

  it('valid bindings produce no diagnostics', () => {
    const diagnostics = validate(packMap(makeBase(), makeChild()), {
      prototypeBindings: [
        { prototypeId: 'brand', packId: 'brand' },
        { prototypeId: 'cold-chain-ops', packId: 'base' },
      ],
    });
    expect(diagnostics).toEqual([]);
  });

  it('binding to a missing pack is an unresolved reference', () => {
    const diagnostics = validate(packMap(makeBase()), {
      prototypeBindings: [{ prototypeId: 'x', packId: 'ghost' }],
    });
    expect(find(diagnostics, 'theme.unresolved-reference', { packId: 'ghost' })).toBeDefined();
  });
});

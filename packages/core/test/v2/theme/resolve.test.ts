import { describe, expect, it } from 'vitest';
import {
  listPackChain,
  resolveAllThemeTables,
  resolveThemePack,
  type ResolvedThemeTable,
  type ThemeExpression,
  type ThemePackSource,
} from '../../../src/v2/theme/index.js';
import { makeBase, makeCatalog, makeChild, makeConstants, packMap } from './fixtures.js';

function resolve(packs: Map<string, ThemePackSource>, packId: string, mode = 'light', accent?: string) {
  return resolveThemePack({
    keyCatalog: makeCatalog(),
    constants: makeConstants(),
    packs,
    packId,
    mode,
    ...(accent === undefined ? {} : { accent }),
  });
}

function table(packs: Map<string, ThemePackSource>, packId: string, mode = 'light', accent?: string): ResolvedThemeTable {
  const result = resolve(packs, packId, mode, accent);
  expect(result.diagnostics).toEqual([]);
  expect(result.table).not.toBeNull();
  return result.table as ResolvedThemeTable;
}

describe('base pack resolution', () => {
  it('resolves every key for all modes and Accents', () => {
    const result = resolveAllThemeTables({
      keyCatalog: makeCatalog(),
      constants: makeConstants(),
      packs: packMap(makeBase()),
      packId: 'base',
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.tables.map((t) => `${t.identity.mode}/${t.identity.accent}`).sort()).toEqual([
      'dark/default',
      'dark/teal',
      'light/default',
      'light/teal',
    ]);
    for (const t of result.tables) {
      expect(t.identity.packDigest).toBe(result.digest);
      expect(t.identity.packId).toBe('base');
    }
  });

  it('resolves values by type and carries constants through', () => {
    const t = table(packMap(makeBase()), 'base');
    expect(t.values['color.primary']).toBe('#1f5fbf');
    expect(t.values['radius.control']).toBe(12);
    expect(t.values['opacity.disabled']).toBe(0.4);
    expect(t.values['motion.duration-short']).toBe(120);
    expect(t.values['elevation.surface']).toBe('none');
    expect(t.values['asset.brand-mark']).toBe('none');
    expect(t.values['font.text']).toEqual({ family: ['system-ui', 'sans-serif'], features: [] });
    expect(t.values['font.numeric']).toEqual({ family: ['ui-monospace', 'monospace'], features: ['tnum'] });
    expect(t.values['border.default']).toEqual({ width: 1, style: 'solid', color: '#111111' });
    expect(t.values['tabbar.height']).toBe(48);
    expect(t.values['tabbar.treatment']).toBe('glass');
    expect(t.constants).toEqual({ 'layout.fill': '100%', 'layer.base': 0 });
  });

  it('applies mode overrides', () => {
    const packs = packMap(makeBase());
    expect(table(packs, 'base', 'dark').values['color.surface']).toBe('#1c1c1c');
    expect(table(packs, 'base', 'light').values['color.surface']).toBe('#ffffff');
    expect(table(packs, 'base', 'dark').values['button.primary-background']).toBe('#8ab4ff');
  });

  it('component key.default is the lowest priority value', () => {
    const t = table(packMap(makeBase()), 'base');
    expect(t.values['button.primary-background']).toBe('#1f5fbf');
    expect(t.values['tabbar.gap']).toBe(16);
    expect(t.provenance['button.primary-background']).toMatchObject({ sourcePackId: 'base', inherited: false });
  });

  it('is not affected by catalog descriptions', () => {
    const described = makeCatalog();
    described.keys[0]!.description = 'new text';
    const a = resolveAllThemeTables({ keyCatalog: described, constants: makeConstants(), packs: packMap(makeBase()), packId: 'base' });
    const b = resolveAllThemeTables({ keyCatalog: makeCatalog(), constants: makeConstants(), packs: packMap(makeBase()), packId: 'base' });
    expect(a.digest).toBe(b.digest);
  });
});

describe('Accent priority', () => {
  it('accent.modes > accent.values > pack modes > pack values', () => {
    const packs = packMap(makeBase());
    // accent.modes (dark) wins
    const darkTeal = table(packs, 'base', 'dark', 'teal');
    expect(darkTeal.values['color.primary']).toBe('#5eead4');
    expect(darkTeal.provenance['color.primary']?.sourcePackId).toBe('base#teal');
    // accent.values wins over pack values in light
    expect(table(packs, 'base', 'light', 'teal').values['color.primary']).toBe('#0f766e');
    // default accent without overrides: pack modes then pack values
    expect(table(packs, 'base', 'dark', 'default').values['color.primary']).toBe('#8ab4ff');
    expect(table(packs, 'base', 'light', 'default').values['color.primary']).toBe('#1f5fbf');
  });

  it('accent.values wins over pack modes', () => {
    const base = makeBase();
    delete base.accents!.accents.teal!.modes;
    const t = table(packMap(base), 'base', 'dark', 'teal');
    expect(t.values['color.primary']).toBe('#0f766e');
  });

  it('uses the pack default accent when none is requested', () => {
    const base = makeBase();
    base.manifest.defaultAccent = 'teal';
    const t = table(packMap(base), 'base');
    expect(t.identity.accent).toBe('teal');
    expect(t.values['color.primary']).toBe('#0f766e');
  });

  it('a pack without an accents file implicitly has only "default"', () => {
    const base = makeBase();
    delete base.accents;
    const result = resolveAllThemeTables({ keyCatalog: makeCatalog(), constants: makeConstants(), packs: packMap(base), packId: 'base' });
    expect(result.tables.map((t) => t.identity.accent)).toEqual(['default', 'default']);
  });
});

describe('$switch and Primitive scope', () => {
  it('selects the case by the enum key', () => {
    const packs = packMap(makeBase());
    expect(table(packs, 'base').values['space.inset']).toBe(16);
    for (const [density, expected] of [
      ['compact', 12],
      ['regular', 16],
      ['comfortable', 20],
    ] as const) {
      const child = makeChild({ semantic: { values: { density } } });
      const t = table(packMap(makeBase(), child), 'brand');
      expect(t.values['space.inset'], density).toBe(expected);
      expect(t.values['tabbar.gap'], density).toBe(expected);
    }
  });

  it('a child Primitive with the same name does not change base expressions', () => {
    const child = makeChild({ primitives: { values: { 'gray.50': '#00ff00', 'gray.900': '#222222' } } });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['color.background']).toBe('#fafafa');
    expect(t.values['color.on-surface']).toBe('#111111');
  });

  it('a child Primitive is visible to child expressions', () => {
    const child = makeChild({
      primitives: { values: { 'gray.900': '#222222' } },
      semantic: { values: { 'color.on-surface': '{gray.900}' } },
    });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['color.on-surface']).toBe('#222222');
    expect(t.provenance['color.on-surface']?.chain).toEqual(['color.on-surface', 'brand:gray.900']);
  });

  it('a child expression can use a Primitive of the base pack', () => {
    const child = makeChild({ semantic: { values: { 'color.primary': '{teal.600}' } } });
    expect(table(packMap(makeBase(), child), 'brand').values['color.primary']).toBe('#0f766e');
  });

  it('keys are late-bound: a child override reaches base component defaults', () => {
    const child = makeChild({
      semantic: { values: { 'color.primary': '#a01c5a', 'color.on-surface': '#222222' } },
    });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['button.primary-background']).toBe('#a01c5a');
    expect(t.values['tabbar.active']).toBe('#222222');
    expect(t.provenance['button.primary-background']).toMatchObject({ sourcePackId: 'base', inherited: true });
  });
});

describe('inheritance and provenance', () => {
  const child = makeChild({
    semantic: { values: { 'color.primary': '#a01c5a' }, modes: { dark: { 'color.primary': '#f0a0c0' } } },
  });
  const packs = packMap(makeBase(), child);

  it('marks inherited values and their source pack', () => {
    const t = table(packs, 'brand');
    expect(t.provenance['color.primary']).toMatchObject({ sourcePackId: 'brand', inherited: false });
    expect(t.provenance['color.surface']).toMatchObject({ sourcePackId: 'base', inherited: true });
    expect(t.values['color.primary']).toBe('#a01c5a');
    expect(table(packs, 'brand', 'dark').values['color.primary']).toBe('#f0a0c0');
  });

  it('records reference chains', () => {
    const t = table(packMap(makeBase()), 'base');
    expect(t.provenance['button.primary-background']?.chain).toEqual([
      'button.primary-background',
      'color.primary',
      'base:blue.600',
    ]);
    expect(t.provenance['tabbar.active']?.chain).toEqual(['tabbar.active', 'color.on-surface', 'base:gray.900']);
    expect(t.provenance['color.on-primary']?.chain).toEqual(['color.on-primary']);
  });

  it('lists the pack chain nearest first', () => {
    expect(listPackChain(packs, 'brand')).toEqual({ chain: ['brand', 'base'], diagnostics: [] });
    expect(listPackChain(packs, 'base')).toEqual({ chain: ['base'], diagnostics: [] });
  });

  it('inherits the Accent file from the base pack', () => {
    const t = table(packs, 'brand', 'light', 'teal');
    expect(t.values['color.primary']).toBe('#0f766e');
    expect(t.provenance['color.primary']).toMatchObject({ sourcePackId: 'base#teal', inherited: true });
  });
});

describe('typography', () => {
  it('derives parts and reassembles roles', () => {
    const t = table(packMap(makeBase()), 'base');
    expect(t.values['typography.title']).toEqual({
      family: ['system-ui', 'sans-serif'],
      features: [],
      weight: 650,
      size: 20,
      lineHeight: 1.3,
    });
    expect(t.values['typography.title.family']).toEqual(['system-ui', 'sans-serif']);
    expect(t.values['typography.title.weight']).toBe(650);
    expect(t.values['typography.title.size']).toBe(20);
    expect(t.values['typography.title.line-height']).toBe(1.3);
    expect(t.values['typography.body.size']).toBe('1rem');
    expect(t.provenance['typography.title.size']?.chain[0]).toBe('typography.title.size');
  });

  it('a part override replaces only that field and the role is reassembled', () => {
    const child = makeChild({ semantic: { values: { 'typography.title.size': 24, 'typography.title.weight': 700 } } });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['typography.title']).toEqual({
      family: ['system-ui', 'sans-serif'],
      features: [],
      weight: 700,
      size: 24,
      lineHeight: 1.3,
    });
    expect(t.values['typography.title.size']).toBe(24);
    expect(t.provenance['typography.title.size']).toMatchObject({ sourcePackId: 'brand', inherited: false });
    expect(t.provenance['typography.title.line-height']).toMatchObject({ sourcePackId: 'base', inherited: true });
  });

  it('a role override in a nearer layer supersedes a part override in a farther layer', () => {
    const middle = makeChild({ semantic: { values: { 'typography.title.size': 24 } } }, 'middle');
    const top = makeChild(
      { semantic: { values: { 'typography.title': { family: '{font.text}', weight: 500, size: 30, lineHeight: 1.2 } } } },
      'top',
      'middle',
    );
    const t = table(packMap(makeBase(), middle, top), 'top');
    expect(t.values['typography.title.size']).toBe(30);
    expect(t.values['typography.title']).toMatchObject({ size: 30, weight: 500, lineHeight: 1.2 });
    // a part override nearer than the role override wins
    const nearer = makeChild(
      { semantic: { values: { 'typography.title.size': 18 } } },
      'nearer',
      'top',
    );
    const t2 = table(packMap(makeBase(), middle, top, nearer), 'nearer');
    expect(t2.values['typography.title.size']).toBe(18);
    expect(t2.values['typography.title']).toMatchObject({ size: 18, weight: 500 });
  });

  it('a font reference supplies family and features', () => {
    const child = makeChild({
      semantic: { values: { 'typography.body': { family: '{font.numeric}', weight: 500, size: 14, lineHeight: 1.4 } } },
    });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['typography.body']).toEqual({
      family: ['ui-monospace', 'monospace'],
      features: ['tnum'],
      weight: 500,
      size: 14,
      lineHeight: 1.4,
    });
    expect(t.values['typography.body.family']).toEqual(['ui-monospace', 'monospace']);
  });

  it('a part family can be overridden with a font reference and reassembles features', () => {
    const child = makeChild({ semantic: { values: { 'typography.title.family': '{font.numeric}' } } });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['typography.title']).toMatchObject({ family: ['ui-monospace', 'monospace'], features: ['tnum'] });
  });
});

describe('composites', () => {
  it('border resolves width/style/color including references', () => {
    const child = makeChild({
      semantic: { values: { 'border.default': { width: '{radius.control}', style: 'dashed', color: '#ff0000' } } },
    });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['border.default']).toEqual({ width: 12, style: 'dashed', color: '#ff0000' });
  });

  it('asset resolves to file, media type, alt and owning pack', () => {
    const child = makeChild({
      files: { 'assets/logo.svg': 'c'.repeat(40) },
      semantic: {
        values: { 'asset.brand-mark': { file: 'assets/logo.svg', mediaType: 'image/svg+xml', alt: 'Logo' } },
      },
    });
    const t = table(packMap(makeBase(), child), 'brand');
    expect(t.values['asset.brand-mark']).toEqual({
      file: 'assets/logo.svg',
      mediaType: 'image/svg+xml',
      alt: 'Logo',
      packId: 'brand',
    });
  });
});

describe('resolveThemePack requests', () => {
  it('reports an undeclared mode', () => {
    const result = resolve(packMap(makeBase()), 'base', 'sepia');
    expect(result.table).toBeNull();
    expect(result.diagnostics.find((d) => d.code === 'theme.mode-undeclared')).toMatchObject({ severity: 'block' });
  });

  it('reports an unknown Accent', () => {
    const result = resolve(packMap(makeBase()), 'base', 'light', 'pink');
    expect(result.table).toBeNull();
    expect(result.diagnostics.find((d) => d.code === 'theme.unresolved-reference')).toMatchObject({ accent: 'pink' });
  });

  it('returns a null table when the pack has block diagnostics', () => {
    const base = makeBase();
    (base.semantic!.values as Record<string, ThemeExpression>)['color.surface'] = 'nope';
    const result = resolve(packMap(base), 'base');
    expect(result.table).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

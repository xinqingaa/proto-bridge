import { describe, expect, it } from 'vitest';
import {
  computeKeyCatalogDigest,
  formatThemeIdentity,
  parseThemeIdentity,
  resolveAllThemeTables,
  type ThemeExpression,
  type ThemePackSource,
} from '../../../src/v2/theme/index.js';
import { makeBase, makeCatalog, makeChild, makeConstants, packMap } from './fixtures.js';

function digestOf(base: ThemePackSource, packId = 'base', child?: ThemePackSource) {
  const packs = child ? packMap(base, child) : packMap(base);
  const result = resolveAllThemeTables({
    keyCatalog: makeCatalog(),
    constants: makeConstants(),
    packs,
    packId,
  });
  expect(result.diagnostics.filter((d) => d.severity === 'block')).toEqual([]);
  expect(result.digest).toMatch(/^sha1:[0-9a-f]{40}$/);
  return result.digest as string;
}

function reverseKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).reverse());
}

describe('pack digest', () => {
  it('is stable for the same input', () => {
    expect(digestOf(makeBase())).toBe(digestOf(makeBase()));
  });

  it('ignores JSON key order', () => {
    const base = makeBase();
    base.semantic!.values = reverseKeys(base.semantic!.values!);
    base.semantic!.modes = { dark: reverseKeys(base.semantic!.modes!.dark!) };
    base.primitives!.values = reverseKeys(base.primitives!.values);
    expect(digestOf(base)).toBe(digestOf(makeBase()));
  });

  it('ignores Primitive names', () => {
    const base = makeBase();
    const values = base.primitives!.values;
    values['azure.600'] = values['blue.600'] as ThemeExpression;
    delete values['blue.600'];
    (base.semantic!.values as Record<string, ThemeExpression>)['color.primary'] = '{azure.600}';
    expect(digestOf(base)).toBe(digestOf(makeBase()));
  });

  it('ignores labels', () => {
    const base = makeBase();
    base.manifest.label = 'Renamed';
    base.manifest.themes[1]!.label = 'Renamed teal';
    expect(digestOf(base)).toBe(digestOf(makeBase()));
  });

  it('ignores expression spelling when the result is equal', () => {
    const base = makeBase();
    (base.semantic!.values as Record<string, ThemeExpression>)['color.primary'] = '#1f5fbf';
    (base.semantic!.values as Record<string, ThemeExpression>)['space.inset'] = 16;
    expect(digestOf(base)).toBe(digestOf(makeBase()));
  });

  it('changes when a dark-mode value changes', () => {
    const base = makeBase();
    base.semantic!.modes!.dark!['color.surface'] = '#202020';
    expect(digestOf(base)).not.toBe(digestOf(makeBase()));
  });

  it('changes when an theme value changes', () => {
    const base = makeBase();
    base.primitives!.values['teal.600'] = '#0e7490';
    expect(digestOf(base)).not.toBe(digestOf(makeBase()));
  });

  it('changes when a file hash changes', () => {
    const a = makeBase();
    a.files = { 'assets/logo.svg': 'a'.repeat(40) };
    const b = makeBase();
    b.files = { 'assets/logo.svg': 'b'.repeat(40) };
    expect(digestOf(a)).not.toBe(digestOf(b));
    expect(digestOf(a)).not.toBe(digestOf(makeBase()));
  });

  it('changes when the key catalog changes materially', () => {
    const base = makeBase();
    const catalog = makeCatalog();
    catalog.keys.find((key) => key.id === 'opacity.disabled')!.valueType = 'duration';
    const result = resolveAllThemeTables({ keyCatalog: catalog, constants: makeConstants(), packs: packMap(base), packId: 'base' });
    expect(result.digest).not.toBeNull();
    expect(result.digest).not.toBe(digestOf(makeBase()));
  });

  it('differs between a child pack and its base and covers the extends chain', () => {
    const child = makeChild({ semantic: { values: { 'color.primary': '#a01c5a' }, modes: { dark: { 'color.primary': '#f0a0c0' } } } });
    expect(digestOf(makeBase(), 'brand', child)).not.toBe(digestOf(makeBase()));
  });
});

describe('key catalog digest', () => {
  it('ignores label, description and source, and key order', () => {
    const a = makeCatalog();
    const b = makeCatalog();
    b.keys.reverse();
    for (const key of b.keys) {
      key.description = 'changed';
      key.label = 'Label';
      key.source = 'contract.json';
    }
    expect(computeKeyCatalogDigest(b)).toBe(computeKeyCatalogDigest(a));
  });

  it('changes when valueType changes', () => {
    const a = makeCatalog();
    const b = makeCatalog();
    b.keys.find((key) => key.id === 'opacity.disabled')!.valueType = 'duration';
    expect(computeKeyCatalogDigest(b)).not.toBe(computeKeyCatalogDigest(a));
  });

  it('changes when contrast pairs change', () => {
    const a = makeCatalog();
    const b = makeCatalog();
    b.contrastPairs[0]!.level = 'ui';
    expect(computeKeyCatalogDigest(b)).not.toBe(computeKeyCatalogDigest(a));
  });
});

describe('theme identity', () => {
  const identity = {
    packId: 'cold-chain-ops',
    packDigest: `sha1:${'ab'.repeat(20)}`,
    mode: 'dark',
    theme: 'teal',
  };

  it('round-trips', () => {
    const text = formatThemeIdentity(identity);
    expect(text).toBe(`cold-chain-ops@sha1:${'ab'.repeat(20)}/teal/dark`);
    expect(parseThemeIdentity(text)).toEqual(identity);
  });

  it('parse returns null for malformed input', () => {
    for (const bad of [
      '',
      'base',
      `base@sha1:${'ab'.repeat(20)}`,
      `base@sha1:${'ab'.repeat(20)}/light`,
      `base@sha1:xyz/light/default`,
      `Base@sha1:${'ab'.repeat(20)}/light/default`,
      `base@sha1:${'ab'.repeat(20)}/light/default/extra`,
    ]) {
      expect(parseThemeIdentity(bad), bad).toBeNull();
    }
  });

  it('format throws for components that cannot round-trip', () => {
    expect(() => formatThemeIdentity({ ...identity, packId: 'bad/id' })).toThrow();
    expect(() => formatThemeIdentity({ ...identity, packDigest: 'sha1:short' })).toThrow();
  });
});

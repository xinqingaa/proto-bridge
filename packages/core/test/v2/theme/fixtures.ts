import type {
  ThemeConstantTable,
  ThemeDiagnostic,
  ThemeExpression,
  ThemeKeyCatalog,
  ThemeKeyDefinition,
  ThemePackSource,
} from '../../../src/v2/theme/index.js';
import { validateThemePacks } from '../../../src/v2/theme/index.js';

function key(
  id: string,
  tier: 'semantic' | 'component',
  valueType: ThemeKeyDefinition['valueType'],
  extra: Partial<ThemeKeyDefinition> = {},
): ThemeKeyDefinition {
  return { id, tier, valueType, bindable: true, modeVariant: false, ...extra };
}

export function makeCatalog(): ThemeKeyCatalog {
  return {
    schemaVersion: 1,
    keys: [
      key('color.background', 'semantic', 'color', { modeVariant: true }),
      key('color.surface', 'semantic', 'color', { modeVariant: true }),
      key('color.on-surface', 'semantic', 'color', { modeVariant: true }),
      key('color.primary', 'semantic', 'color', { modeVariant: true }),
      key('color.on-primary', 'semantic', 'color', { modeVariant: true }),
      key('color.warning', 'semantic', 'color', { modeVariant: true }),
      key('color.on-warning', 'semantic', 'color', { modeVariant: true }),
      key('density', 'semantic', 'enum', { bindable: false, enumValues: ['compact', 'regular', 'comfortable'] }),
      key('surface.treatment', 'semantic', 'enum', { bindable: false, enumValues: ['solid', 'outlined', 'glass'] }),
      key('space.inset', 'semantic', 'length'),
      key('radius.control', 'semantic', 'length'),
      key('opacity.disabled', 'semantic', 'number', { modeVariant: true }),
      key('motion.duration-short', 'semantic', 'duration'),
      key('motion.easing', 'semantic', 'easing'),
      key('elevation.surface', 'semantic', 'shadow', { modeVariant: true }),
      key('surface.glass-backdrop', 'semantic', 'filter', { modeVariant: true }),
      key('typography.title', 'semantic', 'typography'),
      key('typography.body', 'semantic', 'typography'),
      key('typography.numeric-content', 'semantic', 'typography'),
      key('border.default', 'semantic', 'border'),
      key('asset.brand-mark', 'semantic', 'asset', { modeVariant: true }),
      key('button.primary-background', 'component', 'color', { modeVariant: true, default: '{color.primary}' }),
      key('button.primary-text', 'component', 'color', { modeVariant: true, default: '{color.on-primary}' }),
      key('button.radius', 'component', 'length', { default: '{radius.control}' }),
      key('tabbar.active', 'component', 'color', { modeVariant: true, default: '{color.on-surface}' }),
      key('tabbar.gap', 'component', 'length', { default: '{space.inset}' }),
      key('tabbar.height', 'component', 'length', { default: 48 }),
      key('tabbar.treatment', 'component', 'enum', {
        bindable: false,
        enumValues: ['solid', 'outlined', 'glass'],
        default: '{surface.treatment}',
      }),
    ],
    contrastPairs: [
      { foreground: 'color.on-surface', background: 'color.surface', level: 'text' },
      { foreground: 'color.on-primary', background: 'color.primary', level: 'text' },
      { foreground: 'color.on-warning', background: 'color.warning', level: 'text' },
      { foreground: 'color.primary', background: 'color.surface', level: 'ui' },
    ],
  };
}

export function makeConstants(): ThemeConstantTable {
  return {
    schemaVersion: 1,
    constants: [
      { id: 'layout.fill', valueType: 'length', value: '100%' },
      { id: 'layer.base', valueType: 'number', value: 0 },
    ],
  };
}

export function makeBase(): ThemePackSource {
  return {
    manifest: {
      schemaVersion: 1,
      id: 'base',
      label: 'Base',
      scope: 'base',
      modes: ['light', 'dark'],
      defaultMode: 'light',
      themes: [{ id: 'default', label: 'Default' }, { id: 'teal', label: 'Teal' }],
      defaultTheme: 'default',
    },
    primitives: {
      values: {
        'neutral.0': '#ffffff',
        'gray.50': '#fafafa',
        'gray.900': '#111111',
        'blue.600': '#1f5fbf',
        'blue.300': '#8ab4ff',
        'teal.600': '#0f766e',
        'teal.300': '#5eead4',
        'space.16': 16,
      },
    },
    semantic: {
      values: {
        'color.background': '{gray.50}',
        'color.surface': '{neutral.0}',
        'color.on-surface': '{gray.900}',
        'color.primary': '{blue.600}',
        'color.on-primary': '#ffffff',
        'color.warning': '#ffb300',
        'color.on-warning': '#000000',
        density: 'regular',
        'surface.treatment': 'solid',
        'space.inset': { $switch: 'density', cases: { compact: 12, regular: '{space.16}', comfortable: 20 } },
        'radius.control': 12,
        'opacity.disabled': 0.4,
        'motion.duration-short': 120,
        'motion.easing': 'ease',
        'elevation.surface': 'none',
        'surface.glass-backdrop': 'none',
        'typography.title': { weight: 650, size: 20, lineHeight: 1.3 },
        'typography.body': { weight: 400, size: '1rem', lineHeight: 1.5 },
        'typography.numeric-content': { weight: 650, size: 20, lineHeight: 1.3 },
        'border.default': { width: 1, style: 'solid', color: '{color.on-surface}' },
        'asset.brand-mark': 'none',
      },
      themes: { teal: { values: { 'color.primary': '{teal.600}' } } },
      themeModes: { teal: { dark: { 'color.primary': '{teal.300}' } } },
      modes: {
        dark: {
          'color.background': '#101010',
          'color.surface': '#1c1c1c',
          'color.on-surface': '#f5f5f5',
          'color.primary': '{blue.300}',
          'color.on-primary': '#000000',
        },
      },
    },
    component: { values: { 'tabbar.treatment': 'glass' } },

  };
}

export function makeChild(overrides: Partial<ThemePackSource> = {}, id = 'brand', extendsId = 'base'): ThemePackSource {
  return {
    manifest: {
      schemaVersion: 1,
      id,
      label: id,
      extends: extendsId,
      scope: 'prototype',
      modes: ['light', 'dark'],
      defaultMode: 'light',
      themes: [{ id: 'default', label: 'Default' }, { id: 'teal', label: 'Teal' }],
      defaultTheme: 'default',
    },
    ownerPrototypeId: id,
    ...overrides,
  };
}

export function packMap(...sources: ThemePackSource[]): Map<string, ThemePackSource> {
  return new Map(sources.map((source) => [source.manifest.id, source]));
}

export function validate(
  packs: Map<string, ThemePackSource>,
  extra: { prototypeBindings?: Array<{ prototypeId: string; packId: string }>; includeInfo?: boolean } = {},
  catalog: ThemeKeyCatalog = makeCatalog(),
): ThemeDiagnostic[] {
  return validateThemePacks({ keyCatalog: catalog, constants: makeConstants(), packs, ...extra });
}

export function find(
  diagnostics: ThemeDiagnostic[],
  code: ThemeDiagnostic['code'],
  match: Partial<Pick<ThemeDiagnostic, 'key' | 'packId' | 'severity' | 'mode' | 'theme'>> = {},
): ThemeDiagnostic | undefined {
  return diagnostics.find(
    (diagnostic) =>
      diagnostic.code === code &&
      (match.key === undefined || diagnostic.key === match.key) &&
      (match.packId === undefined || diagnostic.packId === match.packId) &&
      (match.severity === undefined || diagnostic.severity === match.severity) &&
      (match.mode === undefined || diagnostic.mode === match.mode) &&
      (match.theme === undefined || diagnostic.theme === match.theme),
  );
}

/** Base pack whose on-warning/warning pair fails contrast but is waived. */
export function makeWaivedBase(): ThemePackSource {
  const base = makeBase();
  (base.semantic!.values as Record<string, ThemeExpression>)['color.on-warning'] = '#ffffff';
  base.manifest.contrastWaivers = [{ pair: ['color.on-warning', 'color.warning'], reason: 'brand amber on white' }];
  return base;
}

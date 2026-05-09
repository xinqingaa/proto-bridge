import type {
  MappingConfidence,
  MapTokensInput,
  TargetPlatform,
  TokenMapResult,
  TokenMapping,
} from '../../types/index.js';

const COLOR_TOKEN_MAP: Record<string, string> = {
  '--color-primary-normal': 'themeService.colors.colorPrimaryNormal',
  '--color-primary-pressed': 'themeService.colors.colorPrimaryPressed',
  '--color-text-normal': 'themeService.colors.colorTextNormal',
  '--color-text-title': 'themeService.colors.colorTextTitle',
  '--color-text-regular': 'themeService.colors.colorTextRegular',
  '--color-text-description': 'themeService.colors.colorTextDescription',
  '--color-text-secondary': 'themeService.colors.colorTextSecondary',
  '--color-text-label': 'themeService.colors.colorTextLabel',
  '--color-text-light': 'themeService.colors.colorTextLight',
  '--color-text-light-1': 'themeService.colors.colorTextLight1',
  '--color-bg-base': 'themeService.colors.colorBgBase',
  '--color-bg-1': 'themeService.colors.colorBg1',
  '--color-bg-surface-1': 'themeService.colors.colorBgSurface1',
  '--color-bg-surface-2': 'themeService.colors.colorBgSurface2',
  '--color-sheet-bg': 'themeService.colors.colorSheetBg',
  '--color-popup-bg': 'themeService.colors.colorPopupBg',
  '--color-bg-mask-1': 'themeService.colors.colorBgMask1',
  '--color-bg-mask-2': 'themeService.colors.colorBgMask2',
  '--color-light-line': 'themeService.colors.colorLightLine',
  '--color-heavy-line': 'themeService.colors.colorHeavyLine',
  '--color-disabled': 'themeService.colors.colorDisabled',
  '--color-warning': 'themeService.colors.colorWarning',
  '--color-error': 'themeService.colors.colorError',
  '--color-redpoint': 'themeService.colors.colorRedpoint',
  '--color-succeed': 'themeService.colors.colorSucceed',
  '--color-icon-brand': 'themeService.colors.colorIconBrand',
  '--color-icon-default': 'themeService.colors.colorIconDefault',
  '--color-icon-secondary': 'themeService.colors.colorIconSecondary',
  '--color-icon-primary': 'themeService.colors.colorIconPrimary',
  '--color-icon-disabled': 'themeService.colors.colorIconDisabled',
  '--color-icon-purple': 'themeService.colors.colorIconPurple',
  '--color-button-brand': 'themeService.colors.colorButtonBrand',
  '--color-button-disabled': 'themeService.colors.colorButtonDisabled',
  '--color-trend-red-1': 'themeService.colors.colorTrendRed1',
  '--color-trend-red-2': 'themeService.colors.colorTrendRed2',
  '--color-trend-red-3': 'themeService.colors.colorTrendRed3',
  '--color-trend-green-1': 'themeService.colors.colorTrendGreen1',
  '--color-trend-green-2': 'themeService.colors.colorTrendGreen2',
  '--color-trend-green-3': 'themeService.colors.colorTrendGreen3',
  '--color-trend-flat': 'themeService.colors.colorTrendFlat',
  '--color-trend-up-disabled': 'themeService.colors.colorTrendUpDisabled',
  '--color-trend-down-disabled': 'themeService.colors.colorTrendDownDisabled',
  '--color-chart-line-1': 'themeService.colors.colorChartLine1',
  '--color-chart-line-2': 'themeService.colors.colorChartLine2',
  '--color-chart-line-3': 'themeService.colors.colorChartLine3',
  '--color-chart-line-4': 'themeService.colors.colorChartLine4',
  '--color-chart-line-5': 'themeService.colors.colorChartLine5',
  '--color-chart-line-6': 'themeService.colors.colorChartLine6',
  '--color-chart-line-7': 'themeService.colors.colorChartLine7',
  '--color-favourite': 'themeService.colors.colorFavourite',
};

const TYPOGRAPHY_TOKEN_MAP: Record<string, string> = {
  'headline-b': 'themeService.textStyles.headlineB',
  'headline-m': 'themeService.textStyles.headlineM',
  'title-b': 'themeService.textStyles.titleB',
  'title-m': 'themeService.textStyles.titleM',
  'body-m': 'themeService.textStyles.bodyM',
  'body-r': 'themeService.textStyles.bodyR',
  'small1-m': 'themeService.textStyles.small1M',
  'small1-r': 'themeService.textStyles.small1R',
  'small2-r': 'themeService.textStyles.small2R',
  'small3-r': 'themeService.textStyles.small3R',
  'small4-r': 'themeService.textStyles.small4R',
  'small4-m': 'themeService.textStyles.small4M',
  'number1-b': 'themeService.textStyles.number1B',
  'number2-b': 'themeService.textStyles.number2B',
  'number3-b': 'themeService.textStyles.number3B',
  'tab-b': 'themeService.textStyles.tabB',
  'tab-m': 'themeService.textStyles.tabM',
};

const COLOR_TOKEN_VALUES: Record<string, string> = {
  '--color-primary-normal': '#1a2028',
  '--color-primary-pressed': '#0f1217',
  '--color-text-normal': '#1a2028',
  '--color-text-title': '#1a2028',
  '--color-text-regular': '#1a2028',
  '--color-text-description': '#6b707f',
  '--color-text-secondary': '#9a9fa5',
  '--color-text-label': '#c6c8cb',
  '--color-text-light': '#ffffff',
  '--color-text-light-1': '#ffffff',
  '--color-bg-base': '#ffffff',
  '--color-bg-1': '#f1f1f1',
  '--color-bg-surface-1': '#f8f8f9',
  '--color-bg-surface-2': '#f8f8f9',
  '--color-sheet-bg': '#ffffff',
  '--color-popup-bg': '#ffffff',
  '--color-bg-mask-1': '#1a20288c',
  '--color-bg-mask-2': '#1a20282d',
  '--color-light-line': '#f1f1f1',
  '--color-heavy-line': '#eeeeee',
  '--color-disabled': '#bfc1c5',
  '--color-warning': '#ff175266',
  '--color-error': '#ff1752',
  '--color-redpoint': '#ff1752',
  '--color-succeed': '#00b98b',
  '--color-icon-brand': '#1a2028',
  '--color-icon-default': '#5e00ff',
  '--color-icon-secondary': '#6d7279',
  '--color-icon-primary': '#6d7279',
  '--color-icon-disabled': '#bfc1c5',
  '--color-icon-purple': '#5e00ff',
  '--color-button-brand': '#1a2028',
  '--color-button-disabled': '#bfc1c5',
  '--color-trend-red-1': '#f41c53',
  '--color-trend-red-2': '#f41c5314',
  '--color-trend-red-3': '#f41c531e',
  '--color-trend-green-1': '#00ac6d',
  '--color-trend-green-2': '#00ac6d14',
  '--color-trend-green-3': '#00ac6d1e',
  '--color-trend-flat': '#616f85',
  '--color-trend-up-disabled': '#f2b1cb',
  '--color-trend-down-disabled': '#b2e6d3',
  '--color-chart-line-1': '#7e3eff',
  '--color-chart-line-2': '#ec00ff',
  '--color-chart-line-3': '#f47927',
  '--color-chart-line-4': '#ffbf00',
  '--color-chart-line-5': '#e8d639',
  '--color-chart-line-6': '#8bbb11',
  '--color-chart-line-7': '#349dff',
  '--color-favourite': '#ff7300',
};

const TYPOGRAPHY_TOKEN_VALUES: Record<string, string> = {
  'headline-b': '17px/22px/700',
  'headline-m': '17px/22px/500',
  'title-b': '20px/28px/700',
  'title-m': '20px/28px/500',
  'body-m': '15px/20px/500',
  'body-r': '15px/20px/400',
  'small1-m': '13px/16px/500',
  'small1-r': '13px/16px/400',
  'small2-r': '12px/16px/400',
  'small3-r': '11px/14px/400',
  'small4-r': '10px/14px/400',
  'small4-m': '10px/14px/500',
  'number1-b': '34px/46px/700',
  'number2-b': '30px/40px/700',
  'number3-b': '24px/32px/700',
  'tab-b': '18px/24px/700',
  'tab-m': '18px/24px/500',
};

const COLOR_VALUE_INDEX = buildReverseTokenIndex(COLOR_TOKEN_VALUES, COLOR_TOKEN_MAP);
const TYPOGRAPHY_VALUE_INDEX = buildReverseTokenIndex(TYPOGRAPHY_TOKEN_VALUES, TYPOGRAPHY_TOKEN_MAP);

export type RuntimeThemeResolution = {
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy: 'css-var' | 'exact' | 'ambiguous' | 'family' | 'manual';
  confidence: MappingConfidence;
  reason: string;
};

export function mapTokens(input: MapTokensInput): TokenMapResult {
  const target = input.target ?? 'flutter';
  const sourceCode = input.sourceCode ?? '';
  const colors = mapColorTokens(collectColorTokenSources(sourceCode), target);
  const typography = mapTypographyTokens(collectTypographyTokenSources(sourceCode), target);
  const unresolved = [
    ...colors.filter((mapping) => !mapping.target),
    ...typography.filter((mapping) => !mapping.target),
    ...mapComputedStyleFallbacks(input.computedStyles ?? [], target),
  ];

  return {
    colors: colors.filter((mapping) => Boolean(mapping.target)),
    typography: typography.filter((mapping) => Boolean(mapping.target)),
    unresolved,
  };
}

export function getKnownTokenMaps(): {
  colors: Record<string, string>;
  typography: Record<string, string>;
} {
  return {
    colors: { ...COLOR_TOKEN_MAP },
    typography: { ...TYPOGRAPHY_TOKEN_MAP },
  };
}

export function resolveFlutterColorTarget(input: {
  cssVar?: string | undefined;
  value: string;
  source?: string | undefined;
}): RuntimeThemeResolution {
  if (input.cssVar && COLOR_TOKEN_MAP[input.cssVar]) {
    return {
      target: COLOR_TOKEN_MAP[input.cssVar],
      matchedBy: 'css-var',
      confidence: 'high',
      reason: `Matched captured color css variable ${input.cssVar} to a built-in YouFi color token.`,
    };
  }

  const normalized = normalizeColorValue(input.value);
  if (!normalized) {
    return {
      matchedBy: 'family',
      confidence: 'low',
      reason: 'Could not normalize captured color value; fall back to theme family selection.',
    };
  }

  const matches = rankColorTargets(COLOR_VALUE_INDEX.get(normalized) ?? [], input.source);
  if (matches.length === 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'exact',
      confidence: 'high',
      reason: `Captured color ${normalized} exactly matches a built-in YouFi color token.`,
    };
  }
  if (matches.length > 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'ambiguous',
      confidence: 'medium',
      reason: `Captured color ${normalized} matches multiple YouFi color tokens; prefer the first candidate and keep the others for review.`,
    };
  }
  return {
    matchedBy: 'family',
    confidence: 'low',
    reason: `No exact YouFi color token found for captured color ${normalized}; fall back to the closest theme family.`,
  };
}

export function resolveFlutterTypographyTarget(input: {
  value: string;
}): RuntimeThemeResolution {
  const normalized = normalizeTypographyValue(input.value);
  if (!normalized) {
    return {
      matchedBy: 'family',
      confidence: 'low',
      reason: 'Could not normalize captured typography value; fall back to theme family selection.',
    };
  }

  const matches = TYPOGRAPHY_VALUE_INDEX.get(normalized) ?? [];
  if (matches.length === 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'exact',
      confidence: 'high',
      reason: `Captured typography ${normalized} exactly matches a built-in YouFi text style.`,
    };
  }
  if (matches.length > 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'ambiguous',
      confidence: 'medium',
      reason: `Captured typography ${normalized} matches multiple YouFi text styles; prefer the first candidate and keep the others for review.`,
    };
  }
  return {
    matchedBy: 'family',
    confidence: 'low',
    reason: `No exact YouFi text style found for captured typography ${normalized}; fall back to the closest textStyles family.`,
  };
}

function collectColorTokenSources(sourceCode: string): string[] {
  const tokens = new Set<string>();
  const regexes = [/var\(\s*(--[a-zA-Z0-9-_]+)/g, /(?<![\w-])(--color-[a-zA-Z0-9-_]+)/g];

  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sourceCode))) {
      if (match[1]?.startsWith('--color-')) tokens.add(match[1]);
    }
  }

  return [...tokens].sort();
}

function collectTypographyTokenSources(sourceCode: string): string[] {
  const tokens = new Set<string>();
  const regex = /@include\s+([a-zA-Z0-9-_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceCode))) {
    if (match[1]) tokens.add(match[1]);
  }
  return [...tokens].sort();
}

function mapColorTokens(tokens: string[], target: TargetPlatform): TokenMapping[] {
  return tokens.map((token) => {
    const mapped = COLOR_TOKEN_MAP[token];
    return {
      source: token,
      target: mapped,
      targetPlatform: target,
      confidence: mapped ? 'high' : 'low',
      reason: mapped ? 'Built-in YouFi color token mapping.' : 'No built-in Flutter color token mapping.',
    };
  });
}

function mapTypographyTokens(tokens: string[], target: TargetPlatform): TokenMapping[] {
  return tokens.map((token) => {
    const mapped = TYPOGRAPHY_TOKEN_MAP[token];
    return {
      source: `@include ${token}`,
      target: mapped,
      targetPlatform: target,
      confidence: mapped ? 'high' : 'low',
      reason: mapped ? 'Built-in YouFi typography token mapping.' : 'No built-in Flutter text style mapping.',
    };
  });
}

function mapComputedStyleFallbacks(
  styles: Array<Record<string, string | undefined>>,
  target: TargetPlatform,
): TokenMapping[] {
  const unresolved = new Set<string>();

  for (const style of styles) {
    for (const key of ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'lineHeight']) {
      const value = style[key];
      if (value) unresolved.add(`${key}: ${value}`);
    }
  }

  return [...unresolved].map((source) => ({
    source,
    targetPlatform: target,
    confidence: 'low',
    reason: 'Runtime computed style has no semantic token source in Phase 1.',
  }));
}

function buildReverseTokenIndex(
  values: Record<string, string>,
  targetMap: Record<string, string>,
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [source, rawValue] of Object.entries(values)) {
    const normalizedValue = source.startsWith('--color-')
      ? normalizeColorValue(rawValue)
      : normalizeTypographyValue(rawValue);
    const target = targetMap[source];
    if (!normalizedValue || !target) continue;
    const existing = index.get(normalizedValue) ?? [];
    if (!existing.includes(target)) existing.push(target);
    index.set(normalizedValue, existing);
  }
  return index;
}

function normalizeColorValue(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'transparent' || trimmed === 'none') return undefined;

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const normalized = hex[1];
    if (!normalized) return undefined;
    const lowered = normalized.toLowerCase();
    if (lowered.length === 3) {
      return `#${lowered.split('').map((part) => `${part}${part}`).join('')}`;
    }
    if (lowered.length === 4) {
      return `#${lowered.split('').map((part) => `${part}${part}`).join('')}`;
    }
    return `#${lowered}`;
  }

  const rgb = trimmed.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) return undefined;
  const rawParts = rgb[1];
  if (!rawParts) return undefined;
  const parts = rawParts.split(',').map((part) => part.trim());
  if (parts.length < 3) return undefined;
  const [redPart, greenPart, bluePart, alphaPart] = parts;
  if (!redPart || !greenPart || !bluePart) return undefined;

  const red = clampColorChannel(redPart);
  const green = clampColorChannel(greenPart);
  const blue = clampColorChannel(bluePart);
  if (red === undefined || green === undefined || blue === undefined) return undefined;

  const alpha = alphaPart !== undefined ? clampAlphaChannel(alphaPart) : undefined;
  const base = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  return alpha === undefined || alpha >= 1 ? base : `${base}${toHex(Math.round(alpha * 255))}`;
}

function normalizeTypographyValue(value: string): string | undefined {
  const parts = value.split('/').map((part) => part.trim());
  if (parts.length < 3) return undefined;
  const [fontSizePart, lineHeightPart, fontWeightPart] = parts;
  if (!fontSizePart || !lineHeightPart || !fontWeightPart) return undefined;
  const fontSize = normalizeCssSize(fontSizePart);
  const lineHeight = normalizeCssSize(lineHeightPart);
  const fontWeight = normalizeFontWeight(fontWeightPart);
  if (!fontSize || !lineHeight || !fontWeight) return undefined;
  return `${fontSize}/${lineHeight}/${fontWeight}`;
}

function normalizeCssSize(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'normal') return undefined;
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (!match) return undefined;
  const sizePart = match[1];
  if (!sizePart) return undefined;
  const parsed = Number.parseFloat(sizePart);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed * 1000) / 1000;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}px`;
}

function normalizeFontWeight(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === 'normal') return '400';
  if (trimmed === 'bold') return '700';
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return `${parsed}`;
}

function rankColorTargets(targets: string[], source?: string | undefined): string[] {
  const scored = [...targets].sort((left, right) =>
    scoreColorTarget(left, source) - scoreColorTarget(right, source) || left.localeCompare(right),
  );
  return dedupe(scored);
}

function scoreColorTarget(target: string, source?: string | undefined): number {
  const normalizedSource = source ?? '';
  if (normalizedSource === 'backgroundColor') {
    if (/color(Bg|SheetBg|PopupBg|LightLine|HeavyLine|Button)/.test(target)) return 0;
    if (/colorTrend(Red2|Red3|Green2|Green3)/.test(target)) return 1;
    if (/colorText/.test(target)) return 2;
    return 3;
  }
  if (/colorText/.test(target)) return 0;
  if (/colorTrend/.test(target)) return 1;
  if (/colorChart|colorFavourite/.test(target)) return 2;
  if (/colorIcon/.test(target)) return 3;
  if (/color(Bg|SheetBg|PopupBg|LightLine|HeavyLine|Button)/.test(target)) return 4;
  return 5;
}

function clampColorChannel(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(255, Math.round(parsed)));
}

function clampAlphaChannel(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(1, parsed));
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

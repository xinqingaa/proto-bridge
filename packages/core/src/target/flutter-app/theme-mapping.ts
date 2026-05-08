import type { MapTokensInput, TargetPlatform, TokenMapResult, TokenMapping } from '../../types/index.js';

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

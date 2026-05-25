import type {
  MappingConfidence,
  MapTokensInput,
  TargetPlatform,
  TokenMapResult,
  TokenMapping,
} from '../../types/index.js';
import { genericProfile } from '../../profile/index.js';
import type { ResolvedRestorationProfile, RestorationProfile } from '../../profile/index.js';

export type RuntimeThemeResolution = {
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy: 'css-var' | 'source-mixin' | 'exact' | 'ambiguous' | 'family' | 'manual';
  confidence: MappingConfidence;
  reason: string;
};

export function mapTokens(input: MapTokensInput): TokenMapResult {
  const target = input.target ?? 'flutter';
  const sourceCode = input.sourceCode ?? '';
  const profile = currentProfile(input.restorationProfile);
  const colors = mapColorTokens(collectColorTokenSources(sourceCode), target, profile);
  const typography = mapTypographyTokens(collectTypographyTokenSources(sourceCode), target, profile);
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
  const tokens = themeTokens(genericProfile);
  return {
    colors: { ...tokens.colors },
    typography: { ...tokens.typography },
  };
}

export function resolveFlutterTypographyMixinTarget(
  mixin: string,
  restorationProfile?: ResolvedRestorationProfile | undefined,
): RuntimeThemeResolution {
  const profile = currentProfile(restorationProfile);
  const tokens = themeTokens(profile);
  const normalized = mixin.trim().replace(/^@include\s+/, '');
  const target = tokens.typography[normalized];
  if (target) {
    return {
      target,
      candidateTargets: [target],
      matchedBy: 'source-mixin',
      confidence: 'high',
      reason: `Source typography mixin @include ${normalized} maps to ${profile.id} profile text style.`,
    };
  }
  return {
    matchedBy: 'family',
    confidence: 'low',
    reason: `No ${profile.id} profile text style mapping found for source typography mixin @include ${normalized}.`,
  };
}

export function resolveFlutterColorTarget(input: {
  cssVar?: string | undefined;
  value: string;
  source?: string | undefined;
  restorationProfile?: ResolvedRestorationProfile | undefined;
}): RuntimeThemeResolution {
  const profile = currentProfile(input.restorationProfile);
  const tokens = themeTokens(profile);
  if (input.cssVar && tokens.colors[input.cssVar]) {
    return {
      target: tokens.colors[input.cssVar],
      matchedBy: 'css-var',
      confidence: 'high',
      reason: `Matched captured color css variable ${input.cssVar} to ${profile.id} profile color token.`,
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

  const colorValueIndex = buildReverseTokenIndex(tokens.colorValues, tokens.colors);
  const matches = rankColorTargets(colorValueIndex.get(normalized) ?? [], input.source);
  if (matches.length === 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'exact',
      confidence: 'high',
      reason: `Captured color ${normalized} exactly matches ${profile.id} profile color token.`,
    };
  }
  if (matches.length > 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'ambiguous',
      confidence: 'medium',
      reason: `Captured color ${normalized} matches multiple ${profile.id} profile color tokens; prefer the first candidate and keep the others for review.`,
    };
  }
  return {
    matchedBy: 'family',
    confidence: 'low',
    reason: `No exact ${profile.id} profile color token found for captured color ${normalized}; fall back to the closest theme family.`,
  };
}

export function resolveFlutterTypographyTarget(input: {
  value: string;
  restorationProfile?: ResolvedRestorationProfile | undefined;
}): RuntimeThemeResolution {
  const profile = currentProfile(input.restorationProfile);
  const tokens = themeTokens(profile);
  const normalized = normalizeTypographyValue(input.value);
  if (!normalized) {
    return {
      matchedBy: 'family',
      confidence: 'low',
      reason: 'Could not normalize captured typography value; fall back to theme family selection.',
    };
  }

  const typographyValueIndex = buildReverseTokenIndex(tokens.typographyValues, tokens.typography);
  const matches = typographyValueIndex.get(normalized) ?? [];
  if (matches.length === 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'exact',
      confidence: 'high',
      reason: `Captured typography ${normalized} exactly matches ${profile.id} profile text style.`,
    };
  }
  if (matches.length > 1) {
    return {
      target: matches[0],
      candidateTargets: matches,
      matchedBy: 'ambiguous',
      confidence: 'medium',
      reason: `Captured typography ${normalized} matches multiple ${profile.id} profile text styles; prefer the first candidate and keep the others for review.`,
    };
  }
  return {
    matchedBy: 'family',
    confidence: 'low',
    reason: `No exact ${profile.id} profile text style found for captured typography ${normalized}; fall back to the closest textStyles family.`,
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

function mapColorTokens(tokens: string[], target: TargetPlatform, profile: RestorationProfile): TokenMapping[] {
  const profileTokens = themeTokens(profile);
  return tokens.map((token) => {
    const mapped = profileTokens.colors[token];
    return {
      source: token,
      target: mapped,
      targetPlatform: target,
      confidence: mapped ? 'high' : 'low',
      reason: mapped ? `${profile.id} profile color token mapping.` : 'No profile Flutter color token mapping.',
    };
  });
}

function mapTypographyTokens(tokens: string[], target: TargetPlatform, profile: RestorationProfile): TokenMapping[] {
  const profileTokens = themeTokens(profile);
  return tokens.map((token) => {
    const mapped = profileTokens.typography[token];
    return {
      source: `@include ${token}`,
      target: mapped,
      targetPlatform: target,
      confidence: mapped ? 'high' : 'low',
      reason: mapped ? `${profile.id} profile typography token mapping.` : 'No profile Flutter text style mapping.',
    };
  });
}

function currentProfile(input: ResolvedRestorationProfile | undefined): RestorationProfile {
  return input?.profile ?? genericProfile;
}

function themeTokens(profile: RestorationProfile): {
  colors: Record<string, string>;
  colorValues: Record<string, string>;
  typography: Record<string, string>;
  typographyValues: Record<string, string>;
} {
  return {
    colors: profile.themeTokens?.colors ?? {},
    colorValues: profile.themeTokens?.colorValues ?? {},
    typography: profile.themeTokens?.typography ?? {},
    typographyValues: profile.themeTokens?.typographyValues ?? {},
  };
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

import type {
  MappingConfidence,
  MapTokensInput,
  TargetPlatform,
  TokenMapResult,
  TokenMapping,
} from '../../types/index.js';

export type RuntimeThemeResolution = {
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy: 'css-var' | 'source-mixin' | 'exact' | 'ambiguous' | 'family' | 'manual';
  confidence: MappingConfidence;
  reason: string;
};

/**
 * Source-only token analysis cannot prove a target expression. Exact mappings
 * are produced later from target scan evidence; this stage preserves intent.
 */
export function mapTokens(input: MapTokensInput): TokenMapResult {
  const target = input.target ?? 'flutter';
  const sourceCode = input.sourceCode ?? '';
  const unresolved = [
    ...collectColorTokenSources(sourceCode).map((source) => unresolvedToken(source, target, 'Source color token requires target evidence.')),
    ...collectTypographyTokenSources(sourceCode).map((source) => unresolvedToken(`@include ${source}`, target, 'Source typography token requires target evidence.')),
    ...mapComputedStyleFallbacks(input.computedStyles ?? [], target),
  ];
  return { colors: [], typography: [], unresolved };
}

export function getKnownTokenMaps(): { colors: Record<string, string>; typography: Record<string, string> } {
  return { colors: {}, typography: {} };
}

export function resolveFlutterTypographyMixinTarget(mixin: string): RuntimeThemeResolution {
  const normalized = mixin.trim().replace(/^@include\s+/, '');
  return {
    matchedBy: 'manual',
    confidence: 'low',
    reason: `Source typography mixin @include ${normalized} has no target-backed token match.`,
  };
}

export function resolveFlutterColorTarget(input: {
  cssVar?: string | undefined;
  value: string;
  source?: string | undefined;
}): RuntimeThemeResolution {
  const normalized = normalizeColorValue(input.value);
  return {
    matchedBy: 'manual',
    confidence: 'low',
    reason: normalized
      ? `Captured color ${normalized} is preserved until a target token definition with matching evidence is scanned.`
      : 'Captured color could not be normalized; preserve the raw visual value for manual target matching.',
  };
}

export function resolveFlutterTypographyTarget(input: { value: string }): RuntimeThemeResolution {
  return {
    matchedBy: 'manual',
    confidence: 'low',
    reason: normalizeTypographyValue(input.value)
      ? `Captured typography ${normalizeTypographyValue(input.value)} is preserved until a target token definition with matching evidence is scanned.`
      : 'Captured typography could not be normalized; preserve the raw visual value for manual target matching.',
  };
}

function collectColorTokenSources(sourceCode: string): string[] {
  const tokens = new Set<string>();
  for (const regex of [/var\(\s*(--[a-zA-Z0-9-_]+)/g, /(?<![\w-])(--color-[a-zA-Z0-9-_]+)/g]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sourceCode))) if (match[1]?.startsWith('--color-')) tokens.add(match[1]);
  }
  return [...tokens].sort();
}

function collectTypographyTokenSources(sourceCode: string): string[] {
  return [...new Set([...sourceCode.matchAll(/@include\s+([a-zA-Z0-9-_]+)/g)].map((match) => match[1]).filter((value): value is string => Boolean(value)))].sort();
}

function unresolvedToken(source: string, targetPlatform: TargetPlatform, reason: string): TokenMapping {
  return { source, targetPlatform, confidence: 'low', reason };
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
  return [...unresolved].map((source) => unresolvedToken(source, target, 'Runtime style requires a target-backed token match.'));
}

function normalizeColorValue(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) return `#${hex.length <= 4 ? hex.split('').map((part) => `${part}${part}`).join('') : hex}`;
  const rgb = trimmed.match(/^rgba?\(([^)]+)\)$/)?.[1]?.split(',').map((part) => Number.parseFloat(part.trim()));
  if (!rgb || rgb.length < 3 || rgb.slice(0, 3).some((part) => !Number.isFinite(part))) return undefined;
  const base = `#${rgb.slice(0, 3).map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, '0')).join('')}`;
  const alpha = rgb[3];
  return alpha === undefined || alpha >= 1 ? base : `${base}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}`;
}

function normalizeTypographyValue(value: string): string | undefined {
  const [fontSize, lineHeight, fontWeight] = value.split('/').map((part) => part.trim());
  return fontSize && lineHeight && fontWeight ? `${fontSize}/${lineHeight}/${fontWeight}` : undefined;
}

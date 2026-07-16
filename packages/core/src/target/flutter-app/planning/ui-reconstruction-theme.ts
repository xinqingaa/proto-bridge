import type {
  PageCanonical,
  ThemeMapping,
  ThemeMappingGroups,
  FlutterTargetConventionProfile,
} from '../../../types/index.js';
import { resolveFlutterColorTarget, resolveFlutterTypographyMixinTarget, resolveFlutterTypographyTarget } from '../theme-mapping.js';
import { dedupeBy } from './ui-reconstruction-shared.js';

export function buildThemeMappings(
  evidence: PageCanonical,
  targetConventions: FlutterTargetConventionProfile,
): ThemeMapping[] {
  const themeFamily = themeFallbackFamilies(targetConventions);
  const runtimeMappings = (evidence.tokens ?? []).slice(0, 80).map((token) => {
    const resolution = token.kind === 'typography'
      ? resolveFlutterTypographyTarget({ value: token.value })
      : token.kind === 'color'
        ? resolveFlutterColorTarget({
          cssVar: token.cssVar,
          value: token.value,
          source: token.source,
        })
        : undefined;
    const familyTarget = token.kind === 'typography'
      ? themeFamily.typography
      : token.kind === 'color'
        ? themeFamily.color
        : undefined;
    const target = supportedThemeTarget(resolution?.target, familyTarget, targetConventions);
    const candidateTargets = supportedThemeCandidates(resolution?.candidateTargets, targetConventions);
    const matchedBy = resolution?.target && !target ? 'manual' : resolution?.matchedBy ?? 'manual';
    const source = token.cssVar ? `${token.source} (${token.cssVar})` : token.source;
    return {
      kind: token.kind,
      source,
      value: token.value,
      authority: token.cssVar ? 'source-runtime-fact' : 'runtime-fact',
      ...(token.usage.length > 0 ? { nodeIds: token.usage.slice(0, 24) } : {}),
      ...(target ? { target } : {}),
      ...(candidateTargets.length ? { candidateTargets } : {}),
      matchedBy,
      confidence: target ? (resolution?.confidence ?? 'medium') : 'low',
      targetStatus: target?.endsWith('.*') ? 'family-only' : target ? 'candidate' : 'unresolved',
      nextAction: 'Preserve this observed value; select a B theme token only after comparing its definition and actual usage.',
      reason: target
        ? `Map evidence ${token.kind} signal to the closest detected target theme token during implementation.`
        : `No target-supported theme token family is inferred for ${token.kind}; confirm manually.`,
    } satisfies ThemeMapping;
  });
  const sourceMappings = (evidence.sourceFacts?.analysis.sfc?.styleTokens ?? []).slice(0, 80).map((token) => {
    const property = token.property.toLowerCase();
    const isTypography = token.kind === 'typography' || property.includes('font');
    const isColor = token.kind === 'color' || property.includes('color');
    const typographyResolution = isTypography && token.token.startsWith('@include ')
      ? resolveFlutterTypographyMixinTarget(token.token)
      : undefined;
    const colorResolution = isColor
      ? resolveFlutterColorTarget({
        cssVar: token.token,
        value: token.fallback ?? token.token,
        source: token.selector,
      })
      : undefined;
    const rawTarget = typographyResolution?.target ?? colorResolution?.target;
    const fallbackTarget = isTypography ? themeFamily.typography : isColor ? themeFamily.color : undefined;
    const target = supportedThemeTarget(rawTarget, fallbackTarget, targetConventions);
    const candidateTargets = supportedThemeCandidates(typographyResolution?.candidateTargets ?? colorResolution?.candidateTargets, targetConventions);
    const hasExactTypographyTarget = Boolean(isTypography && rawTarget === target && typographyResolution?.confidence === 'high');
    const lockToken = Boolean(hasExactTypographyTarget);
    return {
      kind: isTypography ? 'typography' : isColor ? 'color' : undefined,
      source: `${token.selector}.${token.property}`,
      ...(token.selector ? { sourceSelector: token.selector } : {}),
      ...(isTypography && token.token.startsWith('@include ') ? { sourceMixin: token.token.replace(/^@include\s+/, '') } : {}),
      value: token.fallback ?? token.token,
      authority: 'source-fact',
      ...(target ? { target } : {}),
      ...(candidateTargets.length ? { candidateTargets } : {}),
      matchedBy: rawTarget && !target ? 'manual' : typographyResolution?.matchedBy ?? colorResolution?.matchedBy ?? 'manual',
      confidence: target ? (typographyResolution?.confidence ?? colorResolution?.confidence ?? 'medium') : 'low',
      targetStatus: target?.endsWith('.*') ? 'family-only' : target ? 'candidate' : 'unresolved',
      nextAction: 'Use the source token and fallback as reconstruction evidence; let the implementation agent resolve the B-specific theme expression.',
      ...(lockToken ? { lockToken: true, doNotOverride: token.doNotOverride ?? ['fontSize', 'fontWeight', 'height', 'fontFamily'] } : {}),
      reason: lockToken
        ? `Source typography token ${token.token} is an exact semantic design token; generated Flutter must use ${target} without overriding fontSize, height, fontWeight, or fontFamily.`
        : `Source style token ${token.token} preserves semantic design intent; runtime computed style should still confirm final rendered value when available.`,
    } satisfies ThemeMapping;
  });
  return dedupeBy([...runtimeMappings, ...sourceMappings], (mapping) => `${mapping.source}:${mapping.value}`);
}

export function buildThemeMappingGroups(themeMappings: ThemeMapping[]): ThemeMappingGroups {
  const resolved: ThemeMapping[] = [];
  const candidates: ThemeMapping[] = [];
  const familyOnly: ThemeMapping[] = [];
  for (const mapping of themeMappings) {
    if (isFamilyOnlyThemeMapping(mapping)) {
      familyOnly.push(mapping);
      continue;
    }
    if (mapping.confidence === 'high' && (mapping.target || mapping.lockToken)) {
      resolved.push(mapping);
      continue;
    }
    candidates.push(mapping);
  }
  return { resolved, candidates, familyOnly };
}

function isFamilyOnlyThemeMapping(mapping: ThemeMapping): boolean {
  if (mapping.confidence === 'low') return true;
  if (!mapping.target) return true;
  return /\.\*$/.test(mapping.target);
}

function supportedThemeTarget(
  target: string | undefined,
  fallback: string | undefined,
  targetConventions: FlutterTargetConventionProfile,
): string | undefined {
  if (target && isThemeTargetSupported(target, targetConventions)) return target;
  return fallback;
}

function supportedThemeCandidates(
  targets: string[] | undefined,
  targetConventions: FlutterTargetConventionProfile,
): string[] {
  return (targets ?? []).filter((target) => isThemeTargetSupported(target, targetConventions));
}

function isThemeTargetSupported(target: string, targetConventions: FlutterTargetConventionProfile): boolean {
  const patterns = targetConventions.architectureProfile.theme.patterns;
  return patterns.some((pattern) => target.startsWith(pattern));
}

function themeFallbackFamilies(targetConventions: FlutterTargetConventionProfile): {
  color?: string | undefined;
  typography?: string | undefined;
} {
  const patterns = targetConventions.architectureProfile.theme.patterns;
  const colorAccess = patterns.find((pattern) => /(?:colors|colorScheme)$/.test(pattern));
  const typographyAccess = patterns.find((pattern) => /(?:textStyles|textTheme)$/.test(pattern));
  return {
    color: colorAccess
      ? `${colorAccess}.*`
      : patterns.includes('Theme.of(context)') ? 'Theme.of(context).colorScheme.*' : undefined,
    typography: typographyAccess
      ? `${typographyAccess}.*`
      : patterns.includes('Theme.of(context)') ? 'Theme.of(context).textTheme.*' : undefined,
  };
}

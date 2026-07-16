import type { PageCanonical, UiStyleFact } from '../../../types/index.js';
import { dedupeBy } from './ui-reconstruction-shared.js';

/**
 * Builds source/runtime style facts only. Mapping those facts to a target
 * project's theme vocabulary is deliberately left to the implementation agent.
 */
export function buildStyleFacts(evidence: PageCanonical): UiStyleFact[] {
  const runtimeFacts = (evidence.tokens ?? []).slice(0, 80).map((token) => ({
    kind: token.kind,
    source: token.cssVar ? `${token.source} (${token.cssVar})` : token.source,
    value: token.value,
    authority: token.cssVar ? 'source-runtime-fact' as const : 'runtime-fact' as const,
    ...(token.usage.length > 0 ? { nodeIds: token.usage.slice(0, 24) } : {}),
    confidence: 'high' as const,
  } satisfies UiStyleFact));

  const sourceFacts = (evidence.sourceFacts?.analysis.sfc?.styleTokens ?? []).slice(0, 80).map((token) => {
    const property = token.property.toLowerCase();
    const isTypography = token.kind === 'typography' || property.includes('font');
    const isColor = token.kind === 'color' || property.includes('color');
    const sourceMixin = isTypography && token.token.startsWith('@include ')
      ? token.token.replace(/^@include\s+/, '')
      : undefined;
    return {
      kind: isTypography ? 'typography' as const : isColor ? 'color' as const : undefined,
      source: `${token.selector}.${token.property}`,
      ...(token.selector ? { sourceSelector: token.selector } : {}),
      ...(sourceMixin ? { sourceMixin } : {}),
      value: token.fallback ?? token.token,
      authority: 'source-fact' as const,
      confidence: 'high' as const,
      ...(token.doNotOverride?.length ? { doNotOverride: token.doNotOverride } : {}),
    } satisfies UiStyleFact;
  });

  return dedupeBy([...runtimeFacts, ...sourceFacts], (fact) => `${fact.source}:${fact.value}`);
}

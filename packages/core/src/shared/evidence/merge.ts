import type { PageEvidence } from '../../types/index.js';
import type { PageEvidencePatch } from './types.js';

export function mergePageEvidence(base: PageEvidence, patch: PageEvidencePatch): PageEvidence {
  const mergedWarnings = dedupeStrings([...base.warnings, ...(patch.warnings ?? [])]);
  const mergedText = dedupeStrings([...base.text, ...(patch.text ?? [])]);
  const mergedAssets = dedupeBy([...base.assets, ...(patch.assets ?? [])], (item) => item.id);
  const mergedInteractions = dedupeBy(
    [...base.interactions, ...(patch.interactions ?? [])],
    (item) => item.id,
  );
  const mergedTokens = dedupeBy(
    [...(base.tokens ?? []), ...(patch.tokens ?? [])],
    (item) => `${item.kind}:${item.source}:${item.cssVar ?? item.value}`,
  );
  const mergedComponentHints = dedupeBy(
    [...(base.componentHints ?? []), ...(patch.componentHints ?? [])],
    (item) => `${item.kind}:${item.hint}`,
  );
  const mergedTabStates = dedupeBy(
    [...(base.tabStates ?? []), ...(patch.tabStates ?? [])],
    (item) => item.id,
  );
  const mergedProvenance = dedupeBy(
    [...base.provenance, ...(patch.provenance ?? [])],
    (item) => `${item.source}:${item.fields.join(',')}`,
  );

  return {
    ...base,
    ...(patch.page ? { page: { ...base.page, ...patch.page } } : {}),
    text: mergedText,
    assets: mergedAssets,
    interactions: mergedInteractions,
    ...(mergedTokens.length > 0 ? { tokens: mergedTokens } : {}),
    ...(mergedComponentHints.length > 0 ? { componentHints: mergedComponentHints } : {}),
    ...(mergedTabStates.length > 0 ? { tabStates: mergedTabStates } : {}),
    ...(patch.runtime ? { runtime: patch.runtime } : {}),
    ...(patch.ocr ? { ocr: patch.ocr } : {}),
    warnings: mergedWarnings,
    provenance: mergedProvenance,
  };
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function dedupeBy<T>(values: T[], keyOf: (value: T) => string): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const value of values) {
    const key = keyOf(value);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
}

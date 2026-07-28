import { z } from 'zod';
import { PbId, PbKey, ScreenId } from './ids.js';

/**
 * Fragment's formal identity is the owning Screen plus `pbId` and an
 * optional `pbKey` for repeated instances (pb-v2-spec.md "`data-pb-*`
 * Authoring Contract"). Runtime handles, DOM paths, CSS selectors and
 * array indices must never reach this shape; the strict object plus the
 * stable-id regex on `pbId`/`pbKey` rejects them structurally.
 */
export const FragmentRef = z
  .object({
    screenId: ScreenId,
    pbId: PbId,
    pbKey: PbKey.optional(),
  })
  .strict();
export type FragmentRef = z.infer<typeof FragmentRef>;

export function fragmentRefKey(ref: FragmentRef): string {
  return `${ref.screenId}#${ref.pbId}#${ref.pbKey ?? ''}`;
}

export function sortFragmentRefs(refs: readonly FragmentRef[]): FragmentRef[] {
  return [...refs].sort((a, b) => fragmentRefKey(a).localeCompare(fragmentRefKey(b)));
}

function dedupeFragmentRefs(refs: readonly FragmentRef[]): FragmentRef[] {
  const seen = new Map<string, FragmentRef>();
  for (const ref of refs) seen.set(fragmentRefKey(ref), ref);
  return sortFragmentRefs([...seen.values()]);
}

export function normalizeFragmentRefs(refs: readonly FragmentRef[]): FragmentRef[] {
  return dedupeFragmentRefs(refs);
}

export function fragmentSetIsSubsetOf(subset: readonly FragmentRef[], superset: readonly FragmentRef[]): boolean {
  const supersetKeys = new Set(superset.map(fragmentRefKey));
  return subset.every((ref) => supersetKeys.has(fragmentRefKey(ref)));
}

export function fragmentSetEquals(a: readonly FragmentRef[], b: readonly FragmentRef[]): boolean {
  return fragmentSetIsSubsetOf(a, b) && fragmentSetIsSubsetOf(b, a);
}

import { z } from 'zod';
import { FragmentRef, fragmentSetIsSubsetOf, normalizeFragmentRefs } from './fragment.js';
import { sha1Hex } from './hash-sha1.js';
import { CaptureInputMode, EvidenceLevel, evidenceLevelRank } from './vocabulary.js';
import { ScopeKey } from './ids.js';

/**
 * Screenshot capture requirement inside a Capture Scope. `all` and
 * `selected` are compared by set containment against `none`.
 */
export const ScreenshotScope = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({ mode: z.literal('selected'), targets: z.array(FragmentRef).min(1) })
    .strict(),
]);
export type ScreenshotScope = z.infer<typeof ScreenshotScope>;

/**
 * Raw, author-facing Capture Scope. Order and duplicates are not
 * significant; `normalizeCaptureScope` produces the canonical form used to
 * compute `scopeKey` (pb-v2-spec.md "Capture Scope 与 active ref 解析").
 */
export const CaptureScopeInput = z
  .object({
    fragments: z.array(FragmentRef).default([]),
    screenshots: ScreenshotScope.default({ mode: 'none' }),
    sourcePolicy: z.boolean().default(false),
    debugPolicy: z.boolean().default(false),
    evidenceInputMode: CaptureInputMode,
    minEvidenceLevel: EvidenceLevel,
  })
  .strict();
export type CaptureScopeInput = z.infer<typeof CaptureScopeInput>;

export const NormalizedCaptureScope = CaptureScopeInput.extend({
  fragments: z.array(FragmentRef),
});
export type NormalizedCaptureScope = z.infer<typeof NormalizedCaptureScope>;

function normalizeScreenshotScope(scope: ScreenshotScope): ScreenshotScope {
  if (scope.mode !== 'selected') return scope;
  return { mode: 'selected', targets: normalizeFragmentRefs(scope.targets) };
}

/** Empty `fragments` means the scope is not restricted to a Fragment subset, i.e. it can be a primary/full Case Scope candidate. */
export function isFullCaseScope(scope: NormalizedCaptureScope): boolean {
  return scope.fragments.length === 0;
}

export function normalizeCaptureScope(input: CaptureScopeInput): NormalizedCaptureScope {
  return {
    fragments: normalizeFragmentRefs(input.fragments),
    screenshots: normalizeScreenshotScope(input.screenshots),
    sourcePolicy: input.sourcePolicy,
    debugPolicy: input.debugPolicy,
    evidenceInputMode: input.evidenceInputMode,
    minEvidenceLevel: input.minEvidenceLevel,
  };
}

const CAPTURE_INPUT_MODE_RANK: Record<CaptureInputMode, number> = {
  'screenshot-only': 0,
  'generic-runtime': 1,
  instrumented: 2,
};

function screenshotScopeCovers(a: ScreenshotScope, b: ScreenshotScope): boolean {
  if (b.mode === 'none') return true;
  if (a.mode === 'all') return true;
  if (a.mode === 'none') return false;
  if (b.mode === 'all') return false;
  // both 'selected'
  return fragmentSetIsSubsetOf(b.targets, a.targets);
}

/**
 * `a` covers `b` when anything captured under `a` also satisfies what `b`
 * asked for: `a`'s fragments are a superset (or `a` is unrestricted),
 * `a`'s screenshot/source/debug/evidence guarantees are at least as strong.
 */
export function scopeCovers(a: NormalizedCaptureScope, b: NormalizedCaptureScope): boolean {
  const fragmentsCovered = a.fragments.length === 0 || fragmentSetIsSubsetOf(b.fragments, a.fragments);
  if (!fragmentsCovered) return false;
  if (!screenshotScopeCovers(a.screenshots, b.screenshots)) return false;
  if (a.sourcePolicy !== true && b.sourcePolicy === true) return false;
  if (a.debugPolicy !== true && b.debugPolicy === true) return false;
  if (CAPTURE_INPUT_MODE_RANK[a.evidenceInputMode] < CAPTURE_INPUT_MODE_RANK[b.evidenceInputMode]) return false;
  if (evidenceLevelRank(a.minEvidenceLevel) < evidenceLevelRank(b.minEvidenceLevel)) return false;
  return true;
}

export function scopeEquals(a: NormalizedCaptureScope, b: NormalizedCaptureScope): boolean {
  return scopeCovers(a, b) && scopeCovers(b, a);
}

function canonicalScreenshotScope(scope: ScreenshotScope): unknown {
  if (scope.mode !== 'selected') return { mode: scope.mode };
  return { mode: 'selected', targets: normalizeFragmentRefs(scope.targets) };
}

/**
 * Deterministic across reordering, duplicates and default values. Never
 * hand-authored (pb-v2-spec.md 要求 Core 建立唯一规范化表示和稳定 `scopeKey`).
 */
export function computeScopeKey(scope: NormalizedCaptureScope): ScopeKey {
  const canonical = {
    fragments: scope.fragments.map((ref) => ({ screenId: ref.screenId, pbId: ref.pbId, pbKey: ref.pbKey ?? null })),
    screenshots: canonicalScreenshotScope(scope.screenshots),
    sourcePolicy: scope.sourcePolicy,
    debugPolicy: scope.debugPolicy,
    evidenceInputMode: scope.evidenceInputMode,
    minEvidenceLevel: scope.minEvidenceLevel,
  };
  const digest = sha1Hex(JSON.stringify(canonical)).slice(0, 16);
  return `scope_${digest}` as ScopeKey;
}

import type { CaseKey } from '../../contracts/case.js';
import { computeCaseId } from '../../contracts/case.js';
import type { CaptureScopeInput, NormalizedCaptureScope } from '../../contracts/scope.js';
import { computeScopeKey, normalizeCaptureScope } from '../../contracts/scope.js';
import type { FragmentRef } from '../../contracts/fragment.js';

/**
 * Single golden Evidence vertical slice (synthetic IDs, not a live prototype).
 * Prototype `sample`, Screen `sample.task-list`, Variant `default`,
 * Theme `light`, Device `iphone-14`, no Scenario.
 * See packages/core/src/v2/fixtures/README.md and docs/pbwork/development.md §9.
 */
export const WORKSPACE_ID = 'local-workspace';
export const PROTOTYPE_ID = 'sample';
export const SCREEN_ID = 'sample.task-list';
export const VARIANT_ID = 'default';
export const THEME_ID = 'light';
export const FIXTURE_THEME_PACK = {
  packId: 'sample-pack',
  packDigest: `sha1:${'a'.repeat(40)}`,
  theme: 'default',
  mode: 'light',
} as const;
export const FIXTURE_CLOCK = {
  now: '2026-07-28T00:00:00.000Z',
  timeZone: 'Asia/Shanghai',
} as const;
export const FIXTURE_THEME_MANIFEST = {
  packId: FIXTURE_THEME_PACK.packId,
  packDigest: FIXTURE_THEME_PACK.packDigest,
  keyCatalogDigest: `sha1:${'b'.repeat(40)}`,
  themes: ['default'],
  defaultTheme: 'default',
  modes: ['light', 'dark'],
  defaultMode: 'light',
} as const;
export const DEVICE_ID = 'iphone-14';
export const BUNDLE_ID = 'sample.default';
export const FIXTURE_THEME_PACK_CATALOG = {
  schemaVersion: 1,
  catalogRevisionId: 'catalog-sample-theme-pack',
  workspaceId: WORKSPACE_ID,
  bundleId: BUNDLE_ID,
  prototypeId: PROTOTYPE_ID,
  kind: 'theme-pack' as const,
  inputDigest: FIXTURE_THEME_PACK.packDigest,
  createdAt: '2026-07-28T00:00:00.000Z',
  entries: (['light', 'dark'] as const).map((mode) => ({
    objectId: `${FIXTURE_THEME_PACK.packId}/${FIXTURE_THEME_PACK.theme}/${mode}`,
    digest: FIXTURE_THEME_PACK.packDigest,
    value: {
      values: { 'color.primary': mode === 'light' ? '#111111' : '#eeeeee' },
      provenance: {
        'color.primary': {
          sourcePackId: FIXTURE_THEME_PACK.packId,
          chain: ['color.primary'],
          inherited: false,
        },
      },
    },
    blobIds: [],
  })),
};

export const TASK_LIST_CASE_KEY: CaseKey = {
  screenId: SCREEN_ID,
  variantId: VARIANT_ID,
  themeId: THEME_ID,
  deviceId: DEVICE_ID,
};
export const TASK_LIST_CASE_ID = computeCaseId(TASK_LIST_CASE_KEY);

export const TASK_LIST_ROOT_FRAGMENT: FragmentRef = { screenId: SCREEN_ID, pbId: 'sample.task-list.root' };
export const TASK_LIST_LIST_FRAGMENT: FragmentRef = { screenId: SCREEN_ID, pbId: 'sample.task-list.list' };

const FULL_CASE_SCOPE_INPUT: CaptureScopeInput = {
  fragments: [],
  screenshots: { mode: 'all' },
  sourcePolicy: true,
  debugPolicy: false,
  evidenceInputMode: 'instrumented',
  minEvidenceLevel: 'instrumented-source-runtime',
};
export const FULL_CASE_SCOPE: NormalizedCaptureScope = normalizeCaptureScope(FULL_CASE_SCOPE_INPUT);
export const FULL_CASE_SCOPE_KEY = computeScopeKey(FULL_CASE_SCOPE);

const LIST_FRAGMENT_SCOPE_INPUT: CaptureScopeInput = {
  fragments: [TASK_LIST_LIST_FRAGMENT],
  screenshots: { mode: 'selected', targets: [TASK_LIST_LIST_FRAGMENT] },
  sourcePolicy: false,
  debugPolicy: false,
  evidenceInputMode: 'instrumented',
  minEvidenceLevel: 'instrumented-runtime',
};
export const LIST_FRAGMENT_SCOPE: NormalizedCaptureScope = normalizeCaptureScope(LIST_FRAGMENT_SCOPE_INPUT);
export const LIST_FRAGMENT_SCOPE_KEY = computeScopeKey(LIST_FRAGMENT_SCOPE);

export const T0 = '2026-07-28T09:00:00.000Z';
export const T1 = '2026-07-28T09:05:00.000Z';
export const T2 = '2026-07-28T10:00:00.000Z';

import type { CaseKey } from '../../contracts/case.js';
import { computeCaseId } from '../../contracts/case.js';
import type { CaptureScopeInput, NormalizedCaptureScope } from '../../contracts/scope.js';
import { computeScopeKey, normalizeCaptureScope } from '../../contracts/scope.js';
import type { FragmentRef } from '../../contracts/fragment.js';

/**
 * Reference vertical slice fixed by pb-v2-implementation-guide.md "先垂直切片，再扩全量对象":
 * Prototype `project`, Screen `project.task-list`, Variant `default`,
 * Theme `light`, Device `iphone-14`, no Scenario.
 */
export const WORKSPACE_ID = 'local-workspace';
export const PROTOTYPE_ID = 'project';
export const SCREEN_ID = 'project.task-list';
export const VARIANT_ID = 'default';
export const THEME_ID = 'light';
export const DEVICE_ID = 'iphone-14';
export const BUNDLE_ID = 'project.default';

export const TASK_LIST_CASE_KEY: CaseKey = {
  screenId: SCREEN_ID,
  variantId: VARIANT_ID,
  themeId: THEME_ID,
  deviceId: DEVICE_ID,
};
export const TASK_LIST_CASE_ID = computeCaseId(TASK_LIST_CASE_KEY);

export const TASK_LIST_ROOT_FRAGMENT: FragmentRef = { screenId: SCREEN_ID, pbId: 'project.task-list.root' };
export const TASK_LIST_LIST_FRAGMENT: FragmentRef = { screenId: SCREEN_ID, pbId: 'project.task-list.list' };

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

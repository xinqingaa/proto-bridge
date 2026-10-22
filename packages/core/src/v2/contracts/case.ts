import { z } from 'zod';
import {
  CaseId,
  CheckpointId,
  DeviceId,
  ScenarioId,
  ScreenId,
  ThemeId,
  VariantId,
  STABLE_ID_PATTERN,
} from './ids.js';

/**
 * Scenario can cross Screens; the owner Screen must always travel with the
 * reference so identically named Scenarios in different Screens cannot
 * collide (pb-v2-spec.md "稳定身份").
 */
export const ScenarioRef = z
  .object({
    ownerScreenId: ScreenId,
    scenarioId: ScenarioId,
    checkpointId: CheckpointId,
  })
  .strict();
export type ScenarioRef = z.infer<typeof ScenarioRef>;

/**
 * Reserved, explicit stand-ins for dimensions that generic-runtime or
 * screenshot-only input cannot resolve. Never an empty string or `null`
 * (pb-v2-spec.md "所有输入模式在 Preflight 后都必须得到完整 Case 维度").
 */
export const RESERVED_VARIANT_ID: VariantId = 'unspecified';
export const RESERVED_THEME_ID: ThemeId = 'unspecified';
export const RESERVED_DEVICE_ID: DeviceId = 'unspecified';

/**
 * Case identity: Screen, Variant, mode (`themeId`), Device, plus an optional
 * Scenario Checkpoint. `themeId` is the mode id (`light` / `dark`), not the
 * named theme. New Cases carry `theme`; its absence preserves legacy identities.
 * Capture Scope is deliberately excluded
 * (pb-v2-spec.md "核心对象与关系").
 */
export const CaseKey = z
  .object({
    screenId: ScreenId,
    variantId: VariantId,
    themeId: ThemeId,
    theme: ThemeId.optional(),
    deviceId: DeviceId,
    scenario: ScenarioRef.optional(),
  })
  .strict();
export type CaseKey = z.infer<typeof CaseKey>;

/**
 * Deterministic, readable composite of already-stable dimension ids. Not a
 * hash: identity should stay legible for debugging and audit.
 */
export function computeCaseId(caseKey: CaseKey): CaseId {
  const base = `${caseKey.screenId}::${caseKey.variantId}::${caseKey.themeId}::${caseKey.deviceId}`;
  const scenario = caseKey.scenario;
  const suffix = scenario
    ? `::scenario=${scenario.ownerScreenId}.${scenario.scenarioId}@${scenario.checkpointId}`
    : '';
  const namedTheme = caseKey.theme ? `::theme=${caseKey.theme}` : '';
  return `${base}${namedTheme}${suffix}` as CaseId;
}

export function caseKeyEquals(a: CaseKey, b: CaseKey): boolean {
  return computeCaseId(a) === computeCaseId(b);
}

/** Read-only display projection; the Scenario ref stays intact (authored IDs may contain dots). */
export function readCaseIdParts(caseId: string):
  | (Omit<CaseKey, 'scenario'> & {
      scenario?: { ref: string; checkpointId: string };
    })
  | null {
  if (!CaseId.safeParse(caseId).success) return null;
  const [screenId, variantId, themeId, deviceId, ...qualifiers] =
    caseId.split('::');
  const parsed = CaseKey.safeParse({ screenId, variantId, themeId, deviceId });
  if (!parsed.success) return null;
  const result: NonNullable<ReturnType<typeof readCaseIdParts>> = {
    screenId: parsed.data.screenId,
    variantId: parsed.data.variantId,
    themeId: parsed.data.themeId,
    deviceId: parsed.data.deviceId,
  };
  for (const qualifier of qualifiers) {
    if (qualifier.startsWith('theme=') && !result.theme) {
      const theme = ThemeId.safeParse(qualifier.slice('theme='.length));
      if (!theme.success) return null;
      result.theme = theme.data;
    } else if (qualifier.startsWith('scenario=') && !result.scenario) {
      const [ref, checkpointId, extra] = qualifier
        .slice('scenario='.length)
        .split('@');
      if (
        extra !== undefined ||
        !ref ||
        !checkpointId ||
        !STABLE_ID_PATTERN.test(ref) ||
        !CheckpointId.safeParse(checkpointId).success
      )
        return null;
      result.scenario = { ref, checkpointId };
    } else return null;
  }
  return result;
}

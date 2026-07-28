import { z } from 'zod';
import { CaseId, CheckpointId, DeviceId, ScenarioId, ScreenId, ThemeId, VariantId } from './ids.js';

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
 * Case identity: Screen, Variant, Theme, Device, plus an optional Scenario
 * Checkpoint. Capture Scope (Fragment/Screenshot/Source/Debug/Evidence
 * Level) is deliberately excluded (pb-v2-spec.md "核心对象与关系").
 */
export const CaseKey = z
  .object({
    screenId: ScreenId,
    variantId: VariantId,
    themeId: ThemeId,
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
  const suffix = scenario ? `::scenario=${scenario.ownerScreenId}.${scenario.scenarioId}@${scenario.checkpointId}` : '';
  return `${base}${suffix}` as CaseId;
}

export function caseKeyEquals(a: CaseKey, b: CaseKey): boolean {
  return computeCaseId(a) === computeCaseId(b);
}

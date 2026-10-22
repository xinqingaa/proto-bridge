import { V2ContractError } from '../contracts/errors.js';
import type { RuntimeAppearanceEvidence, RuntimeCaptureManifest } from './protocol.js';

const combination = (theme: string | undefined, mode: string) => `${theme}/${mode}`;

export function validateRuntimeAppearanceRules(manifest: {
  theme: Pick<RuntimeCaptureManifest['theme'], 'themes' | 'modes'>;
  screens: Array<{
    screenId: string;
    variants: Array<{ variantId: string }>;
    scenarios: Array<{ scenarioId: string }>;
    appearanceEvidence?: RuntimeAppearanceEvidence | undefined;
  }>;
}): void {
  const knownAppearances = new Set(manifest.theme.themes.flatMap((theme) =>
    manifest.theme.modes.map((mode) => combination(theme, mode))));
  for (const screen of manifest.screens) {
    const ids = new Set<string>();
    const covered = new Set<string>();
    for (const rule of screen.appearanceEvidence?.rules ?? []) {
      const invalid = (detail: string): never => {
        throw new V2ContractError('invalid-schema', `Appearance rule ${screen.screenId}/${rule.ruleId}: ${detail}`);
      };
      if (ids.has(rule.ruleId)) invalid('duplicate rule identity.');
      ids.add(rule.ruleId);
      for (const variant of [...rule.variantIds, ...rule.representativeVariantIds]) {
        if (!screen.variants.some((item) => item.variantId === variant)) invalid(`unknown Variant ${variant}.`);
      }
      for (const scenario of rule.scenarioIds) {
        if (!screen.scenarios.some((item) => item.scenarioId === scenario)) invalid(`unknown Scenario ${scenario}.`);
      }
      for (const key of [...rule.variantIds.map((id) => `variant:${id}`), ...rule.scenarioIds.map((id) => `scenario:${id}`)]) {
        if (covered.has(key)) invalid(`ambiguous or duplicate coverage of ${key}.`);
        covered.add(key);
      }
      if (rule.observations.length && !rule.representativeVariantIds.length) invalid('observations require representative Variants.');
      for (const item of rule.observations) {
        if (!knownAppearances.has(combination(item.theme, item.mode))) invalid(`unknown appearance ${item.theme}/${item.mode}.`);
      }
    }
  }
}


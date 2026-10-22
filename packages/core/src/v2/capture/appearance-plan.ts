import { CapturePlan, type CapturePurpose, type SelectedCase } from '../contracts/run.js';
import { computeScopeKey } from '../contracts/scope.js';
import { validateRuntimeAppearanceRules } from '../runtime-contract/appearance-rules.js';
import type { RuntimeCaptureManifest } from '../runtime-contract/index.js';
import type { CaseMatrixEntry } from './selection.js';

const dimensions = ['structure', 'components', 'bindings', 'resources', 'layout'] as const;
const identity = (item: SelectedCase) => `${item.caseId}#${computeScopeKey(item.captureScope)}`;

/** Business identity deliberately preserves Scenario/checkpoint and Capture Scope. */
function businessIdentity(item: SelectedCase): string {
  const { theme: _theme, themeId: _mode, ...business } = item.caseKey;
  return JSON.stringify([business, computeScopeKey(item.captureScope)]);
}


/**
 * Select actual observations before opening the browser. Authored usage rules
 * establish derivation scope, never measured geometry or unseen pixel results.
 * Unknown/local/fragment dependencies retain the full affected Case matrix.
 */
export function planAppearanceObservations(
  entries: CaseMatrixEntry[],
  manifest: RuntimeCaptureManifest,
  purpose: CapturePurpose,
): { matrix: CaseMatrixEntry[]; plan: CapturePlan } {
  validateRuntimeAppearanceRules(manifest);
  const baseline = { theme: manifest.theme.defaultTheme, mode: manifest.theme.defaultMode };
  const base = new Map(entries.filter(({ selectedCase: item }) =>
    item.caseKey.theme === baseline.theme && item.caseKey.themeId === baseline.mode,
  ).map((entry) => [businessIdentity(entry.selectedCase), entry]));
  const selected = new Map<string, CapturePlan['observations'][number]>();
  const provisional: CapturePlan['derivations'] = [];
  const rules = new Map<string, CapturePlan['rules'][number]>();
  const reference = (item: SelectedCase) => ({ caseId: item.caseId, scopeKey: computeScopeKey(item.captureScope) });
  const observe = (entry: CaseMatrixEntry, reason: CapturePlan['observations'][number]['reason']) => {
    const key = identity(entry.selectedCase);
    if (!selected.has(key)) selected.set(key, { selectedCase: entry.selectedCase, reason });
  };
  for (const entry of base.values()) observe(entry, 'baseline');
  for (const entry of entries) {
    const item = entry.selectedCase;
    if (selected.get(identity(item))?.reason === 'baseline') continue;
    if (purpose === 'appearance-audit') { observe(entry, 'audit'); continue; }
    const owner = item.caseKey.scenario?.ownerScreenId ?? item.caseKey.screenId;
    const screen = manifest.screens.find((candidate) => candidate.screenId === owner);
    const rule = screen?.appearanceEvidence?.rules.find((candidate) => item.caseKey.scenario
      ? candidate.scenarioIds.includes(item.caseKey.scenario.scenarioId)
      : candidate.variantIds.includes(item.caseKey.variantId));
    const baselineEntry = base.get(businessIdentity(item));
    if (!manifest.sourceDigest || !rule || !baselineEntry || owner !== item.caseKey.screenId ||
      item.captureScope.fragments.length || item.captureScope.screenshots.mode !== 'all' ||
      item.captureScope.evidenceInputMode !== 'instrumented' ||
      !dimensions.every((dimension) => rule.dimensions.includes(dimension))) {
      observe(entry, 'fallback'); continue;
    }
    const representatives: CaseMatrixEntry[] = [];
    let missing = false;
    for (const appearance of rule.observations) {
      for (const variantId of rule.representativeVariantIds) {
        const representative = entries.find(({ selectedCase: candidate }) =>
          !candidate.caseKey.scenario && candidate.caseKey.screenId === owner &&
          candidate.caseKey.variantId === variantId && candidate.caseKey.deviceId === item.caseKey.deviceId &&
          candidate.caseKey.theme === appearance.theme && candidate.caseKey.themeId === appearance.mode &&
          computeScopeKey(candidate.captureScope) === computeScopeKey(item.captureScope));
        if (representative) representatives.push(representative);
        else missing = true;
      }
    }
    if (missing) { observe(entry, 'fallback'); continue; }
    for (const representative of representatives) observe(representative, 'representative');
    const ruleKey = `${owner}::${rule.ruleId}::${item.caseKey.deviceId}::${computeScopeKey(item.captureScope)}`;
    rules.set(ruleKey, {
      ruleKey,
      ruleScreenId: owner,
      ruleId: rule.ruleId,
      rationale: rule.rationale,
      dimensions: [...rule.dimensions],
      representatives: [...new Map(representatives.map((representative) =>
        [identity(representative.selectedCase), reference(representative.selectedCase)])).values()],
    });
    provisional.push({
      selectedCase: item,
      baseline: reference(baselineEntry.selectedCase),
      ruleKey,
      pixels: 'unobserved',
    });
  }
  const matrix = entries.filter((entry) => selected.has(identity(entry.selectedCase)));
  const derivations = provisional.filter((entry) => !selected.has(identity(entry.selectedCase)));
  const usedRules = new Set(derivations.map((entry) => entry.ruleKey));
  const plan = CapturePlan.parse({
    version: 1, purpose, inputVersion: manifest.inputVersion,
    ...(manifest.sourceDigest ? { sourceDigest: manifest.sourceDigest } : {}),
    baseline, fullCaseCount: entries.length,
    businessCases: [...base.values()].map((entry) => entry.selectedCase),
    observations: matrix.map((entry) => selected.get(identity(entry.selectedCase))!),
    rules: [...rules.values()].filter((rule) => usedRules.has(rule.ruleKey)).sort((a, b) => a.ruleKey.localeCompare(b.ruleKey)),
    derivations,
  });
  return { matrix, plan };
}

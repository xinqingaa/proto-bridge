import { z } from 'zod';
import { CaseKey, computeCaseId } from '../contracts/case.js';
import {
  DeviceId,
  IssueId,
  PrototypeId,
  ScenarioId,
  ScreenId,
  ThemeId,
  VariantId,
} from '../contracts/ids.js';
import {
  CaptureScopeInput,
  normalizeCaptureScope,
} from '../contracts/scope.js';
import type { NormalizedSelection, SelectedCase } from '../contracts/run.js';
import type {
  RuntimeCaptureManifest,
  RuntimeCheckpointManifest,
  RuntimeScenarioManifest,
  RuntimeScreenManifest,
} from '../runtime-contract/index.js';
import { V2ContractError, unknownReferenceError } from '../contracts/errors.js';
import { assertSelectionReferences } from '../resolver/references.js';
import { resolveCaptureDevice } from './devices.js';

export const VariantSelection = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('default') }).strict(),
  z.object({ mode: z.literal('critical') }).strict(),
  z.object({ mode: z.literal('default-and-critical') }).strict(),
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({
      mode: z.literal('explicit'),
      variantIds: z.array(VariantId).min(1),
    })
    .strict(),
]);
export type VariantSelection = z.infer<typeof VariantSelection>;

export const ScenarioSelection = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z.object({ mode: z.literal('critical') }).strict(),
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({
      mode: z.literal('explicit'),
      scenarioIds: z.array(ScenarioId).min(1),
    })
    .strict(),
]);
export type ScenarioSelection = z.infer<typeof ScenarioSelection>;

export const ScreenSelectionDraft = z
  .object({
    screenId: ScreenId,
    variants: VariantSelection,
    themeIds: z.array(ThemeId).min(1),
    deviceIds: z.array(DeviceId).min(1),
    scenarios: ScenarioSelection.default({ mode: 'none' }),
    captureScope: CaptureScopeInput,
  })
  .strict();
export type ScreenSelectionDraft = z.infer<typeof ScreenSelectionDraft>;

export const SelectionDraft = z
  .object({
    prototypeId: PrototypeId,
    screens: z.array(ScreenSelectionDraft).min(1),
    acceptedWarningIds: z.array(IssueId).default([]),
  })
  .strict();
export type SelectionDraft = z.infer<typeof SelectionDraft>;

export type CaseMatrixScenario = {
  scenario: RuntimeScenarioManifest;
  checkpoint: RuntimeCheckpointManifest;
};

export type CaseMatrixEntry = {
  selectedCase: SelectedCase;
  runtimePath: string;
  initialScreenId: string;
  initialVariantId: string;
  scenario?: CaseMatrixScenario;
};

export type ResolvedSelectionMatrix = {
  selection: NormalizedSelection;
  matrix: CaseMatrixEntry[];
};

/**
 * Rebuilds an explicit Draft from persisted Case/Scope identities. Retry and
 * stale-recapture entry points use this helper so CLI and Local Service do not
 * invent separate grouping semantics.
 */
export function selectionDraftFromSelectedCases(
  prototypeId: string,
  cases: SelectedCase[],
): SelectionDraft {
  const groups = new Map<
    string,
    {
      screenId: string;
      themeId: string;
      deviceId: string;
      captureScope: SelectedCase['captureScope'];
      variantIds: Set<string>;
      scenarioIds: Set<string>;
    }
  >();
  for (const selected of cases) {
    const scenario = selected.caseKey.scenario;
    const screenId = scenario?.ownerScreenId ?? selected.caseKey.screenId;
    const key = JSON.stringify({
      screenId,
      themeId: selected.caseKey.themeId,
      deviceId: selected.caseKey.deviceId,
      captureScope: selected.captureScope,
    });
    const group = groups.get(key) ?? {
      screenId,
      themeId: selected.caseKey.themeId,
      deviceId: selected.caseKey.deviceId,
      captureScope: selected.captureScope,
      variantIds: new Set<string>(),
      scenarioIds: new Set<string>(),
    };
    if (scenario) group.scenarioIds.add(scenario.scenarioId);
    else group.variantIds.add(selected.caseKey.variantId);
    groups.set(key, group);
  }
  return SelectionDraft.parse({
    prototypeId,
    screens: [...groups.values()].map((group) => ({
      screenId: group.screenId,
      variants:
        group.variantIds.size > 0
          ? {
              mode: 'explicit' as const,
              variantIds: [...group.variantIds],
            }
          : { mode: 'default' as const },
      themeIds: [group.themeId],
      deviceIds: [group.deviceId],
      scenarios:
        group.scenarioIds.size > 0
          ? {
              mode: 'explicit' as const,
              scenarioIds: [...group.scenarioIds],
            }
          : { mode: 'none' as const },
      captureScope: group.captureScope,
    })),
    acceptedWarningIds: [],
  });
}

function requireScreen(
  manifest: RuntimeCaptureManifest,
  prototypeId: string,
  screenId: string,
): RuntimeScreenManifest {
  const screen = manifest.screens.find(
    (candidate) =>
      candidate.prototypeId === prototypeId && candidate.screenId === screenId,
  );
  if (!screen) throw unknownReferenceError('Runtime Screen manifest', screenId);
  return screen;
}

function selectedVariantIds(
  screen: RuntimeScreenManifest,
  selection: VariantSelection,
): string[] {
  const critical = screen.variants
    .filter((variant) => variant.critical)
    .map((variant) => variant.variantId);
  let values: string[];
  switch (selection.mode) {
    case 'default':
      values = [screen.defaultVariantId];
      break;
    case 'critical':
      values = critical;
      break;
    case 'default-and-critical':
      values = [screen.defaultVariantId, ...critical];
      break;
    case 'all':
      values = screen.variants.map((variant) => variant.variantId);
      break;
    case 'explicit':
      values = selection.variantIds;
      break;
  }
  const known = new Set(screen.variants.map((variant) => variant.variantId));
  for (const value of values) {
    if (!known.has(value))
      throw unknownReferenceError('Runtime Variant manifest', value);
  }
  return [...new Set(values)].sort();
}

function selectedScenarios(
  screen: RuntimeScreenManifest,
  selection: ScenarioSelection,
): RuntimeScenarioManifest[] {
  if (selection.mode === 'none') return [];
  const values =
    selection.mode === 'all'
      ? screen.scenarios
      : selection.mode === 'critical'
        ? screen.scenarios.filter((scenario) => scenario.critical)
        : selection.scenarioIds.map((scenarioId) => {
            const scenario = screen.scenarios.find(
              (candidate) => candidate.scenarioId === scenarioId,
            );
            if (!scenario)
              throw unknownReferenceError(
                'Runtime Scenario manifest',
                scenarioId,
              );
            return scenario;
          });
  return [
    ...new Map(
      values.map((scenario) => [scenario.scenarioId, scenario]),
    ).values(),
  ].sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
}

function makeEntry(input: {
  caseKey: CaseKey;
  captureScope: ScreenSelectionDraft['captureScope'];
  runtimePath: string;
  initialScreenId: string;
  initialVariantId: string;
  scenario?: CaseMatrixScenario;
}): CaseMatrixEntry {
  const normalizedScope = normalizeCaptureScope(input.captureScope);
  return {
    selectedCase: {
      caseId: computeCaseId(input.caseKey),
      caseKey: input.caseKey,
      captureScope: normalizedScope,
    },
    runtimePath: input.runtimePath,
    initialScreenId: input.initialScreenId,
    initialVariantId: input.initialVariantId,
    ...(input.scenario ? { scenario: input.scenario } : {}),
  };
}

/**
 * The one Core-owned resolver used by future PBWork and CLI entry points.
 * It expands authored strategies into a stable, fully-dimensional Case
 * Matrix and then derives the persisted NormalizedSelection from it.
 */
export function resolveSelectionMatrix(
  rawDraft: SelectionDraft,
  manifest: RuntimeCaptureManifest,
): ResolvedSelectionMatrix {
  const draft = SelectionDraft.parse(rawDraft);
  const entries: CaseMatrixEntry[] = [];

  for (const screenDraft of [...draft.screens].sort((a, b) =>
    a.screenId.localeCompare(b.screenId),
  )) {
    const screen = requireScreen(
      manifest,
      draft.prototypeId,
      screenDraft.screenId,
    );
    const variants = selectedVariantIds(screen, screenDraft.variants);
    const themes = [...new Set(screenDraft.themeIds)].sort();
    const devices = [...new Set(screenDraft.deviceIds)].sort();
    devices.forEach((deviceId) => resolveCaptureDevice(deviceId));

    for (const variantId of variants) {
      for (const themeId of themes) {
        for (const deviceId of devices) {
          entries.push(
            makeEntry({
              caseKey: {
                screenId: screen.screenId,
                variantId,
                themeId,
                deviceId,
              },
              captureScope: screenDraft.captureScope,
              runtimePath: screen.path,
              initialScreenId: screen.screenId,
              initialVariantId: variantId,
            }),
          );
        }
      }
    }

    for (const scenario of selectedScenarios(screen, screenDraft.scenarios)) {
      for (const checkpoint of [...scenario.checkpoints].sort((a, b) =>
        a.checkpointId.localeCompare(b.checkpointId),
      )) {
        const checkpointScreen = requireScreen(
          manifest,
          draft.prototypeId,
          checkpoint.screenId,
        );
        if (
          !checkpointScreen.variants.some(
            (variant) => variant.variantId === checkpoint.variantId,
          )
        ) {
          throw unknownReferenceError(
            'Scenario checkpoint Variant manifest',
            checkpoint.variantId,
          );
        }
        for (const themeId of themes) {
          for (const deviceId of devices) {
            const scenarioScope = {
              ...screenDraft.captureScope,
              // Fragment identities authored for the initial Screen cannot
              // silently constrain a cross-Screen checkpoint.
              fragments:
                checkpoint.screenId === screen.screenId
                  ? screenDraft.captureScope.fragments
                  : [],
              screenshots:
                screenDraft.captureScope.screenshots.mode === 'none'
                  ? { mode: 'none' as const }
                  : { mode: 'all' as const },
            };
            entries.push(
              makeEntry({
                caseKey: {
                  screenId: checkpoint.screenId,
                  variantId: checkpoint.variantId,
                  themeId,
                  deviceId,
                  scenario: {
                    ownerScreenId: scenario.ownerScreenId,
                    scenarioId: scenario.scenarioId,
                    checkpointId: checkpoint.checkpointId,
                  },
                },
                captureScope: scenarioScope,
                runtimePath: screen.path,
                initialScreenId: screen.screenId,
                initialVariantId: scenario.initialVariantId,
                scenario: { scenario, checkpoint },
              }),
            );
          }
        }
      }
    }
  }

  entries.sort((a, b) => {
    const byCase = a.selectedCase.caseId.localeCompare(b.selectedCase.caseId);
    if (byCase !== 0) return byCase;
    return JSON.stringify(a.selectedCase.captureScope).localeCompare(
      JSON.stringify(b.selectedCase.captureScope),
    );
  });
  const seen = new Set<string>();
  for (const entry of entries) {
    const identity = `${entry.selectedCase.caseId}#${JSON.stringify(entry.selectedCase.captureScope)}`;
    if (seen.has(identity)) {
      throw new V2ContractError(
        'invalid-schema',
        `Selection expands to duplicate Case/Scope ${entry.selectedCase.caseId}.`,
      );
    }
    seen.add(identity);
  }
  const selection = {
    prototypeId: draft.prototypeId,
    cases: entries.map((entry) => entry.selectedCase),
    acceptedWarningIds: [...new Set(draft.acceptedWarningIds)].sort(),
  };
  assertSelectionReferences(selection);
  return { selection, matrix: entries };
}

import { createHash } from 'node:crypto';
import type { RuntimeCaptureManifest } from '../runtime-contract/index.js';
import type { NormalizedSelection } from '../contracts/run.js';
import { V2ContractError } from '../contracts/errors.js';
import type { CaseMatrixEntry, SelectionDraft } from './selection.js';
import { resolveSelectionMatrix } from './selection.js';

export type PreflightWarning = {
  warningId: string;
  message: string;
  caseIds: string[];
};

export type CapturePreflight = {
  inputVersion: string;
  manifestDigest: string;
  selection: NormalizedSelection;
  matrix: CaseMatrixEntry[];
  warnings: PreflightWarning[];
  interactionCoverage: {
    required: number;
    selected: number;
    missingScenarioIds: string[];
  };
  unacceptedWarningIds: string[];
  ready: boolean;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function digestCaptureInput(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

/**
 * Resolves and validates a Selection without starting a browser Job.
 * Warning acceptance is identity-based; there is intentionally no force
 * switch that bypasses all warnings.
 */
export function preflightSelection(
  draft: SelectionDraft,
  manifest: RuntimeCaptureManifest,
  options: { maxCases?: number } = {},
): CapturePreflight {
  const { selection, matrix } = resolveSelectionMatrix(draft, manifest);
  const maxCases = options.maxCases ?? 100;
  if (matrix.length > maxCases) {
    throw new V2ContractError(
      'capacity-exceeded',
      `Selection expands to ${matrix.length} Cases; the configured maximum is ${maxCases}.`,
      { selected: matrix.length, maxCases },
    );
  }

  const sourceUnavailable = matrix
    .filter((entry) => entry.selectedCase.captureScope.sourcePolicy)
    .map((entry) => entry.selectedCase.caseId);
  const warnings: PreflightWarning[] = [];
  if (sourceUnavailable.length > 0) {
    warnings.push({
      warningId: 'warning-source-unavailable',
      message:
        'Source Evidence was requested but the Capture driver does not yet provide a Source adapter; these Cases remain Runtime-only.',
      caseIds: sourceUnavailable,
    });
  }

  const selectedScenarios = new Set(
    matrix.flatMap((entry) =>
      entry.selectedCase.caseKey.scenario
        ? [
            `${entry.selectedCase.caseKey.scenario.ownerScreenId}/${entry.selectedCase.caseKey.scenario.scenarioId}`,
          ]
        : [],
    ),
  );
  const selectedScreenIds = new Set(
    draft.screens.map((screen) => screen.screenId),
  );
  const requiredScenarios = manifest.screens
    .filter((screen) => selectedScreenIds.has(screen.screenId))
    .flatMap((screen) =>
      (screen.requiredScenarioIds ?? []).map(
        (scenarioId) => `${screen.screenId}/${scenarioId}`,
      ),
    );
  const missingScenarioIds = requiredScenarios.filter(
    (scenarioId) => !selectedScenarios.has(scenarioId),
  );
  if (missingScenarioIds.length > 0) {
    warnings.push({
      warningId: 'warning-interaction-coverage',
      message: `Required interaction Scenarios are not selected: ${missingScenarioIds.join(', ')}.`,
      caseIds: missingScenarioIds,
    });
  }

  const accepted = new Set(selection.acceptedWarningIds);
  const unacceptedWarningIds = warnings
    .map((warning) => warning.warningId)
    .filter((warningId) => !accepted.has(warningId));
  return {
    inputVersion: manifest.inputVersion,
    manifestDigest: digestCaptureInput(manifest),
    selection,
    matrix,
    warnings,
    interactionCoverage: {
      required: requiredScenarios.length,
      selected: requiredScenarios.length - missingScenarioIds.length,
      missingScenarioIds,
    },
    unacceptedWarningIds,
    ready: unacceptedWarningIds.length === 0,
  };
}

export function assertPreflightReady(
  preflight: CapturePreflight,
): asserts preflight is CapturePreflight & { ready: true } {
  if (!preflight.ready) {
    throw new V2ContractError(
      'invalid-schema',
      `Preflight has unaccepted warnings: ${preflight.unacceptedWarningIds.join(', ')}.`,
      preflight.unacceptedWarningIds,
    );
  }
}

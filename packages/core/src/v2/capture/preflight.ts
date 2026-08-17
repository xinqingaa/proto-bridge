import { createHash } from 'node:crypto';
import type { RuntimeCaptureManifest } from '../runtime-contract/index.js';
import type { RuntimeCatalogInput } from '../runtime-contract/index.js';
import {
  AuthoringDiagnostic,
  type AuthoringDiagnostic as AuthoringDiagnosticValue,
} from '../contracts/authoring-diagnostic.js';
import type { NormalizedSelection } from '../contracts/run.js';
import { V2ContractError } from '../contracts/errors.js';
import type { CaseMatrixEntry, SelectionDraft } from './selection.js';
import { resolveSelectionMatrix } from './selection.js';
import { DEFAULT_CAPTURE_MAX_CASES } from '../workspace-config.js';

export type PreflightWarning = {
  warningId: string;
  message: string;
  caseIds: string[];
};

export type CapturePreflight = {
  inputVersion: string;
  manifestDigest: string;
  catalogInputDigest: string;
  catalogInputs: RuntimeCatalogInput[];
  selection: NormalizedSelection;
  matrix: CaseMatrixEntry[];
  warnings: PreflightWarning[];
  /** Canonical gate input. `warnings` remains a compatibility projection. */
  diagnostics: AuthoringDiagnosticValue[];
  blockingDiagnosticIds: string[];
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
  options: {
    maxCases?: number;
    authoringDiagnostics?: AuthoringDiagnosticValue[];
  } = {},
): CapturePreflight {
  const { selection, matrix } = resolveSelectionMatrix(draft, manifest);
  const catalogInputs = manifest.catalogs ?? [];
  const maxCases = options.maxCases ?? DEFAULT_CAPTURE_MAX_CASES;
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
  const diagnostics = [
    ...(manifest.authoringDiagnostics ?? []),
    ...(options.authoringDiagnostics ?? []),
  ].map((diagnostic) => AuthoringDiagnostic.parse(diagnostic));
  if (sourceUnavailable.length > 0) {
    diagnostics.push({
      diagnosticId: 'warning-source-unavailable',
      code: 'capture.source-unavailable',
      severity: 'warning',
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
    diagnostics.push({
      diagnosticId: 'warning-interaction-coverage',
      code: 'capture.interaction-coverage',
      severity: 'warning',
      message: `Required interaction Scenarios are not selected: ${missingScenarioIds.join(', ')}.`,
      caseIds: missingScenarioIds,
    });
  }

  const accepted = new Set(selection.acceptedWarningIds);
  const warnings = diagnostics
    .filter((diagnostic) => diagnostic.severity === 'warning')
    .map((diagnostic) => ({
      warningId: diagnostic.diagnosticId,
      message: diagnostic.message,
      caseIds: diagnostic.caseIds,
    }));
  const unacceptedWarningIds = warnings
    .map((warning) => warning.warningId)
    .filter((warningId) => !accepted.has(warningId));
  const blockingDiagnosticIds = diagnostics
    .filter((diagnostic) => diagnostic.severity === 'block')
    .map((diagnostic) => diagnostic.diagnosticId);
  return {
    inputVersion: manifest.inputVersion,
    manifestDigest: digestCaptureInput(manifest),
    catalogInputDigest: digestCaptureInput(catalogInputs),
    catalogInputs,
    selection,
    matrix,
    warnings,
    diagnostics,
    blockingDiagnosticIds,
    interactionCoverage: {
      required: requiredScenarios.length,
      selected: requiredScenarios.length - missingScenarioIds.length,
      missingScenarioIds,
    },
    unacceptedWarningIds,
    ready:
      blockingDiagnosticIds.length === 0 && unacceptedWarningIds.length === 0,
  };
}

export function assertPreflightReady(
  preflight: CapturePreflight,
): asserts preflight is CapturePreflight & { ready: true } {
  if (!preflight.ready) {
    throw new V2ContractError(
      'invalid-schema',
      `Preflight is blocked by diagnostics: ${[
        ...preflight.blockingDiagnosticIds,
        ...preflight.unacceptedWarningIds,
      ].join(', ')}.`,
      {
        blockingDiagnosticIds: preflight.blockingDiagnosticIds,
        unacceptedWarningIds: preflight.unacceptedWarningIds,
      },
    );
  }
}

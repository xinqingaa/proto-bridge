import { describe, expect, it } from 'vitest';
import type { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';
import {
  preflightSelection,
  resolveSelectionMatrix,
  type SelectionDraft,
} from '../../../src/v2/capture/index.js';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';

function manifest(
  inputVersion = 'registry-task-list-v2',
): RuntimeCaptureManifest {
  return {
    protocolVersion: 2,
    inputVersion,
    capabilities: [
      'describe',
      'prepare',
      'readiness',
      'semantic-snapshot',
      'reset',
      'scenario',
    ],
    screens: [
      {
        prototypeId: 'sample',
        screenId: 'sample.task-list',
        screenSlug: 'task-list',
        path: '/prototype/sample/task-list',
        sourcePath: 'sample/screens/TaskList.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', label: '默认' },
          { variantId: 'empty', label: '空态' },
          { variantId: 'claimable', label: '可领取' },
        ],
        actions: [
          {
            actionId: 'open-claimable-task',
            kind: 'click',
            target: {
              screenId: 'sample.task-list',
              pbId: 'sample.task-list.list.row',
              pbKey: 't2',
            },
          },
        ],
        scenarios: [
          {
            scenarioId: 'open-claimable-task',
            label: '打开可领取任务',
            ownerScreenId: 'sample.task-list',
            initialVariantId: 'default',
            actionIds: ['open-claimable-task'],
            checkpoints: [
              {
                checkpointId: 'claimable-task-detail',
                screenId: 'sample.task-detail',
                variantId: 'claimable',
                requiredFragments: [
                  {
                    screenId: 'sample.task-detail',
                    pbId: 'sample.task-detail.root',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        prototypeId: 'sample',
        screenId: 'sample.task-detail',
        screenSlug: 'task-detail',
        path: '/prototype/sample/task-detail',
        sourcePath: 'sample/screens/TaskDetail.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', label: '默认' },
          { variantId: 'claimable', label: '可领取' },
        ],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function draft(): SelectionDraft {
  return {
    prototypeId: 'sample',
    screens: [
      {
        screenId: 'sample.task-list',
        variants: {
          mode: 'explicit',
          variantIds: ['default', 'claimable'],
        },
        themeIds: ['light'],
        deviceIds: ['iphone-14'],
        scenarios: { mode: 'explicit', scenarioIds: ['open-claimable-task'] },
        captureScope: {
          fragments: [],
          screenshots: { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: true,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

describe('V2 Selection normalization and Preflight', () => {
  it('expands explicit Variants and a Scenario Checkpoint into a stable three-Case Matrix', () => {
    const contract = manifest();
    const identityBaseline = resolveSelectionMatrix(draft(), contract);
    contract.screens[0]!.variants.find(
      (variant) => variant.variantId === 'default',
    )!.routeQuery = { record: 'task-default' };
    contract.screens[0]!.variants.find(
      (variant) => variant.variantId === 'claimable',
    )!.routeQuery = { record: 'task-claimable' };
    const first = resolveSelectionMatrix(draft(), contract);
    const second = resolveSelectionMatrix(draft(), contract);
    expect(first).toEqual(second);
    expect(first.selection).toEqual(identityBaseline.selection);
    expect(first.matrix).toHaveLength(3);
    expect(first.matrix.map((entry) => entry.selectedCase.caseKey)).toEqual([
      {
        screenId: 'sample.task-detail',
        variantId: 'claimable',
        themeId: 'light',
        deviceId: 'iphone-14',
        scenario: {
          ownerScreenId: 'sample.task-list',
          scenarioId: 'open-claimable-task',
          checkpointId: 'claimable-task-detail',
        },
      },
      {
        screenId: 'sample.task-list',
        variantId: 'claimable',
        themeId: 'light',
        deviceId: 'iphone-14',
      },
      {
        screenId: 'sample.task-list',
        variantId: 'default',
        themeId: 'light',
        deviceId: 'iphone-14',
      },
    ]);
    expect(first.matrix[0]?.runtimePath).toBe(
      '/prototype/sample/task-list',
    );
    expect(first.matrix.map((entry) => entry.initialRouteQuery)).toEqual([
      { record: 'task-default' },
      { record: 'task-claimable' },
      { record: 'task-default' },
    ]);
  });

  it('normalizes a stable Fragment scope without changing Case identity', () => {
    const fragmentDraft = draft();
    fragmentDraft.screens[0]!.variants = {
      mode: 'explicit',
      variantIds: ['default'],
    };
    fragmentDraft.screens[0]!.scenarios = { mode: 'none' };
    fragmentDraft.screens[0]!.captureScope.fragments = [
      {
        screenId: 'sample.task-list',
        pbId: 'sample.task-list.list.row',
        pbKey: 't2',
      },
    ];
    fragmentDraft.screens[0]!.captureScope.screenshots = {
      mode: 'selected',
      targets: [
        {
          screenId: 'sample.task-list',
          pbId: 'sample.task-list.list.row',
          pbKey: 't2',
        },
      ],
    };
    const resolved = resolveSelectionMatrix(fragmentDraft, manifest());
    expect(resolved.matrix).toHaveLength(1);
    expect(resolved.matrix[0]?.selectedCase.captureScope.fragments).toEqual(
      fragmentDraft.screens[0]!.captureScope.fragments,
    );
    expect(resolved.matrix[0]?.selectedCase.caseId).not.toContain('t2');
  });

  it('expands only explicitly selected Scenarios', () => {
    const explicitDraft = draft();
    explicitDraft.screens[0]!.variants = {
      mode: 'explicit',
      variantIds: ['default'],
    };
    const resolved = resolveSelectionMatrix(explicitDraft, manifest());
    expect(resolved.matrix).toHaveLength(2);
    expect(
      resolved.matrix.filter(
        (entry) => entry.selectedCase.caseKey.scenario !== undefined,
      ),
    ).toHaveLength(1);
  });

  it('blocks over-limit Matrix and unaccepted source warnings', () => {
    expect(() =>
      preflightSelection(draft(), manifest(), { maxCases: 2 }),
    ).toThrow(V2ContractError);
    const sourceDraft = draft();
    sourceDraft.screens[0]!.captureScope.sourcePolicy = true;
    const preflight = preflightSelection(sourceDraft, manifest());
    expect(preflight.ready).toBe(false);
    expect(preflight.unacceptedWarningIds).toEqual([
      'warning-source-unavailable',
    ]);
    sourceDraft.acceptedWarningIds = ['warning-source-unavailable'];
    expect(preflightSelection(sourceDraft, manifest()).ready).toBe(true);
  });

  it('reports required interaction coverage independently from Base Cases', () => {
    const contract = manifest();
    contract.screens[0]!.requiredScenarioIds = ['open-claimable-task'];
    const withoutScenario = draft();
    withoutScenario.screens[0]!.scenarios = { mode: 'none' };
    const preflight = preflightSelection(withoutScenario, contract);
    expect(preflight.interactionCoverage).toEqual({
      required: 1,
      selected: 0,
      missingScenarioIds: ['sample.task-list/open-claimable-task'],
    });
    expect(preflight.unacceptedWarningIds).toContain(
      'warning-interaction-coverage',
    );
  });

  it('uses the shared diagnostic severity model as the Preflight gate', () => {
    const contract = manifest();
    contract.authoringDiagnostics = [
      {
        diagnosticId: 'registry-screen-invalid',
        code: 'registry.required',
        severity: 'block',
        message: 'Screen contract is incomplete.',
        caseIds: [],
      },
    ];
    const preflight = preflightSelection(draft(), contract);
    expect(preflight.ready).toBe(false);
    expect(preflight.blockingDiagnosticIds).toEqual([
      'registry-screen-invalid',
    ]);
    expect(preflight.warnings).toEqual([]);
  });
});

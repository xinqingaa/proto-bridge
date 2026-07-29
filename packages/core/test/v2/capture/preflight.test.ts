import { describe, expect, it } from 'vitest';
import type { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';
import {
  preflightSelection,
  resolveSelectionMatrix,
  type SelectionDraft,
} from '../../../src/v2/capture/index.js';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';

function manifest(inputVersion = 'registry-task-list-v2'): RuntimeCaptureManifest {
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
        prototypeId: 'ledger-planet',
        screenId: 'ledger-planet.task-list',
        screenSlug: 'task-list',
        path: '/prototype/ledger-planet/task-list',
        sourcePath: 'ledger-planet/screens/TaskList.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', critical: false },
          { variantId: 'empty', critical: false },
          { variantId: 'claimable', critical: true },
        ],
        actions: [
          {
            actionId: 'open-claimable-task',
            kind: 'click',
            target: {
              screenId: 'ledger-planet.task-list',
              pbId: 'ledger-planet.task-list.list.row',
              pbKey: 't2',
            },
          },
        ],
        scenarios: [
          {
            scenarioId: 'open-claimable-task',
            ownerScreenId: 'ledger-planet.task-list',
            initialVariantId: 'default',
            actionIds: ['open-claimable-task'],
            checkpoints: [
              {
                checkpointId: 'claimable-task-detail',
                screenId: 'ledger-planet.task-detail',
                variantId: 'claimable',
                requiredFragments: [
                  {
                    screenId: 'ledger-planet.task-detail',
                    pbId: 'ledger-planet.task-detail.root',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        prototypeId: 'ledger-planet',
        screenId: 'ledger-planet.task-detail',
        screenSlug: 'task-detail',
        path: '/prototype/ledger-planet/task-detail',
        sourcePath: 'ledger-planet/screens/TaskDetail.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', critical: false },
          { variantId: 'claimable', critical: false },
        ],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function draft(): SelectionDraft {
  return {
    prototypeId: 'ledger-planet',
    screens: [
      {
        screenId: 'ledger-planet.task-list',
        variants: { mode: 'default-and-critical' },
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
  it('expands default, critical and Scenario Checkpoint into a stable three-Case Matrix', () => {
    const first = resolveSelectionMatrix(draft(), manifest());
    const second = resolveSelectionMatrix(draft(), manifest());
    expect(first).toEqual(second);
    expect(first.matrix).toHaveLength(3);
    expect(first.matrix.map((entry) => entry.selectedCase.caseKey)).toEqual([
      {
        screenId: 'ledger-planet.task-detail',
        variantId: 'claimable',
        themeId: 'light',
        deviceId: 'iphone-14',
        scenario: {
          ownerScreenId: 'ledger-planet.task-list',
          scenarioId: 'open-claimable-task',
          checkpointId: 'claimable-task-detail',
        },
      },
      {
        screenId: 'ledger-planet.task-list',
        variantId: 'claimable',
        themeId: 'light',
        deviceId: 'iphone-14',
      },
      {
        screenId: 'ledger-planet.task-list',
        variantId: 'default',
        themeId: 'light',
        deviceId: 'iphone-14',
      },
    ]);
    expect(first.matrix[0]?.runtimePath).toBe(
      '/prototype/ledger-planet/task-list',
    );
  });

  it('normalizes a stable Fragment scope without changing Case identity', () => {
    const fragmentDraft = draft();
    fragmentDraft.screens[0]!.variants = { mode: 'default' };
    fragmentDraft.screens[0]!.scenarios = { mode: 'none' };
    fragmentDraft.screens[0]!.captureScope.fragments = [
      {
        screenId: 'ledger-planet.task-list',
        pbId: 'ledger-planet.task-list.list.row',
        pbKey: 't2',
      },
    ];
    fragmentDraft.screens[0]!.captureScope.screenshots = {
      mode: 'selected',
      targets: [
        {
          screenId: 'ledger-planet.task-list',
          pbId: 'ledger-planet.task-list.list.row',
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

  it('blocks over-limit Matrix and unaccepted source warnings', () => {
    expect(() => preflightSelection(draft(), manifest(), { maxCases: 2 })).toThrow(
      V2ContractError,
    );
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
});

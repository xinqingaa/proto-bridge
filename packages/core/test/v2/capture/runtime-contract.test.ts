import { describe, expect, it } from 'vitest';
import {
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureManifest,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
} from '../../../src/v2/runtime-contract/index.js';

const actual = {
  prototypeId: 'ledger-planet',
  screenId: 'ledger-planet.task-list',
  variantId: 'default',
  themeId: 'light',
  viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
};

describe('V2 Runtime Capture Protocol schemas', () => {
  it('parses the instrumented task-list manifest and all success response kinds', () => {
    const manifest = RuntimeCaptureManifest.parse({
      protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
      inputVersion: 'registry-task-list-v2',
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
            { variantId: 'default', label: '默认' },
            { variantId: 'claimable', label: '可领取' },
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
              label: '打开可领取任务',
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
                  expectedStates: [
                    {
                      fragment: {
                        screenId: 'ledger-planet.task-detail',
                        pbId: 'ledger-planet.task-detail.root',
                      },
                      key: 'selected',
                      value: 'claimable',
                    },
                  ],
                  expectedFragmentKeys: [
                    {
                      fragment: {
                        screenId: 'ledger-planet.task-detail',
                        pbId: 'ledger-planet.task-detail.row',
                      },
                      keys: ['t2'],
                    },
                  ],
                  forbiddenFragments: [
                    {
                      screenId: 'ledger-planet.task-detail',
                      pbId: 'ledger-planet.task-detail.error',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const responses = [
      { kind: 'describe', payload: { manifest } },
      { kind: 'prepare', payload: { actual } },
      {
        kind: 'readiness',
        payload: { actual, stable: true, checks: ['route'] },
      },
      {
        kind: 'semantic-snapshot',
        payload: {
          actual,
          nodes: [
            {
              fragment: {
                screenId: 'ledger-planet.task-list',
                pbId: 'ledger-planet.task-list.root',
              },
              role: 'page',
              tag: 'div',
              text: '任务',
              visible: true,
              bbox: { x: 0, y: 0, width: 390, height: 844 },
            },
          ],
        },
      },
      { kind: 'reset', payload: { actual } },
      {
        kind: 'execute-action',
        payload: { actionId: 'open-claimable-task', actual },
      },
      {
        kind: 'verify-checkpoint',
        payload: { checkpointId: 'claimable-task-detail', actual },
      },
    ];
    for (const response of responses) {
      expect(
        RuntimeCaptureResponse.parse({
          protocolVersion: 2,
          requestId: 'request-contract',
          ok: true,
          ...response,
        }).ok,
      ).toBe(true);
    }
  });

  it('rejects protocol mismatch, malformed requests, and invalid semantic roles', () => {
    expect(() =>
      RuntimeCaptureRequest.parse({
        protocolVersion: 3,
        requestId: 'request-bad-version',
        payload: { kind: 'describe' },
      }),
    ).toThrow();
    expect(() =>
      RuntimeCaptureResponse.parse({
        protocolVersion: 2,
        requestId: 'request-bad-role',
        kind: 'semantic-snapshot',
        ok: true,
        payload: {
          actual,
          nodes: [
            {
              fragment: {
                screenId: 'ledger-planet.task-list',
                pbId: 'ledger-planet.task-list.root',
              },
              role: 'whatever',
              tag: 'div',
              text: '',
              visible: true,
              bbox: { x: 0, y: 0, width: 1, height: 1 },
            },
          ],
        },
      }),
    ).toThrow();
  });
});

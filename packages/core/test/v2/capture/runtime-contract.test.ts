import { describe, expect, it } from 'vitest';
import {
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureManifest,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  RuntimeSemanticNode,
} from '../../../src/v2/runtime-contract/index.js';

const actual = {
  prototypeId: 'sample',
  screenId: 'sample.task-list',
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
          prototypeId: 'sample',
          screenId: 'sample.task-list',
          screenSlug: 'task-list',
          path: '/prototype/sample/task-list',
          sourcePath: 'sample/screens/TaskList.vue',
          defaultVariantId: 'default',
          variants: [
            { variantId: 'default', label: '默认' },
            {
              variantId: 'claimable',
              label: '可领取',
              routeQuery: { record: 'task-claimable' },
            },
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
                  expectedStates: [
                    {
                      fragment: {
                        screenId: 'sample.task-detail',
                        pbId: 'sample.task-detail.root',
                      },
                      key: 'selected',
                      value: 'claimable',
                    },
                  ],
                  expectedFragmentKeys: [
                    {
                      fragment: {
                        screenId: 'sample.task-detail',
                        pbId: 'sample.task-detail.row',
                      },
                      keys: ['t2'],
                    },
                  ],
                  forbiddenFragments: [
                    {
                      screenId: 'sample.task-detail',
                      pbId: 'sample.task-detail.error',
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
                screenId: 'sample.task-list',
                pbId: 'sample.task-list.root',
              },
              role: 'page',
              tag: 'div',
              text: '任务',
              visible: true,
              bbox: { x: 0, y: 0, width: 390, height: 844 },
              semanticAncestors: [],
              documentOrder: 0,
              scrollOwner: { kind: 'viewport' },
              positioning: 'flow',
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
    expect(manifest.screens[0]?.variants[1]?.routeQuery).toEqual({
      record: 'task-claimable',
    });
  });

  it('rejects reserved or malformed authored route query', () => {
    const baseVariant = { variantId: 'default', label: '默认' };
    for (const routeQuery of [
      { variant: 'override' },
      { 'Bad-Key': 'value' },
      { record: 'x'.repeat(513) },
    ]) {
      expect(() =>
        RuntimeCaptureManifest.parse({
          protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
          inputVersion: 'registry-invalid-route-query',
          capabilities: [
            'describe',
            'prepare',
            'readiness',
            'semantic-snapshot',
            'reset',
          ],
          screens: [
            {
              prototypeId: 'sample',
              screenId: 'sample.task-list',
              screenSlug: 'task-list',
              path: '/prototype/sample/task-list',
              defaultVariantId: 'default',
              variants: [{ ...baseVariant, routeQuery }],
              actions: [],
              scenarios: [],
            },
          ],
        }),
      ).toThrow();
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
                screenId: 'sample.task-list',
                pbId: 'sample.task-list.root',
              },
              role: 'whatever',
              tag: 'div',
              text: '',
              visible: true,
              bbox: { x: 0, y: 0, width: 1, height: 1 },
              semanticAncestors: [],
              documentOrder: 0,
              scrollOwner: { kind: 'viewport' },
              positioning: 'flow',
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('represents both whole-page scrolling and fixed-header list composition', () => {
    const base = {
      role: 'summary' as const,
      tag: 'section',
      text: '',
      visible: true,
      bbox: { x: 0, y: 64, width: 390, height: 100 },
      semanticAncestors: [],
      documentOrder: 1,
      positioning: 'flow' as const,
    };
    const wholePage = RuntimeSemanticNode.parse({
      ...base,
      fragment: {
        screenId: 'sample.whole-page',
        pbId: 'sample.whole-page.summary',
      },
      scrollOwner: {
        kind: 'fragment',
        fragment: {
          screenId: 'sample.whole-page',
          pbId: 'sample.whole-page.scroll-list',
        },
      },
    });
    const fixedHeader = RuntimeSemanticNode.parse({
      ...base,
      fragment: {
        screenId: 'sample.fixed-header',
        pbId: 'sample.fixed-header.summary',
      },
      scrollOwner: { kind: 'viewport' },
    });
    expect(wholePage.scrollOwner.kind).toBe('fragment');
    expect(fixedHeader.scrollOwner.kind).toBe('viewport');
  });
});

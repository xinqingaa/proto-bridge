import { describe, expect, it } from 'vitest';
import {
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureManifest,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  RuntimeSemanticNode,
  RuntimeCheckpointManifest,
} from '../../../src/v2/runtime-contract/index.js';
import { formatSchemaIssues } from '../../../src/v2/contracts/errors.js';

const actual = {
  prototypeId: 'sample',
  screenId: 'sample.task-list',
  variantId: 'default',
  theme: {
    packId: 'sample-pack',
    packDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    theme: 'default',
    mode: 'light',
  },
  viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
};

describe('V2 Runtime Capture Protocol schemas', () => {
  it('parses the instrumented task-list manifest and all success response kinds', () => {
    const manifest = RuntimeCaptureManifest.parse({
      protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
      theme: {
        packId: 'sample-pack',
        packDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        keyCatalogDigest: 'sha1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        themes: ['default'],
        defaultTheme: 'default',
        modes: ['light', 'dark'],
        defaultMode: 'light',
      },
      clock: { now: '2026-07-28T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
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
          protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
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

  it('names the Screen, Variant and received pbKey when a numeric instance key is authored', () => {
    const manifest = {
      protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
      inputVersion: 'registry-invalid-pb-key',
      capabilities: [
        'describe',
        'prepare',
        'readiness',
        'semantic-snapshot',
        'reset',
      ],
      screens: [
        {
          prototypeId: 'sample-app',
          screenId: 'sample-app.settings',
          screenSlug: 'settings',
          path: '/prototype/sample-app/settings',
          defaultVariantId: 'default',
          variants: [
            {
              variantId: 'plan-open',
              label: '选择套餐',
              requiredFragments: [
                {
                  screenId: 'sample-app.settings',
                  pbId: 'sample-app.settings.plan-option',
                  pbKey: '3',
                },
              ],
            },
          ],
          actions: [
            {
              actionId: 'choose-plan',
              kind: 'click',
              target: {
                screenId: 'sample-app.settings',
                pbId: 'sample-app.settings.plan-option',
                pbKey: '4',
              },
            },
          ],
          scenarios: [],
        },
      ],
    };
    const parsed = RuntimeCaptureManifest.safeParse(manifest);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const message = formatSchemaIssues(parsed.error, manifest);
    expect(message).toContain('screens.sample-app.settings');
    expect(message).toContain('variants.plan-open');
    expect(message).toContain('sample-app.settings.plan-option#3');
    expect(message).toContain('got "3"');
    expect(message).toContain('stable identifier');
    expect(message).not.toContain('"Invalid"');
  });

  it('preserves camelCase keys in snapshots, ancestors, scroll owners and checkpoint key assertions', () => {
    const parent = {
      screenId: 'sample.task-list',
      pbId: 'sample.task-list.settingsRow',
      pbKey: 'pomodoro-pomodoroMinutes',
    };
    const child = { ...parent, pbId: `${parent.pbId}.value` };
    const node = RuntimeSemanticNode.parse({
      fragment: child,
      semanticParent: parent,
      semanticAncestors: [parent],
      role: 'text',
      tag: 'span',
      text: '25 分钟',
      visible: true,
      bbox: { x: 0, y: 0, width: 80, height: 24 },
      documentOrder: 1,
      scrollOwner: { kind: 'fragment', fragment: parent },
      positioning: 'flow',
    });
    expect(node.fragment).toEqual(child);
    expect(node.semanticParent).toEqual(parent);
    expect(node.semanticAncestors).toEqual([parent]);
    expect(node.scrollOwner).toEqual({ kind: 'fragment', fragment: parent });
    const checkpoint = RuntimeCheckpointManifest.parse({
      checkpointId: 'settings-visible',
      screenId: parent.screenId,
      variantId: 'default',
      requiredFragments: [parent],
      expectedFragmentKeys: [{
        fragment: { screenId: parent.screenId, pbId: parent.pbId },
        keys: [parent.pbKey, 'pomodoro-pomodorominutes'],
      }],
    });
    expect(checkpoint.expectedFragmentKeys?.[0]?.keys).toEqual([
      'pomodoro-pomodoroMinutes', 'pomodoro-pomodorominutes',
    ]);
  });

  it('rejects protocol mismatch, malformed requests, and invalid semantic roles', () => {
    expect(() =>
      RuntimeCaptureRequest.parse({
        protocolVersion: 2,
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

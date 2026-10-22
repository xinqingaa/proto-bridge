import { describe, expect, it } from 'vitest';
import { probeThemeConsistency, ThemeProbeCache } from '../../../src/v2/capture/theme-probe.js';
import { compareModeSemanticTrees } from '../../../src/v2/runtime-contract/theme-probe-compare.js';
import type { RuntimeCaptureManifest, RuntimeSemanticNode } from '../../../src/v2/runtime-contract/protocol.js';

function node(
  pbId: string,
  patch: Partial<RuntimeSemanticNode> = {},
): RuntimeSemanticNode {
  return {
    fragment: { screenId: 'sample.task-list', pbId },
    role: 'text',
    tag: 'p',
    text: 'same',
    visible: true,
    bbox: { x: 1, y: 2, width: 10, height: 10 },
    semanticAncestors: [],
    documentOrder: 0,
    scrollOwner: { kind: 'viewport' },
    positioning: 'flow',
    tokenBindings: { color: 'color.on-surface' },
    ...patch,
  };
}

describe('theme consistency probe', () => {
  it('ignores coordinates, size and text when structure matches', () => {
    const baseline = [node('title')];
    const dark = [
      node('title', {
        text: 'different',
        bbox: { x: 8, y: 9, width: 40, height: 12 },
      }),
    ];
    expect(compareModeSemanticTrees(baseline, dark)).toEqual([]);
  });

  it('blocks a mode that hides a node', () => {
    const baseline = [node('title'), node('badge')];
    const dark = [node('title'), node('badge', { visible: false })];
    expect(compareModeSemanticTrees(baseline, dark)).toEqual([
      { nodeId: 'badge', fields: ['visible'] },
    ]);
  });

  it('reports a node that exists in only one combination', () => {
    expect(compareModeSemanticTrees([node('title')], [])).toEqual([
      { nodeId: 'title', fields: ['presence'] },
    ]);
  });

  it('opens each theme and mode before comparing, and blocks a hidden node', async () => {
    const opened: string[] = [];
    let mode = 'light';
    const manifest = {
      theme: {
        packId: 'sample-pack',
        packDigest: 'sha1:abc',
        themes: ['default'],
        defaultTheme: 'default',
        modes: ['light', 'dark'],
        defaultMode: 'light',
      },
      screens: [{
        prototypeId: 'sample',
        screenId: 'sample.task-list',
        path: '/prototype/sample/task-list',
        defaultVariantId: 'default',
        variants: [{ variantId: 'default', routeQuery: { shipment: 'SH-1' } }],
      }],
    } as RuntimeCaptureManifest;
    const diagnostics = await probeThemeConsistency({
      manifest,
      screenIds: ['sample.task-list'],
      viewport: { width: 390, height: 844 },
      open: async (target) => {
        mode = target.mode;
        opened.push(`${target.theme}/${target.mode}?shipment=${target.routeQuery?.shipment}`);
      },
      request: async () => {
        const nodes = mode === 'dark'
          ? [node('title'), node('badge', { visible: false })]
          : [node('title'), node('badge')];
        return { payload: { nodes } };
      },
    });
    expect(opened).toEqual([
      'default/light?shipment=SH-1',
      'default/dark?shipment=SH-1',
    ]);
    expect(diagnostics.map((item) => item.code)).toEqual(['theme.mode-divergence']);
    expect(diagnostics[0]?.details).toMatchObject({
      nodeId: 'badge',
      fields: ['visible'],
    });
  });
});

describe('Theme probe cache', () => {
  it('reuses only an exact fixed input and reruns on changed source, viewport or failure', async () => {
    const cache = new ThemeProbeCache();
    let calls = 0;
    const probe = async () => { calls++; return []; };
    await cache.run('source-a/viewport-a', probe);
    await cache.run('source-a/viewport-a', probe);
    expect(calls).toBe(1);
    await cache.run('source-b/viewport-a', probe);
    await cache.run('source-a/viewport-b', probe);
    await cache.run(undefined, probe);
    await cache.run(undefined, probe);
    expect(calls).toBe(5);
    await expect(cache.run('failed', async () => { throw new Error('unreachable'); })).rejects.toThrow('unreachable');
    await cache.run('failed', probe);
    expect(calls).toBe(6);
  });
});

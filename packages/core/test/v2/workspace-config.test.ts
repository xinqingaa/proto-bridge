import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INIT_DELIVERY_TARGET_ROOT,
  DEFAULT_V2_CONFIG_FILE,
  OBSOLETE_WORKSPACE_CONFIG_KEYS,
  V2WorkspaceConfig,
} from '../../src/v2/index.js';
import {
  assertDeliveryTargetRootMatch,
  resolveDeliveryTargetRoot,
} from '../../src/v2/store/index.js';

const workspaceBase = {
  schemaVersion: 1 as const,
  workspaceId: 'pbwork-local',
  runtime: { baseUrl: 'http://127.0.0.1:3977' },
  store: { root: '.proto-bridge/store' },
  delivery: { targetRoot: DEFAULT_INIT_DELIVERY_TARGET_ROOT },
};

describe('V2 Workspace config', () => {
  it('uses an explicit V2 schema and applies safe defaults', () => {
    expect(DEFAULT_V2_CONFIG_FILE).toBe('proto-bridge.json');
    expect(V2WorkspaceConfig.parse(workspaceBase)).toMatchObject({
      capture: { maxCases: 200 },
      service: { host: '127.0.0.1', port: 3988 },
      store: { retainArchivedSnapshots: 1 },
      delivery: { targetRoot: 'apps/flutter_pb_app' },
    });
  });

  it('requires delivery.targetRoot and resolves it relative to the config directory', () => {
    expect(() =>
      V2WorkspaceConfig.parse({
        schemaVersion: 1,
        workspaceId: 'pbwork-local',
        runtime: { baseUrl: 'http://127.0.0.1:3977' },
        store: { root: '.proto-bridge/store' },
      }),
    ).toThrow();
    const config = V2WorkspaceConfig.parse(workspaceBase);
    expect(
      resolveDeliveryTargetRoot({ config, configDir: '/workspace' }),
    ).toBe(path.resolve('/workspace', 'apps/flutter_pb_app'));
    expect(
      resolveDeliveryTargetRoot({
        config,
        configDir: '/workspace',
        override: '/other/flutter_app',
      }),
    ).toBe(path.resolve('/other/flutter_app'));
  });

  it('rejects a delivery targetRoot that does not match the bound Workspace path', async () => {
    await expect(
      assertDeliveryTargetRootMatch('/bound/flutter', '/other/flutter'),
    ).rejects.toMatchObject({ code: 'invalid-schema' });
    await expect(
      assertDeliveryTargetRootMatch('/bound/flutter', '/bound/flutter'),
    ).resolves.toBe(path.resolve('/bound/flutter'));
  });

  it('rejects obsolete V1 config keys and credential-bearing URLs', () => {
    expect(OBSOLETE_WORKSPACE_CONFIG_KEYS).toEqual(['source', 'target', 'output']);

    for (const key of OBSOLETE_WORKSPACE_CONFIG_KEYS) {
      expect(() =>
        V2WorkspaceConfig.parse({
          ...workspaceBase,
          [key]:
            key === 'source'
              ? { adapter: 'vue3-prototype', root: '.' }
              : key === 'target'
                ? { adapter: 'flutter-app', root: '.' }
                : { root: './output' },
        }),
      ).toThrow(/unrecognized key/i);
    }

    expect(() =>
      V2WorkspaceConfig.parse({
        ...workspaceBase,
        runtime: { baseUrl: 'http://user:secret@127.0.0.1:3977' },
      }),
    ).toThrow();
  });
});

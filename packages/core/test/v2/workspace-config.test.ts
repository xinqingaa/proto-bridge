import { describe, expect, it } from 'vitest';
import {
  DEFAULT_V2_CONFIG_FILE,
  OBSOLETE_WORKSPACE_CONFIG_KEYS,
  V2WorkspaceConfig,
} from '../../src/v2/index.js';

describe('V2 Workspace config', () => {
  it('uses an explicit V2 schema and applies safe defaults', () => {
    expect(DEFAULT_V2_CONFIG_FILE).toBe('proto-bridge.json');
    expect(
      V2WorkspaceConfig.parse({
        schemaVersion: 1,
        workspaceId: 'pbwork-local',
        runtime: { baseUrl: 'http://127.0.0.1:3977' },
        store: { root: '.proto-bridge/store' },
      }),
    ).toMatchObject({
      capture: { maxCases: 200 },
      service: { host: '127.0.0.1', port: 3988 },
      store: { retainArchivedSnapshots: 1 },
    });
  });

  it('rejects obsolete V1 config keys and credential-bearing URLs', () => {
    expect(OBSOLETE_WORKSPACE_CONFIG_KEYS).toEqual(['source', 'target', 'output']);

    for (const key of OBSOLETE_WORKSPACE_CONFIG_KEYS) {
      expect(() =>
        V2WorkspaceConfig.parse({
          schemaVersion: 1,
          workspaceId: 'pbwork-local',
          runtime: { baseUrl: 'http://127.0.0.1:3977' },
          store: { root: '.proto-bridge/store' },
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
        schemaVersion: 1,
        workspaceId: 'pbwork-local',
        runtime: { baseUrl: 'http://user:secret@127.0.0.1:3977' },
        store: { root: '.proto-bridge/store' },
      }),
    ).toThrow();
  });
});

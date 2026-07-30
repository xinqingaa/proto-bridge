import { describe, expect, it } from 'vitest';
import {
  DEFAULT_V2_CONFIG_FILE,
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
        store: { root: '.proto-bridge/v2-store' },
      }),
    ).toMatchObject({
      capture: { maxCases: 100 },
      service: { host: '127.0.0.1', port: 3988 },
      store: { retainArchivedSnapshots: 1 },
    });
  });

  it('rejects obsolete and credential-bearing configuration', () => {
    expect(() =>
      V2WorkspaceConfig.parse({
        schemaVersion: 1,
        source: { adapter: 'vue3-prototype', root: '.' },
      }),
    ).toThrow();
    expect(() =>
      V2WorkspaceConfig.parse({
        schemaVersion: 1,
        workspaceId: 'pbwork-local',
        runtime: { baseUrl: 'http://user:secret@127.0.0.1:3977' },
        store: { root: '.proto-bridge/v2-store' },
      }),
    ).toThrow();
  });
});

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { V2WorkspaceConfig } from '../../../src/v2/workspace-config.js';
import {
  loadLocalServiceLaunchConfig,
  resolveLocalServiceLaunchConfig,
} from '../../../src/v2/store/service-launch.js';

const base = {
  schemaVersion: 1,
  workspaceId: 'workspace-launch',
  runtime: { baseUrl: 'http://127.0.0.1:3977/', allowedOrigins: [] },
  store: { root: '.proto-bridge/store' },
  delivery: { targetRoot: 'apps/flutter_pb_app' },
};

function resolve(overrides: Record<string, unknown> = {}) {
  return resolveLocalServiceLaunchConfig({
    config: V2WorkspaceConfig.parse({ ...base, ...overrides }),
    configPath: '/repo/proto-bridge.json',
  });
}

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('Local Service launch config', () => {
  it('resolves every launch parameter from the Workspace config', () => {
    expect(
      resolve({
        store: { root: 'store', maxBytes: 4096 },
        capture: { maxCases: 12 },
        service: {
          host: '::1',
          port: 4100,
          allowedOrigins: ['http://127.0.0.1:3977/workbench', 'http://localhost:3977'],
        },
      }),
    ).toEqual({
      configPath: '/repo/proto-bridge.json',
      workspaceId: 'workspace-launch',
      host: '::1',
      port: 4100,
      allowedOrigins: ['http://127.0.0.1:3977', 'http://localhost:3977'],
      runtimeBaseUrl: 'http://127.0.0.1:3977/',
      storeRoot: '/repo/store',
      deliveryTargetRoot: '/repo/apps/flutter_pb_app',
      maxCases: 12,
      maxStoreBytes: 4096,
    });
  });

  it('falls back from service.allowedOrigins to runtime.allowedOrigins to the Runtime origin', () => {
    expect(
      resolve({
        runtime: { ...base.runtime, allowedOrigins: ['http://localhost:3977'] },
      }).allowedOrigins,
    ).toEqual(['http://localhost:3977']);
    const defaults = resolve();
    expect(defaults.allowedOrigins).toEqual(['http://127.0.0.1:3977']);
    expect(defaults).toMatchObject({ host: '127.0.0.1', port: 3988, maxCases: 200 });
    expect(defaults).not.toHaveProperty('maxStoreBytes');
  });

  it('normalizes to origins and de-duplicates in order', () => {
    expect(
      resolve({
        service: {
          allowedOrigins: [
            'http://127.0.0.1:3977/a',
            'http://localhost:3977/',
            'http://127.0.0.1:3977/b?x=1',
          ],
        },
      }).allowedOrigins,
    ).toEqual(['http://127.0.0.1:3977', 'http://localhost:3977']);
  });

  it('loads and validates the config file relative to its own directory', async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'pb-launch-'));
    const configPath = path.join(dir, 'proto-bridge.json');
    await writeFile(configPath, JSON.stringify(base));
    const launch = await loadLocalServiceLaunchConfig(configPath);
    expect(launch.storeRoot).toBe(path.join(dir, '.proto-bridge/store'));
    expect(launch.deliveryTargetRoot).toBe(path.join(dir, 'apps/flutter_pb_app'));

    await writeFile(
      configPath,
      JSON.stringify({ ...base, service: { host: '0.0.0.0', port: 3988, allowedOrigins: [] } }),
    );
    await expect(loadLocalServiceLaunchConfig(configPath)).rejects.toThrow();
  });
});

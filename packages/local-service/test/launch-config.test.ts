import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveLocalServiceLaunchConfig } from '@proto-bridge/core/v2/store';
import { V2WorkspaceConfig } from '@proto-bridge/core/v2';
import { localServiceOptionsFromLaunchConfig } from '../src/index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let root: string | undefined;
let child: ChildProcess | undefined;

afterEach(async () => {
  child?.kill('SIGTERM');
  child = undefined;
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

function runEntry(args: string[]): Promise<{ code: number | null; output: string; process: ChildProcess }> {
  return new Promise((resolve) => {
    const processHandle = spawn(
      'pnpm',
      ['exec', 'tsx', '--conditions=source', 'src/index.ts', ...args],
      { cwd: packageRoot, env: process.env },
    );
    let output = '';
    const onData = (chunk: Buffer) => {
      output += String(chunk);
      if (output.includes('listening on')) resolve({ code: null, output, process: processHandle });
    };
    processHandle.stdout.on('data', onData);
    processHandle.stderr.on('data', onData);
    processHandle.once('exit', (code) => resolve({ code, output, process: processHandle }));
  });
}

describe('Local Service launch config', () => {
  it('maps the Core launch config onto Service options without reinterpretation', () => {
    const launch = resolveLocalServiceLaunchConfig({
      config: V2WorkspaceConfig.parse({
        schemaVersion: 1,
        workspaceId: 'workspace-launch',
        runtime: { baseUrl: 'http://127.0.0.1:3977', allowedOrigins: [] },
        store: { root: 'store', maxBytes: 8192 },
        capture: { maxCases: 7 },
        service: { host: '::1', port: 4200, allowedOrigins: ['http://localhost:3977'] },
        delivery: { targetRoot: 'target' },
      }),
      configPath: '/repo/proto-bridge.json',
    });
    expect(localServiceOptionsFromLaunchConfig(launch)).toEqual({
      host: '::1',
      port: 4200,
      allowedOrigins: ['http://localhost:3977'],
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      storeRoot: '/repo/store',
      workspaceId: 'workspace-launch',
      deliveryTargetRoot: '/repo/target',
      maxCases: 7,
      maxStoreBytes: 8192,
    });
  });

  it('refuses to start without --config instead of falling back to environment defaults', async () => {
    const result = await runEntry([]);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('requires --config');
  }, 30_000);

  it('starts the entry point on the configured host and port with the resolved allowed origins', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pb-launch-entry-'));
    await mkdir(path.join(root, 'target'), { recursive: true });
    const port = await freePort();
    const configPath = path.join(root, 'proto-bridge.json');
    await writeFile(
      configPath,
      JSON.stringify({
        schemaVersion: 1,
        workspaceId: 'workspace-launch-entry',
        runtime: { baseUrl: 'http://127.0.0.1:3977', allowedOrigins: [] },
        store: { root: 'store' },
        service: { host: '127.0.0.1', port, allowedOrigins: ['http://localhost:4977'] },
        delivery: { targetRoot: 'target' },
      }),
    );
    const result = await runEntry(['--config', configPath]);
    child = result.process;
    expect(result.output).toContain(`listening on http://127.0.0.1:${port}`);
    const allowed = await fetch(`http://127.0.0.1:${port}/api/v2/session`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:4977' },
    });
    expect(allowed.status).toBe(201);
    const session = (await allowed.json()) as { data: { workspaceId: string } };
    expect(session.data.workspaceId).toBe('workspace-launch-entry');
    const runtimeOnly = await fetch(`http://127.0.0.1:${port}/api/v2/session`, {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:3977' },
    });
    expect(runtimeOnly.status).toBe(400);
  }, 30_000);
});

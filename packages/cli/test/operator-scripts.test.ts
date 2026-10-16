import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function runScript(script: string, args: string[] = [], env?: NodeJS.ProcessEnv) {
  try {
    const result = await execFileAsync(process.execPath, [path.join(repoRoot, 'scripts', script), ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      maxBuffer: 2 * 1024 * 1024,
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: Number(failure.code ?? 1), stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

describe('root operator scripts', () => {
  it('requires explicit confirmation before destructive clean', async () => {
    const result = await runScript('pb-clean.mjs');
    expect(result.code).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('requires --yes');
  });

  it('does not accept raw apply on the reset convenience wrapper', async () => {
    const result = await runScript('pb-reset.mjs', ['--apply']);
    expect(result.code).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain('does not accept --apply');
  });

  it('supports skipping browser installation for managed CI environments', async () => {
    const result = await runScript('pb-install.mjs', [], { PB_SKIP_BROWSER_INSTALL: '1' });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('skipped Playwright Chromium installation');
  });
});

type DoctorCheck = { status: string; name: string; detail: string; fix?: string };

async function doctorChecks(service: Record<string, unknown> | undefined, runtime: Record<string, unknown> = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pb-doctor-'));
  try {
    const configPath = path.join(dir, 'proto-bridge.json');
    await writeFile(
      configPath,
      JSON.stringify({
        schemaVersion: 1,
        workspaceId: 'doctor-workspace',
        runtime: { baseUrl: 'http://127.0.0.1:43977', allowedOrigins: [], ...runtime },
        store: { root: 'store', maxBytes: 1_048_576 },
        capture: { maxCases: 33 },
        ...(service ? { service } : {}),
        delivery: { targetRoot: 'target' },
      }),
    );
    const result = await runScript('pb-doctor.mjs', ['--json', '--config', configPath]);
    const report = JSON.parse(result.stdout) as { checks: DoctorCheck[] };
    return (name: string) => report.checks.find((check) => check.name === name);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('pb:doctor Local Service launch config', () => {
  it('accepts the Workbench origin through the runtime.baseUrl fallback and reports the resolved launch', async () => {
    const check = await doctorChecks({ host: '127.0.0.1', port: 43988, allowedOrigins: [] });
    expect(check('Workbench origin')).toMatchObject({ status: 'pass' });
    expect(check('Workbench origin')?.detail).toContain('http://127.0.0.1:43977');
    const launch = check('Local Service launch');
    expect(launch?.status).toBe('info');
    expect(launch?.detail).toContain('127.0.0.1:43988');
    expect(launch?.detail).toContain('allowedOrigins=[http://127.0.0.1:43977]');
    expect(launch?.detail).toContain('maxCases=33');
    expect(launch?.detail).toContain('maxStoreBytes=1048576');
  });

  it('applies schema defaults when service is omitted and falls back to runtime.allowedOrigins', async () => {
    const check = await doctorChecks(undefined, { allowedOrigins: ['http://127.0.0.1:43977'] });
    expect(check('Workbench origin')?.status).toBe('pass');
    expect(check('Local Service launch')?.detail).toContain('127.0.0.1:3988');
  });

  it('fails when service.allowedOrigins excludes the Workbench origin and explains the fallback rule', async () => {
    const check = await doctorChecks({
      host: '127.0.0.1',
      port: 43988,
      allowedOrigins: ['http://localhost:9999'],
    });
    expect(check('Workbench origin')?.status).toBe('fail');
    expect(check('Workbench origin')?.detail).toContain('http://localhost:9999');
    expect(check('Workbench origin')?.fix).toContain('runtime.baseUrl');
  });
});

describe('operator script confirmation', () => {
  it('recognizes readline Ctrl+C as an interrupt', async () => {
    const { isPromptInterrupt } = await import('../../../scripts/lib/pb-script-utils.mjs');
    expect(isPromptInterrupt(Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
      code: 'ABORT_ERR',
    }))).toBe(true);
    expect(isPromptInterrupt(new Error('boom'))).toBe(false);
  });

  it('treats prompt AbortError as cancelled without throwing', async () => {
    const { confirmPrompt } = await import('../../../scripts/lib/pb-script-utils.mjs');
    const abort = Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
      code: 'ABORT_ERR',
    });
    await expect(
      confirmPrompt('Type yes: ', 'yes', {
        createInterface: () => ({
          question: async () => {
            throw abort;
          },
          close() {},
        }),
      }),
    ).resolves.toEqual({
      confirmed: false,
      interrupted: true,
    });
  });

  it('accepts case-insensitive yes and exact DELETE', async () => {
    const { confirmPrompt } = await import('../../../scripts/lib/pb-script-utils.mjs');
    await expect(
      confirmPrompt('Type yes: ', 'yes', {
        ignoreCase: true,
        createInterface: () => ({
          question: async () => 'YES',
          close() {},
        }),
      }),
    ).resolves.toEqual({ confirmed: true, interrupted: false });
    await expect(
      confirmPrompt('Type DELETE: ', 'DELETE', {
        createInterface: () => ({
          question: async () => 'delete',
          close() {},
        }),
      }),
    ).resolves.toEqual({ confirmed: false, interrupted: false });
  });
});

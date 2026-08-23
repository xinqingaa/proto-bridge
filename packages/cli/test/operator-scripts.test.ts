import { execFile } from 'node:child_process';
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

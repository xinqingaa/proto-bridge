import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanFlutterTargetDocumentation } from '../../src/target/flutter-app/documentation.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('Flutter target documentation scan', () => {
  it('discovers plural AGENTS.md and target documentation folders', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-docs-'));
    temporaryRoots.push(root);
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(path.join(root, 'AGENTS.md'), '# Rules\nUse the project conventions.');
    await writeFile(path.join(root, 'docs', 'components.md'), '# Components\nCommon components.');

    const result = await scanFlutterTargetDocumentation({ flutterRoot: root });

    expect(result.files.map((file) => file.path)).toEqual([
      'AGENTS.md',
      'docs/components.md',
    ]);
    expect(result.contract.missing).toContain('README.md');
    expect(result.contract.components).toEqual(['docs/components.md']);
    expect(result.contract.complete).toBe(false);
  });
});

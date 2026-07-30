import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { validateFlutterTargetChanges } from '../../src/target/flutter-app/validation/index.js';

const execFileAsync = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const item = path.join(root, entry.name);
        return entry.isDirectory()
          ? sourceFiles(item)
          : Promise.resolve(entry.name.endsWith('.ts') ? [item] : []);
      }),
    )
  ).flat();
}

describe('V2 Target boundary', () => {
  it('keeps every Capture module independent from Target adapters', async () => {
    const captureRoot = path.resolve('src/v2/capture');
    for (const file of await sourceFiles(captureRoot)) {
      const source = await readFile(file, 'utf8');
      expect(source, file).not.toMatch(/(?:from|import\()\s*['"][^'"]*target\//);
    }
  });

  it('validates a target repository without any ProtoBridge config', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-target-v2-'));
    roots.push(root);
    await execFileAsync('git', ['init', '-q', root]);
    const file = path.join(root, 'lib', 'task_list.dart');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "const label = 'TODO';\n", 'utf8');
    const result = await validateFlutterTargetChanges({
      targetRoot: root,
      allowedPaths: ['lib'],
    });
    expect(result.changedFiles).toEqual(['lib/task_list.dart']);
    expect(result.fileIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: expect.stringContaining('TODO') }),
      ]),
    );
    expect(result.targetRoot).toBe(root);
  });
});

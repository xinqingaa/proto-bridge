import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectTargetAdapter,
  findTargetExamples,
  readTargetConventions,
} from '../../src/target/query.js';
import { validateTargetChanges } from '../../src/target/validation.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generic target query facade', () => {
  it('returns an unresolved result for an unsupported target', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-target-'));
    roots.push(root);

    const detection = await detectTargetAdapter(root);
    const conventions = await readTargetConventions({ targetRoot: root });
    const examples = await findTargetExamples({ targetRoot: root });
    const validation = await validateTargetChanges({
      targetRoot: root,
      expectedFiles: ['lib/page.dart'],
    });

    expect(detection.adapterId).toBe('unsupported');
    expect(conventions).toMatchObject({ adapterId: 'unsupported', supported: false });
    expect(examples).toMatchObject({ adapterId: 'unsupported', supported: false, examples: [] });
    expect(validation).toMatchObject({
      adapterId: 'unsupported',
      supported: false,
      status: 'needs-review',
      missingExpectedFiles: [],
    });
  });

  it('selects the Flutter adapter from target markers', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-target-'));
    roots.push(root);
    await mkdir(path.join(root, 'lib'), { recursive: true });
    await writeFile(
      path.join(root, 'pubspec.yaml'),
      'name: sample\ndependencies:\n  flutter:\n    sdk: flutter\n',
    );

    const detection = await detectTargetAdapter(root);
    expect(detection).toMatchObject({ adapterId: 'flutter', confidence: 'high' });
  });
});

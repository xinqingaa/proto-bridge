import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectFlutterTargetConventions } from '../../src/target/flutter-app/architecture-profile.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function writeFlutterFeatureApp(root: string, options?: { architectureDoc?: string }): Promise<void> {
  await mkdir(path.join(root, 'lib', 'features', 'queue'), { recursive: true });
  await writeFile(
    path.join(root, 'pubspec.yaml'),
    [
      'name: sample_app',
      'dependencies:',
      '  flutter:',
      '    sdk: flutter',
      '  flutter_riverpod: ^2.6.1',
      '',
    ].join('\n'),
  );
  await writeFile(
    path.join(root, 'lib', 'main.dart'),
    [
      "import 'package:flutter/material.dart';",
      "import 'package:flutter_riverpod/flutter_riverpod.dart';",
      '',
      'void main() {',
      '  runApp(const ProviderScope(child: MaterialApp(home: QueuePage())));',
      '}',
      '',
    ].join('\n'),
  );
  await writeFile(
    path.join(root, 'lib', 'features', 'queue', 'queue_page.dart'),
    [
      "import 'package:flutter/material.dart';",
      '',
      'class QueuePage extends StatefulWidget {',
      '  const QueuePage({super.key});',
      '  @override',
      '  State<QueuePage> createState() => _QueuePageState();',
      '}',
      '',
      'class _QueuePageState extends State<QueuePage> {',
      "  String _filter = 'all';",
      '  @override',
      '  Widget build(BuildContext context) {',
      '    return Text(_filter);',
      '  }',
      '}',
      '',
    ].join('\n'),
  );
  if (options?.architectureDoc) {
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(path.join(root, 'docs', 'architecture.md'), options.architectureDoc);
  }
}

describe('Flutter architecture profile state facet', () => {
  it('does not infer a state library from pubspec or Dart when architecture docs are absent', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-state-absent-'));
    roots.push(root);
    await writeFlutterFeatureApp(root);

    const result = await detectFlutterTargetConventions({ flutterRoot: root });
    const unresolved = result.unresolved.join('\n');

    expect(result.architectureProfile.state).toMatchObject({
      source: 'absent',
      pattern: 'unspecified',
    });
    expect(result.architectureProfile.state.evidence.join('\n')).toContain(
      'does not infer state libraries',
    );
    expect(unresolved).not.toMatch(/page-level state/);
    expect(unresolved).not.toMatch(/state pattern was not detected from pubspec/);
  });

  it('reads the state pattern from architecture docs instead of pubspec winners', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-state-docs-'));
    roots.push(root);
    await writeFlutterFeatureApp(root, {
      architectureDoc: [
        '# Architecture',
        '',
        'Page business state uses Riverpod Notifier. Do not infer libraries from pubspec.',
        '',
      ].join('\n'),
    });

    const result = await detectFlutterTargetConventions({ flutterRoot: root });

    expect(result.architectureProfile.state).toMatchObject({
      source: 'target-documentation',
      pattern: 'riverpod',
    });
    expect(result.architectureProfile.state.examples[0]?.file).toBe('docs/architecture.md');
    expect(result.unresolved.join('\n')).not.toMatch(/page-level state/);
  });
});

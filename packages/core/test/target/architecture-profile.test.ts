import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectFlutterTargetConventions } from '../../src/target/flutter-app/architecture-profile.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function writeFlutterFeatureApp(root: string, options?: {
  architectureDoc?: string;
  agentsDoc?: string;
  skillDoc?: string;
}): Promise<void> {
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
  if (options?.agentsDoc) {
    await writeFile(path.join(root, 'AGENTS.md'), options.agentsDoc);
  }
  if (options?.skillDoc) {
    await mkdir(path.join(root, '.agents', 'skills', 'ds-sync'), { recursive: true });
    await writeFile(path.join(root, '.agents', 'skills', 'ds-sync', 'SKILL.md'), options.skillDoc);
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

  it('does not treat Skill token bindings as GetX when architecture docs declare Riverpod', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-state-bindings-'));
    roots.push(root);
    await writeFlutterFeatureApp(root, {
      architectureDoc: [
        '# Architecture',
        '',
        'Page business state uses Riverpod Notifier.',
        'Lift shared state to a shared Provider only when two features need it.',
        'The dart-flutter-mcp provider attaches to an already running app.',
        '',
      ].join('\n'),
      agentsDoc: [
        '# Agent rules',
        '',
        'Page business state uses Riverpod Notifier / AsyncNotifier.',
        '',
      ].join('\n'),
      skillDoc: [
        '# DS sync',
        '',
        'Translate component anatomy and token bindings. Role is a semantic fallback.',
        '',
      ].join('\n'),
    });

    const result = await detectFlutterTargetConventions({ flutterRoot: root });
    const stateHints = result.documentation?.architectureHints.filter((hint) => hint.kind === 'state') ?? [];

    expect(result.architectureProfile.state).toMatchObject({
      source: 'target-documentation',
      pattern: 'riverpod',
    });
    expect(result.architectureProfile.state.examples[0]?.file).toBe('docs/architecture.md');
    expect(stateHints.map((hint) => hint.pattern)).toEqual(['riverpod', 'riverpod']);
    expect(stateHints.map((hint) => hint.file)).toEqual(['docs/architecture.md', 'AGENTS.md']);
    expect(result.unresolved.join('\n')).not.toMatch(/conflicting state patterns/);
  });

  it('prefers architecture docs over a Skill that actually names GetxController', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-state-rank-'));
    roots.push(root);
    await writeFlutterFeatureApp(root, {
      architectureDoc: [
        '# Architecture',
        '',
        'Page business state uses Riverpod Notifier.',
        '',
      ].join('\n'),
      skillDoc: [
        '# Legacy notes',
        '',
        'Some older modules used GetxController. Do not copy that pattern.',
        '',
      ].join('\n'),
    });

    const result = await detectFlutterTargetConventions({ flutterRoot: root });

    expect(result.architectureProfile.state).toMatchObject({
      source: 'target-documentation',
      pattern: 'riverpod',
    });
    expect(result.architectureProfile.state.examples[0]?.file).toBe('docs/architecture.md');
    expect(result.architectureProfile.state.evidence.join('\n')).toMatch(/Additional documentation hint: getx/);
  });

  it('discloses conflicting state patterns in the same architecture doc instead of picking the first needle', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-state-conflict-'));
    roots.push(root);
    await writeFlutterFeatureApp(root, {
      architectureDoc: [
        '# Architecture',
        '',
        'Page business state uses Riverpod Notifier.',
        'Legacy screens still use GetxController and must be migrated.',
        '',
      ].join('\n'),
    });

    const result = await detectFlutterTargetConventions({ flutterRoot: root });

    expect(result.architectureProfile.state).toMatchObject({
      source: 'target-documentation',
      pattern: 'unspecified',
    });
    expect(result.architectureProfile.state.evidence.join('\n')).toMatch(/conflicting state patterns/);
    expect(result.unresolved.join('\n')).toMatch(/conflicting state patterns at the same authority/);
  });
});

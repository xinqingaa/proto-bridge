import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  findTargetExamples,
  resolveTargetComponents,
  resolveTargetTokens,
} from '../../src/target/index.js';

const roots: string[] = [];
const execFileAsync = promisify(execFile);

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Target component/token resolver', () => {
  it('resolves open component and token IDs only when target declarations match current code', async () => {
    const root = await flutterTarget();
    await write(
      root,
      'docs/proto-bridge.md',
      `# Adapter\n\n## Component mapping\n\n| Evidence | Target | import |\n| --- | --- | --- |\n| \`commerce.summary-card\` | \`CommonCard\` | \`common/widgets/widgets.dart\` |\n\n## Token mapping\n\n| Evidence token | Target token |\n| --- | --- |\n| \`palette.critical\` | \`TS.colors.error\` |\n`,
    );

    const components = await resolveTargetComponents({
      targetRoot: root,
      ids: ['commerce.summary-card'],
    });
    const tokens = await resolveTargetTokens({
      targetRoot: root,
      ids: ['palette.critical'],
    });

    expect(components.resolutions[0]).toMatchObject({
      status: 'resolved',
      candidates: [{ symbol: 'CommonCard' }],
      validation: { exists: true, importable: true, signatureCompatible: true },
    });
    expect(tokens.resolutions[0]).toMatchObject({
      status: 'resolved',
      candidates: [{ accessor: 'TS.colors.error' }],
      validation: { exists: true },
    });
    expect(components.targetRevisionKey.contentDigest).toMatch(/^sha256:/);
    expect(components.policySources.map((item) => item.path)).toContain('docs/proto-bridge.md');
  });

  it('reports policy/machine conflict instead of choosing a higher-priority declaration', async () => {
    const root = await flutterTarget();
    await write(
      root,
      'AGENTS.md',
      `# Rules\n\n## Component mapping\n\n| Evidence | Target | import |\n| --- | --- | --- |\n| \`open.panel\` | \`CommonCard\` | \`common/widgets/widgets.dart\` |\n`,
    );
    await machineContract(root, {
      components: {
        'open.panel': { symbol: 'CommonPanel', import: 'common/widgets/widgets.dart' },
      },
    });
    const result = await resolveTargetComponents({ targetRoot: root, ids: ['open.panel'] });
    expect(result.resolutions[0]).toMatchObject({ status: 'conflict' });
    expect(result.resolutions[0]?.declarationSources.map((item) => item.kind)).toEqual([
      'target-policy',
      'machine-contract',
    ]);
  });

  it('distinguishes stale declarations, signature mismatches, candidates, ambiguity and unknown IDs', async () => {
    const root = await flutterTarget();
    await write(
      root,
      'lib/common/widgets/invoice_panels.dart',
      `class InvoicePanel extends StatelessWidget {}\nclass InvoiceSummaryPanel extends StatelessWidget {}\n`,
    );
    await machineContract(root, {
      components: {
        'open.missing': { symbol: 'RemovedWidget' },
        'open.signature': { symbol: 'CommonCard', constructorHints: ['required this.nonexistent'] },
      },
    });
    const result = await resolveTargetComponents({
      targetRoot: root,
      ids: ['open.missing', 'open.signature', 'card', 'invoice-panel', 'nothing-known'],
    });
    expect(result.resolutions.map((item) => item.status)).toEqual([
      'stale',
      'stale',
      'candidate',
      'unresolved',
      'unresolved',
    ]);
  });

  it('invalidates the inventory key when relevant target files change', async () => {
    const root = await flutterTarget();
    await machineContract(root, { components: { 'open.dynamic': { symbol: 'LaterWidget' } } });
    const before = await resolveTargetComponents({ targetRoot: root, ids: ['open.dynamic'] });
    expect(before.resolutions[0]?.status).toBe('stale');

    await write(root, 'lib/common/widgets/later_widget.dart', 'class LaterWidget extends StatelessWidget {}\n');
    const after = await resolveTargetComponents({ targetRoot: root, ids: ['open.dynamic'] });
    expect(after.resolutions[0]?.status).toBe('resolved');
    expect(after.targetRevisionKey.contentDigest).not.toBe(before.targetRevisionKey.contentDigest);
  });

  it('isolates candidate output from examples and rejects exclusions outside targetRoot', async () => {
    const root = await flutterTarget();
    await write(root, 'lib/features/real/invoice_page.dart', 'class InvoicePage extends StatelessWidget { Widget build(c) => Scaffold(); }\n');
    await write(root, 'lib/generated_candidate/invoice_copy.dart', 'class InvoiceCopy extends StatelessWidget { Widget build(c) => Scaffold(); }\n');

    const examples = await findTargetExamples({
      targetRoot: root,
      pattern: 'invoice',
      candidateOutputRoot: 'lib/generated_candidate',
    });
    expect(examples.examples.map((item) => item.path)).toContain('lib/features/real/invoice_page.dart');
    expect(examples.examples.map((item) => item.path)).not.toContain('lib/generated_candidate/invoice_copy.dart');
    await expect(
      findTargetExamples({ targetRoot: root, excludePaths: [path.dirname(root)] }),
    ).rejects.toThrow(/inside targetRoot/);
  });

  it('reads examples from gitBase instead of candidate worktree changes', async () => {
    const root = await flutterTarget();
    await write(root, 'lib/features/baseline/invoice_page.dart', 'class InvoicePage extends StatelessWidget { Widget build(c) => Scaffold(); }\n');
    await git(root, ['init']);
    await git(root, ['config', 'user.email', 'resolver@example.invalid']);
    await git(root, ['config', 'user.name', 'Resolver Test']);
    await git(root, ['add', '.']);
    await git(root, ['commit', '-m', 'baseline']);
    const gitBase = (await git(root, ['rev-parse', 'HEAD'])).trim();
    await write(root, 'lib/features/candidate/invoice_copy.dart', 'class InvoiceCopy extends StatelessWidget { Widget build(c) => Scaffold(); }\n');

    const examples = await findTargetExamples({
      targetRoot: root,
      pattern: 'invoice',
      gitBase,
    });

    expect(examples.examples.map((item) => item.path)).toContain('lib/features/baseline/invoice_page.dart');
    expect(examples.examples.map((item) => item.path)).not.toContain('lib/features/candidate/invoice_copy.dart');
  });

  it('returns unsupported resolutions without inventing a Flutter mapping', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-target-unsupported-'));
    roots.push(root);
    const result = await resolveTargetTokens({ targetRoot: root, ids: ['brand.accent'] });
    expect(result).toMatchObject({ adapterId: 'unsupported', supported: false });
    expect(result.resolutions[0]?.status).toBe('unsupported');
  });
});

async function flutterTarget(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pb-target-resolver-'));
  roots.push(root);
  await write(root, 'pubspec.yaml', 'name: resolver_fixture\ndependencies:\n  flutter:\n    sdk: flutter\n');
  await write(root, 'README.md', '# Target\n');
  await write(root, 'lib/common/widgets/widgets.dart', "export 'common_card.dart';\n");
  await write(
    root,
    'lib/common/widgets/common_card.dart',
    'class CommonCard extends StatelessWidget { const CommonCard({required this.child}); final Widget child; }\n',
  );
  await write(root, 'lib/theme/app_tokens.dart', 'class TS { static final colors = AppColors(); } class AppColors { int get error => 1; }\n');
  return root;
}

async function machineContract(
  root: string,
  values: { components?: Record<string, unknown>; tokens?: Record<string, unknown> },
): Promise<void> {
  await write(
    root,
    'docs/proto-bridge.target.json',
    `${JSON.stringify({ version: 1, technology: 'flutter', ...values }, null, 2)}\n`,
  );
}

async function write(root: string, relativePath: string, content: string): Promise<void> {
  const file = path.join(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

async function git(root: string, args: string[]): Promise<string> {
  return (await execFileAsync('git', ['-C', root, ...args])).stdout;
}

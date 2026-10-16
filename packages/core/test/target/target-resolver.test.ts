import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  TARGET_PENDING_NOTICE,
  findTargetExamples,
  resolveTargetComponents,
  resolveTargetTokens,
  validateTargetChanges,
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

  it('requires usage hints, validates mapping shape and preserves open IDs containing token', async () => {
    const root = await flutterTarget();
    await machineContract(root, {
      components: {
        'open.hinted': {
          symbol: 'CommonCard',
          usageHints: ["CommonCard(child: Text('hint'))"],
        },
        'open.path-mismatch': {
          symbol: 'CommonCard',
          definition: 'lib/theme/app_tokens.dart',
        },
        'open.dual': {
          symbol: 'CommonCard',
          accessor: 'TS.colors.error',
        },
        'open.empty': {},
        'open.wrong-kind': { accessor: 'TS.colors.error' },
      },
      tokens: {
        'open.split-chain': { accessor: 'TS.missing.error' },
        'open.wrong-kind-token': { symbol: 'CommonCard' },
        'open.missing-token-usage': {
          accessor: 'TS.colors.error',
          usageHints: ['TS.colors.missing'],
        },
        'open.token-path-mismatch': {
          accessor: 'TS.colors.error',
          definition: 'lib/common/card.dart',
        },
      },
    });
    await write(
      root,
      'docs/proto-bridge.md',
      `# Adapter\n\n## Token mapping\n\n| Evidence token | Target token |\n| --- | --- |\n| \`design.token-primary\` | \`TS.colors.error\` |\n`,
    );

    const beforeUsage = await resolveTargetComponents({
      targetRoot: root,
      ids: ['open.hinted', 'open.path-mismatch', 'open.dual', 'open.empty', 'open.wrong-kind'],
    });
    expect(beforeUsage.resolutions.map((item) => item.status)).toEqual([
      'stale',
      'stale',
      'stale',
      'stale',
      'stale',
    ]);
    expect(beforeUsage.resolutions[0]?.validation.usageFound).toBe(false);

    await write(
      root,
      'lib/features/usage.dart',
      "final fixtureCardUse = CommonCard(child: Text('hint'));\n",
    );
    const afterUsage = await resolveTargetComponents({
      targetRoot: root,
      ids: ['open.hinted'],
    });
    expect(afterUsage.resolutions[0]).toMatchObject({
      status: 'resolved',
      validation: { usageFound: true },
    });

    const tokens = await resolveTargetTokens({
      targetRoot: root,
      ids: [
        'open.split-chain',
        'open.wrong-kind-token',
        'open.missing-token-usage',
        'open.token-path-mismatch',
        'design.token-primary',
      ],
    });
    expect(tokens.resolutions.map((item) => item.status)).toEqual([
      'stale',
      'stale',
      'stale',
      'stale',
      'resolved',
    ]);
    expect(tokens.resolutions[0]?.validation.exists).toBe(false);
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

  describe('entry-level pending', () => {
    it('returns pending for a pending token without heuristics or candidates', async () => {
      const root = await flutterTarget();
      // `TS.colors.error` exists in code and would be a heuristic candidate for this id; pending must not look.
      await machineContract(root, {
        tokens: { 'palette.error': { status: 'pending', reason: 'Flutter 暂无该 Token' } },
      });
      const result = await resolveTargetTokens({ targetRoot: root, ids: ['palette.error'] });
      expect(result.warnings).toEqual([]);
      expect(result.resolutions[0]).toMatchObject({
        id: 'palette.error',
        kind: 'token',
        status: 'pending',
        candidates: [],
        nextQueries: [],
        pending: { notice: TARGET_PENDING_NOTICE, reason: 'Flutter 暂无该 Token' },
        validation: { exists: false, importable: false, signatureCompatible: false, usageFound: false },
      });
      expect(result.resolutions[0]?.reason).toBe('Target 待实现：Flutter 暂无该 Token');
      expect(TARGET_PENDING_NOTICE).toBe('Target 待实现');
    });

    it('returns pending for a pending component without candidate substitutes', async () => {
      const root = await flutterTarget();
      // CommonCard would be a heuristic candidate for `card`.
      await machineContract(root, {
        components: {
          card: { status: 'pending', reason: '  组件尚未移植  ' },
          'other.panel': { symbol: 'CommonCard', import: 'common/widgets/widgets.dart' },
        },
      });
      const result = await resolveTargetComponents({ targetRoot: root, ids: ['card', 'other.panel'] });
      expect(result.resolutions[0]).toMatchObject({
        status: 'pending',
        candidates: [],
        pending: { notice: 'Target 待实现', reason: '组件尚未移植' },
      });
      expect(result.resolutions[0]?.declarationSources.map((item) => item.kind)).toEqual(['machine-contract']);
      expect(result.resolutions[1]?.status).toBe('resolved');
    });

    it('rejects a pending entry with a missing or blank reason as a per-entry conflict, not a silent pending', async () => {
      const root = await flutterTarget();
      await machineContract(root, {
        components: {
          'blank.reason': { status: 'pending', reason: '   ' },
          'missing.reason': { status: 'pending' },
          'ok.component': { symbol: 'CommonCard', import: 'common/widgets/widgets.dart' },
        },
      });
      const result = await resolveTargetComponents({
        targetRoot: root,
        ids: ['blank.reason', 'missing.reason', 'ok.component'],
      });
      expect(result.warnings).toEqual([]);
      expect(result.resolutions.map((item) => item.status)).toEqual(['conflict', 'conflict', 'resolved']);
      expect(result.resolutions[0]?.pending).toBeUndefined();
      expect(result.resolutions[0]?.reason).toMatch(/non-empty reason/);
    });

    it('reports a conflict when pending coexists with a concrete mapping for the same id', async () => {
      const root = await flutterTarget();
      await write(
        root,
        'docs/proto-bridge.md',
        `# Adapter\n\n## Token mapping\n\n| Evidence token | Target token |\n| --- | --- |\n| \`palette.critical\` | \`TS.colors.error\` |\n`,
      );
      await machineContract(root, { tokens: { 'palette.critical': { status: 'pending', reason: 'later' } } });
      const result = await resolveTargetTokens({ targetRoot: root, ids: ['palette.critical'] });
      expect(result.resolutions[0]).toMatchObject({ status: 'conflict', candidates: [] });
    });

    it('still treats an unknown entry status as an invalid manifest warning', async () => {
      const root = await flutterTarget();
      await machineContract(root, { tokens: { 'palette.x': { status: 'done', reason: 'x' } } });
      const result = await resolveTargetTokens({ targetRoot: root, ids: ['palette.x'] });
      expect(result.warnings.join('\n')).toMatch(/Invalid proto-bridge\.target\.json/);
    });

    it('gives validation a hint-level pending notice instead of a conflict or needs-review', async () => {
      const root = await flutterTarget();
      await machineContract(root, {
        components: { 'glass.card': { status: 'pending', reason: 'glass 分支未实现' } },
        tokens: { 'asset.logo': { status: 'pending', reason: 'Flutter 无资产键' } },
      });
      await git(root, ['init']);
      await git(root, ['config', 'user.email', 'resolver@example.invalid']);
      await git(root, ['config', 'user.name', 'Resolver Test']);
      await git(root, ['add', '.']);
      await git(root, ['commit', '-m', 'baseline']);

      const validation = await validateTargetChanges({
        targetRoot: root,
        resolvedMappings: [
          { id: 'glass.card', kind: 'component', symbol: 'CommonCard' },
          { id: 'asset.logo', kind: 'token', accessor: 'TS.assets.logo' },
        ],
      });
      expect(validation).toMatchObject({ adapterId: 'flutter', status: 'ok', mappingIssues: [] });
      if (validation.adapterId !== 'flutter') throw new Error('expected flutter adapter');
      expect(validation.pendingNotices).toEqual([
        expect.objectContaining({ id: 'glass.card', kind: 'component', notice: 'Target 待实现', reason: 'glass 分支未实现' }),
        expect.objectContaining({ id: 'asset.logo', kind: 'token', notice: 'Target 待实现', reason: 'Flutter 无资产键' }),
      ]);
      expect(validation.pendingNotices[0]?.detail).toContain('Target 待实现');
    });
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
  await write(
    root,
    'lib/theme/app_tokens.dart',
    'class TS { static final colors = AppColors(); } class AppColors { int get error => 1; }\nfinal fixtureTokenUse = TS.colors.error;\n',
  );
  return root;
}

async function machineContract(
  root: string,
  values: { components?: Record<string, unknown>; tokens?: Record<string, unknown> },
): Promise<void> {
  await write(
    root,
    'proto-bridge.target.json',
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

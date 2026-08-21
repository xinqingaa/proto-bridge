import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { preflightSelection } from '@proto-bridge/core/v2/capture';
import { ProtoBridgeLocalService } from '@proto-bridge/local-service';
import { runCli, CLI_EXIT_CODES, resolveDeliverDraft } from '../src/cli.js';
import { parseCliArgs } from '../src/args.js';
import type { CliIo } from '../src/output.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-cli-'));
  tempRoots.push(root);
  return root;
}

function recorder(cwd: string): {
  io: CliIo;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      cwd,
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      isInteractive: false,
      confirm: async () => false,
    },
    stdout,
    stderr,
  };
}

function manifest() {
  return {
    protocolVersion: 2,
    inputVersion: 'cli-screenshot-v1',
    capabilities: [
      'describe',
      'prepare',
      'readiness',
      'semantic-snapshot',
      'reset',
    ],
    screens: [
      {
        prototypeId: 'sample',
        screenId: 'sample.task-list',
        screenSlug: 'task-list',
        path: '/prototype/sample/task-list',
        defaultVariantId: 'default',
        variants: [{ variantId: 'default', label: '默认' }],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function screenshotDraft() {
  return {
    prototypeId: 'sample',
    screens: [
      {
        screenId: 'sample.task-list',
        variants: { mode: 'explicit', variantIds: ['default'] },
        themeIds: ['light'],
        deviceIds: ['iphone-14'],
        scenarios: { mode: 'none' },
        captureScope: {
          fragments: [],
          screenshots: { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: false,
          evidenceInputMode: 'screenshot-only',
          minEvidenceLevel: 'screenshot-only',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

function coldChainManifest() {
  const screen = (
    screenSlug: string,
    variantCount: number,
    scenarioCount: number,
  ) => ({
    prototypeId: 'cold-chain-ops',
    screenId: `cold-chain-ops.${screenSlug}`,
    screenSlug,
    path: `/prototype/cold-chain-ops/${screenSlug}`,
    defaultVariantId: 'state-1',
    variants: Array.from({ length: variantCount }, (_, index) => ({
      variantId: `state-${index + 1}`,
      label: `状态 ${index + 1}`,
    })),
    actions: Array.from({ length: scenarioCount }, (_, index) => ({
      actionId: `action-${index + 1}`,
      kind: 'click' as const,
      target: {
        screenId: `cold-chain-ops.${screenSlug}`,
        pbId: `cold-chain-ops.${screenSlug}.action-${index + 1}`,
      },
    })),
    scenarios: Array.from({ length: scenarioCount }, (_, index) => ({
      scenarioId: `scenario-${index + 1}`,
      label: `场景 ${index + 1}`,
      ownerScreenId: `cold-chain-ops.${screenSlug}`,
      initialVariantId: 'state-1',
      actionIds: [`action-${index + 1}`],
      checkpoints: [
        {
          checkpointId: `checkpoint-${index + 1}`,
          screenId: `cold-chain-ops.${screenSlug}`,
          variantId: 'state-1',
          requiredFragments: [],
        },
      ],
    })),
  });
  return {
    protocolVersion: 2,
    inputVersion: 'cold-chain-cli-parity',
    capabilities: [
      'describe',
      'prepare',
      'readiness',
      'semantic-snapshot',
      'reset',
      'scenario',
    ],
    screens: [
      screen('exception-queue', 5, 2),
      screen('shipment-detail', 5, 2),
      screen('resolution-form', 7, 3),
    ],
  };
}

describe('ProtoBridge CLI', () => {
  it('expands whole-Prototype and one-Screen deliver intent to 24 and 7 Cases', async () => {
    const root = await tempRoot();
    const manifestPath = path.join(root, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(coldChainManifest()));
    const loaded = {
      value: { runtime: { baseUrl: 'http://127.0.0.1:3977' } },
    } as any;

    const whole = await resolveDeliverDraft(
      parseCliArgs([
        'deliver',
        '--prototype',
        'cold-chain-ops',
        '--manifest',
        manifestPath,
      ]),
      loaded,
    );
    expect(
      preflightSelection(whole!, coldChainManifest() as any).matrix,
    ).toHaveLength(24);

    const oneScreen = await resolveDeliverDraft(
      parseCliArgs([
        'deliver',
        '--prototype',
        'cold-chain-ops',
        '--screen',
        'exception-queue',
        '--manifest',
        manifestPath,
      ]),
      loaded,
    );
    expect(
      preflightSelection(oneScreen!, coldChainManifest() as any).matrix,
    ).toHaveLength(7);
  });
  it('exposes the Evidence commands directly without a legacy prefix', async () => {
    const root = await tempRoot();
    const output = recorder(root);

    expect(await runCli(['--help'], output.io)).toBe(CLI_EXIT_CODES.ok);
    const usage = output.stdout.join('\n');
    expect(usage).toContain('proto-bridge workspace init');
    expect(usage).toContain('proto-bridge deliver --prototype <id>');
    expect(usage).toContain('--acknowledge-unofficial-capture');
    expect(usage).toContain('delivery.targetRoot');
    expect(usage).not.toContain('proto-bridge v2');
    expect(usage).not.toContain('proto-bridge generate');
  });

  it('creates and diagnoses an explicit Workspace config', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    expect(
      await runCli(
        [
          'workspace',
          'init',
          '--workspace',
          'cli-test',
          '--runtime',
          'http://127.0.0.1:3977',
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    const config = JSON.parse(
      await readFile(path.join(root, 'proto-bridge.json'), 'utf8'),
    );
    expect(config).toMatchObject({
      schemaVersion: 1,
      workspaceId: 'cli-test',
      delivery: { targetRoot: 'apps/flutter_pb_app' },
      service: {
        allowedOrigins: ['http://127.0.0.1:3977'],
      },
    });
    expect(await runCli(['workspace', 'doctor', '--json'], output.io)).toBe(
      CLI_EXIT_CODES.ok,
    );
    expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
      workspaceId: 'cli-test',
      bundles: 0,
    });
  });

  it('runs workspace doctor while another process holds the writer lock', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'cli-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const { LocalFileStore } = await import('@proto-bridge/core/v2/store');
    const writer = new LocalFileStore({
      root: path.join(root, '.proto-bridge', 'store'),
      workspaceId: 'cli-test' as never,
    });
    await writer.init();
    try {
      expect(await runCli(['workspace', 'doctor', '--json'], output.io)).toBe(
        CLI_EXIT_CODES.ok,
      );
      expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
        workspaceId: 'cli-test',
      });
    } finally {
      await writer.close();
    }
  });

  it('requires explicit reinitialize after external Store destruction', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli([
      'workspace', 'init', '--workspace', 'cli-reinitialize-test', '--runtime', 'http://127.0.0.1:3977',
    ], output.io);
    const storeRoot = path.join(root, '.proto-bridge', 'store');
    await rm(storeRoot, { recursive: true, force: true });

    expect(await runCli(['workspace', 'doctor', 'repair', '--json'], output.io)).toBe(CLI_EXIT_CODES.error);
    await expect(access(storeRoot)).rejects.toThrow();
    expect(await runCli([
      'workspace', 'reinitialize', '--confirm-destroyed', 'cli-reinitialize-test', '--json',
    ], output.io)).toBe(CLI_EXIT_CODES.ok);
    expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
      workspaceId: 'cli-reinitialize-test',
      reinitialized: true,
      lifecycle: { storeLayoutVersion: 3 },
    });
  });

  it('previews Workspace reset, then clears Store and deliveries while preserving config', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'cli-reset-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const storeRoot = path.join(root, '.proto-bridge', 'store');
    const deliveriesRoot = path.join(root, '.proto-bridge', 'deliveries');
    await writeFile(path.join(storeRoot, 'old-capture.txt'), 'old', 'utf8');
    await mkdir(deliveriesRoot, { recursive: true });
    await writeFile(path.join(deliveriesRoot, 'old-prompt.md'), 'old', 'utf8');

    expect(
      await runCli(['workspace', 'reset', '--json'], output.io),
    ).toBe(CLI_EXIT_CODES.ok);
    const preview = JSON.parse(output.stdout.at(-1) ?? '{}');
    expect(preview).toMatchObject({
      workspaceId: 'cli-reset-test',
      applied: false,
    });
    await expect(access(path.join(storeRoot, 'old-capture.txt'))).resolves.toBeUndefined();

    expect(
      await runCli(
        ['workspace', 'reset', '--apply', '--plan-id', preview.planId, '--generation', preview.generationId, '--json'],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
      workspaceId: 'cli-reset-test',
      applied: true,
    });
    await expect(access(path.join(storeRoot, 'old-capture.txt'))).rejects.toThrow();
    await expect(access(deliveriesRoot)).rejects.toThrow();
    await expect(access(path.join(storeRoot, 'workspace.json'))).resolves.toBeUndefined();
    await expect(access(path.join(root, 'proto-bridge.json'))).resolves.toBeUndefined();
  });

  it('resets through a running Local Service without requiring a manual stop', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'cli-live-reset-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const configPath = path.join(root, 'proto-bridge.json');
    const storeRoot = path.join(root, '.proto-bridge', 'store');
    const deliveriesRoot = path.join(root, '.proto-bridge', 'deliveries');
    await writeFile(path.join(storeRoot, 'old-capture.txt'), 'old', 'utf8');
    await mkdir(deliveriesRoot, { recursive: true });
    await writeFile(path.join(deliveriesRoot, 'old-prompt.md'), 'old', 'utf8');
    const liveService = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: ['http://127.0.0.1:3977'],
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      storeRoot,
      workspaceId: 'cli-live-reset-test',
      deliveryTargetRoot: path.join(root, 'delivery-target'),
    });
    const address = await liveService.start();
    try {
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      config.service.port = address.port;
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

      expect(await runCli(['workspace', 'reset', '--json'], output.io)).toBe(CLI_EXIT_CODES.ok);
      const preview = JSON.parse(output.stdout.at(-1) ?? '{}');
      const resetExit = await runCli(
        ['workspace', 'reset', '--apply', '--plan-id', preview.planId, '--generation', preview.generationId, '--json'],
        output.io,
      );
      expect(resetExit, output.stderr.join('\n')).toBe(CLI_EXIT_CODES.ok);
      expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
        workspaceId: 'cli-live-reset-test',
        applied: true,
        viaService: true,
      });
      await expect(access(path.join(storeRoot, 'old-capture.txt'))).rejects.toThrow();
      await expect(access(deliveriesRoot)).rejects.toThrow();
      await expect(access(path.join(storeRoot, 'workspace.json'))).resolves.toBeUndefined();
      expect(await liveService.store.listBundles()).toEqual([]);
    } finally {
      await liveService.close();
    }
  });

  it('uses one Matrix for preflight and screenshot-only Capture', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'cli-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const manifestPath = path.join(root, 'manifest.json');
    const selectionPath = path.join(root, 'selection.json');
    const screenshotPath = path.join(root, 'screen.png');
    await writeFile(manifestPath, JSON.stringify(manifest()), 'utf8');
    await writeFile(selectionPath, JSON.stringify(screenshotDraft()), 'utf8');
    await writeFile(
      screenshotPath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    );

    expect(
      await runCli(
        [
          'preflight',
          '--selection',
          selectionPath,
          '--manifest',
          manifestPath,
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    const preflight = JSON.parse(output.stdout.at(-1) ?? '{}');
    expect(preflight.matrix).toHaveLength(1);

    expect(
      await runCli(
        [
          'capture',
          'run',
          '--selection',
          selectionPath,
          '--manifest',
          manifestPath,
          '--screenshot',
          screenshotPath,
          '--bundle',
          'cli-screenshot',
          '--acknowledge-unofficial-capture',
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    const capture = JSON.parse(output.stdout.at(-1) ?? '{}');
    expect(capture.snapshot.activeSlots).toHaveLength(1);
    expect(capture.storedBlobIds).toHaveLength(1);
    const snapshotId = capture.snapshot.snapshotId as string;

    expect(
      await runCli(
        ['bundle', 'inspect', '--bundle', 'cli-screenshot', '--json'],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    const evidence = JSON.parse(output.stdout.at(-1) ?? '{}');
    expect(evidence.summary.screenshots).toBe(1);

    expect(
      await runCli(
        [
          'stale',
          'check',
          '--bundle',
          'cli-screenshot',
          '--snapshot',
          snapshotId,
          '--manifest',
          manifestPath,
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    expect(
      await runCli(
        [
          'handoff',
          'create',
          '--bundle',
          'cli-screenshot',
          '--snapshot',
          snapshotId,
          '--manifest',
          manifestPath,
          '--intent',
          'Implement task-list shell',
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    const handoff = JSON.parse(output.stdout.at(-1) ?? '{}');
    expect(handoff.snapshotId).toBe(snapshotId);

    const exportPath = path.join(root, 'handoff.json');
    expect(
      await runCli(
        [
          'handoff',
          'export',
          '--handoff',
          handoff.handoffId,
          '--output',
          exportPath,
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    expect(JSON.parse(await readFile(exportPath, 'utf8')).handoffId).toBe(
      handoff.handoffId,
    );

    expect(
      await runCli(
        ['bundle', 'archive', '--bundle', 'cli-screenshot', '--json'],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.ok);
    expect(
      await runCli(
        [
          'capture',
          'run',
          '--selection',
          selectionPath,
          '--manifest',
          manifestPath,
          '--screenshot',
          screenshotPath,
          '--bundle',
          'cli-screenshot',
          '--acknowledge-unofficial-capture',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.blocked);
  });

  it('rejects a global risk bypass', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    expect(await runCli(['preflight', '--force'], output.io)).toBe(
      CLI_EXIT_CODES.error,
    );
    expect(output.stderr.join('\n')).toContain('--force is not supported');
  });

  it('blocks unofficial capture without acknowledgement in non-interactive mode', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'cli-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const manifestPath = path.join(root, 'manifest.json');
    const selectionPath = path.join(root, 'selection.json');
    const screenshotPath = path.join(root, 'screen.png');
    await writeFile(manifestPath, JSON.stringify(manifest()), 'utf8');
    await writeFile(selectionPath, JSON.stringify(screenshotDraft()), 'utf8');
    await writeFile(
      screenshotPath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    expect(
      await runCli(
        [
          'capture',
          'run',
          '--selection',
          selectionPath,
          '--manifest',
          manifestPath,
          '--screenshot',
          screenshotPath,
          '--bundle',
          'cli-unofficial',
          '--json',
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.blocked);
    expect(output.stderr.join('\n')).toContain('--acknowledge-unofficial-capture');
  });

  it('produces the same Matrix as the PBWork Local Service', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    await runCli(
      [
        'workspace',
        'init',
        '--workspace',
        'matrix-test',
        '--runtime',
        'http://127.0.0.1:3977',
      ],
      output.io,
    );
    const manifestPath = path.join(root, 'manifest.json');
    const selectionPath = path.join(root, 'selection.json');
    await writeFile(manifestPath, JSON.stringify(manifest()), 'utf8');
    await writeFile(selectionPath, JSON.stringify(screenshotDraft()), 'utf8');
    await runCli(
      [
        'preflight',
        '--selection',
        selectionPath,
        '--manifest',
        manifestPath,
        '--json',
      ],
      output.io,
    );
    const cliPreflight = JSON.parse(output.stdout.at(-1) ?? '{}');

    const origin = 'http://127.0.0.1:3977';
    const service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot: path.join(root, 'service-store'),
      workspaceId: 'matrix-test',
      deliveryTargetRoot: path.join(root, 'delivery-target'),
      preflightProvider: async (draft) => ({
        preflight: preflightSelection(draft, manifest()),
      }),
    });
    try {
      const address = await service.start();
      const base = `http://${address.host}:${address.port}/api/v2`;
      const sessionResponse = await fetch(`${base}/session`, {
        method: 'POST',
        headers: { Origin: origin },
      });
      const session = (await sessionResponse.json()) as any;
      const response = await fetch(`${base}/preflights`, {
        method: 'POST',
        headers: {
          Origin: origin,
          Authorization: `Bearer ${session.data.sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draft: screenshotDraft() }),
      });
      const servicePreflight = (await response.json()) as any;
      expect(servicePreflight.data.result.selection).toEqual(
        cliPreflight.selection,
      );
      expect(servicePreflight.data.result.matrix).toEqual(cliPreflight.matrix);
    } finally {
      await service.close();
    }
  });
});

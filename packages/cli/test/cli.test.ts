import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { preflightSelection } from '@proto-bridge/core/v2/capture';
import { ProtoBridgeLocalService } from '@proto-bridge/local-service';
import { runCli, CLI_EXIT_CODES } from '../src/cli.js';
import type { CliIo } from '../src/output.js';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
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
    },
    stdout,
    stderr,
  };
}

function manifest() {
  return {
    protocolVersion: 2,
    inputVersion: 'cli-screenshot-v1',
    capabilities: ['describe', 'prepare', 'readiness', 'semantic-snapshot', 'reset'],
    screens: [
      {
        prototypeId: 'ledger-planet',
        screenId: 'ledger-planet.task-list',
        screenSlug: 'task-list',
        path: '/prototype/ledger-planet/task-list',
        defaultVariantId: 'default',
        variants: [{ variantId: 'default', critical: false }],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function screenshotDraft() {
  return {
    prototypeId: 'ledger-planet',
    screens: [
      {
        screenId: 'ledger-planet.task-list',
        variants: { mode: 'default' },
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

describe('ProtoBridge CLI', () => {
  it('exposes the Evidence commands directly without a legacy prefix', async () => {
    const root = await tempRoot();
    const output = recorder(root);

    expect(await runCli(['--help'], output.io)).toBe(CLI_EXIT_CODES.ok);
    const usage = output.stdout.join('\n');
    expect(usage).toContain('proto-bridge workspace init');
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
      service: {
        allowedOrigins: ['http://127.0.0.1:3977'],
      },
    });
    expect(
      await runCli(['workspace', 'doctor', '--json'], output.io),
    ).toBe(CLI_EXIT_CODES.ok);
    expect(JSON.parse(output.stdout.at(-1) ?? '{}')).toMatchObject({
      workspaceId: 'cli-test',
      bundles: 0,
    });
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
        ],
        output.io,
      ),
    ).toBe(CLI_EXIT_CODES.blocked);
  });

  it('rejects a global risk bypass', async () => {
    const root = await tempRoot();
    const output = recorder(root);
    expect(
      await runCli(['preflight', '--force'], output.io),
    ).toBe(CLI_EXIT_CODES.error);
    expect(output.stderr.join('\n')).toContain('--force is not supported');
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

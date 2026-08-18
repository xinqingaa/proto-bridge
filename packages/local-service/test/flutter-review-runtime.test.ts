import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ReviewSession } from '@proto-bridge/core/review';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FlutterMcpProvider,
  type FlutterMcpTransport,
  type McpToolDefinition,
} from '../src/flutter-mcp-provider.js';
import { FlutterReviewRuntime } from '../src/flutter-review-runtime.js';

class ScenarioTransport implements FlutterMcpTransport {
  readonly calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  private observations = 0;

  constructor(private readonly targetRoot: string) {}

  async initialize() {
    return { protocolVersion: '2025-06-18', serverInfo: { name: 'dart-mcp-server', version: 'fixture' } };
  }

  async listTools(): Promise<McpToolDefinition[]> {
    return ['dtd', 'flutter_driver_command', 'widget_inspector', 'get_runtime_errors', 'vm_service'].map((name) => ({ name }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.calls.push({ name, args });
    if (name === 'dtd' && args.command === 'listDtdUris') return { dtdUris: [{ uri: 'ws://fixture-dtd', workingDirectory: this.targetRoot }] };
    if (name === 'dtd' && args.command === 'connect') return { connected: true };
    if (name === 'dtd' && args.command === 'listConnectedApps') return { apps: [{ applicationIdentity: 'runtime-test', uri: 'ws://fixture-app' }] };
    if (name === 'vm_service' && args.method === 'getVM') return { isolates: [{ id: 'isolates/1' }] };
    if (name === 'vm_service' && args.method === 'ext.protoBridge.identity') return { result: applicationReceipt() };
    if (name === 'vm_service' && args.method === 'ext.protoBridge.prepare') return { result: { ready: true } };
    if (name === 'vm_service' && args.method === 'ext.protoBridge.observe') {
      this.observations += 1;
      return { result: state(this.observations === 1 ? 'closed' : 'open') };
    }
    if (name === 'widget_inspector') return { result: { summaryTree: 'fixture' } };
    if (name === 'flutter_driver_command' && args.command === 'tap') return { result: { tapped: true } };
    if (name === 'get_runtime_errors') return { content: [{ type: 'text', text: 'No recent runtime errors.' }] };
    throw new Error(`Unexpected fake Flutter MCP call ${name}:${String(args.command ?? args.method)}`);
  }

  async close(): Promise<void> {}
}

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe('Flutter Review Runtime', () => {
  it('replays a declarative Scenario through one attached official MCP App session', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-runtime-'));
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, 'proto-bridge.target.json'), JSON.stringify({
      version: 1,
      technology: 'flutter',
      review: {
        version: 2,
        provider: 'dart-flutter-mcp',
        runtime: {
          applicationIdentity: 'runtime-test',
          identityServiceExtension: 'ext.protoBridge.identity',
          prepareServiceExtension: 'ext.protoBridge.prepare',
          observeServiceExtension: 'ext.protoBridge.observe',
          reviewHarnessVersion: '1',
          textEntryEmulation: true,
        },
        cases: { 'sample::open': { screenId: 'sample', route: '/sample' } },
        scenarios: {
          'sample::open': {
            screenId: 'sample', scenarioId: 'open', checkpointId: 'opened',
            actions: [{ actionId: 'open', kind: 'tap', targetRegionId: 'sample.trigger', finder: { kind: 'value-key', value: 'open-trigger' } }],
          },
        },
      },
    }));
    const transport = new ScenarioTransport(root);
    const provider = new FlutterMcpProvider({ retryDelayMs: 0, transportFactory: () => transport });
    const replayed = await new FlutterReviewRuntime(provider).replay(session(root), { caseId: 'sample::open' });

    expect(replayed.transition).toMatchObject({
      caseId: 'sample::open', scenarioId: 'open', checkpointId: 'opened',
      preState: { shell: { variantId: 'closed' } },
      actions: [{ actionId: 'open', kind: 'click', targetRegionId: 'sample.trigger' }],
      postState: { shell: { variantId: 'open' } },
    });
    expect(replayed.runtimeReceipt).toMatchObject({
      operation: 'scenario', providerId: 'dart-flutter-mcp', targetCommit: 'baseline',
      targetContentDigest: 'sha256:target-content', appBuildDigest: 'sha256:app-build',
    });
    expect(transport.calls.some((item) => item.name === 'flutter_driver_command' && item.args.command === 'tap' && item.args.appUri === 'ws://fixture-app')).toBe(true);
    expect(transport.calls.some((item) => ['launch_app', 'list_devices', 'stop_app'].includes(item.name))).toBe(false);
  });
});

function applicationReceipt() {
  return {
    applicationIdentity: 'runtime-test', targetCommit: 'baseline',
    targetContentDigest: 'sha256:target-content', appBuildDigest: 'sha256:app-build',
    reviewHarnessVersion: '1', platform: 'fixture-device', textEntryEmulation: true,
  };
}

function state(variantId: string) {
  return {
    caseId: 'sample::open', shell: { screenId: 'sample', variantId },
    visibleRegionIds: variantId === 'open' ? ['sample.trigger', 'sample.panel'] : ['sample.trigger'],
    keyedCollections: [], values: [], complete: true, unknownKeys: [],
  };
}

function session(targetRoot: string): ReviewSession {
  return {
    reviewRunId: 'review-runtime-test', workspaceId: 'workspace', generationId: 'generation',
    bundleId: 'bundle', snapshotId: 'snapshot', handoffId: 'handoff', targetRoot,
    targetBaselineCommit: 'baseline', targetRevision: 'revision', targetContentDigest: 'sha256:target-content',
    selectedCaseIds: ['sample::open'], requiredSourceDigests: [], requiredScenarioCaseIds: ['sample::open'],
    obligationContractVersion: 1, requiredObligations: [], verificationContractVersion: 1,
    reviewProfile: { contractVersion: 1, coverageProfile: 'l3-full', reasonCodes: [], excludedCaseIds: [], excludedScenarioCaseIds: [] },
    runtimeProvider: { required: true, providerId: 'dart-flutter-mcp' }, comparatorVersion: 'fixture',
    createdAt: '2026-08-18T00:00:00.000Z', status: 'active', codeReviewStatus: 'pending',
    runtimeReviewStatus: 'pending', reviewOutcome: 'pending', eventHeadDigest: 'sha256:event', eventCount: 1,
    viewedSourceDigests: [], renderedSourceDigests: [], replayedScenarioCaseIds: [], authorizedTranches: [],
    attempts: [], findings: [], obligationAssessments: [], verifierReceipts: [], providerFailures: [],
    runtimeOperationReceipts: [], artifacts: [],
  };
}

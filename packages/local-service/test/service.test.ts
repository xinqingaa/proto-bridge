import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fact } from '@proto-bridge/core/v2';
import type { AgentHandoff } from '@proto-bridge/core/v2';
import { compileReconstructionObligations, reviewVerifierReceiptDigest } from '@proto-bridge/core/review';
import { buildAcceptanceContractFromStore, LocalFileStore } from '@proto-bridge/core/v2/store';
import { readTargetIdentity } from '@proto-bridge/core/target';
import type { RuntimeCaptureManifest } from '@proto-bridge/core/v2/runtime-contract';
import {
  preflightSelection,
  type CaptureCaseInput,
  type CapturedCase,
  type CaseCaptureDriver,
  type SelectionDraft,
} from '@proto-bridge/core/v2/capture';
import { ProtoBridgeLocalService } from '../src/service.js';
import {
  FlutterMcpProvider,
  type FlutterMcpTransport,
  type McpToolDefinition,
} from '../src/flutter-mcp-provider.js';

const origin = 'http://127.0.0.1:3977';
const execFileAsync = promisify(execFile);
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const TARGET_PNG_BYTES = Buffer.from(PNG_BYTES);
TARGET_PNG_BYTES[30] = TARGET_PNG_BYTES[30]! ^ 1;

class ServiceFlutterMcpTransport implements FlutterMcpTransport {
  constructor(private readonly targetRoot: string) {}

  async initialize() {
    return { protocolVersion: '2025-06-18', serverInfo: { name: 'dart-mcp-server', version: 'fixture' } };
  }

  async listTools(): Promise<McpToolDefinition[]> {
    return [
      { name: 'connect_dart_tooling_daemon' },
      { name: 'get_widget_tree' },
      { name: 'get_runtime_errors' },
      { name: 'flutter_driver', inputSchema: { type: 'object', properties: { command: { type: 'string', enum: ['get_text', 'tap', 'enter_text', 'waitFor', 'scroll', 'scrollIntoView', 'screenshot'] } } } },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (name === 'connect_dart_tooling_daemon') return { connected: true };
    if (name === 'flutter_driver' && args.command === 'get_text' && args.keyValueString === 'pb.review.identity') {
      const identity = await readTargetIdentity(this.targetRoot);
      return { content: [{ type: 'text', text: JSON.stringify({
        applicationIdentity: 'target-service-test', targetCommit: identity.head,
        targetContentDigest: identity.contentDigest, appBuildDigest: 'sha256:fixture-app',
        reviewHarnessVersion: '1', platform: 'fixture-device', textEntryEmulation: true,
      }) }] };
    }
    if (name === 'flutter_driver' && args.command === 'get_text' && args.keyValueString === 'pb.review.observation') {
      return { content: [{ type: 'text', text: JSON.stringify({
        state: {
          caseId: this.caseId, shell: { screenId: 'sample.task-list', variantId: 'default' },
          visibleRegionIds: [], keyedCollections: [], values: [], complete: true, unknownKeys: [],
        },
        structure: {
          caseId: this.caseId, regions: [], rootRegionIds: [], siblingGroups: [], siblingRelations: [], scrollContainers: [],
          complete: true, unknownRegionIds: [],
        },
      }) }] };
    }
    if (name === 'get_widget_tree') return { result: { summaryTree: 'fixture' } };
    if (name === 'flutter_driver' && args.command === 'enter_text') { this.caseId = String(args.text); return { result: { entered: true } }; }
    if (name === 'flutter_driver' && ['tap', 'waitFor'].includes(String(args.command))) return { result: { ok: true } };
    if (name === 'flutter_driver' && args.command === 'screenshot') {
      return { content: [{ type: 'image', mimeType: 'image/png', data: TARGET_PNG_BYTES.toString('base64') }] };
    }
    if (name === 'get_runtime_errors') return { content: [{ type: 'text', text: 'No recent runtime errors.' }] };
    throw new Error(`Unexpected fake Flutter MCP call ${name}:${String(args.command ?? args.method)}`);
  }

  async close(): Promise<void> {}

  private caseId = '';
}

function manifest(): RuntimeCaptureManifest {
  return {
    protocolVersion: 2,
    inputVersion: 'stage-four-service-input',
    capabilities: [
      'describe',
      'prepare',
      'readiness',
      'semantic-snapshot',
      'reset',
      'scenario',
    ],
    screens: [
      {
        prototypeId: 'sample',
        screenId: 'sample.task-list',
        screenSlug: 'task-list',
        path: '/prototype/sample/task-list',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', label: '默认' },
          { variantId: 'claimable', label: '可领取' },
        ],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function draft(sourcePolicy = false): SelectionDraft {
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
          sourcePolicy,
          debugPolicy: false,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

class FakeDriver implements CaseCaptureDriver {
  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    const fact: Fact = {
      factId: `${input.entry.selectedCase.caseId}.page`,
      candidates: [
        {
          value: 'page',
          provenance: { source: 'data-pb', locator: 'root' },
        },
      ],
      resolution: 'resolved',
      effectiveValue: 'page',
    };
    return {
      evidenceLevel: 'instrumented-runtime',
      facts: [fact],
      requiredFactsTotal: 1,
      requiredFactsResolved: 1,
      binaries: [
        {
          kind: 'screenshot',
          mediaType: 'image/png',
          bytes: PNG_BYTES,
        },
      ],
      diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    };
  }
}

class FailingDriver implements CaseCaptureDriver {
  async captureCase(): Promise<CapturedCase> {
    throw new Error('fixture case failed for finalization recovery');
  }
}

class SuccessThenWaitDriver extends FakeDriver {
  calls = 0;
  private resolveSecond!: () => void;
  private rejectSecond!: (reason: Error) => void;
  readonly secondCaseStarted = new Promise<void>((resolve) => {
    this.resolveSecond = resolve;
  });

  override async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    this.calls += 1;
    if (this.calls === 1) return super.captureCase(input);
    this.resolveSecond();
    return new Promise<CapturedCase>((_resolve, reject) => {
      this.rejectSecond = reject;
      const cancel = () => reject(new Error('cancelled by lifecycle test'));
      if (input.signal?.aborted) {
        cancel();
        return;
      }
      input.signal?.addEventListener('abort', cancel, { once: true });
    });
  }

  failPendingCase(): void {
    this.rejectSecond?.(new Error('simulated abandoned Service process'));
  }
}

let root: string | undefined;
let service: ProtoBridgeLocalService | undefined;

afterEach(async () => {
  await service?.close().catch(() => undefined);
  service = undefined;
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function start(
  preflightTtlMs = 60_000,
  driverFactory: () => CaseCaptureDriver = () => new FakeDriver(),
) {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-local-service-'));
  const deliveryTargetRoot = path.join(root, 'delivery-target');
  await mkdir(deliveryTargetRoot, { recursive: true });
  service = new ProtoBridgeLocalService({
    port: 0,
    allowedOrigins: [origin],
    runtimeBaseUrl: origin,
    storeRoot: path.join(root, 'store'),
    workspaceId: 'workspace-service-test',
    deliveryTargetRoot,
    preflightTtlMs,
    preflightProvider: async (selection) => ({
      preflight: preflightSelection(selection, manifest()),
    }),
    driverFactory,
    flutterMcpProviderFactory: () => new FlutterMcpProvider({
      dtdUri: 'ws://fixture-dtd',
      retryDelayMs: 0,
      transportFactory: ({ cwd }) => new ServiceFlutterMcpTransport(cwd),
    }),
  });
  const address = await service.start();
  return `http://${address.host}:${address.port}/api/v2`;
}

async function call(
  base: string,
  pathName: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
) {
  const response = await fetch(`${base}${pathName}`, {
    method: options.method ?? 'GET',
    headers: {
      Origin: origin,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  return { response, body: (await response.json()) as any };
}

describe('ProtoBridge Local Service', () => {
  it('requires an Origin/session and keeps the token out of URLs', async () => {
    const base = await start();
    const unauthorized = await call(base, '/console');
    expect(unauthorized.response.status).toBe(401);
    const session = await call(base, '/session', { method: 'POST' });
    expect(session.body.data.protocolVersion).toBe(6);
    expect(session.body.data.deliveryTargetRoot).toBe(
      path.join(root!, 'delivery-target'),
    );
    expect(session.response.status).toBe(201);
    expect(session.body.data.sessionToken).not.toContain('/');
    const state = await call(base, '/console', {
      token: session.body.data.sessionToken,
    });
    expect(state.body.data.workspaceId).toBe('workspace-service-test');
  });

  it('migrates an old final record only as diagnostic when fixed Evidence references do not verify', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const startedAt = new Date().toISOString();
    const document = {
      schemaVersion: 1,
      workspaceId: 'workspace-service-test',
      generationId: session.body.data.generationId,
      revision: 1,
      records: {
        sample: {
          prototypeId: 'sample',
          stage: 'final',
          operation: { kind: 'idle' },
          artifacts: {
            jobId: 'job-missing',
            bundleId: 'bundle-missing',
            snapshotId: 'snapshot-missing',
            handoffId: 'handoff-missing',
            deliveryId: 'old-delivery',
            agentPromptPath: path.join(root!, 'deliveries', 'old-delivery', 'agent-prompt.md'),
            receiptPath: path.join(root!, 'deliveries', 'old-delivery', 'receipt.json'),
            finalizedAt: startedAt,
            operationKey: '00000000-0000-4000-8000-000000000031',
            requestDigest: `sha256:${'a'.repeat(64)}`,
          },
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      },
      history: [],
      updatedAt: startedAt,
    };
    const migrated = await call(base, '/prototype-lifecycle/migrate', {
      method: 'POST',
      token,
      body: { document },
    });
    expect(migrated.response.status).toBe(201);
    expect(migrated.body.data.records.sample).toMatchObject({
      stage: 'review',
      operation: {
        kind: 'failed',
        action: 'finalize',
        message: expect.stringContaining('Evidence 仅作诊断'),
      },
      artifacts: null,
    });
    const repeated = await call(base, '/prototype-lifecycle/migrate', {
      method: 'POST',
      token,
      body: { document },
    });
    expect(repeated.response.status).toBe(409);
  });

  it('lists only unsuccessful Run attempts for a cancelled finalization and preserves composite Case IDs', async () => {
    const driver = new SuccessThenWaitDriver();
    const base = await start(60_000, () => driver);
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const startedAt = new Date().toISOString();
    const prototypeId = 'sample';
    const operationKey = '00000000-0000-4000-8000-000000000052';
    const lifecycle = await call(base, '/prototype-lifecycle', { token });
    const activeRecord = {
      prototypeId,
      stage: 'active',
      operation: { kind: 'idle' },
      artifacts: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    const activeDocument = {
      ...lifecycle.body.data,
      revision: 1,
      records: { [prototypeId]: activeRecord },
      updatedAt: startedAt,
    };
    const activeSaved = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 0, document: activeDocument },
    });
    const document = {
      ...activeSaved.body.data,
      revision: 2,
      records: {
        [prototypeId]: {
          ...activeRecord,
          stage: 'review',
          operation: {
            kind: 'finalizing',
            operationKey,
            phase: 'preflighting',
            startedAt,
            acceptedWarningIds: [],
            acknowledgedRiskKinds: [],
          },
        },
      },
      updatedAt: startedAt,
    };
    const finalizationStarted = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 1, document },
    });
    expect(finalizationStarted.response.status).toBe(200);
    const confirmationDocument = {
      ...finalizationStarted.body.data,
      revision: 3,
      records: {
        [prototypeId]: {
          ...finalizationStarted.body.data.records[prototypeId],
          operation: {
            ...finalizationStarted.body.data.records[prototypeId].operation,
            phase: 'awaiting-confirmation',
          },
        },
      },
      updatedAt: new Date().toISOString(),
    };
    const confirmation = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 2, document: confirmationDocument },
    });
    expect(confirmation.response.status).toBe(200);

    const selection = draft();
    const screen = selection.screens[0]!;
    screen.variants = { mode: 'explicit', variantIds: ['default', 'claimable'] };
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: selection },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
        operationKey,
      },
    });
    expect(accepted.response.status).toBe(202);
    await driver.secondCaseStarted;
    await call(base, `/jobs/${accepted.body.data.job.jobId}/cancel`, {
      method: 'POST',
      token,
    });

    let failedRecord: any;
    let terminalJob: any;
    for (let index = 0; index < 100; index += 1) {
      const [currentLifecycle, currentJob] = await Promise.all([
        call(base, '/prototype-lifecycle', { token }),
        call(base, `/jobs/${accepted.body.data.job.jobId}`, { token }),
      ]);
      failedRecord = currentLifecycle.body.data.records[prototypeId];
      terminalJob = currentJob.body.data;
      if (failedRecord?.operation.kind === 'failed' && terminalJob?.status === 'cancelled') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(terminalJob.status).toBe('cancelled');
    const run = await service!.store.getRun(terminalJob.bundleId, terminalJob.runId);
    const unsuccessfulAttempts = run!.attempts.filter(
      (attempt) => !['captured', 'reused'].includes(attempt.result),
    );
    expect(unsuccessfulAttempts).toHaveLength(1);
    expect(unsuccessfulAttempts[0]!.caseId).toContain('::');
    expect(failedRecord.operation.failedCases).toEqual([
      {
        caseId: unsuccessfulAttempts[0]!.caseId,
        reason: unsuccessfulAttempts[0]!.reason ?? unsuccessfulAttempts[0]!.result,
      },
    ]);
  });

  it('uses the journal only when an interrupted Job has no Run attempts', async () => {
    const driver = new SuccessThenWaitDriver();
    let base = await start(60_000, () => driver);
    let session = await call(base, '/session', { method: 'POST' });
    let token = session.body.data.sessionToken as string;
    const startedAt = new Date().toISOString();
    const prototypeId = 'sample';
    const operationKey = '00000000-0000-4000-8000-000000000055';
    const lifecycle = await call(base, '/prototype-lifecycle', { token });
    const activeRecord = {
      prototypeId,
      stage: 'active',
      operation: { kind: 'idle' },
      artifacts: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    const activeSaved = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: {
        expectedRevision: 0,
        document: {
          ...lifecycle.body.data,
          revision: 1,
          records: { [prototypeId]: activeRecord },
          updatedAt: startedAt,
        },
      },
    });
    const finalizingSaved = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: {
        expectedRevision: 1,
        document: {
          ...activeSaved.body.data,
          revision: 2,
          records: {
            [prototypeId]: {
              ...activeRecord,
              stage: 'review',
              operation: {
                kind: 'finalizing',
                operationKey,
                phase: 'preflighting',
                startedAt,
                acceptedWarningIds: [],
                acknowledgedRiskKinds: [],
              },
            },
          },
          updatedAt: startedAt,
        },
      },
    });
    const confirmation = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: {
        expectedRevision: 2,
        document: {
          ...finalizingSaved.body.data,
          revision: 3,
          records: {
            [prototypeId]: {
              ...finalizingSaved.body.data.records[prototypeId],
              operation: {
                ...finalizingSaved.body.data.records[prototypeId].operation,
                phase: 'awaiting-confirmation',
              },
            },
          },
          updatedAt: new Date().toISOString(),
        },
      },
    });
    expect(confirmation.response.status).toBe(200);
    const selection = draft();
    selection.screens[0]!.variants = {
      mode: 'explicit',
      variantIds: ['default', 'claimable'],
    };
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: selection },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
        operationKey,
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    const secondCaseId = accepted.body.data.job.selection.cases[1].caseId as string;
    await driver.secondCaseStarted;
    await service!.store.appendJobJournal(jobId, {
      event: 'case-finished',
      detail: `${secondCaseId}:failed:journal reason: with a colon`,
    });

    await service!.close();
    driver.failPendingCase();
    service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot: path.join(root!, 'store'),
      workspaceId: 'workspace-service-test',
      deliveryTargetRoot: path.join(root!, 'delivery-target'),
      preflightProvider: async (selectionDraft) => ({
        preflight: preflightSelection(selectionDraft, manifest()),
      }),
      driverFactory: () => new FakeDriver(),
    });
    const address = await service.start();
    base = `http://${address.host}:${address.port}/api/v2`;
    session = await call(base, '/session', { method: 'POST' });
    token = session.body.data.sessionToken as string;

    let failedRecord: any;
    let interruptedJob: any;
    for (let index = 0; index < 100; index += 1) {
      const [currentLifecycle, currentJob] = await Promise.all([
        call(base, '/prototype-lifecycle', { token }),
        call(base, `/jobs/${jobId}`, { token }),
      ]);
      failedRecord = currentLifecycle.body.data.records[prototypeId];
      interruptedJob = currentJob.body.data;
      if (failedRecord?.operation.kind === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(interruptedJob.status).toBe('interrupted');
    expect(failedRecord.operation.failedCases).toEqual([
      { caseId: secondCaseId, reason: 'journal reason: with a colon' },
    ]);
    expect(failedRecord.operation.failedCases[0].caseId).toContain('::');
  });

  it('records one rollback failure and still reconciles later lifecycle records', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pb-local-service-rollback-'));
    const storeRoot = path.join(root, 'store');
    const deliveryTargetRoot = path.join(root, 'delivery-target');
    await mkdir(deliveryTargetRoot, { recursive: true });
    const seedStore = new LocalFileStore({
      root: storeRoot,
      workspaceId: 'workspace-service-test',
    });
    await seedStore.init();
    const empty = await seedStore.getPrototypeLifecycleDocument();
    await seedStore.close();
    const startedAt = new Date().toISOString();
    const makeRecord = (prototypeId: string, suffix: string) => {
      const operationKey = `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
      const bundleId = `bundle-rollback-${suffix}`;
      return {
        prototypeId,
        stage: 'final',
        operation: {
          kind: 'rolling-back',
          operationKey,
          startedAt,
          bundleIds: [bundleId],
          note: `rollback ${prototypeId}`,
        },
        artifacts: {
          jobId: `job-rollback-${suffix}`,
          bundleId,
          snapshotId: `snapshot-rollback-${suffix}`,
          handoffId: `handoff-rollback-${suffix}`,
          deliveryId: `delivery-rollback-${suffix}`,
          agentPromptPath: `/deliveries/${suffix}/agent-prompt.md`,
          receiptPath: `/deliveries/${suffix}/receipt.json`,
          finalizedAt: startedAt,
          operationKey,
          requestDigest: `sha256:${'b'.repeat(64)}`,
        },
        createdAt: startedAt,
        updatedAt: startedAt,
      };
    };
    const document = {
      ...empty,
      revision: 1,
      records: {
        sample: makeRecord('sample', '061'),
        'sample-other': makeRecord('sample-other', '062'),
      },
      updatedAt: startedAt,
    };
    const lifecyclePath = path.join(
      storeRoot,
      'pbwork',
      'workspace-service-test',
      'lifecycle-v1.json',
    );
    await mkdir(path.dirname(lifecyclePath), { recursive: true });
    await writeFile(lifecyclePath, `${JSON.stringify(document, null, 2)}\n`);

    service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot,
      workspaceId: 'workspace-service-test',
      deliveryTargetRoot,
      preflightProvider: async (selection) => ({ preflight: preflightSelection(selection, manifest()) }),
      driverFactory: () => new FakeDriver(),
    });
    vi.spyOn(service.store, 'getBundle').mockResolvedValue({ status: 'active' } as never);
    let trashCalls = 0;
    vi.spyOn(service.store, 'trashBundle').mockImplementation(async () => {
      trashCalls += 1;
      if (trashCalls === 1) throw new Error('fixture trash failure');
      return {} as never;
    });
    await service.start();

    const reconciled = await service.store.getPrototypeLifecycleDocument();
    expect(reconciled.records.sample).toMatchObject({
      stage: 'final',
      operation: {
        kind: 'failed',
        action: 'rollback',
        message: expect.stringContaining('fixture trash failure'),
      },
      artifacts: { bundleId: 'bundle-rollback-061' },
    });
    expect(reconciled.records['sample-other']).toMatchObject({
      stage: 'review',
      operation: { kind: 'idle' },
      artifacts: null,
    });
    expect(trashCalls).toBe(2);
  });

  it('reconciles a failed Case into a durable terminal state without creating a Handoff', async () => {
    const base = await start(60_000, () => new FailingDriver());
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const startedAt = new Date().toISOString();
    const prototypeId = 'sample';
    let lifecycle = await call(base, '/prototype-lifecycle', { token });
    const activeRecord = {
      prototypeId,
      stage: 'active',
      operation: { kind: 'idle' },
      artifacts: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    let document = {
      ...lifecycle.body.data,
      revision: 1,
      records: { [prototypeId]: activeRecord },
      updatedAt: startedAt,
    };
    let updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 0, document },
    });
    document = {
      ...updated.body.data,
      revision: 2,
      records: {
        [prototypeId]: {
          ...activeRecord,
          stage: 'review',
          operation: {
            kind: 'finalizing',
            operationKey: '00000000-0000-4000-8000-000000000041',
            phase: 'preflighting',
            startedAt,
            acceptedWarningIds: [],
            acknowledgedRiskKinds: [],
          },
        },
      },
      updatedAt: new Date().toISOString(),
    };
    updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 1, document },
    });
    document = {
      ...updated.body.data,
      revision: 3,
      records: {
        [prototypeId]: {
          ...updated.body.data.records[prototypeId],
          operation: {
            ...updated.body.data.records[prototypeId].operation,
            phase: 'awaiting-confirmation',
          },
        },
      },
      updatedAt: new Date().toISOString(),
    };
    updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 2, document },
    });
    expect(updated.response.status).toBe(200);

    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
        operationKey: '00000000-0000-4000-8000-000000000041',
      },
    });
    expect(accepted.response.status).toBe(202);

    let failedRecord: any;
    for (let index = 0; index < 100; index += 1) {
      lifecycle = await call(base, '/prototype-lifecycle', { token });
      failedRecord = lifecycle.body.data.records[prototypeId];
      if (failedRecord?.operation.kind === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(failedRecord.stage).toBe('review');
    expect(failedRecord.operation).toMatchObject({
      kind: 'failed',
      action: 'finalize',
      operationKey: '00000000-0000-4000-8000-000000000041',
    });
    expect(failedRecord.operation.failedCases).toHaveLength(1);
    expect(failedRecord.artifacts).toBeNull();
    expect(await service!.store.listHandoffs(accepted.body.data.job.bundleId)).toHaveLength(0);
    const deliveries = await call(base, `/deliveries?bundleId=${encodeURIComponent(accepted.body.data.job.bundleId)}`, { token });
    expect(deliveries.body.data.deliveries).toHaveLength(0);
  });

  it('runs one durable background Job after Preflight and exposes its Snapshot to a new request', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    let job: any;
    for (let index = 0; index < 30; index += 1) {
      const result = await call(base, `/jobs/${jobId}`, { token });
      job = result.body.data;
      if (['completed', 'failed'].includes(job.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(job.status).toBe('completed');
    expect(
      job.journal.some((entry: any) => entry.event === 'case-finished'),
    ).toBe(true);
    const details = await call(base, `/bundles/${job.bundleId}`, { token });
    expect(details.body.data.activeSnapshot.activeSlots).toHaveLength(1);
    expect(details.body.data.blobs).toHaveLength(1);
    const fixedSnapshot = await call(
      base,
      `/bundles/${job.bundleId}/snapshots/${details.body.data.activeSnapshot.snapshotId}`,
      { token },
    );
    expect(fixedSnapshot.response.status).toBe(200);
    expect(fixedSnapshot.body.data.activeSnapshot.snapshotId).toBe(
      details.body.data.activeSnapshot.snapshotId,
    );
  });

  it('recovers a fixed finalization across Service restart and creates one Handoff and Delivery', async () => {
    let base = await start();
    let session = await call(base, '/session', { method: 'POST' });
    let token = session.body.data.sessionToken as string;
    let lifecycle = await call(base, '/prototype-lifecycle', { token });
    const operationKey = '00000000-0000-4000-8000-000000000021';
    const startedAt = new Date().toISOString();
    const prototypeId = 'sample';
    const activeRecord = {
      prototypeId,
      stage: 'active',
      operation: { kind: 'idle' },
      artifacts: null,
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    let document = {
      ...lifecycle.body.data,
      revision: 1,
      records: { [prototypeId]: activeRecord },
      updatedAt: startedAt,
    };
    let updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 0, document },
    });
    expect(updated.response.status).toBe(200);
    document = {
      ...updated.body.data,
      revision: 2,
      records: {
        [prototypeId]: {
          ...activeRecord,
          stage: 'review',
          operation: {
            kind: 'finalizing',
            operationKey,
            phase: 'preflighting',
            startedAt,
            acceptedWarningIds: [],
            acknowledgedRiskKinds: [],
          },
        },
      },
      updatedAt: new Date().toISOString(),
    };
    updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 1, document },
    });
    expect(updated.response.status).toBe(200);
    document = {
      ...updated.body.data,
      revision: 3,
      records: {
        [prototypeId]: {
          ...updated.body.data.records[prototypeId],
          operation: {
            ...updated.body.data.records[prototypeId].operation,
            phase: 'awaiting-confirmation',
          },
        },
      },
      updatedAt: new Date().toISOString(),
    };
    updated = await call(base, '/prototype-lifecycle', {
      method: 'PUT',
      token,
      body: { expectedRevision: 2, document },
    });
    expect(updated.response.status).toBe(200);

    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const createBody = {
      preflightId: preflight.body.data.preflightId,
      acceptedWarningIds: [],
      operationKey,
    };
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: createBody,
    });
    expect(accepted.response.status).toBe(202);
    const repeated = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: createBody,
    });
    expect(repeated.body.data.job.jobId).toBe(accepted.body.data.job.jobId);

    let operation: any;
    for (let index = 0; index < 100; index += 1) {
      lifecycle = await call(base, '/prototype-lifecycle', { token });
      operation = lifecycle.body.data.records[prototypeId]?.operation;
      if (lifecycle.body.data.records[prototypeId]?.stage === 'final' || operation?.phase === 'awaiting-risks' || operation?.phase === 'building-prompt' || operation?.kind === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(operation?.kind).toBe('finalizing');
    expect(operation?.snapshotId).toBeTruthy();
    expect(['awaiting-risks', 'building-prompt']).toContain(operation.phase);

    await service!.close();
    service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot: path.join(root!, 'store'),
      workspaceId: 'workspace-service-test',
      deliveryTargetRoot: path.join(root!, 'delivery-target'),
      preflightProvider: async (selection) => ({ preflight: preflightSelection(selection, manifest()) }),
      driverFactory: () => new FakeDriver(),
    });
    const address = await service.start();
    base = `http://${address.host}:${address.port}/api/v2`;
    session = await call(base, '/session', { method: 'POST' });
    token = session.body.data.sessionToken as string;
    lifecycle = await call(base, '/prototype-lifecycle', { token });
    let recovered = lifecycle.body.data.records[prototypeId];
    if (recovered.stage !== 'final') {
      expect(recovered.operation).toMatchObject({
        kind: 'finalizing',
        operationKey,
        jobId: accepted.body.data.job.jobId,
      });
    }

    operation = recovered.operation;
    if (recovered.stage !== 'final' && operation.phase === 'awaiting-risks') {
      const preview = await call(base, '/handoffs/preview', {
        method: 'POST',
        token,
        body: {
          bundleId: operation.bundleId,
          snapshotId: operation.snapshotId,
          acknowledgedRiskKinds: [],
        },
      });
      expect(preview.response.status).toBe(200);
      const acknowledgedRiskKinds = [...new Set(preview.body.data.risks.map((risk: any) => risk.kind))];
      const latest = await call(base, '/prototype-lifecycle', { token });
      const next = {
        ...latest.body.data,
        revision: latest.body.data.revision + 1,
        records: {
          ...latest.body.data.records,
          [prototypeId]: {
            ...latest.body.data.records[prototypeId],
            operation: {
              ...latest.body.data.records[prototypeId].operation,
              phase: 'building-prompt',
              acknowledgedRiskKinds,
            },
          },
        },
        updatedAt: new Date().toISOString(),
      };
      const confirmation = await call(base, '/prototype-lifecycle', {
        method: 'PUT',
        token,
        body: { expectedRevision: latest.body.data.revision, document: next },
      });
      expect(confirmation.response.status).toBe(200);
    }

    let finalized: any;
    for (let index = 0; index < 100; index += 1) {
      const latest = await call(base, '/prototype-lifecycle', { token });
      finalized = latest.body.data.records[prototypeId];
      if (finalized.stage === 'final' || finalized.operation.kind === 'failed') break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(finalized.stage, JSON.stringify(finalized.operation)).toBe('final');
    expect(finalized.artifacts).toMatchObject({ operationKey, jobId: accepted.body.data.job.jobId });
    const handoffs = await service.store.listHandoffs(finalized.artifacts.bundleId);
    expect(handoffs).toHaveLength(1);
    const deliveries = await call(base, `/deliveries?bundleId=${encodeURIComponent(finalized.artifacts.bundleId)}`, { token });
    expect(deliveries.body.data.deliveries).toHaveLength(1);

    await service!.close();
    await rm(
      path.join(root!, 'store', 'pbwork', 'workspace-service-test', 'lifecycle-v1.json'),
      { force: true },
    );
    service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot: path.join(root!, 'store'),
      workspaceId: 'workspace-service-test',
      deliveryTargetRoot: path.join(root!, 'delivery-target'),
      preflightProvider: async (selection) => ({ preflight: preflightSelection(selection, manifest()) }),
      driverFactory: () => new FakeDriver(),
    });
    const migrationAddress = await service.start();
    const migrationBase = `http://${migrationAddress.host}:${migrationAddress.port}/api/v2`;
    const migrationSession = await call(migrationBase, '/session', { method: 'POST' });
    const migrationDocument = {
      schemaVersion: 1,
      workspaceId: 'workspace-service-test',
      generationId: migrationSession.body.data.generationId,
      revision: 1,
      records: { [prototypeId]: finalized },
      history: [],
      updatedAt: new Date().toISOString(),
    };
    const imported = await call(migrationBase, '/prototype-lifecycle/migrate', {
      method: 'POST',
      token: migrationSession.body.data.sessionToken,
      body: { document: migrationDocument },
    });
    expect(imported.response.status).toBe(201);
    expect(imported.body.data.records[prototypeId]).toMatchObject({
      stage: 'final',
      artifacts: {
        jobId: finalized.artifacts.jobId,
        bundleId: finalized.artifacts.bundleId,
        snapshotId: finalized.artifacts.snapshotId,
        handoffId: finalized.artifacts.handoffId,
        deliveryId: finalized.artifacts.deliveryId,
      },
    });

    let recoveryBase = migrationBase;
    let recoveryToken = migrationSession.body.data.sessionToken as string;
    const sidecarPath = path.join(
      root!,
      'store',
      'pbwork',
      'workspace-service-test',
      'lifecycle-v1.json',
    );
    const receipt = JSON.parse(
      await readFile(finalized.artifacts.receiptPath, 'utf8'),
    );
    const job = await service.store.getJob(finalized.artifacts.jobId);
    const baseOperation = {
      kind: 'finalizing' as const,
      operationKey: finalized.artifacts.operationKey,
      requestDigest: job!.operationRequestDigest,
      phase: 'building-prompt' as const,
      startedAt: finalized.artifacts.finalizedAt,
      jobId: finalized.artifacts.jobId,
      bundleId: finalized.artifacts.bundleId,
      snapshotId: finalized.artifacts.snapshotId,
      acceptedWarningIds: receipt.acceptedWarningIds,
      acknowledgedRiskKinds: receipt.acknowledgedRiskKinds,
      implementationIntent: '',
    };
    const persistCrashState = async (record: Record<string, unknown>) => {
      const current = await service!.store.getPrototypeLifecycleDocument();
      const interrupted = {
        ...current,
        revision: current.revision + 1,
        records: { ...current.records, [prototypeId]: record },
        updatedAt: new Date().toISOString(),
      };
      await service!.close();
      await writeFile(sidecarPath, `${JSON.stringify(interrupted, null, 2)}\n`);
    };
    const restart = async () => {
      service = new ProtoBridgeLocalService({
        port: 0,
        allowedOrigins: [origin],
        runtimeBaseUrl: origin,
        storeRoot: path.join(root!, 'store'),
        workspaceId: 'workspace-service-test',
        deliveryTargetRoot: path.join(root!, 'delivery-target'),
        preflightProvider: async (selection) => ({ preflight: preflightSelection(selection, manifest()) }),
        driverFactory: () => new FakeDriver(),
      });
      const restartedAddress = await service.start();
      recoveryBase = `http://${restartedAddress.host}:${restartedAddress.port}/api/v2`;
      const restartedSession = await call(recoveryBase, '/session', { method: 'POST' });
      recoveryToken = restartedSession.body.data.sessionToken as string;
    };
    const waitForFinal = async () => {
      let record: any;
      for (let index = 0; index < 100; index += 1) {
        const latest = await call(recoveryBase, '/prototype-lifecycle', { token: recoveryToken });
        record = latest.body.data.records[prototypeId];
        if (record.stage === 'final' || record.operation.kind === 'failed') break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(record.stage, JSON.stringify(record.operation)).toBe('final');
      return record;
    };

    // Crash cut: Handoff is durable, but its ID and the later Delivery are not in lifecycle.
    const handoffOnlyRecord = {
      ...imported.body.data.records[prototypeId],
      stage: 'review',
      operation: baseOperation,
      artifacts: null,
      updatedAt: new Date().toISOString(),
    };
    await persistCrashState(handoffOnlyRecord);
    await rm(path.dirname(finalized.artifacts.receiptPath), { recursive: true, force: true });
    await restart();
    let recoveredFinal = await waitForFinal();
    expect(recoveredFinal.artifacts.handoffId).toBe(finalized.artifacts.handoffId);
    expect(await service.store.listHandoffs(finalized.artifacts.bundleId)).toHaveLength(1);
    let recoveredDeliveries = await call(
      recoveryBase,
      `/deliveries?bundleId=${encodeURIComponent(finalized.artifacts.bundleId)}`,
      { token: recoveryToken },
    );
    expect(recoveredDeliveries.body.data.deliveries).toHaveLength(1);

    // Crash cut: receipt directory rename completed, but lifecycle.deliveryId was not saved.
    const receiptWrittenRecord = {
      ...recoveredFinal,
      stage: 'review',
      operation: {
        ...baseOperation,
        handoffId: finalized.artifacts.handoffId,
      },
      artifacts: null,
      updatedAt: new Date().toISOString(),
    };
    await persistCrashState(receiptWrittenRecord);
    await restart();
    recoveredFinal = await waitForFinal();
    expect(recoveredFinal.artifacts.deliveryId).toBe(finalized.artifacts.deliveryId);
    expect(await service.store.listHandoffs(finalized.artifacts.bundleId)).toHaveLength(1);
    recoveredDeliveries = await call(
      recoveryBase,
      `/deliveries?bundleId=${encodeURIComponent(finalized.artifacts.bundleId)}`,
      { token: recoveryToken },
    );
    expect(recoveredDeliveries.body.data.deliveries).toHaveLength(1);

    // Crash cut: Service persisted rolling-back and trashed the Bundle, then stopped before lifecycle CAS.
    const lifecycleBeforeRollback = await service.store.getPrototypeLifecycleDocument();
    const rollingBackRecord = {
      ...recoveredFinal,
      operation: {
        kind: 'rolling-back',
        operationKey: '00000000-0000-4000-8000-000000000054',
        startedAt: new Date().toISOString(),
        bundleIds: [finalized.artifacts.bundleId],
        note: 'crash cut during rollback',
      },
      updatedAt: new Date().toISOString(),
    };
    const interruptedRollback = {
      ...lifecycleBeforeRollback,
      revision: lifecycleBeforeRollback.revision + 1,
      records: { ...lifecycleBeforeRollback.records, [prototypeId]: rollingBackRecord },
      updatedAt: new Date().toISOString(),
    };
    await service.close();
    await writeFile(sidecarPath, `${JSON.stringify(interruptedRollback, null, 2)}\n`);
    const crashStore = new LocalFileStore({
      root: path.join(root!, 'store'),
      workspaceId: 'workspace-service-test',
    });
    await crashStore.init();
    await crashStore.trashBundle(finalized.artifacts.bundleId);
    await crashStore.close();
    await restart();
    const rollbackState = await call(recoveryBase, '/prototype-lifecycle', {
      token: recoveryToken,
    });
    expect(rollbackState.body.data.records[prototypeId]).toMatchObject({
      stage: 'review',
      operation: { kind: 'idle' },
      artifacts: null,
    });
    expect((await service.store.getBundle(finalized.artifacts.bundleId))?.status).toBe('trashed');
    expect(
      rollbackState.body.data.history.filter(
        (entry: any) => entry.prototypeId === prototypeId && entry.from === 'final' && entry.to === 'review',
      ),
    ).toHaveLength(1);
  });

  it('serves Evidence Inventory and enforces the trash-before-delete lifecycle', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    const bundleId = accepted.body.data.job.bundleId as string;
    for (let index = 0; index < 30; index += 1) {
      const result = await call(base, `/jobs/${jobId}`, { token });
      if (result.body.data.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const inventory = await call(base, '/evidence-inventory', { token });
    expect(inventory.response.status).toBe(200);
    expect(JSON.stringify(inventory.body.data)).toContain(bundleId);

    const trashed = await call(base, '/bundles/trash', {
      method: 'POST',
      token,
      body: { bundleIds: [bundleId] },
    });
    expect(trashed.body.data[0].status).toBe('trashed');

    const restored = await call(base, '/bundles/restore', {
      method: 'POST',
      token,
      body: { bundleIds: [bundleId] },
    });
    expect(restored.body.data[0].status).toBe('writable');

    await call(base, '/bundles/trash', {
      method: 'POST',
      token,
      body: { bundleIds: [bundleId] },
    });
    const planned = await call(base, '/delete-plans', {
      method: 'POST',
      token,
      body: { bundleIds: [bundleId] },
    });
    expect(planned.response.status).toBe(201);
    expect(planned.body.data.candidates[0].blockedBy).toHaveLength(0);
    const deleted = await call(base, '/delete-plans/apply', {
      method: 'POST',
      token,
      body: { plan: planned.body.data },
    });
    expect(deleted.body.data.deletedBundleIds).toEqual([bundleId]);
    const state = await call(base, '/console', { token });
    expect(
      state.body.data.bundles.some(
        (bundle: { bundleId: string }) => bundle.bundleId === bundleId,
      ),
    ).toBe(false);
  });

  it('fully resets a live Workspace and keeps the Service usable', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    for (let index = 0; index < 30; index += 1) {
      const result = await call(base, `/jobs/${jobId}`, { token });
      if (result.body.data.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const deliveriesRoot = path.join(root!, 'deliveries');
    await mkdir(deliveriesRoot, { recursive: true });
    await writeFile(path.join(deliveriesRoot, 'old.md'), 'old');

    const preview = await call(base, '/workspace/reset/preview', {
      method: 'POST',
      token,
      body: { workspaceId: 'workspace-service-test' },
    });
    expect(preview.response.status).toBe(201);
    const reset = await call(base, '/workspace/reset/apply', {
      method: 'POST',
      token,
      body: {
        workspaceId: 'workspace-service-test',
        generationId: preview.body.data.generationId,
        planId: preview.body.data.planId,
      },
    });
    expect(reset.response.status).toBe(200);
    expect(reset.body.data.oldGenerationId).toBe(preview.body.data.generationId);
    expect(reset.body.data.newGenerationId).not.toBe(preview.body.data.generationId);
    await expect(access(deliveriesRoot)).rejects.toThrow();
    const oldState = await call(base, '/console', { token });
    expect(oldState.response.status).toBe(401);
    const nextSession = await call(base, '/session', { method: 'POST' });
    const state = await call(base, '/console', { token: nextSession.body.data.sessionToken });
    expect(state.body.data.bundles).toEqual([]);
    expect(state.body.data.jobs).toEqual([]);
    expect(state.body.data.generationId).toBe(reset.body.data.newGenerationId);
    await expect(
      access(path.join(root!, 'store', 'workspace.json')),
    ).resolves.toBeUndefined();
  });

  it('rejects reset apply when the preview scope or generation drifts', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preview = await call(base, '/workspace/reset/preview', {
      method: 'POST',
      token,
      body: { workspaceId: 'workspace-service-test' },
    });
    const deliveriesRoot = path.join(root!, 'deliveries');
    await mkdir(deliveriesRoot, { recursive: true });
    await writeFile(path.join(deliveriesRoot, 'late.json'), '{}\n');

    const drift = await call(base, '/workspace/reset/apply', {
      method: 'POST',
      token,
      body: {
        workspaceId: 'workspace-service-test',
        generationId: preview.body.data.generationId,
        planId: preview.body.data.planId,
      },
    });
    expect(drift.response.status).toBe(409);
    expect(drift.body.error.code).toBe('reset-plan-drift');

    const mismatch = await call(base, '/workspace/reset/apply', {
      method: 'POST',
      token,
      body: {
        workspaceId: 'workspace-service-test',
        generationId: 'generation-foreign',
        planId: preview.body.data.planId,
      },
    });
    expect(mismatch.response.status).toBe(409);
    expect(mismatch.body.error.code).toBe('workspace-generation-mismatch');
  });

  it('enters external-store-destroyed without recreating a deleted live root', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const storeRoot = path.join(root!, 'store');
    await rm(storeRoot, { recursive: true, force: true });

    const state = await call(base, '/console', { token });
    expect(state.response.status).toBe(409);
    expect(state.body.error.code).toBe('external-store-destroyed');
    await expect(access(storeRoot)).rejects.toThrow();
  });

  it('blocks unaccepted warnings, expired Preflight and foreign request fields', async () => {
    const base = await start(5);
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const invalid = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: { ...draft(), storeRoot: '/tmp/escape' } },
    });
    expect(invalid.response.status).toBe(400);
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft(true) },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const expired = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
      },
    });
    expect(expired.body.error.code).toBe('preflight-expired');
  });

  it('builds a recapture Draft from only stale Case/Scope entries', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft() },
    });
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: [],
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    let job: any;
    for (let index = 0; index < 30; index += 1) {
      const result = await call(base, `/jobs/${jobId}`, { token });
      job = result.body.data;
      if (job.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const details = await call(base, `/bundles/${job.bundleId}`, { token });
    const report = await service!.store.createStalenessReport({
      bundleId: job.bundleId,
      snapshotId: details.body.data.activeSnapshot.snapshotId,
      inputVersion: 'changed-input',
      currentDependencyDigests: {
        'manifest:sample': 'changed-manifest',
        'runtime:sample.task-list': 'changed-runtime',
      },
    });
    expect(report.perRevision.every((entry) => entry.stale)).toBe(true);
    const staleDraft = await call(
      base,
      `/bundles/${job.bundleId}/stale-draft`,
      {
        method: 'POST',
        token,
        body: { reportId: report.reportId },
      },
    );
    expect(staleDraft.response.status).toBe(200);
    expect(staleDraft.body.data.prototypeId).toBe('sample');
    expect(staleDraft.body.data.screens).toHaveLength(1);
    expect(staleDraft.body.data.screens[0].screenId).toBe(
      'sample.task-list',
    );
  });

  it('requires explicit acknowledgement for Handoff evidence-level risks', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const preflight = await call(base, '/preflights', {
      method: 'POST',
      token,
      body: { draft: draft(true) },
    });
    const warningIds = preflight.body.data.result.warnings.map(
      (warning: any) => warning.warningId,
    );
    const accepted = await call(base, '/jobs', {
      method: 'POST',
      token,
      body: {
        preflightId: preflight.body.data.preflightId,
        acceptedWarningIds: warningIds,
      },
    });
    const jobId = accepted.body.data.job.jobId as string;
    let job: any;
    for (let index = 0; index < 30; index += 1) {
      const result = await call(base, `/jobs/${jobId}`, { token });
      job = result.body.data;
      if (job.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const details = await call(base, `/bundles/${job.bundleId}`, { token });
    const request = {
      bundleId: job.bundleId,
      snapshotId: details.body.data.activeSnapshot.snapshotId,
      acknowledgedRiskKinds: [],
    };
    const preview = await call(base, '/handoffs/preview', {
      method: 'POST',
      token,
      body: request,
    });
    expect(preview.body.data.risks.map((risk: any) => risk.kind)).toContain(
      'evidence-level-limitation',
    );
    const blocked = await call(base, '/handoffs', {
      method: 'POST',
      token,
      body: request,
    });
    expect(blocked.response.status).toBe(400);
    const created = await call(base, '/handoffs', {
      method: 'POST',
      token,
      body: {
        ...request,
        acknowledgedRiskKinds: [
          'evidence-level-limitation',
          'reconstruction-readiness',
        ],
      },
    });
    expect(created.response.status).toBe(201);
    expect(created.body.data.handoff.snapshotId).toBe(request.snapshotId);
    const reviewRunId = 'review-service-vertical';
    const caseId = created.body.data.handoff.selectedCases[0].caseId as string;
    const source = details.body.data.blobs[0];
    const fixedHandoff = created.body.data.handoff as unknown as AgentHandoff;
    const requiredObligations = compileReconstructionObligations(
      (await buildAcceptanceContractFromStore({ store: service!.store, handoff: fixedHandoff })).contract,
    );
    const targetRoot = path.join(root!, 'target');
    await mkdir(path.join(targetRoot, 'lib'), { recursive: true });
    await writeFile(path.join(targetRoot, 'pubspec.yaml'), 'name: target_service_test\ndependencies:\n  flutter:\n    sdk: flutter\n');
    await writeFile(path.join(targetRoot, 'lib', 'main.dart'), 'void main() {}\n');
    await writeFile(path.join(targetRoot, 'proto-bridge.target.json'), JSON.stringify({
      version: 1,
      technology: 'flutter',
      review: {
        version: 3,
        provider: 'dart-flutter-mcp',
        runtime: {
          applicationIdentity: 'target-service-test',
          attachMode: 'operator-dtd-uri',
          runtimeMode: 'debug',
          observationContractVersion: 1,
          reviewHarnessVersion: '1',
          textEntryEmulation: true,
          bridge: {
            identityFinder: { kind: 'value-key', value: 'pb.review.identity' },
            controlFinder: { kind: 'value-key', value: 'pb.review.control' },
            caseInputFinder: { kind: 'value-key', value: 'pb.review.case-input' },
            prepareFinder: { kind: 'value-key', value: 'pb.review.prepare' },
            readyFinder: { kind: 'value-key', value: 'pb.review.ready' },
            observationFinder: { kind: 'value-key', value: 'pb.review.observation' },
          },
        },
        cases: { [caseId]: { screenId: 'sample.task-list' } },
      },
    }));
    await execFileAsync('git', ['init', '-q'], { cwd: targetRoot });
    await execFileAsync('git', ['config', 'user.email', 'service@example.invalid'], { cwd: targetRoot });
    await execFileAsync('git', ['config', 'user.name', 'Service Test'], { cwd: targetRoot });
    await execFileAsync('git', ['add', '.'], { cwd: targetRoot });
    await execFileAsync('git', ['commit', '-qm', 'fixture'], { cwd: targetRoot });
    const targetIdentity = await readTargetIdentity(targetRoot);
    const reviewSeed = {
      reviewRunId, workspaceId: 'workspace-service-test', generationId: session.body.data.generationId,
      bundleId: job.bundleId, snapshotId: request.snapshotId, handoffId: created.body.data.handoff.handoffId,
      targetRoot, targetBaselineCommit: targetIdentity.head, targetRevision: 'revision-a', targetContentDigest: targetIdentity.contentDigest,
      selectedCaseIds: [caseId], requiredSourceDigests: [source.digest], requiredScenarioCaseIds: [],
      obligationContractVersion: 1, requiredObligations, verificationContractVersion: 1,
      reviewProfile: { contractVersion: 1, coverageProfile: 'l2-focused', reasonCodes: ['uncertain-observation'], excludedCaseIds: [], excludedScenarioCaseIds: [] },
      runtimeProvider: { required: true, providerId: 'dart-flutter-mcp' },
      comparatorVersion: 'compare-v1', createdAt: '2026-08-04T00:00:00.000Z',
    };
    const forgedReview = await call(base, '/reviews', {
      method: 'POST', token,
      body: { seed: { ...reviewSeed, requiredObligations: requiredObligations.slice(1) } },
    });
    expect(forgedReview.response.status).toBe(400);
    expect(forgedReview.body.error.message).toContain('do not match');
    const review = await call(base, '/reviews', {
      method: 'POST', token,
      body: { seed: reviewSeed },
    });
    expect(review.response.status).toBe(201);
    expect(review.body.data).toMatchObject({
      reviewProfile: { coverageProfile: 'l2-focused', reasonCodes: ['uncertain-observation'] },
      runtimeProvider: { required: true, providerId: 'dart-flutter-mcp' },
      targetContentDigest: targetIdentity.contentDigest,
    });
    const forged = await call(base, `/reviews/${reviewRunId}/tranches`, { method: 'POST', token, body: { approvalToken: 'ordinary-tool-parameter' } });
    expect(forged.response.status).toBe(401);
    const trancheApproval = await call(base, '/review-approvals', { method: 'POST', token, body: { kind: 'tranche', reviewRunId, screenId: 'sample.task-list', tranche: 1, approvalRef: 'operator-approved', actor: 'operator' } });
    await call(base, `/reviews/${reviewRunId}/tranches`, { method: 'POST', token, body: { approvalToken: trancheApproval.body.data.token } });
    const sourceArtifact = { kind: 'source', digest: source.digest, mimeType: 'image/png', byteLength: PNG_BYTES.byteLength, width: 1, height: 1, owner: { screenId: 'sample.task-list' } };
    await call(base, `/reviews/${reviewRunId}/viewed`, { method: 'POST', token, body: { screenId: 'sample.task-list', caseIds: [caseId], artifact: sourceArtifact, bytesBase64: PNG_BYTES.toString('base64') } });
    const rendered = await call(base, `/reviews/${reviewRunId}/render`, { method: 'POST', token, body: { caseId, sourceDigest: source.digest, tranche: 1, round: 1, attemptId: 'attempt-1' } });
    expect(rendered.response.status).toBe(201);
    expect(rendered.body.data.providerSession.providerId).toBe('dart-flutter-mcp');
    const targetDigest = rendered.body.data.attempts[0].targetDigest as string;
    const targetArtifact = rendered.body.data.artifacts.find((item: any) => item.digest === targetDigest);
    const diffArtifact = { ...targetArtifact, kind: 'diff' };
    const compared = await call(base, `/reviews/${reviewRunId}/compare`, { method: 'POST', token, body: { screenId: 'sample.task-list', caseId, attemptId: 'attempt-1', sourceDigest: source.digest, targetDigest, diff: { artifact: diffArtifact, bytesBase64: TARGET_PNG_BYTES.toString('base64') }, comparable: true, normalizedDiffSignature: 'sha256:fixture', receiptTool: 'fixture-compare' } });
    expect(compared.response.status, JSON.stringify(compared.body)).toBe(201);
    await call(base, `/reviews/${reviewRunId}/findings`, { method: 'POST', token, body: { actor: 'agent', findings: [] } });
    const incompleteApproval = await call(base, '/review-approvals', { method: 'POST', token, body: { kind: 'finalize', reviewRunId, confirmationRef: 'human-before-semantic-review', actor: 'human' } });
    const incomplete = await call(base, `/reviews/${reviewRunId}/finalize`, { method: 'POST', token, body: { approvalToken: incompleteApproval.body.data.token } });
    expect(incomplete.response.status).toBe(500);
    expect(incomplete.body.error.message).toContain('missingObligations');
    const unsignedVerifierReceipt = {
      receiptVersion: 1 as const,
      verifierId: 'fixture-verifier-v1',
      adapterId: 'fixture',
      targetRevision: reviewSeed.targetRevision,
      targetHead: reviewSeed.targetBaselineCommit,
      targetContentDigest: targetIdentity.contentDigest,
      results: requiredObligations.map((item) => ({ obligationId: item.obligationId, dimension: item.dimension, status: 'matched' as const, detail: 'Machine verified.' })),
    };
    const verifierReceipt = { ...unsignedVerifierReceipt, receiptDigest: reviewVerifierReceiptDigest(unsignedVerifierReceipt) };
    const verified = await call(base, `/reviews/${reviewRunId}/claims`, { method: 'POST', token, body: { receipt: verifierReceipt, receiptTool: 'fixture-verifier-v1' } });
    expect(verified.body.data.verifierReceipts).toHaveLength(1);
    const assessed = await call(base, `/reviews/${reviewRunId}/assessments`, { method: 'POST', token, body: {
      assessments: requiredObligations.map((item) => ({ obligationId: item.obligationId, status: 'matched', detail: 'Verified in the target implementation.', evidenceDigests: [source.digest, verifierReceipt.receiptDigest], verifierReceiptDigest: verifierReceipt.receiptDigest })),
    } });
    expect(assessed.body.data.obligationAssessments).toHaveLength(requiredObligations.length);
    const finalizeApproval = await call(base, '/review-approvals', { method: 'POST', token, body: { kind: 'finalize', reviewRunId, confirmationRef: 'human-confirmed', actor: 'human' } });
    const finalized = await call(base, `/reviews/${reviewRunId}/finalize`, { method: 'POST', token, body: { approvalToken: finalizeApproval.body.data.token } });
    expect(finalized.response.status, JSON.stringify(finalized.body)).toBe(201);
    expect(finalized.body.data.status).toBe('closed');
    expect(finalized.body.data.reviewOutcome).toBe('focused-accepted');
    const delivery = await call(base, '/deliveries', {
      method: 'POST',
      token,
      body: {
        handoffId: created.body.data.handoff.handoffId,
        targetRoot: path.join(root!, 'delivery-target'),
      },
    });
    expect(delivery.response.status).toBe(201);
    const mismatched = await call(base, '/deliveries', {
      method: 'POST',
      token,
      body: {
        handoffId: created.body.data.handoff.handoffId,
        targetRoot: path.join(root!, 'other-target'),
      },
    });
    expect(mismatched.response.status).toBe(400);
    expect(mismatched.body.error.code).toBe('invalid-schema');
    expect(delivery.body.data.agentPrompt).toContain(
      '# ProtoBridge Evidence 驱动的页面实现',
    );
    expect(delivery.body.data.agentPrompt).not.toContain('# Evidence Implementation Brief');
    const listedDeliveries = await call(
      base,
      `/deliveries?bundleId=${encodeURIComponent(job.bundleId)}`,
      { token },
    );
    expect(listedDeliveries.body.data.deliveries).toHaveLength(1);
    const deliveryDetail = await call(
      base,
      `/deliveries/${encodeURIComponent(delivery.body.data.deliveryId)}`,
      { token },
    );
    expect(deliveryDetail.response.status).toBe(200);
    expect(deliveryDetail.body.data.agentPrompt).toBe(
      delivery.body.data.agentPrompt,
    );
  });

  it('invalidates old sessions on restart and reports orphan Jobs as interrupted', async () => {
    const base = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const oldToken = session.body.data.sessionToken as string;
    const queued = await service!.store.createJob({
      bundleId: 'bundle-pending-restart',
      selection: preflightSelection(draft(), manifest()).selection,
      inputVersion: manifest().inputVersion,
    });
    await service!.close();
    service = new ProtoBridgeLocalService({
      port: 0,
      allowedOrigins: [origin],
      runtimeBaseUrl: origin,
      storeRoot: path.join(root!, 'store'),
      workspaceId: 'workspace-service-test',
      deliveryTargetRoot: path.join(root!, 'delivery-target'),
      preflightProvider: async (selection) => ({
        preflight: preflightSelection(selection, manifest()),
      }),
      driverFactory: () => new FakeDriver(),
    });
    const address = await service.start();
    const restartedBase = `http://${address.host}:${address.port}/api/v2`;
    const oldSession = await call(restartedBase, '/console', {
      token: oldToken,
    });
    expect(oldSession.response.status).toBe(401);
    const nextSession = await call(restartedBase, '/session', {
      method: 'POST',
    });
    expect(nextSession.body.data.finalizedOrphanJobIds).toContain(queued.jobId);
    const state = await call(restartedBase, '/console', {
      token: nextSession.body.data.sessionToken,
    });
    expect(
      state.body.data.jobs.find((job: any) => job.jobId === queued.jobId)
        .status,
    ).toBe('interrupted');
  });
});

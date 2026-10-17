import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Fact } from '@proto-bridge/core/v2';
import { deliveryRootFromStoreRoot } from '@proto-bridge/core/v2/store';
import type { RuntimeCaptureManifest } from '@proto-bridge/core/v2/runtime-contract';
import {
  preflightSelection,
  type CaptureCaseInput,
  type CapturedCase,
  type CaseCaptureDriver,
  type SelectionDraft,
} from '@proto-bridge/core/v2/capture';
import { ProtoBridgeLocalService } from '../src/service.js';

const origin = 'http://127.0.0.1:3977';
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function manifest(): RuntimeCaptureManifest {
  return {
    protocolVersion: 3,
    theme: {
    packId: 'sample-pack',
    packDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    keyCatalogDigest: 'sha1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    themes: ['default'],
    defaultTheme: 'default',
    modes: ['light', 'dark'],
    defaultMode: 'light',
  },
  clock: { now: '2026-07-28T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
    catalogs: [{
    kind: 'theme-pack',
    inputDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    entries: [{
      objectId: 'sample-pack/default/light',
      digest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      value: { values: {}, provenance: {} },
      blobIds: [],
    }],
  }],
    inputVersion: 'service-reliability-input',
    capabilities: ['describe', 'prepare', 'readiness', 'semantic-snapshot', 'reset', 'scenario'],
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

function draft(): SelectionDraft {
  return {
    prototypeId: 'sample',
    themePack: {
      packId: 'sample-pack',
      packDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      theme: 'default',
      mode: 'light',
    },
    screens: [
      {
        screenId: 'sample.task-list',
        variants: { mode: 'explicit', variantIds: ['default'] },
        deviceIds: ['iphone-14'],
        scenarios: { mode: 'none' },
        captureScope: {
          fragments: [],
          screenshots: { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: false,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

/** Facts without a structure shell contract, so every Snapshot carries a reconstruction-readiness risk. */
class FakeDriver implements CaseCaptureDriver {
  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    const fact: Fact = {
      factId: `${input.entry.selectedCase.caseId}.page`,
      candidates: [{ value: 'page', provenance: { source: 'data-pb', locator: 'root' } }],
      resolution: 'resolved',
      effectiveValue: 'page',
    };
    return {
      evidenceLevel: 'instrumented-runtime',
      facts: [fact],
      requiredFactsTotal: 1,
      requiredFactsResolved: 1,
      binaries: [{ kind: 'screenshot', mediaType: 'image/png', bytes: PNG_BYTES }],
      diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    };
  }
}

let root: string | undefined;
let service: ProtoBridgeLocalService | undefined;
let preflightCalls = 0;

afterEach(async () => {
  await service?.close().catch(() => undefined);
  service = undefined;
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  preflightCalls = 0;
});

async function start() {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-service-reliability-'));
  const deliveryTargetRoot = path.join(root, 'delivery-target');
  await mkdir(deliveryTargetRoot, { recursive: true });
  service = new ProtoBridgeLocalService({
    port: 0,
    allowedOrigins: [origin],
    runtimeBaseUrl: origin,
    storeRoot: path.join(root, 'store'),
    workspaceId: 'workspace-service-reliability',
    deliveryTargetRoot,
    preflightProvider: async (selection) => {
      preflightCalls += 1;
      return { preflight: preflightSelection(selection, manifest()) };
    },
    driverFactory: () => new FakeDriver(),
  });
  const address = await service.start();
  return { base: `http://${address.host}:${address.port}/api/v2`, port: address.port };
}

async function call(
  base: string,
  pathName: string,
  options: { method?: string; token?: string; body?: unknown } = {},
) {
  const response = await fetch(`${base}${pathName}`, {
    method: options.method ?? 'GET',
    headers: {
      Origin: origin,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return { response, body: (await response.json()) as any };
}

/** Raw HTTP so neither the URL parser nor fetch normalizes the path or the Host header. */
function rawRequest(
  port: number,
  rawPath: string,
  headers: Record<string, string>,
  method = 'GET',
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, path: rawPath, method, headers, setHost: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let body: unknown = text;
          try {
            body = JSON.parse(text);
          } catch {
            // Non-JSON bodies are returned as text.
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function putLifecycle(base: string, token: string, mutate: (document: any) => any) {
  const latest = await call(base, '/prototype-lifecycle', { token });
  const next = {
    ...mutate(latest.body.data),
    revision: latest.body.data.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  const updated = await call(base, '/prototype-lifecycle', {
    method: 'PUT',
    token,
    body: { expectedRevision: latest.body.data.revision, document: next },
  });
  expect(updated.response.status, JSON.stringify(updated.body)).toBe(200);
  return updated.body.data;
}

async function finalizeUntilAwaitingRisks(base: string, token: string) {
  const prototypeId = 'sample';
  const operationKey = '00000000-0000-4000-8000-000000000101';
  const startedAt = new Date().toISOString();
  const activeRecord = {
    prototypeId,
    stage: 'active',
    operation: { kind: 'idle' },
    artifacts: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
  await putLifecycle(base, token, (document) => ({
    ...document,
    records: { [prototypeId]: activeRecord },
  }));
  await putLifecycle(base, token, (document) => ({
    ...document,
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
  }));
  await putLifecycle(base, token, (document) => ({
    ...document,
    records: {
      [prototypeId]: {
        ...document.records[prototypeId],
        operation: { ...document.records[prototypeId].operation, phase: 'awaiting-confirmation' },
      },
    },
  }));
  const preflight = await call(base, '/preflights', { method: 'POST', token, body: { draft: draft() } });
  expect(preflight.response.status).toBe(201);
  const accepted = await call(base, '/jobs', {
    method: 'POST',
    token,
    body: { preflightId: preflight.body.data.preflightId, acceptedWarningIds: [], operationKey },
  });
  expect(accepted.response.status).toBe(202);
  let record: any;
  for (let index = 0; index < 200; index += 1) {
    const lifecycle = await call(base, '/prototype-lifecycle', { token });
    record = lifecycle.body.data.records[prototypeId];
    if (record.operation.kind !== 'finalizing' || record.operation.phase === 'awaiting-risks') break;
    await delay(20);
  }
  expect(record.operation, JSON.stringify(record.operation)).toMatchObject({
    kind: 'finalizing',
    phase: 'awaiting-risks',
  });
  return { prototypeId, operation: record.operation };
}

describe('Local Service reliability: awaiting-risks reconciliation', () => {
  it('evaluates risks once while a finalization waits and persists Staleness only for the Handoff', async () => {
    const { base } = await start();
    const session = await call(base, '/session', { method: 'POST' });
    const token = session.body.data.sessionToken as string;
    const { prototypeId, operation } = await finalizeUntilAwaitingRisks(base, token);
    // One Preflight for POST /preflights and one refresh for POST /jobs.
    const callsBeforeAwaitingRisks = 2;

    // Stay in awaiting-risks for at least three reconciliation ticks (1 s each).
    await delay(3_500);
    const reportsWhileWaiting = await service!.store.listStalenessReports(operation.bundleId);
    expect(
      preflightCalls - callsBeforeAwaitingRisks,
      'Preflight runs once per awaiting-risks evaluation, not once per tick',
    ).toBe(1);
    expect(reportsWhileWaiting, 'awaiting-risks ticks must not persist StalenessReports').toHaveLength(0);

    const preview = await call(base, '/handoffs/preview', {
      method: 'POST',
      token,
      body: { bundleId: operation.bundleId, snapshotId: operation.snapshotId, acknowledgedRiskKinds: [] },
    });
    expect(preview.response.status).toBe(200);
    const riskKinds = [...new Set(preview.body.data.risks.map((risk: any) => risk.kind))];
    expect(riskKinds).toContain('reconstruction-readiness');
    expect(await service!.store.listStalenessReports(operation.bundleId)).toHaveLength(0);

    await putLifecycle(base, token, (document) => ({
      ...document,
      records: {
        ...document.records,
        [prototypeId]: {
          ...document.records[prototypeId],
          operation: {
            ...document.records[prototypeId].operation,
            phase: 'building-prompt',
            acknowledgedRiskKinds: riskKinds,
          },
        },
      },
    }));
    let finalized: any;
    for (let index = 0; index < 200; index += 1) {
      const lifecycle = await call(base, '/prototype-lifecycle', { token });
      finalized = lifecycle.body.data.records[prototypeId];
      if (finalized.stage === 'final' || finalized.operation.kind === 'failed') break;
      await delay(25);
    }
    expect(finalized.stage, JSON.stringify(finalized.operation)).toBe('final');
    const reports = await service!.store.listStalenessReports(operation.bundleId);
    expect(reports).toHaveLength(1);
    const [handoff] = await service!.store.listHandoffs(operation.bundleId);
    expect(handoff?.stalenessReportId).toBe(reports[0]!.reportId);
  }, 30_000);
});

describe('Local Service reliability: Delivery ID validation', () => {
  it.each(['%2E%2E', '%2E'])(
    'never serves files for dot-segment Delivery ID %s',
    async (rawId) => {
      const { base, port } = await start();
      const deliveryRoot = deliveryRootFromStoreRoot(path.join(root!, 'store'));
      await writeFile(path.join(path.dirname(deliveryRoot), 'receipt.json'), '{"leaked":true}');
      await writeFile(path.join(path.dirname(deliveryRoot), 'agent-prompt.md'), 'leaked');
      const session = await call(base, '/session', { method: 'POST' });
      const token = session.body.data.sessionToken as string;
      const response = await rawRequest(port, `/api/v2/deliveries/${rawId}`, {
        Host: `127.0.0.1:${port}`,
        Origin: origin,
        Authorization: `Bearer ${token}`,
      });
      expect(response.status).not.toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('leaked');
    },
  );

  it.each(['..%2Fstore', 'bad%20id', '%00', '.tmp-operation-x', '%E0%A4%A'])(
    'rejects unsafe Delivery ID %s before reading the file system',
    async (rawId) => {
      const { base, port } = await start();
      const deliveryRoot = deliveryRootFromStoreRoot(path.join(root!, 'store'));
      // A readable receipt outside the Delivery root that traversal could reach.
      await writeFile(path.join(path.dirname(deliveryRoot), 'receipt.json'), '{"leaked":true}');
      await writeFile(path.join(path.dirname(deliveryRoot), 'agent-prompt.md'), 'leaked');
      const session = await call(base, '/session', { method: 'POST' });
      const token = session.body.data.sessionToken as string;
      const response = await rawRequest(port, `/api/v2/deliveries/${rawId}`, {
        Host: `127.0.0.1:${port}`,
        Origin: origin,
        Authorization: `Bearer ${token}`,
      });
      expect(response.status, JSON.stringify(response.body)).toBe(400);
      expect(JSON.stringify(response.body)).not.toContain('leaked');
    },
  );
});

describe('Local Service reliability: Host header', () => {
  it('rejects requests whose Host header is not a loopback name (DNS rebinding)', async () => {
    const { port } = await start();
    for (const host of [`evil.example:${port}`, 'evil.example', `127.0.0.1.evil.example:${port}`]) {
      const response = await rawRequest(port, '/api/v2/session', { Host: host, Origin: origin }, 'POST');
      expect(response.status, `${host}: ${JSON.stringify(response.body)}`).toBe(400);
      expect(response.body.error.code).toBe('unsafe-input');
    }
    const missing = await rawRequest(port, '/api/v2/session', { Origin: origin }, 'POST');
    expect(missing.status).toBe(400);
  });

  it('accepts loopback Host headers on any port, as the PBWork dev proxy forwards them', async () => {
    const { port } = await start();
    for (const host of [`127.0.0.1:${port}`, '127.0.0.1:3977', `localhost:${port}`, `[::1]:${port}`]) {
      const response = await rawRequest(port, '/api/v2/session', { Host: host, Origin: origin }, 'POST');
      expect(response.status, `${host}: ${JSON.stringify(response.body)}`).toBe(201);
    }
  });
});

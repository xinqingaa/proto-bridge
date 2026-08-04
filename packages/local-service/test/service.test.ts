import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Fact } from '@proto-bridge/core/v2';
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
        prototypeId: 'ledger-planet',
        screenId: 'ledger-planet.task-list',
        screenSlug: 'task-list',
        path: '/prototype/ledger-planet/task-list',
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
    prototypeId: 'ledger-planet',
    screens: [
      {
        screenId: 'ledger-planet.task-list',
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

let root: string | undefined;
let service: ProtoBridgeLocalService | undefined;

afterEach(async () => {
  await service?.close().catch(() => undefined);
  service = undefined;
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function start(preflightTtlMs = 60_000) {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-local-service-'));
  service = new ProtoBridgeLocalService({
    port: 0,
    allowedOrigins: [origin],
    runtimeBaseUrl: origin,
    storeRoot: path.join(root, 'store'),
    workspaceId: 'workspace-service-test',
    preflightTtlMs,
    preflightProvider: async (selection) => ({
      preflight: preflightSelection(selection, manifest()),
    }),
    driverFactory: () => new FakeDriver(),
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
    expect(session.response.status).toBe(201);
    expect(session.body.data.sessionToken).not.toContain('/');
    const state = await call(base, '/console', {
      token: session.body.data.sessionToken,
    });
    expect(state.body.data.workspaceId).toBe('workspace-service-test');
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
        'manifest:ledger-planet': 'changed-manifest',
        'runtime:ledger-planet.task-list': 'changed-runtime',
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
    expect(staleDraft.body.data.prototypeId).toBe('ledger-planet');
    expect(staleDraft.body.data.screens).toHaveLength(1);
    expect(staleDraft.body.data.screens[0].screenId).toBe(
      'ledger-planet.task-list',
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
    const delivery = await call(base, '/deliveries', {
      method: 'POST',
      token,
      body: {
        handoffId: created.body.data.handoff.handoffId,
        targetRoot: 'apps/flutter_pb_app',
      },
    });
    expect(delivery.response.status).toBe(201);
    expect(delivery.body.data.agentPrompt).toContain(
      '# ProtoBridge Evidence 驱动的页面实现',
    );
    expect(delivery.body.data.agentPrompt).not.toContain('# Evidence Implementation Brief');
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

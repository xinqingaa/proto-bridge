import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Fact } from '../../../src/v2/contracts/evidence.js';
import type { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';
import {
  CaptureJobHost,
  capturePreflightToStore,
  evaluateAgentHandoff,
  preflightSelection,
  type CaptureCaseInput,
  type CapturedCase,
  type CaseCaptureDriver,
  type SelectionDraft,
} from '../../../src/v2/capture/index.js';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';
import { referenceCaseSlice as fixture } from '../../../src/v2/fixtures/index.js';

const faults = vi.hoisted(() => ({
  failBytes: undefined as ((filePath: string) => boolean) | undefined,
  failJson: undefined as ((filePath: string) => boolean) | undefined,
}));

vi.mock('../../../src/v2/store/atomic-file.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/v2/store/atomic-file.js')>();
  const injected = (filePath: string) =>
    Object.assign(new Error(`EIO: injected write failure at ${filePath}`), {
      code: 'EIO',
    });
  return {
    ...actual,
    writeImmutableBytes: async (
      filePath: string,
      objectKind: string,
      value: Uint8Array,
    ) => {
      if (faults.failBytes?.(filePath)) throw injected(filePath);
      return actual.writeImmutableBytes(filePath, objectKind, value);
    },
    writeImmutableJson: async (
      filePath: string,
      objectKind: string,
      value: unknown,
    ) => {
      if (faults.failJson?.(filePath)) throw injected(filePath);
      return actual.writeImmutableJson(filePath, objectKind, value);
    },
  };
});

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

/** Same decodable PNG header, distinct content per Variant. */
function pngFor(variantId: string): Buffer {
  return Buffer.concat([PNG_BYTES, Buffer.from(variantId, 'utf8')]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function capturedCase(
  input: CaptureCaseInput,
  overrides: Partial<CapturedCase> = {},
): CapturedCase {
  const variantId = input.entry.selectedCase.caseKey.variantId;
  const fact: Fact = {
    factId: `${input.entry.selectedCase.caseKey.screenId}.${variantId}.role`,
    candidates: [
      {
        value: 'page',
        provenance: {
          source: 'data-pb',
          locator: `${input.entry.selectedCase.caseKey.screenId}.root#data-pb-role`,
        },
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
      { kind: 'screenshot', mediaType: 'image/png', bytes: pngFor(variantId) },
    ],
    diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    ...overrides,
  };
}

const fakeDriver: CaseCaptureDriver = {
  async captureCase(input) {
    return capturedCase(input);
  },
};

function manifest(inputVersion: string): RuntimeCaptureManifest {
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
    inputVersion,
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
        sourcePath: 'sample/screens/TaskList.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', label: '默认' },
          { variantId: 'empty', label: '空态' },
          { variantId: 'claimable', label: '可领取' },
        ],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function draft(variants: string[]): SelectionDraft {
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
        variants: { mode: 'explicit', variantIds: variants },
        deviceIds: ['iphone-14'],
        scenarios: { mode: 'none' },
        captureScope: {
          fragments: [],
          screenshots: { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: true,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

function caseIdFor(
  preflight: ReturnType<typeof preflightSelection>,
  variantId: string,
): string {
  const entry = preflight.matrix.find(
    (candidate) => candidate.selectedCase.caseKey.variantId === variantId,
  );
  if (!entry) throw new Error(`No Case for ${variantId}`);
  return entry.selectedCase.caseId;
}

async function waitFor(condition: () => Promise<boolean>): Promise<void> {
  for (let index = 0; index < 200; index += 1) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for condition.');
}

let root: string;
let store: LocalFileStore;

beforeEach(async () => {
  faults.failBytes = undefined;
  faults.failJson = undefined;
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-capture-reliability-'));
  store = new LocalFileStore({ root, workspaceId: fixture.WORKSPACE_ID });
  await store.init();
  await store.createBundle({
    bundleId: fixture.BUNDLE_ID,
    prototypeId: fixture.PROTOTYPE_ID,
    run: fixture.RUN_1,
    revisions: [fixture.PRIMARY_ACTIVE_REVISION],
    coverage: fixture.RUN_1.coverage,
  });
});

afterEach(async () => {
  faults.failBytes = undefined;
  faults.failJson = undefined;
  await store.close();
  await rm(root, { recursive: true, force: true });
});

describe('Capture reliability: required Blob and Issue writes', () => {
  it('marks a Case failed when its required screenshot Blob cannot be written', async () => {
    const preflight = preflightSelection(
      draft(['empty', 'claimable']),
      manifest('runtime-input-blob-fault'),
    );
    const badDigest = sha256(pngFor('claimable'));
    faults.failBytes = (filePath) => filePath.includes(badDigest);

    const result = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: fakeDriver,
    });
    faults.failBytes = undefined;

    const claimableCaseId = caseIdFor(preflight, 'claimable');
    const emptyCaseId = caseIdFor(preflight, 'empty');
    const claimable = result.run.attempts.find(
      (attempt) => attempt.caseId === claimableCaseId,
    );
    expect(claimable).toMatchObject({ result: 'failed' });
    expect(claimable?.reason).toMatch(/screenshot/i);
    expect(claimable?.revisionId).toBeUndefined();
    expect(result.snapshot.coverage.counts).toMatchObject({
      selected: 2,
      captured: 1,
      failed: 1,
    });
    expect(
      result.snapshot.activeSlots.some((slot) => slot.caseId === claimableCaseId),
    ).toBe(false);

    const emptySlot = result.snapshot.activeSlots.find(
      (slot) => slot.caseId === emptyCaseId,
    );
    expect(emptySlot).toBeDefined();
    const screenshots = (await store.listBlobRecords(fixture.BUNDLE_ID)).filter(
      (blob) => blob.kind === 'screenshot',
    );
    expect(
      screenshots.some((blob) =>
        blob.ownerRefs.some((owner) => owner.objectId === emptySlot?.revisionId),
      ),
    ).toBe(true);
  });

  it('finalizes the Job as failed and keeps the old active Snapshot when an Issue write fails', async () => {
    const before = await store.getActiveSnapshot(fixture.BUNDLE_ID);
    faults.failJson = (filePath) =>
      filePath.includes(`${path.sep}issues${path.sep}`);
    const unknownDriver: CaseCaptureDriver = {
      async captureCase(input) {
        return capturedCase(input, {
          facts: [
            {
              factId: `${input.entry.selectedCase.caseKey.screenId}.hidden-state`,
              candidates: [
                {
                  value: null,
                  provenance: {
                    source: 'runtime-observation',
                    locator: 'hidden-state',
                  },
                },
              ],
              resolution: 'unknown',
              issueRef: 'issue-task-list-hidden-state',
            },
          ],
          requiredFactsResolved: 0,
        });
      },
    };
    const host = new CaptureJobHost();
    const accepted = await host.accept({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-issue-fault'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: unknownDriver,
    });
    await accepted.completion.catch(() => undefined);
    faults.failJson = undefined;

    const job = await store.getJob(accepted.job.jobId);
    expect(job?.status).toBe('failed');
    expect(job?.journal.map((entry) => entry.detail ?? '').join('\n')).toMatch(
      /issue/i,
    );
    expect(await store.listIssues(fixture.BUNDLE_ID)).toEqual([]);
    expect(
      (await store.getActiveSnapshot(fixture.BUNDLE_ID))?.snapshotId,
    ).toBe(before?.snapshotId);
  });
});

describe('Capture reliability: crash recovery from per-Case staging', () => {
  it('recovers the k Cases completed before the writer process was killed', async () => {
    const bundleId = 'bundle-crash-recovery';
    const preflight = preflightSelection(
      draft(['default', 'empty', 'claimable']),
      manifest('runtime-input-crash'),
    );
    const k = 2;
    let calls = 0;
    let killPointReached!: () => void;
    const killPoint = new Promise<void>((resolve) => {
      killPointReached = resolve;
    });
    const crashingDriver: CaseCaptureDriver = {
      async captureCase(input) {
        calls += 1;
        if (calls <= k) return capturedCase(input);
        killPointReached();
        // The process dies here: this Case never finishes.
        return new Promise<CapturedCase>(() => undefined);
      },
    };
    const host = new CaptureJobHost();
    const accepted = await host.accept({
      store,
      bundleId,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: crashingDriver,
    });
    await killPoint;
    // Simulated kill -9: drop the writer without any finalization.
    await store.close();

    const restarted = new LocalFileStore({
      root,
      workspaceId: fixture.WORKSPACE_ID,
    });
    store = restarted;
    const initialized = await restarted.init();
    expect(initialized.finalizedOrphanJobs).toContain(accepted.job.jobId);

    const job = await restarted.getJob(accepted.job.jobId);
    expect(job?.status).toBe('interrupted');
    const snapshot = await restarted.getActiveSnapshot(bundleId);
    expect(snapshot, 'completed Cases must survive the crash').toBeDefined();
    const run = await restarted.getRun(bundleId, job!.runId!);
    expect(run?.terminationReason).toBe('interrupted');
    expect(
      run?.attempts.map((attempt) => attempt.result).sort(),
    ).toEqual(['captured', 'captured', 'interrupted']);
    expect(snapshot!.coverage.counts).toMatchObject({
      selected: 3,
      captured: k,
      interrupted: 1,
    });

    const completedCaseIds = preflight.matrix
      .slice(0, k)
      .map((entry) => entry.selectedCase.caseId);
    const blobs = await restarted.listBlobRecords(bundleId);
    for (const caseId of completedCaseIds) {
      const slot = snapshot!.activeSlots.find((item) => item.caseId === caseId);
      expect(slot, `active Evidence for ${caseId}`).toBeDefined();
      expect(
        await restarted.getEvidenceRevision(bundleId, slot!.revisionId),
      ).toBeDefined();
      const screenshot = blobs.find((blob) =>
        blob.ownerRefs.some((owner) => owner.objectId === slot!.revisionId),
      );
      expect(screenshot, `screenshot for ${caseId}`).toBeDefined();
      expect(await restarted.getBlob(bundleId, screenshot!.blobId)).toBeDefined();
    }

    const report = await restarted.createStalenessReport({
      bundleId,
      snapshotId: snapshot!.snapshotId,
      inputVersion: preflight.inputVersion,
      currentDependencyDigests: {
        'manifest:sample': preflight.manifestDigest,
        'runtime:sample.task-list': preflight.inputVersion,
      },
    });
    const evaluation = await evaluateAgentHandoff({
      store: restarted,
      bundleId,
      snapshotId: snapshot!.snapshotId,
      selectedCases: run!.selection.cases,
      stalenessReport: report,
    });
    expect(evaluation.coverageStatus).toBe('partial');
  });
});

describe('Capture reliability: concurrent Jobs on one Bundle', () => {
  it('keeps both Jobs’ Evidence active when two Jobs commit to the same Bundle concurrently', async () => {
    let started = 0;
    let releaseBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    const barrierDriver: CaseCaptureDriver = {
      async captureCase(input) {
        started += 1;
        if (started === 2) releaseBarrier();
        await barrier;
        return capturedCase(input);
      },
    };
    const emptyPreflight = preflightSelection(
      draft(['empty']),
      manifest('runtime-input-race-empty'),
    );
    const claimablePreflight = preflightSelection(
      draft(['claimable']),
      manifest('runtime-input-race-claimable'),
    );
    await Promise.all([
      capturePreflightToStore({
        store,
        bundleId: fixture.BUNDLE_ID,
        preflight: emptyPreflight,
        runtimeBaseUrl: 'http://127.0.0.1:3977',
        driver: barrierDriver,
      }),
      capturePreflightToStore({
        store,
        bundleId: fixture.BUNDLE_ID,
        preflight: claimablePreflight,
        runtimeBaseUrl: 'http://127.0.0.1:3977',
        driver: barrierDriver,
      }),
    ]);
    const active = await store.getActiveSnapshot(fixture.BUNDLE_ID);
    const activeCaseIds = new Set(active?.activeSlots.map((slot) => slot.caseId));
    expect(activeCaseIds.has(caseIdFor(emptyPreflight, 'empty'))).toBe(true);
    expect(activeCaseIds.has(caseIdFor(claimablePreflight, 'claimable'))).toBe(
      true,
    );
  });

  it('runs one Capture Job per Workspace at a time and keeps later Jobs visibly queued', async () => {
    const gates: Array<() => void> = [];
    const gatedDriver: CaseCaptureDriver = {
      async captureCase(input) {
        await new Promise<void>((resolve) => gates.push(resolve));
        return capturedCase(input);
      },
    };
    const host = new CaptureJobHost();
    const first = await host.accept({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-queue-first'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: gatedDriver,
    });
    const second = await host.accept({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['claimable']),
        manifest('runtime-input-queue-second'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: gatedDriver,
    });
    await waitFor(async () => gates.length === 1);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(gates).toHaveLength(1);
    expect((await store.getJob(first.job.jobId))?.status).toBe('capturing');
    expect((await store.getJob(second.job.jobId))?.status).toBe('queued');

    gates.shift()!();
    await first.completion;
    await waitFor(async () => gates.length === 1);
    gates.shift()!();
    await second.completion;

    expect((await store.getJob(first.job.jobId))?.status).toBe('completed');
    expect((await store.getJob(second.job.jobId))?.status).toBe('completed');
    const active = await store.getActiveSnapshot(fixture.BUNDLE_ID);
    expect(active?.activeSlots.map((slot) => slot.caseId)).toEqual(
      expect.arrayContaining(
        [first, second].flatMap((accepted) =>
          accepted.job.selection.cases.map((selected) => selected.caseId),
        ),
      ),
    );
  });

  it('cancels a queued Job without running it', async () => {
    const gates: Array<() => void> = [];
    let calls = 0;
    const gatedDriver: CaseCaptureDriver = {
      async captureCase(input) {
        calls += 1;
        await new Promise<void>((resolve) => gates.push(resolve));
        return capturedCase(input);
      },
    };
    const host = new CaptureJobHost();
    const first = await host.accept({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-queue-cancel-first'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: gatedDriver,
    });
    const second = await host.accept({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['claimable']),
        manifest('runtime-input-queue-cancel-second'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: gatedDriver,
    });
    await waitFor(async () => gates.length === 1);
    const cancelled = await host.cancel(store, second.job.jobId);
    expect(cancelled.status).toBe('cancelled');
    gates.shift()!();
    await first.completion;
    await second.completion.catch(() => undefined);
    expect(calls).toBe(1);
    expect((await store.getJob(second.job.jobId))?.status).toBe('cancelled');
  });
});

describe('Capture reliability: staging cleanup', () => {
  it('removes Job staging after a successful commit', async () => {
    await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-staging-cleanup'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: fakeDriver,
    });
    const entries = await readdir(path.join(root, 'job-staging')).catch(
      () => [] as string[],
    );
    expect(entries).toEqual([]);
  });
});

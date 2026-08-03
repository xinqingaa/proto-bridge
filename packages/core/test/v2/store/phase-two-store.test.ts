import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogRevision } from '../../../src/v2/contracts/catalog.js';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';
import { V2_SCHEMA_MAJOR } from '../../../src/v2/contracts/version.js';
import { ledgerPlanetTaskList as f } from '../../../src/v2/fixtures/index.js';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';

let root: string;
const stores: LocalFileStore[] = [];

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-phase-two-'));
});

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
  await rm(root, { recursive: true, force: true });
});

async function openStore(
  options: Omit<ConstructorParameters<typeof LocalFileStore>[0], 'root' | 'workspaceId'> = {},
): Promise<LocalFileStore> {
  const store = new LocalFileStore({ root, workspaceId: f.WORKSPACE_ID, ...options });
  await store.init();
  stores.push(store);
  return store;
}

async function createBundle(store: LocalFileStore): Promise<void> {
  await store.createBundle({
    bundleId: f.BUNDLE_ID,
    prototypeId: f.PROTOTYPE_ID,
    run: f.RUN_1,
    revisions: [f.PRIMARY_ACTIVE_REVISION],
    coverage: f.RUN_1.coverage,
  });
}

describe('Phase 2 Store: atomic Bundle and reference boundary', () => {
  it('never exposes a Bundle when its first Snapshot transaction is invalid', async () => {
    const store = await openStore();
    const invalidRevision = { ...f.PRIMARY_ACTIVE_REVISION, bundleId: 'foreign-bundle' };
    await expect(
      store.createBundle({
        bundleId: f.BUNDLE_ID,
        prototypeId: f.PROTOTYPE_ID,
        run: f.RUN_1,
        revisions: [invalidRevision],
        coverage: f.RUN_1.coverage,
      }),
    ).rejects.toThrow(V2ContractError);
    expect(await store.getBundle(f.BUNDLE_ID)).toBeUndefined();
    expect(await store.getActiveSnapshot(f.BUNDLE_ID)).toBeUndefined();
  });

  it('does not publish a new Bundle when the first Run contains no consumable Evidence', async () => {
    const store = await openStore();
    const emptyRun = {
      ...f.RUN_1,
      runId: 'run-empty-first-snapshot',
      attempts: [],
      terminationReason: 'failed' as const,
      coverage: {
        ...f.RUN_1.coverage,
        counts: {
          ...f.RUN_1.coverage.counts,
          captured: 0,
          missing: 1,
        },
        evidenceLevelBreakdown: {},
        factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
      },
    };
    await expect(
      store.createBundle({
        bundleId: f.BUNDLE_ID,
        prototypeId: f.PROTOTYPE_ID,
        run: emptyRun,
        revisions: [],
        coverage: emptyRun.coverage,
      }),
    ).rejects.toThrow(/without at least one active Evidence/);
    expect(await store.getBundle(f.BUNDLE_ID)).toBeUndefined();
  });

  it('keeps the previous active Snapshot on a durable-write failure and supports an idempotent retry', async () => {
    const setup = await openStore();
    await createBundle(setup);
    const previous = await setup.getActiveSnapshot(f.BUNDLE_ID);
    await setup.close();
    stores.splice(stores.indexOf(setup), 1);

    const failing = await openStore({
      beforeActivateSnapshot: async () => {
        throw new Error('simulated pointer-flip failure');
      },
    });
    await expect(
      failing.commitRun({
        bundleId: f.BUNDLE_ID,
        run: f.RUN_2,
        revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
        coverage: f.SNAPSHOT.coverage,
      }),
    ).rejects.toThrow(/pointer-flip/);
    expect(await failing.getActiveSnapshot(f.BUNDLE_ID)).toEqual(previous);
    await failing.close();
    stores.splice(stores.indexOf(failing), 1);

    const recovered = await openStore();
    const committed = await recovered.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    expect(committed.snapshot.activeSlots).toEqual(f.SNAPSHOT.activeSlots);
  });
});

describe('Phase 2 Store: Catalog and controlled Blob', () => {
  it('persists a digest-backed Blob and Catalog revision across restart', async () => {
    const writer = await openStore();
    await createBundle(writer);
    const bytes = new TextEncoder().encode('controlled debug payload');
    const blob = await writer.putBlob({
      bundleId: f.BUNDLE_ID,
      kind: 'debug',
      mediaType: 'text/plain',
      bytes,
      ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
    });
    const catalog: CatalogRevision = {
      schemaVersion: V2_SCHEMA_MAJOR,
      catalogRevisionId: 'catalog-task-list-v1',
      workspaceId: f.WORKSPACE_ID,
      bundleId: f.BUNDLE_ID,
      prototypeId: f.PROTOTYPE_ID,
      kind: 'screen',
      inputDigest: 'registry-task-list-v1',
      createdAt: f.T2,
      entries: [
        {
          objectId: 'ledger-planet.task-list',
          digest: 'screen-task-list-v1',
          value: { title: '任务中心' },
          blobIds: [blob.blobId],
        },
      ],
    };
    await writer.putCatalogRevision(catalog);
    await writer.close();
    stores.splice(stores.indexOf(writer), 1);

    const reader = await openStore();
    expect(await reader.getCatalogRevision(f.BUNDLE_ID, catalog.catalogRevisionId)).toEqual(catalog);
    const reloadedBlob = await reader.getBlob(f.BUNDLE_ID, blob.blobId);
    expect(reloadedBlob?.record.digest).toBe(blob.digest);
    expect(new TextDecoder().decode(reloadedBlob?.bytes)).toBe('controlled debug payload');
  });

  it('keeps identical bytes reachable from distinct immutable owners', async () => {
    const store = await openStore();
    await createBundle(store);
    await store.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const primary = await store.putBlob({
      bundleId: f.BUNDLE_ID,
      kind: 'screenshot',
      mediaType: 'image/png',
      bytes,
      ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
    });
    const fragment = await store.putBlob({
      bundleId: f.BUNDLE_ID,
      kind: 'screenshot',
      mediaType: 'image/png',
      bytes,
      ownerRefs: [
        { kind: 'revision', objectId: f.FRAGMENT_REVISION_ID },
      ],
    });

    expect(primary.blobId).not.toBe(fragment.blobId);
    expect(primary.digest).toBe(fragment.digest);
    expect((await store.getBlob(f.BUNDLE_ID, primary.blobId))?.record.ownerRefs).toEqual([
      { kind: 'revision', objectId: f.PRIMARY_REVISION_ID },
    ]);
    expect((await store.getBlob(f.BUNDLE_ID, fragment.blobId))?.record.ownerRefs).toEqual([
      { kind: 'revision', objectId: f.FRAGMENT_REVISION_ID },
    ]);

    const retried = await store.putBlob({
      bundleId: f.BUNDLE_ID,
      kind: 'screenshot',
      mediaType: 'image/png',
      bytes,
      ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
    });
    expect(retried).toEqual(primary);
  });

  it('rejects arbitrary media, oversize bytes and unresolved logical owners', async () => {
    const store = await openStore({ maxBlobBytes: 4 });
    await createBundle(store);
    await expect(
      store.putBlob({
        bundleId: f.BUNDLE_ID,
        kind: 'debug',
        mediaType: 'application/octet-stream',
        bytes: new Uint8Array([1]),
        ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
      }),
    ).rejects.toMatchObject({ code: 'blob-rejected' });
    await expect(
      store.putBlob({
        bundleId: f.BUNDLE_ID,
        kind: 'debug',
        mediaType: 'text/plain',
        bytes: new Uint8Array(5),
        ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
      }),
    ).rejects.toMatchObject({ code: 'blob-rejected' });
    await expect(
      store.putBlob({
        bundleId: f.BUNDLE_ID,
        kind: 'debug',
        mediaType: 'text/plain',
        bytes: new Uint8Array([1]),
        ownerRefs: [{ kind: 'revision', objectId: 'missing-revision' }],
      }),
    ).rejects.toMatchObject({ code: 'unknown-reference' });
  });
});

describe('Phase 2 Store: reuse and dependency-level stale', () => {
  it('reuses only an exact Scope/input/profile match', async () => {
    const store = await openStore();
    await createBundle(store);
    expect(
      await store.findReusableEvidence({
        bundleId: f.BUNDLE_ID,
        caseId: f.TASK_LIST_CASE_ID,
        captureScope: f.FULL_CASE_SCOPE,
        inputDigest: f.PRIMARY_ACTIVE_REVISION.inputDigest,
        minimumEvidenceLevel: 'instrumented-runtime',
      }),
    ).toEqual(f.PRIMARY_ACTIVE_REVISION);
    expect(
      await store.findReusableEvidence({
        bundleId: f.BUNDLE_ID,
        caseId: f.TASK_LIST_CASE_ID,
        captureScope: f.LIST_FRAGMENT_SCOPE,
        inputDigest: f.PRIMARY_ACTIVE_REVISION.inputDigest,
      }),
    ).toBeUndefined();
  });

  it('marks only revisions whose actual dependency closure changed', async () => {
    const store = await openStore();
    await createBundle(store);
    const { snapshot } = await store.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    const report = await store.createStalenessReport({
      bundleId: f.BUNDLE_ID,
      snapshotId: snapshot.snapshotId,
      inputVersion: 'workspace-input-v2',
      currentDependencyDigests: {
        'registry:ledger-planet.task-list': 'registry-task-list-v1',
        'source:ledger-planet.task-list': 'source-task-list-v2',
        'runtime:ledger-planet.task-list.list': 'runtime-task-list-list-v1',
        'source:unrelated-screen': 'unrelated-v9',
      },
    });
    expect(report.perRevision).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ revisionId: f.PRIMARY_REVISION_ID, stale: true }),
        expect.objectContaining({ revisionId: f.FRAGMENT_REVISION_ID, stale: false }),
      ]),
    );
  });

  it('validates every fixed Handoff reference at the Store write boundary', async () => {
    const store = await openStore();
    await createBundle(store);
    const { snapshot } = await store.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    const report = await store.createStalenessReport({
      bundleId: f.BUNDLE_ID,
      snapshotId: snapshot.snapshotId,
      inputVersion: f.RUN_2.inputVersion,
      currentDependencyDigests: {
        'registry:ledger-planet.task-list': 'registry-task-list-v1',
        'source:ledger-planet.task-list': 'source-task-list-v1',
        'runtime:ledger-planet.task-list.list': 'runtime-task-list-list-v1',
      },
    });
    const handoff = {
      ...f.HANDOFF,
      handoffId: 'handoff-store-boundary',
      snapshotId: snapshot.snapshotId,
      stalenessReportId: report.reportId,
    };
    await expect(store.putHandoff(handoff)).resolves.toBeUndefined();
    await expect(
      store.putHandoff({
        ...handoff,
        handoffId: 'handoff-store-boundary-invalid',
        snapshotId: 'missing-snapshot',
      }),
    ).rejects.toMatchObject({ code: 'unknown-reference' });
  });
});

describe('Phase 2 Store: Bundle lifecycle, capacity and retention', () => {
  it('archives a Bundle as read-only and forks a fixed source Snapshot without changing the source', async () => {
    const store = await openStore();
    await createBundle(store);
    const source = await store.getActiveSnapshot(f.BUNDLE_ID);
    expect(source).toBeDefined();
    await store.archiveBundle(f.BUNDLE_ID);
    await expect(
      store.createJob({
        bundleId: f.BUNDLE_ID,
        selection: f.RUN_1.selection,
        inputVersion: f.RUN_1.inputVersion,
      }),
    ).rejects.toMatchObject({ code: 'bundle-archived' });

    const fork = await store.forkBundle({
      sourceBundleId: f.BUNDLE_ID,
      sourceSnapshotId: source!.snapshotId,
      bundleId: 'bundle-ledger-planet-fork',
    });
    expect(fork.bundle.originSnapshotId).toBe(source!.snapshotId);
    expect(fork.snapshot.activeSlots).toEqual(source!.activeSlots);
    expect((await store.getActiveSnapshot(f.BUNDLE_ID))?.snapshotId).toBe(source!.snapshotId);
  });

  it('does not archive a Bundle while a non-terminal Job still owns an execution journal', async () => {
    const store = await openStore();
    await createBundle(store);
    const job = await store.createJob({
      bundleId: f.BUNDLE_ID,
      selection: f.RUN_1.selection,
      inputVersion: f.RUN_1.inputVersion,
    });
    await expect(store.archiveBundle(f.BUNDLE_ID)).rejects.toThrow(/non-terminal Jobs/);
    await store.finalizeJob(job.jobId, 'cancelled');
    await expect(store.archiveBundle(f.BUNDLE_ID)).resolves.toMatchObject({
      status: 'archived',
    });
  });

  it('trashes, restores, and permanently deletes through a fresh Delete Plan', async () => {
    const store = await openStore();
    await createBundle(store);
    await expect(store.trashBundle(f.BUNDLE_ID)).resolves.toMatchObject({
      status: 'trashed',
      statusBeforeTrash: 'writable',
    });
    await expect(store.restoreBundle(f.BUNDLE_ID)).resolves.toMatchObject({
      status: 'writable',
    });
    await store.trashBundle(f.BUNDLE_ID);
    const plan = await store.planDeleteBundles([f.BUNDLE_ID]);
    expect(plan.candidates[0]?.blockedBy).toEqual([]);
    await expect(store.applyDeleteBundles(plan)).resolves.toEqual({
      deletedBundleIds: [f.BUNDLE_ID],
    });
    expect(await store.getBundle(f.BUNDLE_ID)).toBeUndefined();
  });

  it('enforces Store capacity before accepting new bytes', async () => {
    const store = await openStore({ maxBytes: 1 });
    await expect(
      store.createBundle({
        bundleId: f.BUNDLE_ID,
        prototypeId: f.PROTOTYPE_ID,
        run: f.RUN_1,
        revisions: [f.PRIMARY_ACTIVE_REVISION],
        coverage: f.RUN_1.coverage,
      }),
    ).rejects.toMatchObject({ code: 'capacity-exceeded' });
    expect(await store.getBundle(f.BUNDLE_ID)).toBeUndefined();
  });

  it('cleans only archived, unprotected history and preserves active transitive refs', async () => {
    const store = await openStore();
    await createBundle(store);
    await store.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    const failedRun = {
      ...f.PARTIAL_RUN,
      runId: 'run-retention-failed',
      attempts: [
        {
          ...f.PARTIAL_RUN.attempts[0]!,
          runId: 'run-retention-failed',
          attemptId: 'attempt-retention-failed',
        },
      ],
    };
    const active = (
      await store.commitRun({
        bundleId: f.BUNDLE_ID,
        run: failedRun,
        revisions: [],
        coverage: f.PARTIAL_SNAPSHOT.coverage,
      })
    ).snapshot;
    await store.archiveBundle(f.BUNDLE_ID);

    const plan = await store.planClean({ retainArchivedSnapshots: 1 });
    expect(plan.candidates.some((candidate) => candidate.kind === 'snapshot')).toBe(true);
    expect(
      plan.candidates.some(
        (candidate) => candidate.kind === 'snapshot' && candidate.objectId === active.snapshotId,
      ),
    ).toBe(false);
    await store.applyClean(plan);
    expect(await store.getActiveSnapshot(f.BUNDLE_ID)).toEqual(active);
    for (const slot of active.activeSlots) {
      expect(await store.getEvidenceRevision(f.BUNDLE_ID, slot.revisionId)).toBeDefined();
    }
  });

  it('rejects a stale clean plan when a new Staleness Report protects history', async () => {
    const store = await openStore();
    await createBundle(store);
    const oldSnapshot = await store.getActiveSnapshot(f.BUNDLE_ID);
    await store.commitRun({
      bundleId: f.BUNDLE_ID,
      run: f.RUN_2,
      revisions: [f.FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: f.SNAPSHOT.coverage,
    });
    await store.archiveBundle(f.BUNDLE_ID);
    const plan = await store.planClean({ retainArchivedSnapshots: 1 });
    expect(plan.candidates.some((candidate) => candidate.objectId === oldSnapshot!.snapshotId)).toBe(true);
    await store.createStalenessReport({
      bundleId: f.BUNDLE_ID,
      snapshotId: oldSnapshot!.snapshotId,
      inputVersion: f.RUN_1.inputVersion,
      currentDependencyDigests: {
        'registry:ledger-planet.task-list': 'registry-task-list-v1',
        'source:ledger-planet.task-list': 'source-task-list-v1',
      },
    });
    await expect(store.applyClean(plan)).rejects.toMatchObject({ code: 'clean-plan-stale' });
    expect(await store.getSnapshot(f.BUNDLE_ID, oldSnapshot!.snapshotId)).toBeDefined();
  });
});

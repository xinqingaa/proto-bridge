import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';
import { referenceCaseSlice } from '../../../src/v2/fixtures/index.js';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';
import type { NormalizedSelection } from '../../../src/v2/contracts/run.js';

const {
  WORKSPACE_ID,
  BUNDLE_ID,
  PROTOTYPE_ID,
  RUN_1,
  RUN_2,
  PRIMARY_ACTIVE_REVISION,
  FRAGMENT_SCOPED_ACTIVE_REVISION,
  PRIMARY_REVISION_ID,
  SNAPSHOT,
  TASK_LIST_CASE_ID,
  FULL_CASE_SCOPE_KEY,
  LIST_FRAGMENT_SCOPE_KEY,
  ATTEMPT_1_ID,
  RUN_1_ID,
} = referenceCaseSlice;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-store-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function freshStoreWithBundle(): Promise<LocalFileStore> {
  const store = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
  await store.init();
  await store.createBundle({
    bundleId: BUNDLE_ID,
    prototypeId: PROTOTYPE_ID,
    run: RUN_1,
    revisions: [PRIMARY_ACTIVE_REVISION],
    coverage: RUN_1.coverage,
  });
  return store;
}

describe('LocalFileStore: commit + read', () => {
  it('commits a primary-capture Run and reads back an active Snapshot with the same shape as the golden fixture', async () => {
    const store = await freshStoreWithBundle();
    const { snapshot } = await store.commitRun({
      bundleId: BUNDLE_ID,
      run: RUN_1,
      revisions: [PRIMARY_ACTIVE_REVISION],
      coverage: RUN_1.coverage,
    });

    expect(snapshot.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);

    const active = await store.getActiveSnapshot(BUNDLE_ID);
    expect(active).toEqual(snapshot);

    const run = await store.getRun(BUNDLE_ID, RUN_1_ID);
    expect(run).toEqual(RUN_1);

    const revision = await store.getEvidenceRevision(BUNDLE_ID, PRIMARY_REVISION_ID);
    expect(revision).toEqual(PRIMARY_ACTIVE_REVISION);
  });

  it('folds a second, Fragment-scope Run on top and reproduces the exact golden fixture Snapshot content', async () => {
    const store = await freshStoreWithBundle();
    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });
    const { snapshot } = await store.commitRun({
      bundleId: BUNDLE_ID,
      run: RUN_2,
      revisions: [FRAGMENT_SCOPED_ACTIVE_REVISION],
      coverage: SNAPSHOT.coverage,
    });

    expect(snapshot.activeSlots).toEqual(SNAPSHOT.activeSlots);
    expect(snapshot.latestAttempts).toEqual(SNAPSHOT.latestAttempts);
    expect(snapshot.coverage).toEqual(SNAPSHOT.coverage);
  });

  it('is readable from a brand-new Store instance pointed at the same root (restart-safe reads)', async () => {
    const writer = await freshStoreWithBundle();
    await writer.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });
    await writer.close();

    const reader = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await reader.init();
    const active = await reader.getActiveSnapshot(BUNDLE_ID);
    expect(active?.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);
    expect(await reader.getRun(BUNDLE_ID, RUN_1_ID)).toEqual(RUN_1);
    expect(await reader.getEvidenceRevision(BUNDLE_ID, PRIMARY_REVISION_ID)).toEqual(PRIMARY_ACTIVE_REVISION);
    await reader.close();
  });
});

describe('LocalFileStore: reference integrity and transactional failure', () => {
  it('rejects atomic Bundle creation whose captured Attempt references a missing revision, without exposing an empty Bundle', async () => {
    const store = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await store.init();
    const brokenRun = { ...RUN_1, attempts: [{ ...RUN_1.attempts[0]!, revisionId: 'ghost-revision' }] };

    await expect(
      store.createBundle({
        bundleId: BUNDLE_ID,
        prototypeId: PROTOTYPE_ID,
        run: brokenRun,
        revisions: [],
        coverage: RUN_1.coverage,
      }),
    ).rejects.toThrow(V2ContractError);

    expect(await store.getBundle(BUNDLE_ID)).toBeUndefined();
    expect(await store.getActiveSnapshot(BUNDLE_ID)).toBeUndefined();
    expect(await store.getRun(BUNDLE_ID, RUN_1_ID)).toBeUndefined();
  });

  it('leaves the previous active Snapshot completely untouched when a later commit fails', async () => {
    const store = await freshStoreWithBundle();
    const { snapshot: firstSnapshot } = await store.commitRun({
      bundleId: BUNDLE_ID,
      run: RUN_1,
      revisions: [PRIMARY_ACTIVE_REVISION],
      coverage: RUN_1.coverage,
    });

    const brokenRun2 = { ...RUN_2, attempts: [{ ...RUN_2.attempts[0]!, revisionId: 'ghost-revision-2' }] };
    await expect(
      store.commitRun({ bundleId: BUNDLE_ID, run: brokenRun2, revisions: [], coverage: RUN_1.coverage }),
    ).rejects.toThrow(V2ContractError);

    const stillActive = await store.getActiveSnapshot(BUNDLE_ID);
    expect(stillActive).toEqual(firstSnapshot);
  });

  it('rejects committing into an unknown Bundle', async () => {
    const store = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await store.init();
    await expect(
      store.commitRun({ bundleId: 'no-such-bundle', run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage }),
    ).rejects.toThrow(V2ContractError);
  });
});

describe('LocalFileStore: failed retries never clear active Evidence', () => {
  it('carries forward the primary active revision when an exact Fragment retry fails, and records the failure as that scope\'s latest Attempt', async () => {
    const store = await freshStoreWithBundle();
    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });

    const failedRun = {
      ...RUN_2,
      runId: 'run-failed-retry',
      attempts: [
        {
          ...RUN_2.attempts[0]!,
          runId: 'run-failed-retry',
          attemptId: 'attempt-failed-retry',
          result: 'failed' as const,
          revisionId: undefined,
          reason: 'Runtime timed out waiting for the list Fragment to stabilize.',
        },
      ],
    };
    const { snapshot } = await store.commitRun({
      bundleId: BUNDLE_ID,
      run: failedRun,
      revisions: [],
      coverage: RUN_1.coverage,
    });

    expect(snapshot.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);
    expect(snapshot.latestAttempts).toContainEqual({
      caseId: TASK_LIST_CASE_ID,
      scopeKey: LIST_FRAGMENT_SCOPE_KEY,
      attemptId: 'attempt-failed-retry',
      runId: 'run-failed-retry',
    });
    expect(snapshot.latestAttempts).toContainEqual({
      caseId: TASK_LIST_CASE_ID,
      scopeKey: FULL_CASE_SCOPE_KEY,
      attemptId: ATTEMPT_1_ID,
      runId: RUN_1_ID,
    });
  });
});

describe('LocalFileStore: immutability', () => {
  it('treats re-putting the exact same Run content as a no-op', async () => {
    const store = await freshStoreWithBundle();
    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });
    await expect(
      store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage }),
    ).resolves.toBeDefined();
  });

  it('rejects re-putting the same Run id with different content', async () => {
    const store = await freshStoreWithBundle();
    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });

    const mutatedRun = { ...RUN_1, terminationReason: 'failed' as const };
    await expect(
      store.commitRun({ bundleId: BUNDLE_ID, run: mutatedRun, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage }),
    ).rejects.toThrow(/immutable-violation|already persisted with different content/);
  });
});

describe('LocalFileStore: concurrent writer protection', () => {
  it('rejects a second Store instance trying to init the same root while the first still holds the lock', async () => {
    const first = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await first.init();

    const second = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await expect(second.init()).rejects.toThrow(/writer-lock-held|already locked/);

    await first.close();
    const third = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await expect(third.init()).resolves.toBeDefined();
    await third.close();
  });

  it('allows a read-only Store to inspect a fixed Snapshot while the writer lock is held', async () => {
    const writer = await freshStoreWithBundle();
    const active = await writer.getActiveSnapshot(BUNDLE_ID);

    const reader = new LocalFileStore({
      root,
      workspaceId: WORKSPACE_ID,
      readOnly: true,
    });
    await expect(reader.init()).resolves.toMatchObject({
      finalizedOrphanJobs: [],
      lifecycle: { storeLayoutVersion: 3, generationId: expect.stringMatching(/^generation-/) },
    });
    await expect(
      reader.getSnapshot(BUNDLE_ID, active!.snapshotId),
    ).resolves.toEqual(active);
    await expect(
      reader.createJob({
        bundleId: BUNDLE_ID,
        selection: RUN_1.selection as NormalizedSelection,
        inputVersion: RUN_1.inputVersion,
      }),
    ).rejects.toThrow(/read-only mode/);

    await reader.close();
    await writer.close();
  });
});

describe('LocalFileStore: workspace mismatch', () => {
  it('rejects initializing a root that already belongs to a different workspace', async () => {
    const first = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await first.init();
    await first.close();

    const other = new LocalFileStore({ root, workspaceId: 'some-other-workspace' });
    await expect(other.init()).rejects.toThrow(V2ContractError);
  });
});

describe('LocalFileStore: Workspace generation and root identity', () => {
  it('keeps generation on reopen and creates a new generation only after bound reset', async () => {
    const store = await freshStoreWithBundle();
    const before = await store.getWorkspaceLifecycle();
    await store.close();

    const reopened = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    const initialized = await reopened.init();
    expect(initialized.lifecycle.generationId).toBe(before.generationId);
    const reset = await reopened.resetWorkspace(before.generationId as string);
    expect(reset.oldGenerationId).toBe(before.generationId);
    expect(reset.newGenerationId).not.toBe(before.generationId);
    await expect(reopened.getBundle(BUNDLE_ID)).resolves.toBeUndefined();
    await reopened.close();
  });

  it('reports legacy generation to readers and migrates it once under the writer lock', async () => {
    const store = await freshStoreWithBundle();
    await store.close();
    const manifestPath = path.join(root, 'workspace.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    delete manifest.generationId;
    delete manifest.storeLayoutVersion;
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');

    const reader = new LocalFileStore({ root, workspaceId: WORKSPACE_ID, readOnly: true });
    const legacy = await reader.init();
    expect(legacy.lifecycle.generationId).toBe('legacy-unavailable');
    await reader.close();

    const writer = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    const migrated = await writer.init();
    expect(migrated.migration).toMatchObject({ kind: 'legacy-generation-upgrade' });
    expect(await writer.getBundle(BUNDLE_ID)).toBeDefined();
    const generation = migrated.lifecycle.generationId;
    await writer.close();

    const again = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    const reopened = await again.init();
    expect(reopened.lifecycle.generationId).toBe(generation);
    expect(reopened.migration).toBeUndefined();
    await again.close();
  });

  it('fails terminally when an active writer root is externally deleted and does not recreate it', async () => {
    const store = await freshStoreWithBundle();
    await rm(root, { recursive: true, force: true });
    await expect(store.createBundle({
      bundleId: 'bundle-after-destroy',
      prototypeId: PROTOTYPE_ID,
      run: { ...RUN_1, bundleId: 'bundle-after-destroy' },
      revisions: [],
      coverage: RUN_1.coverage,
    })).rejects.toMatchObject({ code: 'external-store-destroyed' });
    await expect(access(root)).rejects.toThrow();
    await store.close();
  });

  it('detects writer lock removal before the next mutation', async () => {
    const store = await freshStoreWithBundle();
    await rm(path.join(root, '.lock'), { force: true });
    await expect(store.archiveBundle(BUNDLE_ID)).rejects.toMatchObject({ code: 'writer-lock-lost' });
    await store.close();
  });

  it('leaves an interrupted reset terminal until explicit reinitialize', async () => {
    const initial = await freshStoreWithBundle();
    const generation = (await initial.getWorkspaceLifecycle()).generationId as string;
    await initial.close();
    const crashing = new LocalFileStore({
      root,
      workspaceId: WORKSPACE_ID,
      beforeResetManifest: async () => { throw new Error('simulated reset crash'); },
    });
    await crashing.init();
    await expect(crashing.resetWorkspace(generation)).rejects.toThrow('simulated reset crash');
    await expect(crashing.createJob({
      bundleId: BUNDLE_ID,
      selection: RUN_1.selection as NormalizedSelection,
      inputVersion: RUN_1.inputVersion,
    })).rejects.toMatchObject({ code: 'workspace-resetting' });
    await expect(access(path.join(root, '.reset-in-progress.json'))).resolves.toBeUndefined();
    await expect(access(path.join(root, 'workspace.json'))).rejects.toThrow();
    await crashing.close();

    const restarted = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    await expect(restarted.init()).rejects.toMatchObject({ code: 'workspace-resetting' });
  });
});

describe('LocalFileStore: Job lifecycle and orphan/restart finalization', () => {
  const selection: NormalizedSelection = RUN_1.selection;

  it('accepts, runs and finalizes a Job normally', async () => {
    const store = await freshStoreWithBundle();
    const job = await store.createJob({ bundleId: BUNDLE_ID, selection, inputVersion: RUN_1.inputVersion });
    expect(job.status).toBe('queued');

    const discovering = await store.startJob(job.jobId, RUN_1_ID);
    expect(discovering.status).toBe('discovering');
    expect(discovering.runId).toBe(RUN_1_ID);
    expect((await store.advanceJob(job.jobId, 'capturing')).status).toBe('capturing');

    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });
    expect((await store.advanceJob(job.jobId, 'writing')).status).toBe('writing');
    const finalized = await store.finalizeJob(job.jobId, 'completed');
    expect(finalized.status).toBe('completed');
    expect(finalized.endedAt).toBeDefined();
  });

  it('finalizes a Job left capturing by a crashed writer as interrupted on the next Store init, without touching existing active Evidence', async () => {
    const writer = await freshStoreWithBundle();
    await writer.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });

    const orphanSelection: NormalizedSelection = RUN_2.selection;
    const job = await writer.createJob({ bundleId: BUNDLE_ID, selection: orphanSelection, inputVersion: RUN_2.inputVersion });
    await writer.startJob(job.jobId, 'run-that-never-finished');
    await writer.advanceJob(job.jobId, 'capturing');
    // Simulate a crash: the process dies here, before commitRun or finalizeJob ever runs.
    await writer.close();

    const restarted = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    const { finalizedOrphanJobs } = await restarted.init();
    expect(finalizedOrphanJobs).toContain(job.jobId);

    const reloadedJob = await restarted.getJob(job.jobId);
    expect(reloadedJob?.status).toBe('interrupted');
    expect(reloadedJob?.runId).toBe('run-that-never-finished');

    const synthesizedRun = await restarted.getRun(BUNDLE_ID, 'run-that-never-finished');
    expect(synthesizedRun?.terminationReason).toBe('interrupted');
    expect(synthesizedRun?.attempts).toEqual([]);
    expect(synthesizedRun?.coverage.counts.missing).toBe(orphanSelection.cases.length);

    // Crucially, the Bundle's existing primary active Evidence from Run 1 must survive untouched.
    const active = await restarted.getActiveSnapshot(BUNDLE_ID);
    expect(active?.activeSlots).toEqual([
      { caseId: TASK_LIST_CASE_ID, kind: 'primary', scopeKey: FULL_CASE_SCOPE_KEY, revisionId: PRIMARY_REVISION_ID },
    ]);
    await restarted.close();
  });

  it('finalizes a Job that never even started (still queued) as interrupted with a zero-Attempt Run', async () => {
    const store = await freshStoreWithBundle();
    const job = await store.createJob({ bundleId: BUNDLE_ID, selection, inputVersion: RUN_1.inputVersion });
    await store.close();

    const restarted = new LocalFileStore({ root, workspaceId: WORKSPACE_ID });
    const { finalizedOrphanJobs } = await restarted.init();
    expect(finalizedOrphanJobs).toContain(job.jobId);
    const reloadedJob = await restarted.getJob(job.jobId);
    expect(reloadedJob?.status).toBe('interrupted');
    expect(reloadedJob?.runId).toBeDefined();
    await restarted.close();
  });

  it('rejects appending to or finalizing an already-terminal Job', async () => {
    const store = await freshStoreWithBundle();
    const job = await store.createJob({ bundleId: BUNDLE_ID, selection, inputVersion: RUN_1.inputVersion });
    await store.startJob(job.jobId, RUN_1_ID);
    await store.advanceJob(job.jobId, 'capturing');
    await store.commitRun({ bundleId: BUNDLE_ID, run: RUN_1, revisions: [PRIMARY_ACTIVE_REVISION], coverage: RUN_1.coverage });
    await store.advanceJob(job.jobId, 'writing');
    await store.finalizeJob(job.jobId, 'completed');

    await expect(store.finalizeJob(job.jobId, 'failed')).rejects.toThrow(V2ContractError);
    await expect(store.appendJobJournal(job.jobId, { event: 'late-event' })).rejects.toThrow(V2ContractError);
  });
});

describe('LocalFileStore: Bundle', () => {
  it('rejects creating a second Bundle with the same identity', async () => {
    const store = await freshStoreWithBundle();
    await expect(
      store.createBundle({
        bundleId: BUNDLE_ID,
        prototypeId: PROTOTYPE_ID,
        run: RUN_1,
        revisions: [PRIMARY_ACTIVE_REVISION],
        coverage: RUN_1.coverage,
      }),
    ).rejects.toThrow(V2ContractError);
  });

  it('never exposes a successfully created Bundle without its first Snapshot', async () => {
    const store = await freshStoreWithBundle();
    expect(await store.getBundle(BUNDLE_ID)).toBeDefined();
    expect(await store.getActiveSnapshot(BUNDLE_ID)).toBeDefined();
  });
});

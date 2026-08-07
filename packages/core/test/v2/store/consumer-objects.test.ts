import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtures } from '../../../src/v2/index.js';
import { LocalFileStore } from '../../../src/v2/store/index.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe('Store-backed Consumer objects', () => {
  it('lists immutable Catalog revisions and Issues across reader restart', async () => {
    const reference = fixtures.referenceCaseSlice;
    const root = await mkdtemp(path.join(os.tmpdir(), 'pb-consumer-store-'));
    roots.push(root);
    const writer = new LocalFileStore({
      root,
      workspaceId: reference.WORKSPACE_ID,
    });
    await writer.init();
    await writer.createBundle({
      bundleId: reference.BUNDLE_ID,
      prototypeId: reference.PROTOTYPE_ID,
      run: reference.RUN_1,
      revisions: [reference.PRIMARY_ACTIVE_REVISION],
      coverage: reference.RUN_1.coverage,
    });
    await writer.putCatalogRevision({
      schemaVersion: 1,
      catalogRevisionId: 'catalog-task-list-screen-v1',
      workspaceId: reference.WORKSPACE_ID,
      bundleId: reference.BUNDLE_ID,
      prototypeId: reference.PROTOTYPE_ID,
      kind: 'screen',
      inputDigest: 'sha256:task-list-screen-v1',
      createdAt: '2026-07-30T08:00:00.000Z',
      entries: [
        {
          objectId: reference.SCREEN_ID,
          digest: 'sha256:task-list',
          value: { title: '任务列表' },
          blobIds: [],
        },
      ],
    });
    await writer.putIssue(reference.BUNDLE_ID, reference.UNKNOWN_ISSUE);
    await writer.close();

    const reader = new LocalFileStore({
      root,
      workspaceId: reference.WORKSPACE_ID,
      readOnly: true,
    });
    await reader.init();
    expect(await reader.listCatalogRevisions(reference.BUNDLE_ID)).toHaveLength(
      1,
    );
    expect(await reader.listIssues(reference.BUNDLE_ID)).toEqual([
      reference.UNKNOWN_ISSUE,
    ]);
    await reader.close();
  });
});

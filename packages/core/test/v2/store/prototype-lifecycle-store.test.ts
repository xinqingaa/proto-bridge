import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { referenceCaseSlice as f } from '../../../src/v2/fixtures/index.js';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';

let root: string;
const stores: LocalFileStore[] = [];

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-prototype-lifecycle-'));
});

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
  await rm(root, { recursive: true, force: true });
});

async function openStore() {
  const store = new LocalFileStore({
    root,
    workspaceId: f.WORKSPACE_ID,
  });
  await store.init();
  stores.push(store);
  return store;
}

describe('LocalFileStore: Prototype lifecycle', () => {
  it('persists lifecycle records and immutable transition history', async () => {
    const store = await openStore();
    const active = await store.ensurePrototypeLifecycle(f.PROTOTYPE_ID);
    expect(active).toMatchObject({ stage: 'active', revision: 1 });

    const review = await store.transitionPrototypeLifecycle({
      prototypeId: f.PROTOTYPE_ID,
      expectedRevision: active.revision,
      to: 'review',
      note: 'Ready for review',
    });
    expect(review.record).toMatchObject({ stage: 'review', revision: 2 });

    const operating = await store.updatePrototypeLifecycleOperation({
      prototypeId: f.PROTOTYPE_ID,
      expectedRevision: review.record.revision,
      operation: {
        kind: 'finalizing',
        phase: 'preflighting',
        startedAt: new Date().toISOString(),
      },
    });
    expect(operating).toMatchObject({ revision: 3, operation: { kind: 'finalizing' } });
    await expect(
      store.transitionPrototypeLifecycle({
        prototypeId: f.PROTOTYPE_ID,
        expectedRevision: 2,
        to: 'active',
      }),
    ).rejects.toMatchObject({ code: 'lifecycle-conflict' });

    const events = await store.listPrototypeLifecycleEvents(f.PROTOTYPE_ID);
    expect(events.map((event) => [event.from, event.to, event.note])).toEqual([
      ['active', 'review', 'Ready for review'],
      [null, 'active', 'Initialized in Core Store'],
    ]);
  });

  it('imports a validated legacy review record only before initialization', async () => {
    const store = await openStore();
    const imported = await store.importPrototypeLifecycle({
      prototypeId: f.PROTOTYPE_ID,
      stage: 'review',
      artifacts: null,
      note: 'Legacy PBWork v2 import',
    });
    expect(imported).toMatchObject({ stage: 'review', revision: 1 });
    await expect(
      store.importPrototypeLifecycle({
        prototypeId: f.PROTOTYPE_ID,
        stage: 'active',
        artifacts: null,
      }),
    ).rejects.toMatchObject({ code: 'lifecycle-conflict' });
  });
});

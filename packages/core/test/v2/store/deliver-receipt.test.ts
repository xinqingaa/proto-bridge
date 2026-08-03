import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createAgentHandoff } from '../../../src/v2/capture/handoff.js';
import { ledgerPlanetTaskList as fixture } from '../../../src/v2/fixtures/index.js';
import { writeDeliveryReceipt } from '../../../src/v2/store/deliver-receipt.js';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Delivery review artifacts', () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  });

  it('writes an Asia/Shanghai delivery with a fixed contract and review PNGs', async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pb-delivery-'));
    const storeRoot = path.join(tempRoot, '.proto-bridge', 'store');
    const targetRoot = path.join(tempRoot, 'target');
    const store = new LocalFileStore({
      root: storeRoot,
      workspaceId: fixture.WORKSPACE_ID,
    });
    await store.init();
    const created = await store.createBundle({
      bundleId: fixture.BUNDLE_ID,
      prototypeId: fixture.PROTOTYPE_ID,
      run: fixture.RUN_1,
      revisions: [fixture.PRIMARY_ACTIVE_REVISION],
      coverage: fixture.RUN_1.coverage,
    });
    await store.putBlob({
      bundleId: fixture.BUNDLE_ID,
      kind: 'screenshot',
      mediaType: 'image/png',
      bytes: PNG_BYTES,
      ownerRefs: [
        { kind: 'revision', objectId: fixture.PRIMARY_ACTIVE_REVISION.revisionId },
      ],
    });
    const staleness = await store.createStalenessReport({
      bundleId: fixture.BUNDLE_ID,
      snapshotId: created.snapshot.snapshotId,
      inputVersion: 'delivery-test-v1',
      currentDependencyDigests: {
        'registry:ledger-planet.task-list': 'registry-task-list-v1',
        'source:ledger-planet.task-list': 'source-task-list-v1',
      },
    });
    const handoff = await createAgentHandoff({
      store,
      bundleId: fixture.BUNDLE_ID,
      snapshotId: created.snapshot.snapshotId,
      selectedCases: fixture.RUN_1.selection.cases,
      stalenessReport: staleness,
      currentInputVersion: staleness.inputVersion,
      acknowledgedRiskKinds: ['reconstruction-readiness'],
    });
    await store.close();

    const receipt = await writeDeliveryReceipt({
      storeRoot,
      targetRoot,
      handoff,
      source: 'cli',
      timeZone: 'Asia/Shanghai',
    });
    expect(receipt.schemaVersion).toBe(2);
    expect(receipt.deliveryId).toMatch(/T\d{2}-\d{2}-\d{2}\+08-00$/);
    expect(receipt.createdAtLocal).toMatch(/\+08:00$/);
    expect(receipt.screenshotCount).toBe(1);
    const contract = JSON.parse(
      await readFile(receipt.acceptanceContractPath, 'utf8'),
    );
    expect(contract).not.toHaveProperty('policy');
    expect(contract.screenshots).toHaveLength(1);
    expect(await readFile(receipt.agentPromptPath, 'utf8')).toContain(
      receipt.acceptanceContractPath,
    );
    const reviewManifest = JSON.parse(
      await readFile(receipt.reviewManifestPath, 'utf8'),
    );
    const reviewPng = path.join(
      path.dirname(receipt.reviewManifestPath),
      reviewManifest.screenshots[0].path,
    );
    expect(await readFile(reviewPng)).toEqual(PNG_BYTES);
  });
});

import {
  BlobId,
  BundleId,
  SnapshotId,
  WorkspaceId,
} from "@proto-bridge/core/v2";
import {
  buildEvidenceReadModel,
  type EvidenceReadModel,
} from "@proto-bridge/core/v2/evidence-read-model";
import { LocalFileStore } from "@proto-bridge/core/v2/store";
import type { ServerOptions } from "../types.js";

export type EvidenceBundleSummary = {
  bundleId: string;
  prototypeId: string;
  status: string;
  activeSnapshotId?: string;
  committedAt?: string;
  deliveryStatus?: EvidenceReadModel["deliveryStatus"];
  messages: string[];
  snapshotResource?: string;
};

export type EvidenceSnapshotDetails = {
  bundle: {
    bundleId: string;
    prototypeId: string;
    status: string;
  };
  evidence: EvidenceReadModel;
};

export function evidenceSnapshotUri(
  bundleId: string,
  snapshotId: string,
): string {
  return `proto-bridge://evidence/${encodeURIComponent(bundleId)}/snapshots/${encodeURIComponent(snapshotId)}`;
}

export function evidenceScreenshotUri(
  bundleId: string,
  snapshotId: string,
  blobId: string,
): string {
  return `${evidenceSnapshotUri(bundleId, snapshotId)}/screenshots/${encodeURIComponent(blobId)}`;
}

/**
 * Read-only Stage 5 adapter over the same immutable V2 Store consumed by
 * PBWork. It always resolves a concrete Snapshot ID before returning
 * evidence, so a long-running Agent never silently drifts to a newer active
 * Snapshot.
 */
export class EvidenceStoreReader {
  private store: LocalFileStore | undefined;
  private initPromise: Promise<LocalFileStore> | undefined;

  constructor(private readonly options: ServerOptions) {}

  configured(): boolean {
    return Boolean(this.options.storeRoot && this.options.workspaceId);
  }

  async listBundles(): Promise<EvidenceBundleSummary[]> {
    const store = await this.requireStore();
    const bundles = await store.listBundles();
    return Promise.all(
      bundles.map(async (bundle) => {
        const snapshot = await store.getActiveSnapshot(bundle.bundleId);
        if (!snapshot) {
          return {
            bundleId: bundle.bundleId,
            prototypeId: bundle.prototypeId,
            status: bundle.status,
            messages: ["Bundle 还没有 active Snapshot，因此没有可消费的证据。"],
          };
        }
        const details = await this.readSnapshot(
          bundle.bundleId,
          snapshot.snapshotId,
        );
        return {
          bundleId: bundle.bundleId,
          prototypeId: bundle.prototypeId,
          status: bundle.status,
          activeSnapshotId: snapshot.snapshotId,
          committedAt: snapshot.committedAt,
          deliveryStatus: details.evidence.deliveryStatus,
          messages: details.evidence.messages,
          snapshotResource: evidenceSnapshotUri(
            bundle.bundleId,
            snapshot.snapshotId,
          ),
        };
      }),
    );
  }

  async readSnapshot(
    bundleIdInput: string,
    snapshotIdInput: string,
  ): Promise<EvidenceSnapshotDetails> {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const snapshotId = SnapshotId.parse(snapshotIdInput);
    const bundle = await store.getBundle(bundleId);
    if (!bundle) throw new Error(`Unknown Evidence Bundle: ${bundleId}`);
    const snapshot = await store.getSnapshot(bundleId, snapshotId);
    if (!snapshot) {
      throw new Error(
        `Unknown Snapshot ${snapshotId} in Evidence Bundle ${bundleId}.`,
      );
    }
    const activeRevisionIds = new Set(
      snapshot.activeSlots.map((slot) => slot.revisionId),
    );
    const revisions = (await store.listEvidenceRevisions(bundleId)).filter(
      (revision) => activeRevisionIds.has(revision.revisionId),
    );
    const evidence = buildEvidenceReadModel({
      snapshot,
      runs: await store.listRuns(bundleId),
      revisions,
      blobs: await store.listBlobRecords(bundleId),
    });
    return {
      bundle: {
        bundleId: bundle.bundleId,
        prototypeId: bundle.prototypeId,
        status: bundle.status,
      },
      evidence,
    };
  }

  async readScreenshot(
    bundleIdInput: string,
    snapshotIdInput: string,
    blobIdInput: string,
  ): Promise<{ mediaType: string; bytes: Uint8Array }> {
    const details = await this.readSnapshot(bundleIdInput, snapshotIdInput);
    const allowed = new Set(
      details.evidence.screens.flatMap((screen) =>
        screen.cases.flatMap((item) => item.screenshotBlobIds),
      ),
    );
    const blobId = BlobId.parse(blobIdInput);
    if (!allowed.has(blobId)) {
      throw new Error(
        `Screenshot ${blobId} is not attached to Snapshot ${snapshotIdInput}.`,
      );
    }
    const store = await this.requireStore();
    const blob = await store.getBlob(BundleId.parse(bundleIdInput), blobId);
    if (!blob || blob.record.kind !== "screenshot") {
      throw new Error(`Screenshot Blob ${blobId} does not exist.`);
    }
    return { mediaType: blob.record.mediaType, bytes: blob.bytes };
  }

  private async requireStore(): Promise<LocalFileStore> {
    if (this.store) return this.store;
    if (this.initPromise) return this.initPromise;
    const { storeRoot, workspaceId } = this.options;
    if (!storeRoot || !workspaceId) {
      throw new Error(
        "Evidence Store reader is not configured. Start MCP with --store-root <path> and --workspace <workspaceId>, or set PB_V2_STORE_ROOT and PB_V2_WORKSPACE_ID.",
      );
    }
    this.initPromise = (async () => {
      const store = new LocalFileStore({
        root: storeRoot,
        workspaceId: WorkspaceId.parse(workspaceId),
        readOnly: true,
      });
      await store.init();
      this.store = store;
      return store;
    })();
    return this.initPromise;
  }
}

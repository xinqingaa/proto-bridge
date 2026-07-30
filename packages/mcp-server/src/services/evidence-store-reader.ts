import {
  BlobId,
  BundleId,
  CaseEvidenceRevisionId,
  CatalogRevisionId,
  HandoffId,
  IssueId,
  RunId,
  SnapshotId,
  StalenessReportId,
  V2ContractError,
  WorkspaceId,
  unknownReferenceError,
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

export type EvidenceHistory = {
  bundleId: string;
  snapshots: string[];
  runs: Array<{
    runId: string;
    terminationReason: string;
    inputVersion: string;
    coverage: unknown;
  }>;
  catalogs: Array<{
    catalogRevisionId: string;
    kind: string;
    inputDigest: string;
    createdAt: string;
  }>;
  issues: unknown[];
  stalenessReports: Array<{
    reportId: string;
    snapshotId: string;
    inputVersion: string;
    checkedAt: string;
    staleRevisions: number;
  }>;
  handoffs: Array<{
    handoffId: string;
    snapshotId: string;
    coverageStatus: string;
    freshnessStatus: string;
    createdAt: string;
    risks: unknown[];
  }>;
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
 * Read-only adapter over the same immutable Store consumed by PBWork.
 * It always resolves a concrete Snapshot ID before returning
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

  workspace(): {
    workspaceId: string;
    configuredStoreRoot: boolean;
  } {
    if (!this.options.workspaceId) {
      throw new V2ContractError(
        "workspace-mismatch",
        "MCP Evidence Reader is not connected to a Workspace.",
      );
    }
    return {
      workspaceId: WorkspaceId.parse(this.options.workspaceId),
      configuredStoreRoot: Boolean(this.options.storeRoot),
    };
  }

  async history(bundleIdInput: string): Promise<EvidenceHistory> {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    if (!(await store.getBundle(bundleId))) {
      throw unknownReferenceError("Evidence Bundle", bundleId);
    }
    const runs = await store.listRuns(bundleId);
    const catalogs = await store.listCatalogRevisions(bundleId);
    const stalenessReports = await store.listStalenessReports(bundleId);
    const handoffs = await store.listHandoffs(bundleId);
    return {
      bundleId,
      snapshots: await store.listSnapshotIds(bundleId),
      runs: runs.map((run) => ({
        runId: run.runId,
        terminationReason: run.terminationReason,
        inputVersion: run.inputVersion,
        coverage: run.coverage,
      })),
      catalogs: catalogs.map((catalog) => ({
        catalogRevisionId: catalog.catalogRevisionId,
        kind: catalog.kind,
        inputDigest: catalog.inputDigest,
        createdAt: catalog.createdAt,
      })),
      issues: await store.listIssues(bundleId),
      stalenessReports: stalenessReports.map((report) => ({
        reportId: report.reportId,
        snapshotId: report.snapshotId,
        inputVersion: report.inputVersion,
        checkedAt: report.checkedAt,
        staleRevisions: report.perRevision.filter((entry) => entry.stale)
          .length,
      })),
      handoffs: handoffs.map((handoff) => ({
        handoffId: handoff.handoffId,
        snapshotId: handoff.snapshotId,
        coverageStatus: handoff.coverageStatus,
        freshnessStatus: handoff.freshnessStatus,
        createdAt: handoff.createdAt,
        risks: handoff.risks,
      })),
    };
  }

  async readSnapshot(
    bundleIdInput: string,
    snapshotIdInput: string,
  ): Promise<EvidenceSnapshotDetails> {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const snapshotId = SnapshotId.parse(snapshotIdInput);
    const bundle = await store.getBundle(bundleId);
    if (!bundle) throw unknownReferenceError("Evidence Bundle", bundleId);
    const snapshot = await store.getSnapshot(bundleId, snapshotId);
    if (!snapshot) {
      throw unknownReferenceError("Evidence Snapshot", {
        bundleId,
        snapshotId,
      });
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

  async readRun(bundleIdInput: string, runIdInput: string) {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const runId = RunId.parse(runIdInput);
    const run = await store.getRun(bundleId, runId);
    if (!run) throw unknownReferenceError("Evidence Run", { bundleId, runId });
    return run;
  }

  async readRevision(
    bundleIdInput: string,
    snapshotIdInput: string,
    revisionIdInput: string,
  ) {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const snapshotId = SnapshotId.parse(snapshotIdInput);
    const revisionId = CaseEvidenceRevisionId.parse(revisionIdInput);
    const snapshot = await store.getSnapshot(bundleId, snapshotId);
    if (!snapshot) {
      throw unknownReferenceError("Evidence Snapshot", {
        bundleId,
        snapshotId,
      });
    }
    if (!snapshot.activeSlots.some((slot) => slot.revisionId === revisionId)) {
      throw new V2ContractError(
        "unknown-reference",
        `Evidence revision ${revisionId} is not reachable from fixed Snapshot ${snapshotId}.`,
        { bundleId, snapshotId, revisionId },
      );
    }
    const revision = await store.getEvidenceRevision(bundleId, revisionId);
    if (!revision) {
      throw unknownReferenceError("Case Evidence revision", revisionId);
    }
    return revision;
  }

  async readCatalog(bundleIdInput: string, catalogRevisionIdInput: string) {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const catalogRevisionId = CatalogRevisionId.parse(catalogRevisionIdInput);
    const catalog = await store.getCatalogRevision(bundleId, catalogRevisionId);
    if (!catalog) {
      throw unknownReferenceError("Catalog revision", {
        bundleId,
        catalogRevisionId,
      });
    }
    return catalog;
  }

  async readIssue(bundleIdInput: string, issueIdInput: string) {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const issueId = IssueId.parse(issueIdInput);
    const issue = await store.getIssue(bundleId, issueId);
    if (!issue) {
      throw unknownReferenceError("Evidence Issue", { bundleId, issueId });
    }
    return issue;
  }

  async readStaleness(
    bundleIdInput: string,
    snapshotIdInput: string,
    reportIdInput: string,
  ) {
    const store = await this.requireStore();
    const bundleId = BundleId.parse(bundleIdInput);
    const snapshotId = SnapshotId.parse(snapshotIdInput);
    const reportId = StalenessReportId.parse(reportIdInput);
    const report = await store.getStalenessReport(reportId);
    if (
      !report ||
      report.bundleId !== bundleId ||
      report.snapshotId !== snapshotId
    ) {
      throw unknownReferenceError("Snapshot-bound Staleness Report", {
        bundleId,
        snapshotId,
        reportId,
      });
    }
    return report;
  }

  async readHandoff(handoffIdInput: string) {
    const store = await this.requireStore();
    const handoffId = HandoffId.parse(handoffIdInput);
    const handoff = await store.getHandoff(handoffId);
    if (!handoff) throw unknownReferenceError("Agent Handoff", handoffId);
    if (handoff.workspaceId !== store.workspaceId) {
      throw new V2ContractError(
        "workspace-mismatch",
        `Handoff ${handoffId} belongs to Workspace ${handoff.workspaceId}, not ${store.workspaceId}.`,
      );
    }
    return handoff;
  }

  async readBlob(input: {
    bundleId: string;
    snapshotId: string;
    blobId: string;
    allowDebug: boolean;
    catalogRevisionId?: string;
  }): Promise<{ record: unknown; base64: string }> {
    const details = await this.readSnapshot(input.bundleId, input.snapshotId);
    const store = await this.requireStore();
    const bundleId = BundleId.parse(input.bundleId);
    const blobId = BlobId.parse(input.blobId);
    const blob = await store.getBlob(bundleId, blobId);
    if (!blob) throw unknownReferenceError("Evidence Blob", blobId);
    const activeRevisionIds = new Set(
      details.evidence.screens.flatMap((screen) =>
        screen.cases.map((item) => item.revisionId),
      ),
    );
    const snapshotRunIds = new Set([
      details.evidence.sourceRunId,
      ...(await store
        .getSnapshot(bundleId, SnapshotId.parse(input.snapshotId)))
        ?.latestAttempts.map((item) => item.runId) ?? [],
    ]);
    let reachable = blob.record.ownerRefs.some(
      (owner) =>
        (owner.kind === "revision" && activeRevisionIds.has(owner.objectId)) ||
        (owner.kind === "run" && snapshotRunIds.has(owner.objectId)),
    );
    if (!reachable && input.catalogRevisionId) {
      const catalog = await this.readCatalog(
        input.bundleId,
        input.catalogRevisionId,
      );
      reachable = catalog.entries.some((entry) =>
        entry.blobIds.includes(blobId),
      );
    }
    if (!reachable) {
      throw new V2ContractError(
        "unknown-reference",
        `Blob ${blobId} is not reachable from the fixed Snapshot or Catalog revision.`,
      );
    }
    if (
      (blob.record.kind === "debug" || blob.record.kind === "trace") &&
      !input.allowDebug
    ) {
      throw new V2ContractError(
        "unsafe-input",
        "Debug/Trace Evidence requires allowDebug=true.",
      );
    }
    return {
      record: blob.record,
      base64: Buffer.from(blob.bytes).toString("base64"),
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
      throw new V2ContractError(
        "unknown-reference",
        `Screenshot ${blobId} is not attached to Snapshot ${snapshotIdInput}.`,
      );
    }
    const store = await this.requireStore();
    const blob = await store.getBlob(BundleId.parse(bundleIdInput), blobId);
    if (!blob || blob.record.kind !== "screenshot") {
      throw unknownReferenceError("Screenshot Blob", blobId);
    }
    return { mediaType: blob.record.mediaType, bytes: blob.bytes };
  }

  private async requireStore(): Promise<LocalFileStore> {
    if (this.store) return this.store;
    if (this.initPromise) return this.initPromise;
    const { storeRoot, workspaceId } = this.options;
    if (!storeRoot || !workspaceId) {
      throw new V2ContractError(
        "workspace-mismatch",
        "Evidence Store reader is not configured. Start MCP with --store-root <path> and --workspace <workspaceId>, or set PB_STORE_ROOT and PB_WORKSPACE_ID.",
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

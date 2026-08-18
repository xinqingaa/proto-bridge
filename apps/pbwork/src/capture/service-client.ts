import {
  LocalServiceEnvelope,
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type BundleEvidenceDetails,
  type CaptureConsoleState,
  type CreateJobRequest,
  type CreateJobResponse,
  type DeliveryArtifact,
  type DeliveryDetail,
  type DeliveryListItem,
  type HandoffPreview,
  type HandoffPreviewRequest,
  type EvidenceInventory,
  type BundleDeletePlan,
  type BundleDeleteResult,
  type LocalServiceSession,
  type StoredPreflight,
  type WorkspaceResetPlan,
  type WorkspaceResetResult,
} from "@proto-bridge/core/v2/service-contract";
import type {
  AgentHandoff,
  CaptureJob,
  StalenessReport,
} from "@proto-bridge/core/v2";
import type { SelectionDraft } from "@proto-bridge/core/v2/capture";

const SESSION_KEY = "pbwork.capture-v2.session";

export class LocalServiceClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "LocalServiceClientError";
  }
}

export class CaptureServiceClient {
  private token: string | null = null;

  constructor(private readonly basePath = "/__pb_v2") {
    try {
      this.token = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      this.token = null;
    }
  }

  async connect(): Promise<LocalServiceSession> {
    const session = await this.request<LocalServiceSession>("/session", {
      method: "POST",
      authenticated: false,
    });
    if (session.protocolVersion !== LOCAL_SERVICE_PROTOCOL_VERSION) {
      throw new LocalServiceClientError(
        "incompatible-protocol",
        `Local Service protocol ${String(session.protocolVersion)} is incompatible with required version ${LOCAL_SERVICE_PROTOCOL_VERSION}.`,
      );
    }
    this.token = session.sessionToken;
    window.sessionStorage.setItem(SESSION_KEY, session.sessionToken);
    return session;
  }

  disconnect(): void {
    this.token = null;
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  consoleState(): Promise<CaptureConsoleState> {
    return this.request("/console");
  }

  evidenceInventory(): Promise<EvidenceInventory> {
    return this.request("/evidence-inventory");
  }

  trashBundles(bundleIds: string[]): Promise<unknown> {
    return this.request("/bundles/trash", {
      method: "POST",
      body: { bundleIds },
    });
  }

  restoreBundles(bundleIds: string[]): Promise<unknown> {
    return this.request("/bundles/restore", {
      method: "POST",
      body: { bundleIds },
    });
  }

  planDeleteBundles(bundleIds: string[]): Promise<BundleDeletePlan> {
    return this.request("/delete-plans", {
      method: "POST",
      body: { bundleIds },
    });
  }

  applyDeleteBundles(plan: BundleDeletePlan): Promise<BundleDeleteResult> {
    return this.request("/delete-plans/apply", {
      method: "POST",
      body: { plan },
    });
  }

  createPreflight(draft: SelectionDraft): Promise<StoredPreflight> {
    return this.request("/preflights", {
      method: "POST",
      body: { draft },
    });
  }

  createJob(body: CreateJobRequest): Promise<CreateJobResponse> {
    return this.request("/jobs", { method: "POST", body });
  }

  getJob(jobId: string): Promise<CaptureJob> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}`);
  }

  cancelJob(jobId: string): Promise<CaptureJob> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
  }

  retryDraft(jobId: string): Promise<SelectionDraft> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}/retry-draft`, {
      method: "POST",
    });
  }

  staleDraft(bundleId: string, reportId: string): Promise<SelectionDraft> {
    return this.request(
      `/bundles/${encodeURIComponent(bundleId)}/stale-draft`,
      {
        method: "POST",
        body: { reportId },
      },
    );
  }

  recaptureDraft(bundleId: string, caseId?: string): Promise<SelectionDraft> {
    return this.request(
      `/bundles/${encodeURIComponent(bundleId)}/recapture-draft`,
      {
        method: "POST",
        body: { ...(caseId ? { caseId } : {}) },
      },
    );
  }

  bundleDetails(bundleId: string): Promise<BundleEvidenceDetails> {
    return this.request(`/bundles/${encodeURIComponent(bundleId)}`);
  }

  snapshotDetails(
    bundleId: string,
    snapshotId: string,
  ): Promise<BundleEvidenceDetails> {
    return this.request(
      `/bundles/${encodeURIComponent(bundleId)}/snapshots/${encodeURIComponent(snapshotId)}`,
    );
  }

  archiveBundle(bundleId: string): Promise<unknown> {
    return this.request(`/bundles/${encodeURIComponent(bundleId)}/archive`, {
      method: "POST",
    });
  }

  forkBundle(bundleId: string, snapshotId: string): Promise<unknown> {
    return this.request(`/bundles/${encodeURIComponent(bundleId)}/fork`, {
      method: "POST",
      body: { snapshotId },
    });
  }

  checkStaleness(
    bundleId: string,
    snapshotId: string,
  ): Promise<StalenessReport> {
    return this.request("/staleness", {
      method: "POST",
      body: { bundleId, snapshotId },
    });
  }

  previewHandoff(body: HandoffPreviewRequest): Promise<HandoffPreview> {
    return this.request("/handoffs/preview", { method: "POST", body });
  }

  async createHandoff(body: HandoffPreviewRequest): Promise<AgentHandoff> {
    const result = await this.request<{ handoff: AgentHandoff }>("/handoffs", {
      method: "POST",
      body,
    });
    return result.handoff;
  }

  createDelivery(body: {
    handoffId: string;
    targetRoot: string;
    implementationIntent?: string;
    runId?: string;
    acceptedWarningIds?: string[];
    acknowledgedRiskKinds?: string[];
    overwriteDeliveryId?: string;
  }): Promise<DeliveryArtifact> {
    return this.request("/deliveries", { method: "POST", body });
  }

  listDeliveries(
    bundleId?: string,
  ): Promise<{ deliveries: DeliveryListItem[] }> {
    const query = bundleId ? `?bundleId=${encodeURIComponent(bundleId)}` : "";
    return this.request(`/deliveries${query}`);
  }

  deliveryDetails(deliveryId: string): Promise<DeliveryDetail> {
    return this.request(`/deliveries/${encodeURIComponent(deliveryId)}`);
  }

  previewWorkspaceReset(body: {
    workspaceId: string;
  }): Promise<WorkspaceResetPlan> {
    return this.request("/workspace/reset/preview", { method: "POST", body });
  }

  applyWorkspaceReset(body: {
    planId: string;
    workspaceId: string;
    generationId: string;
  }): Promise<WorkspaceResetResult> {
    return this.request("/workspace/reset/apply", { method: "POST", body });
  }

  async blobUrl(bundleId: string, blobId: string): Promise<string> {
    if (!this.token)
      throw new LocalServiceClientError(
        "unauthorized",
        "尚未连接 Local Service。",
      );
    const response = await fetch(
      `${this.basePath}/blobs/${encodeURIComponent(bundleId)}/${encodeURIComponent(blobId)}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new LocalServiceClientError(
        "blob-read-failed",
        `截图读取失败（${response.status}）。`,
      );
    }
    return URL.createObjectURL(await response.blob());
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      authenticated?: boolean;
    } = {},
  ): Promise<T> {
    const authenticated = options.authenticated ?? true;
    if (authenticated && !this.token) {
      throw new LocalServiceClientError(
        "unauthorized",
        "尚未连接 Local Service。",
      );
    }
    const response = await fetch(`${this.basePath}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(authenticated && this.token
          ? { Authorization: `Bearer ${this.token}` }
          : {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      cache: "no-store",
    });
    const raw = LocalServiceEnvelope.parse(await response.json());
    if (!raw.ok) {
      if (raw.error.code === "unauthorized") this.disconnect();
      throw new LocalServiceClientError(
        raw.error.code,
        raw.error.message,
        raw.error.details,
      );
    }
    return raw.data as T;
  }
}

export const captureServiceClient = new CaptureServiceClient();

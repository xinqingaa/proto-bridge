import {
  LocalServiceEnvelope,
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type BundleEvidenceDetails,
  type HandoffPreview,
  type StoredPreflight,
  type WorkspaceResetResult,
  type WorkspaceResetPlan,
  type WorkspaceResetApplyRequest,
  type CreateReviewApprovalRequest,
  type ReviewApprovalToken,
  type LocalServiceSession,
} from '@proto-bridge/core/v2/service-contract';
import type { ReviewSession } from '@proto-bridge/core/review';
import type { AgentHandoff, CaptureJob } from '@proto-bridge/core/v2';
import type { SelectionDraft } from '@proto-bridge/core/v2/capture';
import type { LoadedCliConfig } from './config.js';

export class CliServiceClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CliServiceClientError';
  }
}

export type CliServiceClient = {
  baseUrl: string;
  previewWorkspaceReset(workspaceId: string): Promise<WorkspaceResetPlan>;
  applyWorkspaceReset(input: WorkspaceResetApplyRequest): Promise<WorkspaceResetResult>;
  createPreflight(draft: SelectionDraft): Promise<StoredPreflight>;
  createJob(input: {
    preflightId: string;
    acceptedWarningIds: string[];
    bundleId?: string;
  }): Promise<{ job: CaptureJob }>;
  getJob(jobId: string): Promise<CaptureJob>;
  cancelJob(jobId: string): Promise<CaptureJob>;
  getBundle(bundleId: string): Promise<BundleEvidenceDetails>;
  previewHandoff(input: {
    bundleId: string;
    snapshotId: string;
    implementationIntent?: string;
    acknowledgedRiskKinds: string[];
  }): Promise<HandoffPreview>;
  createHandoff(input: {
    bundleId: string;
    snapshotId: string;
    implementationIntent?: string;
    acknowledgedRiskKinds: string[];
  }): Promise<AgentHandoff>;
  readReview(reviewRunId: string): Promise<ReviewSession>;
  createReviewApproval(input: CreateReviewApprovalRequest): Promise<ReviewApprovalToken>;
};

function serviceBaseUrl(loaded: LoadedCliConfig): string {
  const { host, port } = loaded.value.service;
  return `http://${host}:${port}/api/v2`;
}

function serviceOrigin(loaded: LoadedCliConfig): string {
  const allowed = loaded.value.service.allowedOrigins[0];
  if (allowed) return new URL(allowed).origin;
  return new URL(loaded.value.runtime.baseUrl).origin;
}

export async function probeLocalService(
  loaded: LoadedCliConfig,
): Promise<boolean> {
  const baseUrl = serviceBaseUrl(loaded);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 400);
  try {
    const session = await requestJson<LocalServiceSession>(
      `${baseUrl}/session`,
      {
        method: 'POST',
        origin: serviceOrigin(loaded),
        body: {},
        signal: controller.signal,
      },
    );
    return session.protocolVersion === LOCAL_SERVICE_PROTOCOL_VERSION
      && session.workspaceId === loaded.value.workspaceId;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function connectLocalService(
  loaded: LoadedCliConfig,
): Promise<CliServiceClient> {
  const baseUrl = serviceBaseUrl(loaded);
  const origin = serviceOrigin(loaded);
  const session = await requestJson<LocalServiceSession>(`${baseUrl}/session`, {
    method: 'POST',
    origin,
    body: {},
  });
  if (session.protocolVersion !== LOCAL_SERVICE_PROTOCOL_VERSION) {
    throw new CliServiceClientError(
      'incompatible-protocol',
      `Local Service protocol ${String(session.protocolVersion)} is incompatible with required version ${LOCAL_SERVICE_PROTOCOL_VERSION}.`,
    );
  }
  if (session.workspaceId !== loaded.value.workspaceId) {
    throw new CliServiceClientError(
      'workspace-mismatch',
      `Local Service workspace ${session.workspaceId} does not match config workspace ${loaded.value.workspaceId}.`,
    );
  }
  const token = session.sessionToken;

  async function authed<T>(
    pathName: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    return requestJson<T>(`${baseUrl}${pathName}`, {
      origin,
      token,
      ...(init.method ? { method: init.method } : {}),
      ...(init.body === undefined ? {} : { body: init.body }),
    });
  }

  return {
    baseUrl,
    previewWorkspaceReset(workspaceId) {
      return authed('/workspace/reset/preview', {
        method: 'POST',
        body: { workspaceId },
      });
    },
    applyWorkspaceReset(input) {
      return authed('/workspace/reset/apply', { method: 'POST', body: input });
    },
    createPreflight(draft) {
      return authed('/preflights', { method: 'POST', body: { draft } });
    },
    createJob(input) {
      return authed('/jobs', { method: 'POST', body: input });
    },
    getJob(jobId) {
      return authed(`/jobs/${encodeURIComponent(jobId)}`);
    },
    cancelJob(jobId) {
      return authed(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
      });
    },
    getBundle(bundleId) {
      return authed(`/bundles/${encodeURIComponent(bundleId)}`);
    },
    previewHandoff(input) {
      return authed('/handoffs/preview', { method: 'POST', body: input });
    },
    async createHandoff(input) {
      const result = await authed<{ handoff: AgentHandoff }>('/handoffs', {
        method: 'POST',
        body: input,
      });
      return result.handoff;
    },
    readReview(reviewRunId) {
      return authed(`/reviews/${encodeURIComponent(reviewRunId)}`);
    },
    createReviewApproval(input) {
      return authed('/review-approvals', { method: 'POST', body: input });
    },
  };
}

async function requestJson<T>(
  url: string,
  init: {
    method?: string;
    origin: string;
    token?: string;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Origin: init.origin,
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    ...(init.signal ? { signal: init.signal } : {}),
  });
  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    throw new CliServiceClientError(
      'invalid-schema',
      `Local Service returned a non-JSON response (${response.status}).`,
    );
  }
  const parsed = LocalServiceEnvelope.parse(envelope);
  if (!parsed.ok) {
    throw new CliServiceClientError(
      parsed.error.code,
      parsed.error.message,
      parsed.error.details,
    );
  }
  return parsed.data as T;
}

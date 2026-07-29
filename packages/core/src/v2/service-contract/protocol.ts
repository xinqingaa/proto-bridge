import { z } from 'zod';
import type { BlobRecord } from '../contracts/blob.js';
import type { Bundle } from '../contracts/bundle.js';
import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import type { AgentHandoff, Risk } from '../contracts/handoff.js';
import type { CaptureJob } from '../contracts/job.js';
import type { Run } from '../contracts/run.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { StalenessReport } from '../contracts/staleness.js';
import type { CapturePreflight } from '../capture/preflight.js';
import type { SelectionDraft } from '../capture/selection.js';

export const LOCAL_SERVICE_PROTOCOL_VERSION = 2 as const;

export const LocalServiceError = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  })
  .strict();
export type LocalServiceError = z.infer<typeof LocalServiceError>;

export const LocalServiceEnvelope = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), data: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: LocalServiceError }).strict(),
]);
export type LocalServiceEnvelope = z.infer<typeof LocalServiceEnvelope>;

export type LocalServiceSession = {
  protocolVersion: typeof LOCAL_SERVICE_PROTOCOL_VERSION;
  serviceInstanceId: string;
  sessionToken: string;
  workspaceId: string;
  expiresAt: string;
  finalizedOrphanJobIds: string[];
};

export type StoredPreflight = {
  preflightId: string;
  createdAt: string;
  expiresAt: string;
  result: CapturePreflight;
};

export type BundleSummary = {
  bundle: Bundle;
  activeSnapshot?: BundleSnapshot;
};

export type CaptureConsoleState = {
  workspaceId: string;
  bundles: BundleSummary[];
  jobs: CaptureJob[];
};

export type BundleEvidenceDetails = {
  bundle: Bundle;
  activeSnapshot: BundleSnapshot;
  runs: Run[];
  activeRevisions: CaseEvidenceRevision[];
  blobs: BlobRecord[];
  stalenessReports: StalenessReport[];
  handoffs: AgentHandoff[];
};

export type CreatePreflightRequest = {
  draft: SelectionDraft;
};

export type CreateJobRequest = {
  preflightId: string;
  acceptedWarningIds: string[];
  bundleId?: string;
};

export type CreateJobResponse = {
  job: CaptureJob;
};

export type HandoffPreviewRequest = {
  bundleId: string;
  snapshotId: string;
  implementationIntent?: string;
  acknowledgedRiskKinds: string[];
};

export type HandoffPreview = {
  risks: Risk[];
  coverageStatus: 'complete' | 'partial';
  freshnessStatus: 'fresh' | 'stale';
  handoff?: AgentHandoff;
  persisted: boolean;
};

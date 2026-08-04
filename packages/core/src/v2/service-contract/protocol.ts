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
import type { EvidenceInventory } from '../evidence-inventory.js';
import type {
  BundleDeletePlan,
  BundleDeleteResult,
} from '../store/types.js';

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
  generationId: string | 'legacy-unavailable';
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
  generationId: string | 'legacy-unavailable';
  bundles: BundleSummary[];
  jobs: CaptureJob[];
};

export type WorkspaceResetScopeSummary = {
  objects: number;
  bytes: number;
};

export type WorkspaceResetPlan = {
  planId: string;
  workspaceId: string;
  generationId: string;
  inventoryDigest: string;
  evidence: WorkspaceResetScopeSummary;
  deliveries: WorkspaceResetScopeSummary;
  reviews: WorkspaceResetScopeSummary;
  runningTasks: string[];
  createdAt: string;
  expiresAt: string;
  irreversibleWarnings: string[];
};

export type WorkspaceResetPreviewRequest = {
  workspaceId: string;
};

export type WorkspaceResetApplyRequest = {
  workspaceId: string;
  generationId: string;
  planId: string;
};

export type WorkspaceResetResult = {
  workspaceId: string;
  oldGenerationId: string;
  newGenerationId: string;
  actualRemoved: {
    evidence: WorkspaceResetScopeSummary;
    deliveries: WorkspaceResetScopeSummary;
    reviews: WorkspaceResetScopeSummary;
  };
  revokedSessionCount: number;
  stoppedJobIds: string[];
  stoppedReviewRunIds: string[];
};

export type { EvidenceInventory };
export type { BundleDeletePlan, BundleDeleteResult };

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
  interactionCoverage?: {
    required: number;
    captured: number;
    missingScenarioIds: string[];
  };
  freshnessStatus: 'fresh' | 'stale';
  handoff?: AgentHandoff;
  persisted: boolean;
};

export type CreateDeliveryRequest = {
  handoffId: string;
  targetRoot: string;
  implementationIntent?: string;
  runId?: string;
  acceptedWarningIds?: string[];
  acknowledgedRiskKinds?: string[];
};

export type DeliveryArtifact = {
  deliveryId: string;
  agentPrompt: string;
  agentPromptPath: string;
  acceptanceContractPath: string;
  acceptanceChecklistPath: string;
  evidenceBriefPath: string;
  reviewIndexPath: string;
  screenshotCount: number;
  receiptPath: string;
  handoffId: string;
  bundleId: string;
  snapshotId: string;
};

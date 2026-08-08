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
import type {
  ReviewArtifact,
  ReviewFinding,
  ReviewObligationAssessment,
  ReviewVerifierReceipt,
  ReviewSessionSeed,
} from '../../review/contracts.js';

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
  /** Immutable snapshots retained for exact Job → result history links. */
  snapshots: BundleSnapshot[];
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
  /** When set, rewrite this delivery directory instead of creating a new timestamp id. */
  overwriteDeliveryId?: string;
};

export type DeliveryListItem = {
  deliveryId: string;
  bundleId: string;
  snapshotId: string;
  handoffId: string;
  createdAt: string;
  agentPromptPath: string;
  receiptPath: string;
  freshnessStatus?: 'fresh' | 'stale';
};

export type DeliveryDetail = DeliveryListItem & {
  agentPrompt: string;
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

export type StartTargetReviewRequest = { seed: ReviewSessionSeed };
export type ReviewArtifactUpload = { artifact: ReviewArtifact; bytesBase64: string };
export type RecordScreenshotViewedRequest = ReviewArtifactUpload & {
  screenId: string;
  caseIds: string[];
};
export type RecordTargetRenderRequest = ReviewArtifactUpload & {
  screenId: string;
  caseId: string;
  sourceDigest: string;
  tranche: number;
  round: number;
  attemptId: string;
  targetRevision: string;
  receiptTool: string;
};
export type RecordScenarioReplayRequest = {
  screenId: string;
  caseId: string;
  scenarioId: string;
  receiptDigest: string;
  targetRevision: string;
  receiptTool: string;
  transition?: import('../../review/contracts.js').TargetScenarioTransition;
};
export type RecordArtifactCompareRequest = {
  screenId: string;
  caseId: string;
  attemptId: string;
  sourceDigest: string;
  targetDigest: string;
  diff: ReviewArtifactUpload;
  overlay?: ReviewArtifactUpload;
  comparable: boolean;
  normalizedDiffSignature?: string;
  reason?: string;
  receiptTool: string;
};
export type RecordReviewFindingsRequest = {
  findings: ReviewFinding[];
  actor: 'agent' | 'operator' | 'human';
};
export type RecordReviewAssessmentsRequest = {
  assessments: ReviewObligationAssessment[];
};
export type RecordTargetClaimsVerifiedRequest = {
  receipt: ReviewVerifierReceipt;
  receiptTool: string;
};
export type AuthorizeReviewTrancheRequest = {
  screenId: string;
  tranche: number;
  approvalRef: string;
  actor: 'operator' | 'human' | 'pbwork' | 'cli' | 'mcp-host-approval';
};
export type CreateReviewApprovalRequest =
  | { kind: 'tranche'; reviewRunId: string; screenId: string; tranche: number; approvalRef: string; actor: 'operator' | 'human' | 'pbwork' | 'cli' | 'mcp-host-approval' }
  | { kind: 'finalize'; reviewRunId: string; confirmationRef: string; actor: 'operator' | 'human' };
export type ReviewApprovalToken = { token: string; kind: 'tranche' | 'finalize'; reviewRunId: string; expiresAt: string };
export type ConsumeReviewApprovalRequest = { approvalToken: string };
export type FinalizeTargetReviewRequest = {
  confirmationRef: string;
  actor: 'operator' | 'human';
};

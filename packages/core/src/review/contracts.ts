import type { ReconstructionObligation } from './obligations.js';
import type { StructureIR } from '../v2/consumer-projection.js';

export type ReviewStatus =
  | 'active'
  | 'awaiting-human-review'
  | 'needs-human'
  | 'unverified'
  | 'closed'
  | 'completed'
  | 'invalidated';

export type ReviewCoverageProfile = 'l1-quick' | 'l2-focused' | 'l3-full';
export type ReviewCodeStatus = 'pending' | 'reviewed' | 'deviation' | 'unverified';
export type ReviewRuntimeStatus = 'not-applicable' | 'pending' | 'verified' | 'unavailable' | 'unverified' | 'needs-human';
export type ReviewOutcome =
  | 'pending'
  | 'code-reviewed'
  | 'quick-checked'
  | 'focused-accepted'
  | 'fully-audited'
  | 'needs-focused-review'
  | 'runtime-unverified'
  | 'invalidated';

export type ReviewProfile = {
  contractVersion: 1 | 'legacy-unavailable';
  coverageProfile: ReviewCoverageProfile;
  reasonCodes: string[];
  excludedCaseIds: Array<{ caseId: string; reason: string }>;
  excludedScenarioCaseIds: Array<{ caseId: string; reason: string }>;
};

export type ReviewRuntimeProviderRequirement = {
  required: boolean;
  providerId?: string;
};

export type ReviewProviderCapabilities = {
  dtd: boolean;
  vmService: boolean;
  driver: boolean;
  inspector: boolean;
  screenshot: boolean;
  interaction: boolean;
  runtimeErrors: boolean;
};

export type ReviewApplicationReceipt = {
  applicationIdentity: string;
  targetCommit: string;
  targetContentDigest: string;
  appBuildDigest: string;
  reviewHarnessVersion: string;
  platform: string;
  runtimeOrOsVersion?: string;
  logicalSize?: { width: number; height: number };
  pixelSize?: { width: number; height: number };
  dpr?: number;
  orientation?: string;
  locale?: string;
  theme?: string;
  textScale?: number;
  safeArea?: string;
  fontEnvironment?: string;
  textEntryEmulation?: boolean;
  settlePolicy?: string;
  systemChromePolicy?: string;
};

export type ReviewProviderSessionReceipt = {
  receiptVersion: 1;
  providerId: string;
  providerVersion: string;
  protocolVersion: string;
  serverCommandDigest: string;
  availableTools: string[];
  capabilities: ReviewProviderCapabilities;
  unsupportedReasons: string[];
  providerFingerprint: string;
  sessionIdentityDigest: string;
  sessionStartedAt: string;
  application: ReviewApplicationReceipt;
};

export type ReviewRuntimeOperation = 'connect' | 'inspect' | 'screenshot' | 'tap' | 'input' | 'scroll' | 'wait' | 'runtime-errors' | 'scenario';

export type ReviewRuntimeOperationReceipt = {
  receiptVersion: 1;
  operationId: string;
  operation: ReviewRuntimeOperation;
  providerId: string;
  providerFingerprint: string;
  sessionIdentityDigest: string;
  applicationIdentity: string;
  appBuildDigest: string;
  targetCommit: string;
  targetContentDigest: string;
  attemptOrdinal: 1 | 2 | 3;
  startedAt: string;
  finishedAt: string;
  capability: string;
  resultDigest: string;
};

export type ReviewProviderFailure = {
  operationId: string;
  operation: ReviewRuntimeOperation;
  attemptOrdinal: 1 | 2 | 3;
  errorCode: string;
  retryable: boolean;
  providerFingerprint?: string;
  sessionIdentityDigest?: string;
  startedAt: string;
  finishedAt: string;
  detailDigest: string;
};

export type ReviewSeverity = 'Critical' | 'Major' | 'Minor' | 'Accepted' | 'Unverified';
export type ReviewFindingStatus = 'open' | 'fixed' | 'accepted' | 'unverified';
export type ReviewActor = 'runner' | 'mcp' | 'agent' | 'operator' | 'human' | 'pbwork' | 'cli' | 'mcp-host-approval';

export type ReviewArtifact = {
  kind: 'source' | 'target' | 'diff' | 'overlay' | 'log';
  digest: string;
  mimeType: string;
  byteLength: number;
  width?: number;
  height?: number;
  environment?: Record<string, string | number | boolean>;
  owner: { screenId: string; caseId?: string; scenarioId?: string; attemptId?: string };
};

export type ReviewFinding = {
  findingId: string;
  screenId: string;
  caseId?: string;
  severity: ReviewSeverity;
  status: ReviewFindingStatus;
  detail: string;
  evidenceDigests: string[];
  targetBasis?: string;
  humanConfirmed?: boolean;
};

export type ReviewAssessmentStatus =
  | 'matched'
  | 'deviation'
  | 'unverified'
  | 'not-applicable';

export type ReviewObligationAssessment = {
  obligationId: string;
  status: ReviewAssessmentStatus;
  detail: string;
  evidenceDigests: string[];
  verifierReceiptDigest?: string;
  targetBasis?: string;
};

export type ReviewVerifierResult = {
  obligationId: string;
  dimension: ReconstructionObligation['dimension'];
  status: 'matched' | 'deviation' | 'unverified';
  detail: string;
  targetOccurrence?: {
    path: string;
    line: number;
    column?: number;
    symbol?: string;
    accessor?: string;
    ownerSymbol?: string;
    targetSlot?: string;
  };
  stateProof?: TargetStateSnapshot;
  transitionProof?: TargetScenarioTransition;
};

export type ReviewStateScalar = string | number | boolean | null;

export type TargetStateSnapshot = {
  caseId: string;
  shell: { screenId: string; variantId: string };
  visibleRegionIds: string[];
  keyedCollections: Array<{ collectionId: string; keys: string[] }>;
  values: Array<{ regionId: string; key: string; value: ReviewStateScalar }>;
  complete: boolean;
  unknownKeys: string[];
};

export type TargetScenarioAction = {
  actionId: string;
  kind: 'click' | 'input' | 'select' | 'submit' | 'scroll' | 'wait' | 'custom';
  targetRegionId?: string;
  input?: ReviewStateScalar;
};

export type TargetScenarioTransition = {
  caseId: string;
  screenId: string;
  scenarioId: string;
  checkpointId: string;
  preState: TargetStateSnapshot;
  actions: TargetScenarioAction[];
  postState: TargetStateSnapshot;
  visibleResult: {
    visibleRegionIds: string[];
    changedRegionIds: string[];
  };
};

export type ReviewVerifierReceipt = {
  receiptVersion: 1;
  receiptDigest: string;
  verifierId: string;
  adapterId: string;
  targetRevision: string;
  targetHead: string;
  targetContentDigest: string;
  results: ReviewVerifierResult[];
};

export type ReviewSessionSeed = {
  reviewRunId: string;
  workspaceId: string;
  generationId: string | 'legacy-unavailable';
  bundleId: string;
  snapshotId: string;
  handoffId: string;
  targetRoot: string;
  targetBaselineCommit: string;
  targetRevision: string;
  targetContentDigest?: string;
  selectedCaseIds: string[];
  requiredSourceDigests: string[];
  requiredScenarioCaseIds: string[];
  obligationContractVersion: 1 | 'legacy-unavailable';
  requiredObligations: ReconstructionObligation[];
  verificationContractVersion: 1 | 'legacy-unavailable';
  reviewProfile?: ReviewProfile;
  runtimeProvider?: ReviewRuntimeProviderRequirement;
  comparatorVersion: string;
  createdAt: string;
};

export type ReviewEventPayload =
  | { kind: 'session-started'; seed: ReviewSessionSeed }
  | { kind: 'runtime-provider-connected'; receipt: ReviewProviderSessionReceipt }
  | { kind: 'runtime-provider-session-invalidated'; reason: string }
  | { kind: 'provider-call-failed'; failure: ReviewProviderFailure }
  | { kind: 'runtime-provider-terminated'; runtimeStatus: 'unavailable' | 'unverified' | 'needs-human'; reason: string }
  | { kind: 'tranche-authorized'; screenId: string; tranche: number; approvalRef: string }
  | { kind: 'screenshot-viewed'; screenId: string; caseIds: string[]; source: ReviewArtifact }
  | { kind: 'target-rendered'; screenId: string; caseId: string; sourceDigest: string; tranche: number; round: number; attemptId: string; targetRevision: string; target: ReviewArtifact; runtimeReceipt?: ReviewRuntimeOperationReceipt; structureObservation?: StructureIR; stateObservation?: TargetStateSnapshot }
  | { kind: 'scenario-replayed'; screenId: string; caseId: string; scenarioId: string; receiptDigest: string; targetRevision: string; transition?: TargetScenarioTransition; runtimeReceipt?: ReviewRuntimeOperationReceipt }
  | { kind: 'artifacts-compared'; screenId: string; caseId: string; attemptId: string; sourceDigest: string; targetDigest: string; diff: ReviewArtifact; overlay?: ReviewArtifact; comparable: boolean; normalizedDiffSignature?: string; reason?: string }
  | { kind: 'target-claims-verified'; receipt: ReviewVerifierReceipt }
  | { kind: 'findings-recorded'; findings: ReviewFinding[] }
  | { kind: 'obligations-assessed'; assessments: ReviewObligationAssessment[] }
  | { kind: 'human-finalized'; confirmationRef: string; decision: 'accept' | 'complete' }
  | { kind: 'invalidated'; reason: string };

export type ReviewEvent = {
  eventId: string;
  previousEventDigest: string | null;
  eventDigest: string;
  at: string;
  actor: ReviewActor;
  tool?: string;
  payload: ReviewEventPayload;
};

export type ReviewAttempt = {
  attemptId: string;
  screenId: string;
  caseId: string;
  sourceDigest: string;
  tranche: number;
  round: number;
  targetRevision: string;
  targetDigest: string;
  diffDigest?: string;
  normalizedDiffSignature?: string;
  comparable?: boolean;
  runtimeOperationId?: string;
  sessionIdentityDigest?: string;
  appBuildDigest?: string;
};

export type ReviewSession = Omit<ReviewSessionSeed, 'reviewProfile' | 'runtimeProvider'> & {
  reviewProfile: ReviewProfile;
  runtimeProvider: ReviewRuntimeProviderRequirement;
  status: ReviewStatus;
  codeReviewStatus: ReviewCodeStatus;
  runtimeReviewStatus: ReviewRuntimeStatus;
  reviewOutcome: ReviewOutcome;
  eventHeadDigest: string;
  eventCount: number;
  viewedSourceDigests: string[];
  renderedSourceDigests: string[];
  replayedScenarioCaseIds: string[];
  authorizedTranches: Array<{ screenId: string; tranche: number; approvalRef: string }>;
  attempts: ReviewAttempt[];
  findings: ReviewFinding[];
  obligationAssessments: ReviewObligationAssessment[];
  verifierReceipts: ReviewVerifierReceipt[];
  verifierTargetContentDigest?: string;
  providerSession?: ReviewProviderSessionReceipt;
  providerFailures: ReviewProviderFailure[];
  runtimeOperationReceipts: ReviewRuntimeOperationReceipt[];
  runtimeStructureObservations: StructureIR[];
  runtimeStateObservations: TargetStateSnapshot[];
  runtimeScenarioTransitions: TargetScenarioTransition[];
  artifacts: ReviewArtifact[];
  stopReason?: string;
  completedAt?: string;
};

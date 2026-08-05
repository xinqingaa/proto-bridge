import type { ReconstructionObligation } from './obligations.js';

export type ReviewStatus =
  | 'active'
  | 'awaiting-human-review'
  | 'needs-human'
  | 'unverified'
  | 'completed'
  | 'invalidated';

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
  kind: 'click' | 'input' | 'select' | 'submit' | 'custom';
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
  selectedCaseIds: string[];
  requiredSourceDigests: string[];
  requiredScenarioCaseIds: string[];
  obligationContractVersion: 1 | 'legacy-unavailable';
  requiredObligations: ReconstructionObligation[];
  verificationContractVersion: 1 | 'legacy-unavailable';
  comparatorVersion: string;
  createdAt: string;
};

export type ReviewEventPayload =
  | { kind: 'session-started'; seed: ReviewSessionSeed }
  | { kind: 'tranche-authorized'; screenId: string; tranche: number; approvalRef: string }
  | { kind: 'screenshot-viewed'; screenId: string; caseIds: string[]; source: ReviewArtifact }
  | { kind: 'target-rendered'; screenId: string; caseId: string; sourceDigest: string; tranche: number; round: number; attemptId: string; targetRevision: string; target: ReviewArtifact }
  | { kind: 'scenario-replayed'; screenId: string; caseId: string; scenarioId: string; receiptDigest: string; targetRevision: string; transition?: TargetScenarioTransition }
  | { kind: 'artifacts-compared'; screenId: string; caseId: string; attemptId: string; sourceDigest: string; targetDigest: string; diff: ReviewArtifact; overlay?: ReviewArtifact; comparable: boolean; normalizedDiffSignature?: string; reason?: string }
  | { kind: 'target-claims-verified'; receipt: ReviewVerifierReceipt }
  | { kind: 'findings-recorded'; findings: ReviewFinding[] }
  | { kind: 'obligations-assessed'; assessments: ReviewObligationAssessment[] }
  | { kind: 'human-finalized'; confirmationRef: string; decision: 'complete' }
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
};

export type ReviewSession = ReviewSessionSeed & {
  status: ReviewStatus;
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
  artifacts: ReviewArtifact[];
  stopReason?: string;
  completedAt?: string;
};

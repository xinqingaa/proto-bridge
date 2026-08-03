import {
  buildEvidenceReadModel,
  buildReconstructionAcceptanceContract,
  type EvidenceReadModel,
  type ReconstructionAcceptanceContract,
} from '../index.js';
import type { AgentHandoff } from '../contracts/handoff.js';
import type { V2Store } from './types.js';

export async function buildAcceptanceContractFromStore(input: {
  store: V2Store;
  handoff: AgentHandoff;
}): Promise<{
  evidence: EvidenceReadModel;
  contract: ReconstructionAcceptanceContract;
}> {
  const snapshot = await input.store.getSnapshot(
    input.handoff.bundleId,
    input.handoff.snapshotId,
  );
  if (!snapshot) {
    throw new Error(`Snapshot ${input.handoff.snapshotId} is missing.`);
  }
  const [runs, revisions, blobs] = await Promise.all([
    input.store.listRuns(input.handoff.bundleId),
    input.store.listEvidenceRevisions(input.handoff.bundleId),
    input.store.listBlobRecords(input.handoff.bundleId),
  ]);
  const fullEvidence = buildEvidenceReadModel({
    snapshot,
    runs,
    revisions,
    blobs,
  });
  const selectedIds = new Set(
    input.handoff.selectedCases.map((selectedCase) => selectedCase.caseId),
  );
  const evidence: EvidenceReadModel = {
    ...fullEvidence,
    screens: fullEvidence.screens
      .map((screen) => ({
        ...screen,
        cases: screen.cases.filter((item) => selectedIds.has(item.caseId)),
      }))
      .filter((screen) => screen.cases.length > 0),
  };
  return {
    evidence,
    contract: buildReconstructionAcceptanceContract({
      handoffId: input.handoff.handoffId,
      workspaceId: input.handoff.workspaceId,
      evidence,
    }),
  };
}

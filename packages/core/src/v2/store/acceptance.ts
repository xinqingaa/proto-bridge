import {
  buildEvidenceReadModel,
  buildReconstructionAcceptanceContract,
  projectCaptureCoverage,
  capturePlanCoversSelection,
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
  const fixedCases = fullEvidence.screens.flatMap((screen) => screen.cases).filter((item) =>
    input.handoff.selectedCases.some((selected) => selected.resolution === 'resolved' && selected.caseId === item.caseId
      && selected.revisionId === item.revisionId));
  const selected = input.handoff.selectedCases.flatMap((item) => item.caseKey
    ? [{ caseId: item.caseId, caseKey: item.caseKey, captureScope: item.captureScope }] : []);
  const { captureCoverage: _fullCaptureCoverage, ...evidenceBase } = fullEvidence;
  const evidence: EvidenceReadModel = {
    ...evidenceBase,
    ...(fullEvidence.capturePlan && capturePlanCoversSelection(fullEvidence.capturePlan, selected)
      ? { captureCoverage: projectCaptureCoverage(fullEvidence.capturePlan, fixedCases, selected) } : {}),
    screens: fullEvidence.screens
      .map((screen) => ({
        ...screen,
        cases: fixedCases.filter((item) => item.screenId === screen.screenId),
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

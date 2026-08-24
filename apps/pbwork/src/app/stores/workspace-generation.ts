import type {
  CaptureConsoleState,
  EvidenceInventory,
} from "@proto-bridge/core/v2/service-contract";

export type WorkspaceGenerationBinding = {
  workspaceId: string | null;
  generationId: string | null;
};

type ArtifactBundleSource = {
  artifacts?: { bundleId: string } | null;
  operation?: {
    kind: string;
    bundleId?: string;
    bundleIds?: string[];
  };
};

export function shouldResetLocalWorkspaceState(
  binding: WorkspaceGenerationBinding,
  current: { workspaceId: string; generationId: string },
  danglingArtifacts: boolean,
): boolean {
  if (!current.generationId || current.generationId === "legacy-unavailable") {
    return false;
  }
  if (binding.workspaceId && binding.workspaceId !== current.workspaceId) {
    return true;
  }
  if (binding.generationId && binding.generationId !== current.generationId) {
    return true;
  }
  return !binding.generationId && danglingArtifacts;
}

export function artifactBundleIdsFromRecords(
  records: Record<string, ArtifactBundleSource>,
): string[] {
  const ids: string[] = [];
  for (const record of Object.values(records)) {
    if (record.artifacts?.bundleId) ids.push(record.artifacts.bundleId);
    if (record.operation?.kind === "finalizing" && record.operation.bundleId) {
      ids.push(record.operation.bundleId);
    }
    if (
      record.operation?.kind === "rolling-back" &&
      record.operation.bundleIds
    ) {
      ids.push(...record.operation.bundleIds);
    }
  }
  return ids;
}

export function hasDanglingArtifactRefs(
  records: Record<string, ArtifactBundleSource>,
  knownBundleIds: Set<string>,
): boolean {
  return artifactBundleIdsFromRecords(records).some(
    (bundleId) => !knownBundleIds.has(bundleId),
  );
}

export function knownBundleIdsFromEvidence(
  inventory: EvidenceInventory | null,
  consoleState: CaptureConsoleState | null,
): Set<string> {
  const ids = new Set<string>();
  for (const prototype of inventory?.prototypes ?? []) {
    for (const screen of prototype.screens) {
      for (const item of screen.items) ids.add(item.bundleId);
    }
  }
  for (const summary of consoleState?.bundles ?? []) {
    ids.add(summary.bundle.bundleId);
  }
  return ids;
}

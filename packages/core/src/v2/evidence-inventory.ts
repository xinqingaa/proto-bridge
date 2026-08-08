import type { BlobRecord } from './contracts/blob.js';
import type { Bundle } from './contracts/bundle.js';
import type { CaseEvidenceRevision } from './contracts/evidence.js';
import type { AgentHandoff } from './contracts/handoff.js';
import type { Run } from './contracts/run.js';
import type { BundleSnapshot } from './contracts/snapshot.js';
import type { StalenessReport } from './contracts/staleness.js';
import { computeScopeKey } from './contracts/scope.js';

export type EvidenceInventoryStatus =
  | 'fresh'
  | 'stale'
  | 'unchecked'
  | 'partial'
  | 'failed'
  | 'archived'
  | 'trashed';

export type EvidenceInventoryItem = {
  bundleId: string;
  snapshotId: string;
  prototypeId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  caseId: string;
  scopeKey: string;
  fragments: Array<{
    screenId: string;
    pbId: string;
    pbKey?: string | undefined;
  }>;
  scenario?: {
    ownerScreenId: string;
    scenarioId: string;
    checkpointId: string;
  };
  revisionId: string;
  status: EvidenceInventoryStatus;
  capturedAt: string;
  evidenceLevel: CaseEvidenceRevision['evidenceLevel'];
  screenshotCount: number;
  historyCount: number;
  handoffCount: number;
};

export type EvidenceInventoryScreen = {
  screenId: string;
  items: EvidenceInventoryItem[];
};

export type EvidenceInventoryPrototype = {
  prototypeId: string;
  screens: EvidenceInventoryScreen[];
};

export type EvidenceInventory = {
  workspaceId: string;
  generatedAt: string;
  prototypes: EvidenceInventoryPrototype[];
};

export type EvidenceInventoryBundleInput = {
  bundle: Bundle;
  activeSnapshot?: BundleSnapshot;
  runs: Run[];
  revisions: CaseEvidenceRevision[];
  blobs: BlobRecord[];
  stalenessReports: StalenessReport[];
  handoffs: AgentHandoff[];
};

export function buildEvidenceInventory(
  workspaceId: string,
  bundles: EvidenceInventoryBundleInput[],
): EvidenceInventory {
  const items: EvidenceInventoryItem[] = [];
  for (const input of bundles) {
    const snapshot = input.activeSnapshot;
    if (!snapshot) continue;
    const selectedBySlot = new Map(
      input.runs
        .flatMap((run) => run.selection.cases)
        .map(
          (selected) =>
            [
              `${selected.caseId}#${computeScopeKey(selected.captureScope)}`,
              selected,
            ] as const,
        ),
    );
    const revisionsById = new Map(
      input.revisions.map((revision) => [revision.revisionId, revision] as const),
    );
    const attemptsById = new Map(
      input.runs.flatMap((run) =>
        run.attempts.map((attempt) => [attempt.attemptId, attempt] as const),
      ),
    );
    const latestReport = input.stalenessReports
      .filter((report) => report.snapshotId === snapshot.snapshotId)
      .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt))[0];
    const staleByRevision = new Map(
      latestReport?.perRevision.map((entry) => [entry.revisionId, entry.stale]) ?? [],
    );
    const latestAttemptByCase = new Map(
      snapshot.latestAttempts.map((ref) => [ref.caseId, ref.attemptId] as const),
    );

    for (const slot of snapshot.activeSlots) {
      const selected = selectedBySlot.get(`${slot.caseId}#${slot.scopeKey}`);
      const revision = revisionsById.get(slot.revisionId);
      if (!selected || !revision) continue;
      const attempt = attemptsById.get(latestAttemptByCase.get(slot.caseId) ?? '');
      const stale = staleByRevision.get(revision.revisionId);
      const partial =
        revision.requiredFactsResolved < revision.requiredFactsTotal;
      const failed = Boolean(
        attempt &&
          ['failed', 'unsupported', 'cancelled', 'interrupted'].includes(
            attempt.result,
          ),
      );
      const status: EvidenceInventoryStatus =
        input.bundle.status === 'trashed'
          ? 'trashed'
          : input.bundle.status === 'archived'
          ? 'archived'
          : failed
            ? 'failed'
            : partial
              ? 'partial'
              : stale === true
                ? 'stale'
                : stale === false
                  ? 'fresh'
                  : 'unchecked';
      items.push({
        bundleId: input.bundle.bundleId,
        snapshotId: snapshot.snapshotId,
        prototypeId: input.bundle.prototypeId,
        screenId: selected.caseKey.screenId,
        variantId: selected.caseKey.variantId,
        themeId: selected.caseKey.themeId,
        deviceId: selected.caseKey.deviceId,
        caseId: selected.caseId,
        scopeKey: slot.scopeKey,
        fragments: selected.captureScope.fragments ?? [],
        ...(selected.caseKey.scenario
          ? { scenario: selected.caseKey.scenario }
          : {}),
        revisionId: revision.revisionId,
        status,
        capturedAt: revision.capturedAt,
        evidenceLevel: revision.evidenceLevel,
        screenshotCount: input.blobs.filter(
          (blob) =>
            blob.kind === 'screenshot' &&
            blob.ownerRefs.some(
              (owner) =>
                owner.kind === 'revision' &&
                owner.objectId === revision.revisionId,
            ),
        ).length,
        historyCount: input.revisions.filter(
          (candidate) => candidate.caseId === selected.caseId,
        ).length,
        handoffCount: input.handoffs.filter(
          (handoff) => handoff.snapshotId === snapshot.snapshotId,
        ).length,
      });
    }
  }

  const prototypeIds = [...new Set(items.map((item) => item.prototypeId))].sort();
  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    prototypes: prototypeIds.map((prototypeId) => {
      const prototypeItems = items.filter((item) => item.prototypeId === prototypeId);
      return {
        prototypeId,
        screens: [...new Set(prototypeItems.map((item) => item.screenId))]
          .sort()
          .map((screenId) => ({
            screenId,
            items: prototypeItems
              .filter((item) => item.screenId === screenId)
              .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt)),
          })),
      };
    }),
  };
}

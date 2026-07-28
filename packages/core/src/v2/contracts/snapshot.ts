import { z } from 'zod';
import { AttemptId, BundleId, CaseEvidenceRevisionId, CaseId, PrototypeId, RunId, ScopeKey, SnapshotId, WorkspaceId } from './ids.js';
import { CoverageSummary } from './coverage.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * `{caseId, scopeKey}` uniquely identifies an active slot. `primary` is the
 * reserved slot for the full Case Scope; every other covered Capture Scope
 * gets its own `scoped` slot (pb-v2-spec.md "Capture Scope 与 active ref 解析").
 */
export const ActiveSlot = z
  .object({
    caseId: CaseId,
    scopeKey: ScopeKey,
    kind: z.enum(['primary', 'scoped']),
    revisionId: CaseEvidenceRevisionId,
  })
  .strict();
export type ActiveSlot = z.infer<typeof ActiveSlot>;

export const LatestAttemptRef = z
  .object({
    caseId: CaseId,
    scopeKey: ScopeKey,
    attemptId: AttemptId,
    runId: RunId,
  })
  .strict();
export type LatestAttemptRef = z.infer<typeof LatestAttemptRef>;

function slotKey(slot: Pick<ActiveSlot, 'caseId' | 'scopeKey' | 'kind'>): string {
  return `${slot.caseId}#${slot.kind}#${slot.kind === 'primary' ? '' : slot.scopeKey}`;
}

function attemptRefKey(ref: Pick<LatestAttemptRef, 'caseId' | 'scopeKey'>): string {
  return `${ref.caseId}#${ref.scopeKey}`;
}

/**
 * A Bundle Snapshot is the only object that represents the Bundle's
 * current, consumable Evidence projection; a Run never substitutes for it
 * (pb-v2-spec.md "核心对象与关系"). Snapshots are immutable once committed:
 * later Runs create new Snapshots, they never mutate this one.
 */
export const BundleSnapshot = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    snapshotId: SnapshotId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    prototypeId: PrototypeId,
    sourceRunId: RunId,
    committedAt: z.string().datetime(),
    activeSlots: z.array(ActiveSlot),
    latestAttempts: z.array(LatestAttemptRef),
    coverage: CoverageSummary,
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const seenSlots = new Set<string>();
    snapshot.activeSlots.forEach((slot, index) => {
      const key = slotKey(slot);
      if (seenSlots.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate active slot for ${key}`, path: ['activeSlots', index] });
      }
      seenSlots.add(key);
    });
    const seenAttempts = new Set<string>();
    snapshot.latestAttempts.forEach((ref, index) => {
      const key = attemptRefKey(ref);
      if (seenAttempts.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate latest attempt ref for ${key}`, path: ['latestAttempts', index] });
      }
      seenAttempts.add(key);
    });
  });
export type BundleSnapshot = z.infer<typeof BundleSnapshot>;

export function findActiveSlot(
  snapshot: Pick<BundleSnapshot, 'activeSlots'>,
  caseId: CaseId,
  match: { kind: 'primary' } | { kind: 'scoped'; scopeKey: ScopeKey },
): ActiveSlot | undefined {
  return snapshot.activeSlots.find(
    (slot) => slot.caseId === caseId && slot.kind === match.kind && (match.kind === 'primary' || slot.scopeKey === match.scopeKey),
  );
}

export function findLatestAttemptRef(
  snapshot: Pick<BundleSnapshot, 'latestAttempts'>,
  caseId: CaseId,
  scopeKey: ScopeKey,
): LatestAttemptRef | undefined {
  return snapshot.latestAttempts.find((ref) => ref.caseId === caseId && ref.scopeKey === scopeKey);
}

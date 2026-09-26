import { z } from 'zod';
import {
  BundleId,
  HandoffId,
  JobId,
  PrototypeId,
  SnapshotId,
  WorkspaceId,
} from './ids.js';
import { RiskKind } from './vocabulary.js';

export const PrototypeLifecycleStage = z.enum([
  'active',
  'review',
  'final',
  'archived',
]);
export type PrototypeLifecycleStage = z.infer<typeof PrototypeLifecycleStage>;

export const FinalizationPhase = z.enum([
  'preflighting',
  'awaiting-confirmation',
  'capturing',
  'awaiting-risks',
  'building-prompt',
]);
export type FinalizationPhase = z.infer<typeof FinalizationPhase>;

export const LifecycleOperationKey = z.string().uuid();
export const OperationRequestDigest = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export type LifecycleOperationKey = z.infer<typeof LifecycleOperationKey>;
export type OperationRequestDigest = z.infer<typeof OperationRequestDigest>;

export const FinalizationFailedCase = z
  .object({ caseId: z.string().min(1), reason: z.string().min(1) })
  .strict();

export const FinalizedArtifacts = z
  .object({
    jobId: JobId,
    bundleId: BundleId,
    snapshotId: SnapshotId,
    handoffId: HandoffId,
    deliveryId: z.string().min(1),
    agentPromptPath: z.string().min(1),
    receiptPath: z.string().min(1),
    finalizedAt: z.string().datetime(),
    operationKey: LifecycleOperationKey,
    requestDigest: OperationRequestDigest,
  })
  .strict();
export type FinalizedArtifacts = z.infer<typeof FinalizedArtifacts>;

export const PrototypeLifecycleOperation = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('idle') }).strict(),
  z
    .object({
      kind: z.literal('finalizing'),
      operationKey: LifecycleOperationKey,
      requestDigest: OperationRequestDigest.optional(),
      phase: FinalizationPhase,
      startedAt: z.string().datetime(),
      jobId: JobId.optional(),
      bundleId: BundleId.optional(),
      snapshotId: SnapshotId.optional(),
      handoffId: HandoffId.optional(),
      deliveryId: z.string().min(1).optional(),
      acceptedWarningIds: z.array(z.string().min(1)).default([]),
      acknowledgedRiskKinds: z.array(RiskKind).default([]),
      implementationIntent: z.string().optional(),
      failedCases: z.array(FinalizationFailedCase).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('rolling-back'),
      operationKey: LifecycleOperationKey,
      startedAt: z.string().datetime(),
      bundleIds: z.array(BundleId).min(1),
      note: z.string().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('failed'),
      operationKey: LifecycleOperationKey.optional(),
      action: z.enum(['finalize', 'rollback']),
      message: z.string().min(1),
      failedAt: z.string().datetime(),
      failedCases: z.array(FinalizationFailedCase).optional(),
    })
    .strict(),
]);
export type PrototypeLifecycleOperation = z.infer<
  typeof PrototypeLifecycleOperation
>;

export const PrototypeLifecycleRecord = z
  .object({
    prototypeId: PrototypeId,
    stage: PrototypeLifecycleStage,
    operation: PrototypeLifecycleOperation,
    artifacts: FinalizedArtifacts.nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (record.stage === 'final' && !record.artifacts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'final lifecycle records must bind finalized artifacts',
        path: ['artifacts'],
      });
    }
    if (record.stage === 'archived' && record.operation.kind !== 'idle') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'archived lifecycle records cannot have active operations',
        path: ['operation'],
      });
    }
  });
export type PrototypeLifecycleRecord = z.infer<typeof PrototypeLifecycleRecord>;

export const PrototypeLifecycleHistoryEntry = z
  .object({
    id: z.string().min(1),
    prototypeId: PrototypeId,
    from: PrototypeLifecycleStage,
    to: PrototypeLifecycleStage,
    note: z.string(),
    changedAt: z.string().datetime(),
  })
  .strict();
export type PrototypeLifecycleHistoryEntry = z.infer<
  typeof PrototypeLifecycleHistoryEntry
>;

export const PrototypeLifecycleDocument = z
  .object({
    schemaVersion: z.literal(1),
    workspaceId: WorkspaceId,
    generationId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    records: z.record(PrototypeId, PrototypeLifecycleRecord),
    history: z.array(PrototypeLifecycleHistoryEntry).max(500),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((document, ctx) => {
    for (const [prototypeId, record] of Object.entries(document.records)) {
      if (record.prototypeId !== prototypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'record key must match prototypeId',
          path: ['records', prototypeId, 'prototypeId'],
        });
      }
    }
  });
export type PrototypeLifecycleDocument = z.infer<
  typeof PrototypeLifecycleDocument
>;

export const PROTOTYPE_LIFECYCLE_HISTORY_LIMIT = 500;

export function emptyPrototypeLifecycleDocument(input: {
  workspaceId: string;
  generationId: string;
  now?: Date;
}): PrototypeLifecycleDocument {
  const now = (input.now ?? new Date()).toISOString();
  return PrototypeLifecycleDocument.parse({
    schemaVersion: 1,
    workspaceId: input.workspaceId,
    generationId: input.generationId,
    revision: 0,
    records: {},
    history: [],
    updatedAt: now,
  });
}

const ALLOWED_STAGE_TRANSITIONS: Readonly<
  Record<PrototypeLifecycleStage, readonly PrototypeLifecycleStage[]>
> = {
  active: ['review'],
  review: ['active', 'final'],
  final: ['review', 'archived'],
  archived: [],
};

const PHASE_ORDER: Readonly<Record<FinalizationPhase, number>> = {
  preflighting: 0,
  'awaiting-confirmation': 1,
  capturing: 2,
  'awaiting-risks': 3,
  'building-prompt': 4,
};

function sameFinalizedArtifacts(
  left: FinalizedArtifacts | null,
  right: FinalizedArtifacts | null,
): boolean {
  if (!left || !right) return left === right;
  return (
    left.jobId === right.jobId &&
    left.bundleId === right.bundleId &&
    left.snapshotId === right.snapshotId &&
    left.handoffId === right.handoffId &&
    left.deliveryId === right.deliveryId &&
    left.agentPromptPath === right.agentPromptPath &&
    left.receiptPath === right.receiptPath &&
    left.finalizedAt === right.finalizedAt &&
    left.operationKey === right.operationKey &&
    left.requestDigest === right.requestDigest
  );
}

/** Core-owned state transition checks for Workspace-persisted PBWork lifecycle data. */
export function assertPrototypeLifecycleUpdate(
  previousInput: PrototypeLifecycleDocument,
  nextInput: PrototypeLifecycleDocument,
): PrototypeLifecycleDocument {
  const previous = PrototypeLifecycleDocument.parse(previousInput);
  const next = PrototypeLifecycleDocument.parse(nextInput);
  if (
    previous.workspaceId !== next.workspaceId ||
    previous.generationId !== next.generationId
  ) {
    throw new Error('Prototype lifecycle Workspace identity cannot change in an update.');
  }
  if (next.revision !== previous.revision + 1) {
    throw new Error('Prototype lifecycle revision must advance by exactly one.');
  }
  for (const [prototypeId, oldRecord] of Object.entries(previous.records)) {
    const nextRecord = next.records[prototypeId];
    if (!nextRecord) {
      throw new Error(`Prototype lifecycle record ${prototypeId} cannot be removed by update.`);
    }
    if (
      oldRecord.stage !== nextRecord.stage &&
      !ALLOWED_STAGE_TRANSITIONS[oldRecord.stage].includes(nextRecord.stage)
    ) {
      throw new Error(
        `Prototype lifecycle cannot transition from ${oldRecord.stage} to ${nextRecord.stage}.`,
      );
    }
    const oldOperation = oldRecord.operation;
    const nextOperation = nextRecord.operation;
    if (oldOperation.kind !== 'finalizing' && nextOperation.kind === 'finalizing') {
      if (
        nextOperation.phase !== 'preflighting' ||
        nextOperation.jobId !== undefined ||
        nextOperation.bundleId !== undefined ||
        nextOperation.snapshotId !== undefined ||
        nextOperation.handoffId !== undefined ||
        nextOperation.deliveryId !== undefined
      ) {
        throw new Error(
          'A new finalization must start at preflighting without fixed artifact references.',
        );
      }
    }
    if (oldOperation.kind !== 'rolling-back' && nextOperation.kind === 'rolling-back') {
      if (
        oldRecord.stage !== 'final' ||
        !oldRecord.artifacts ||
        nextOperation.bundleIds.length !== 1 ||
        nextOperation.bundleIds[0] !== oldRecord.artifacts.bundleId
      ) {
        throw new Error(
          'A rollback must start from final and target exactly its bound Bundle.',
        );
      }
    }
    if (
      oldOperation.kind === 'finalizing' &&
      nextOperation.kind === 'finalizing'
    ) {
      if (oldOperation.operationKey !== nextOperation.operationKey) {
        throw new Error('An active finalization cannot change operationKey.');
      }
      if (PHASE_ORDER[nextOperation.phase] < PHASE_ORDER[oldOperation.phase] ||
          PHASE_ORDER[nextOperation.phase] > PHASE_ORDER[oldOperation.phase] + 1) {
        throw new Error('Finalization phase must advance one step at a time.');
      }
      for (const field of ['jobId', 'bundleId', 'snapshotId', 'handoffId', 'deliveryId'] as const) {
        const previousRef = oldOperation[field];
        const nextRef = nextOperation[field];
        if (previousRef && previousRef !== nextRef) {
          throw new Error(`Finalization ${field} is a fixed reference and cannot change.`);
        }
        if (!previousRef && nextRef) {
          const phaseForField = {
            jobId: 'capturing',
            bundleId: 'capturing',
            snapshotId: 'awaiting-risks',
            handoffId: 'building-prompt',
            deliveryId: 'building-prompt',
          } as const;
          if (nextOperation.phase !== phaseForField[field]) {
            throw new Error(`Finalization ${field} can only be fixed during ${phaseForField[field]}.`);
          }
        }
      }
    } else if (oldOperation.kind === 'finalizing') {
      if (
        !(
          nextOperation.kind === 'failed' &&
          nextOperation.operationKey === oldOperation.operationKey &&
          nextRecord.stage === 'review'
        ) &&
        !(
          oldOperation.phase === 'building-prompt' &&
          nextOperation.kind === 'idle' &&
          nextRecord.stage === 'final'
        )
      ) {
        throw new Error('An active finalization can only fail or complete through its fixed operation.');
      }
    } else if (oldOperation.kind === 'rolling-back') {
      const unchanged =
        nextOperation.kind === 'rolling-back' &&
        nextOperation.operationKey === oldOperation.operationKey &&
        nextOperation.startedAt === oldOperation.startedAt &&
        nextOperation.note === oldOperation.note &&
        nextOperation.bundleIds.length === oldOperation.bundleIds.length &&
        nextOperation.bundleIds.every((bundleId, index) => bundleId === oldOperation.bundleIds[index]) &&
        nextRecord.stage === oldRecord.stage &&
        sameFinalizedArtifacts(oldRecord.artifacts, nextRecord.artifacts);
      const failed =
        nextOperation.kind === 'failed' &&
        nextOperation.operationKey === oldOperation.operationKey &&
        nextRecord.stage === oldRecord.stage &&
        sameFinalizedArtifacts(oldRecord.artifacts, nextRecord.artifacts);
      const completed =
        nextOperation.kind === 'idle' &&
        nextRecord.stage === 'review' &&
        nextRecord.artifacts === null;
      if (!unchanged && !failed && !completed) {
        throw new Error('A rollback operation can only finish or fail.');
      }
    } else if (
      oldOperation.kind === 'failed' &&
      nextOperation.kind === 'finalizing' &&
      oldOperation.operationKey === nextOperation.operationKey
    ) {
      throw new Error('Retrying a failed lifecycle operation requires a new operationKey.');
    }
    if (oldRecord.stage !== 'final' && nextRecord.stage === 'final') {
      const completedOperationKey =
        oldOperation.kind === 'finalizing'
          ? oldOperation.operationKey
          : undefined;
      if (
        nextRecord.operation.kind !== 'idle' ||
        !nextRecord.artifacts ||
        oldRecord.stage !== 'review' ||
        !completedOperationKey ||
        nextRecord.artifacts.operationKey !== completedOperationKey ||
        oldOperation.kind !== 'finalizing' ||
        oldOperation.phase !== 'building-prompt' ||
        oldOperation.jobId !== nextRecord.artifacts.jobId ||
        oldOperation.bundleId !== nextRecord.artifacts.bundleId ||
        oldOperation.snapshotId !== nextRecord.artifacts.snapshotId ||
        oldOperation.handoffId !== nextRecord.artifacts.handoffId ||
        oldOperation.deliveryId !== nextRecord.artifacts.deliveryId
      ) {
        throw new Error('Final lifecycle stage requires artifacts from its fixed completed operation.');
      }
    }
    if (oldRecord.stage === 'final' && nextRecord.stage === 'review') {
      if (
        oldOperation.kind !== 'rolling-back' ||
        nextRecord.artifacts !== null ||
        nextRecord.operation.kind !== 'idle'
      ) {
        throw new Error('Rollback to review must clear bound artifacts and finish the operation.');
      }
    }
  }
  for (const [prototypeId, record] of Object.entries(next.records)) {
    if (!previous.records[prototypeId] && record.stage !== 'active') {
      throw new Error('New prototype lifecycle records must begin active.');
    }
  }
  return next;
}

/** Validates the single legacy import allowed into a new Workspace sidecar. */
export function assertPrototypeLifecycleMigration(
  documentInput: PrototypeLifecycleDocument,
  expectedIdentity: { workspaceId: string; generationId: string },
): PrototypeLifecycleDocument {
  const document = PrototypeLifecycleDocument.parse(documentInput);
  if (
    document.workspaceId !== expectedIdentity.workspaceId ||
    document.generationId !== expectedIdentity.generationId ||
    document.revision !== 1
  ) {
    throw new Error('Lifecycle migration must target the current Workspace generation at revision 1.');
  }
  for (const record of Object.values(document.records)) {
    if (record.operation.kind === 'finalizing' || record.operation.kind === 'rolling-back') {
      throw new Error('Legacy active operations cannot be migrated without a durable operation key.');
    }
    if (record.stage === 'final' && !record.artifacts) {
      throw new Error('A migrated final record requires fixed artifact references.');
    }
  }
  return document;
}

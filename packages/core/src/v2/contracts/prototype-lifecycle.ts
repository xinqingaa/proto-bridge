import { z } from 'zod';
import {
  BundleId,
  HandoffId,
  JobId,
  PrototypeId,
  PrototypeLifecycleEventId,
  SnapshotId,
  WorkspaceId,
} from './ids.js';
import { V2_SCHEMA_MAJOR } from './version.js';

export const PROTOTYPE_LIFECYCLE_STAGES = [
  'active',
  'review',
  'final',
  'archived',
] as const;
export const PrototypeLifecycleStage = z.enum(PROTOTYPE_LIFECYCLE_STAGES);
export type PrototypeLifecycleStage = z.infer<typeof PrototypeLifecycleStage>;

export const PROTOTYPE_LIFECYCLE_TRANSITIONS: Readonly<
  Record<PrototypeLifecycleStage, readonly PrototypeLifecycleStage[]>
> = {
  active: ['review'],
  review: ['active', 'final'],
  final: ['review', 'archived'],
  archived: [],
};

export const PrototypeFinalizedArtifacts = z
  .object({
    jobId: JobId,
    bundleId: BundleId,
    snapshotId: SnapshotId,
    handoffId: HandoffId,
    deliveryId: z.string().min(1),
    agentPromptPath: z.string().min(1),
    receiptPath: z.string().min(1),
    finalizedAt: z.string().datetime(),
  })
  .strict();
export type PrototypeFinalizedArtifacts = z.infer<
  typeof PrototypeFinalizedArtifacts
>;

export const PrototypeLifecycleOperation = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('idle') }).strict(),
  z
    .object({
      kind: z.literal('finalizing'),
      phase: z.enum([
        'preflighting',
        'awaiting-confirmation',
        'capturing',
        'awaiting-risks',
        'building-prompt',
      ]),
      startedAt: z.string().datetime(),
      jobId: JobId.optional(),
      bundleId: BundleId.optional(),
      snapshotId: SnapshotId.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('rolling-back'),
      startedAt: z.string().datetime(),
      bundleIds: BundleId.array().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('failed'),
      action: z.enum(['finalize', 'rollback']),
      message: z.string().min(1),
      failedAt: z.string().datetime(),
    })
    .strict(),
]);
export type PrototypeLifecycleOperation = z.infer<
  typeof PrototypeLifecycleOperation
>;

export const PrototypeLifecycleRecord = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    workspaceId: WorkspaceId,
    prototypeId: PrototypeId,
    stage: PrototypeLifecycleStage,
    operation: PrototypeLifecycleOperation,
    artifacts: PrototypeFinalizedArtifacts.nullable(),
    revision: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((record, ctx) => {
    const stableArtifacts = record.stage === 'final' || record.stage === 'archived';
    if (stableArtifacts && !record.artifacts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['artifacts'],
        message: `${record.stage} Prototype lifecycle records require finalized artifacts`,
      });
    }
    if (!stableArtifacts && record.artifacts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['artifacts'],
        message: `${record.stage} Prototype lifecycle records cannot retain finalized artifacts`,
      });
    }
  });
export type PrototypeLifecycleRecord = z.infer<
  typeof PrototypeLifecycleRecord
>;

export const PrototypeLifecycleEvent = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    eventId: PrototypeLifecycleEventId,
    workspaceId: WorkspaceId,
    prototypeId: PrototypeId,
    from: PrototypeLifecycleStage.nullable(),
    to: PrototypeLifecycleStage,
    note: z.string().max(300),
    artifacts: PrototypeFinalizedArtifacts.nullable(),
    recordRevision: z.number().int().positive(),
    changedAt: z.string().datetime(),
  })
  .strict();
export type PrototypeLifecycleEvent = z.infer<typeof PrototypeLifecycleEvent>;

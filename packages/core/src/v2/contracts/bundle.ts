import { z } from 'zod';
import { BundleId, PrototypeId, SnapshotId, WorkspaceId } from './ids.js';
import { BundleStatus } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * "一个 Prototype 的长期证据集合" (pb-v2-spec.md 核心对象与关系). Unlike Run,
 * Snapshot and Evidence revision, a Bundle record itself is a small,
 * mutable-in-place control object: only `status` (writable -> archived) and
 * `schemaVersion` may ever change after creation, never `bundleId`,
 * `workspaceId`, `prototypeId` or `originSnapshotId`.
 */
export const Bundle = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    bundleId: BundleId,
    workspaceId: WorkspaceId,
    prototypeId: PrototypeId,
    status: BundleStatus,
    createdAt: z.string().datetime(),
    /** Set only for a Bundle created by `fork`; identifies the source Snapshot it was forked from (pb-v2-spec.md "Bundle 生命周期"). */
    originSnapshotId: SnapshotId.optional(),
  })
  .strict();
export type Bundle = z.infer<typeof Bundle>;

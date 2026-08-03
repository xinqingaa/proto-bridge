import { z } from 'zod';
import { BlobId, BundleId, WorkspaceId } from './ids.js';
import { V2_SCHEMA_MAJOR } from './version.js';

export const BLOB_KINDS = ['screenshot', 'trace', 'debug'] as const;
export const BlobKind = z.enum(BLOB_KINDS);
export type BlobKind = z.infer<typeof BlobKind>;

export const BLOB_OWNER_KINDS = ['revision', 'snapshot', 'run', 'catalog'] as const;
export const BlobOwnerRef = z
  .object({
    kind: z.enum(BLOB_OWNER_KINDS),
    objectId: z.string().min(1),
  })
  .strict();
export type BlobOwnerRef = z.infer<typeof BlobOwnerRef>;

/**
 * Metadata for a Store-controlled binary object. Callers never persist an
 * arbitrary local path: bytes enter through the Store and are addressed by
 * this logical, digest-backed identity.
 */
export const BlobRecord = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    blobId: BlobId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    kind: BlobKind,
    mediaType: z.string().min(1),
    byteLength: z.number().int().min(0),
    digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    createdAt: z.string().datetime(),
    image: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
    ownerRefs: z.array(BlobOwnerRef).min(1),
  })
  .strict();
export type BlobRecord = z.infer<typeof BlobRecord>;

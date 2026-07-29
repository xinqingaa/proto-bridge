import { z } from 'zod';
import { BlobId, BundleId, CatalogRevisionId, PrototypeId, WorkspaceId } from './ids.js';
import { V2_SCHEMA_MAJOR } from './version.js';

export const CATALOG_KINDS = [
  'prototype',
  'navigation',
  'screen',
  'component',
  'token',
  'asset',
  'scenario',
] as const;
export const CatalogKind = z.enum(CATALOG_KINDS);
export type CatalogKind = z.infer<typeof CatalogKind>;

export const CatalogEntry = z
  .object({
    objectId: z.string().min(1),
    digest: z.string().min(1),
    value: z.unknown(),
    blobIds: z.array(BlobId).default([]),
  })
  .strict();
export type CatalogEntry = z.infer<typeof CatalogEntry>;

/** An immutable, input-bound revision of one Prototype catalog. */
export const CatalogRevision = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    catalogRevisionId: CatalogRevisionId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    prototypeId: PrototypeId,
    kind: CatalogKind,
    inputDigest: z.string().min(1),
    createdAt: z.string().datetime(),
    entries: z.array(CatalogEntry),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const seen = new Set<string>();
    catalog.entries.forEach((entry, index) => {
      if (seen.has(entry.objectId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate Catalog object identity ${entry.objectId}`,
          path: ['entries', index, 'objectId'],
        });
      }
      seen.add(entry.objectId);
    });
  });
export type CatalogRevision = z.infer<typeof CatalogRevision>;

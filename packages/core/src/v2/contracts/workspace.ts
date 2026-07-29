import { z } from 'zod';
import { PrototypeId, WorkspaceId } from './ids.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * Minimal V2 Workspace identity boundary. Runtime/Source/Store settings
 * remain phase-specific configuration, while this Contract fixes the
 * Workspace and Prototype ownership that every persistent ref relies on.
 */
export const Workspace = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    workspaceId: WorkspaceId,
    prototypeIds: z.array(PrototypeId).min(1),
    createdAt: z.string().datetime(),
  })
  .strict()
  .superRefine((workspace, ctx) => {
    const seen = new Set<string>();
    workspace.prototypeIds.forEach((prototypeId, index) => {
      if (seen.has(prototypeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate Prototype identity ${prototypeId}`,
          path: ['prototypeIds', index],
        });
      }
      seen.add(prototypeId);
    });
  });
export type Workspace = z.infer<typeof Workspace>;

import { z } from 'zod';
import { WorkspaceId } from './contracts/ids.js';
import { V2_SCHEMA_MAJOR } from './contracts/version.js';

const HttpOrigin = z
  .string()
  .url()
  .superRefine((value, ctx) => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'must be an HTTP(S) URL without credentials',
      });
    }
  });

/** Keys from the deleted V1 config surface; rejected by `.strict()`. */
export const OBSOLETE_WORKSPACE_CONFIG_KEYS = [
  'source',
  'target',
  'output',
] as const;

/** Default Preflight Case cap. A 10-screen authored Prototype with Variants and Scenarios can exceed 100. */
export const DEFAULT_CAPTURE_MAX_CASES = 200;

/**
 * `workspace init` template only. Runtime CLI/PBWork/MCP must read
 * `delivery.targetRoot` from Workspace config instead of this literal.
 */
export const DEFAULT_INIT_DELIVERY_TARGET_ROOT = 'apps/flutter_pb_app';

export const V2WorkspaceConfig = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    workspaceId: WorkspaceId,
    runtime: z
      .object({
        baseUrl: HttpOrigin,
        allowedOrigins: z.array(HttpOrigin).default([]),
      })
      .strict(),
    store: z
      .object({
        root: z.string().min(1),
        maxBytes: z.number().int().positive().optional(),
        retainArchivedSnapshots: z.number().int().min(0).default(1),
      })
      .strict(),
    capture: z
      .object({
        maxCases: z.number().int().positive().default(DEFAULT_CAPTURE_MAX_CASES),
      })
      .strict()
      .default({ maxCases: DEFAULT_CAPTURE_MAX_CASES }),
    service: z
      .object({
        host: z.enum(['127.0.0.1', '::1']).default('127.0.0.1'),
        port: z.number().int().min(1).max(65_535).default(3988),
        allowedOrigins: z.array(HttpOrigin).default([]),
      })
      .strict()
      .default({
        host: '127.0.0.1',
        port: 3988,
        allowedOrigins: [],
      }),
    delivery: z
      .object({
        targetRoot: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type V2WorkspaceConfig = z.infer<typeof V2WorkspaceConfig>;

export const DEFAULT_V2_CONFIG_FILE = 'proto-bridge.json';

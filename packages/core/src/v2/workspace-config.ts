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
        maxCases: z.number().int().positive().default(100),
      })
      .strict()
      .default({ maxCases: 100 }),
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
    source: z
      .object({
        adapter: z.string().min(1),
        root: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type V2WorkspaceConfig = z.infer<typeof V2WorkspaceConfig>;

export const DEFAULT_V2_CONFIG_FILE = 'proto-bridge.v2.json';

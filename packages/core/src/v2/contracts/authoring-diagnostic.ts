import { z } from 'zod';

export const AUTHORING_DIAGNOSTIC_SEVERITIES = [
  'block',
  'warning',
  'info',
] as const;
export const AuthoringDiagnosticSeverity = z.enum(
  AUTHORING_DIAGNOSTIC_SEVERITIES,
);
export type AuthoringDiagnosticSeverity = z.infer<
  typeof AuthoringDiagnosticSeverity
>;

/**
 * One browser-safe diagnostic shape shared by PBWork, CLI and Capture.
 * `diagnosticId` identifies an occurrence/acknowledgement; `code` identifies
 * the stable rule across files, screens and tools.
 */
export const AuthoringDiagnostic = z
  .object({
    diagnosticId: z.string().min(1),
    code: z.string().regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/),
    severity: AuthoringDiagnosticSeverity,
    message: z.string().min(1),
    caseIds: z.array(z.string().min(1)).default([]),
    source: z
      .object({
        kind: z.enum(['contract', 'registry', 'source', 'runtime']),
        locator: z.string().min(1).optional(),
        screenId: z.string().min(1).optional(),
        fragmentId: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    nextAction: z.string().min(1).optional(),
    details: z.unknown().optional(),
  })
  .strict();
export type AuthoringDiagnostic = z.infer<typeof AuthoringDiagnostic>;


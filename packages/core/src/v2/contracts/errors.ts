import type { ZodError } from 'zod';

/**
 * Error classification shared by Core, CLI, MCP and Service so no entry
 * point invents a second status vocabulary (pb-v2-spec.md 规范与可执行 Schema).
 */
export type V2ErrorCode =
  | 'invalid-schema'
  | 'unsupported-schema-version'
  | 'unknown-reference'
  | 'ambiguous-reference'
  | 'immutable-violation'
  | 'downgrade-rejected'
  | 'workspace-mismatch'
  | 'writer-lock-held'
  | 'workspace-resetting'
  | 'workspace-generation-mismatch'
  | 'reset-plan-expired'
  | 'reset-plan-drift'
  | 'external-store-destroyed'
  | 'writer-lock-lost'
  | 'bundle-archived'
  | 'capacity-exceeded'
  | 'blob-rejected'
  | 'clean-plan-stale'
  | 'invalid-continuation'
  | 'incompatible-consumer-capability'
  | 'unsafe-input'
  | 'preflight-expired'
  | 'unauthorized';

export class V2ContractError extends Error {
  readonly code: V2ErrorCode;
  readonly details?: unknown;

  constructor(code: V2ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'V2ContractError';
    this.code = code;
    this.details = details;
  }
}

export function invalidSchemaError(
  objectKind: string,
  error: ZodError,
): V2ContractError {
  return new V2ContractError(
    'invalid-schema',
    `${objectKind} failed schema validation: ${error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')}`,
    error.issues,
  );
}

export function unknownReferenceError(
  objectKind: string,
  ref: unknown,
): V2ContractError {
  return new V2ContractError(
    'unknown-reference',
    `${objectKind} reference does not resolve: ${JSON.stringify(ref)}`,
    ref,
  );
}

export function ambiguousReferenceError(
  objectKind: string,
  candidates: unknown[],
): V2ContractError {
  return new V2ContractError(
    'ambiguous-reference',
    `${objectKind} resolution is ambiguous between ${candidates.length} candidates with no unique minimal covering item.`,
    candidates,
  );
}

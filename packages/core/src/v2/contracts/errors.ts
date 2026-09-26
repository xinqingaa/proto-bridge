import type { ZodError, ZodIssue } from 'zod';

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
  | 'revision-conflict'
  | 'idempotency-conflict'
  | 'reset-plan-expired'
  | 'reset-plan-drift'
  | 'external-store-destroyed'
  | 'writer-lock-lost'
  | 'review-already-exists'
  | 'review-artifact-digest-mismatch'
  | 'review-event-log-corrupt'
  | 'review-service-unavailable'
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

export function isZodError(error: unknown): error is ZodError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as { name?: string }).name === 'ZodError' &&
      Array.isArray((error as { issues?: unknown }).issues),
  );
}

export function formatSchemaIssues(error: ZodError, data?: unknown): string {
  return error.issues.map((issue) => formatSchemaIssue(issue, data)).join('; ');
}

export function invalidSchemaError(
  objectKind: string,
  error: ZodError,
  data?: unknown,
): V2ContractError {
  return new V2ContractError(
    'invalid-schema',
    `${objectKind} failed schema validation: ${formatSchemaIssues(error, data)}`,
    error.issues,
  );
}

function formatSchemaIssue(issue: ZodIssue, data?: unknown): string {
  const locator = formatSchemaPath(issue.path, data);
  const received =
    data === undefined ? undefined : valueAtPath(data, issue.path);
  const receivedSuffix =
    received === undefined ? '' : ` (got ${previewReceived(received)})`;
  return `${locator}: ${issue.message}${receivedSuffix}`;
}

function formatSchemaPath(path: PropertyKey[], data?: unknown): string {
  if (path.length === 0) return '<root>';
  const parts: string[] = [];
  let current: unknown = data;
  for (const segment of path) {
    if (typeof segment === 'number') {
      const item = Array.isArray(current) ? current[segment] : undefined;
      const label = identityLabel(item);
      parts.push(label ?? `[${segment}]`);
      current = item;
      continue;
    }
    parts.push(String(segment));
    current =
      current && typeof current === 'object'
        ? (current as Record<string, unknown>)[String(segment)]
        : undefined;
  }
  return parts.join('.');
}

function valueAtPath(data: unknown, path: PropertyKey[]): unknown {
  let current: unknown = data;
  for (const segment of path) {
    if (current == null) return undefined;
    if (typeof segment === 'number') {
      current = Array.isArray(current) ? current[segment] : undefined;
      continue;
    }
    current =
      typeof current === 'object'
        ? (current as Record<string, unknown>)[String(segment)]
        : undefined;
  }
  return current;
}

function identityLabel(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.pbId === 'string') {
    return typeof record.pbKey === 'string'
      ? `${record.pbId}#${record.pbKey}`
      : record.pbId;
  }
  if (typeof record.screenId === 'string' && typeof record.prototypeId === 'string') {
    return record.screenId;
  }
  if (typeof record.variantId === 'string') return record.variantId;
  if (typeof record.actionId === 'string') return record.actionId;
  if (typeof record.scenarioId === 'string') return record.scenarioId;
  if (typeof record.checkpointId === 'string') return record.checkpointId;
  return undefined;
}

function previewReceived(value: unknown): string {
  if (typeof value === 'string') {
    const preview = value.length > 80 ? `${value.slice(0, 77)}...` : value;
    return JSON.stringify(preview);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return JSON.stringify(value);
  }
  return typeof value;
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

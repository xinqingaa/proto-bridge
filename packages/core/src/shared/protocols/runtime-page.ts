export type RuntimePageProtocolName = 'proto-bridge' | 'legacy' | 'none';

export type RuntimePageMetadata = Record<string, unknown>;

export type RuntimePageListEntry = Record<string, unknown>;

export type RuntimePageProtocolPayload = {
  protocol: RuntimePageProtocolName;
  version?: string | undefined;
  capabilities: {
    pageMetadata: boolean;
    pageList: boolean;
  };
  metadata?: RuntimePageMetadata | undefined;
  pageList?: RuntimePageListEntry[] | undefined;
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;

export function normalizeRuntimePageProtocolPayload(
  value: unknown,
): RuntimePageProtocolPayload {
  const input = isRecord(value) ? value : {};
  const capabilities = isRecord(input.capabilities) ? input.capabilities : {};
  const metadata = isRecord(input.metadata) ? sanitizeRecord(input.metadata) : undefined;
  const pageListValue = Array.isArray(input.pageList) ? input.pageList : undefined;

  return {
    protocol: normalizeProtocolName(input.protocol),
    ...(typeof input.version === 'string' ? { version: input.version } : {}),
    capabilities: {
      pageMetadata: Boolean(capabilities.pageMetadata),
      pageList: Boolean(capabilities.pageList),
    },
    ...(metadata ? { metadata } : {}),
    ...(pageListValue ? { pageList: pageListValue.map((item) => sanitizeRecord(isRecord(item) ? item : {})) } : {}),
    warnings: Array.isArray(input.warnings)
      ? input.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
  };
}

function normalizeProtocolName(value: unknown): RuntimePageProtocolName {
  if (value === 'proto-bridge' || value === 'legacy') return value;
  return 'none';
}

function sanitizeRecord(value: JsonRecord): JsonRecord {
  try {
    return JSON.parse(JSON.stringify(value)) as JsonRecord;
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

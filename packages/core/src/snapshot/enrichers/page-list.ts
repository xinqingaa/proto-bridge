import type { PageTabState } from '../../types/index.js';
import type { RuntimePageProtocolPayload } from '../../shared/protocols/runtime-page.js';
import type { PageEvidencePatch } from '../../shared/evidence/types.js';

export function buildPageListEvidence(input: {
  runtime?: RuntimePageProtocolPayload | undefined;
}): PageEvidencePatch {
  const runtime = input.runtime;
  if (!runtime || !runtime.capabilities.pageList || !runtime.pageList || runtime.pageList.length === 0) return {};

  const text = runtime.pageList
    .map((item) => readStringField(item, ['label', 'title', 'name', 'route', 'path']))
    .filter((item): item is string => Boolean(item));
  const tabStates = runtime.pageList.map((item, index) => toTabState(item, index));

  return {
    text,
    tabStates,
    runtime,
    provenance: [
      {
        source: 'page-list',
        fields: ['text', 'tabStates', 'runtime'],
      },
    ],
  };
}

function toTabState(item: Record<string, unknown>, index: number): PageTabState {
  return {
    id: readStringField(item, ['id', 'key', 'path', 'route']) ?? `page_list_${index + 1}`,
    ...(readStringField(item, ['label', 'title', 'name']) ? { label: readStringField(item, ['label', 'title', 'name']) } : {}),
    state: normalizeState(item.active ?? item.selected ?? item.current),
    evidence: ['runtime page list'],
  };
}

function readStringField(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function normalizeState(value: unknown): PageTabState['state'] {
  if (value === true || value === 'active' || value === 'selected' || value === 'current') return 'active';
  if (value === false || value === 'inactive' || value === 'unselected') return 'inactive';
  return 'unknown';
}

import type { PageComponentHint, PageEvidence, PageTabState } from '../../types/index.js';
import type { RuntimePageProtocolPayload } from '../../shared/protocols/runtime-page.js';
import type { PageEvidencePatch } from '../../shared/evidence/types.js';

const TITLE_KEYS = ['title', 'pageTitle', 'screenTitle', 'label', 'name'];
const ROUTE_KEYS = ['route', 'path', 'pagePath', 'screenPath'];

export function buildAnnotatedRuntimeEvidence(input: {
  evidence: PageEvidence;
  runtime?: RuntimePageProtocolPayload | undefined;
}): PageEvidencePatch {
  const runtime = input.runtime;
  if (!runtime || !runtime.capabilities.pageMetadata || !runtime.metadata) return {};

  const title = firstString(runtime.metadata, TITLE_KEYS);
  const route = firstString(runtime.metadata, ROUTE_KEYS);
  const componentHints = collectRuntimeComponentHints(runtime.metadata);
  const tabStates = collectRuntimeTabStates(runtime.metadata);
  const warnings = runtime.warnings.map((warning) => `runtime metadata: ${warning}`);

  return {
    page: {
      ...(title && !input.evidence.page.title ? { title } : {}),
      ...(route && !input.evidence.page.route ? { route } : {}),
    },
    ...(componentHints.length > 0 ? { componentHints } : {}),
    ...(tabStates.length > 0 ? { tabStates } : {}),
    runtime,
    warnings,
    provenance: [
      {
        source: 'runtime-metadata',
        fields: ['page', 'componentHints', 'tabStates', 'runtime'],
      },
    ],
  };
}

function collectRuntimeComponentHints(metadata: RuntimePageProtocolPayload['metadata']): PageComponentHint[] {
  if (!metadata) return [];
  const componentNames = [
    ...arrayStrings(metadata.sections),
    ...arrayStrings(metadata.components),
    ...arrayStrings(metadata.widgets),
  ];
  return componentNames.slice(0, 24).map((hint) => ({
    kind: 'runtime-metadata',
    hint,
    confidence: 'medium',
    evidence: ['runtime metadata'],
  }));
}

function collectRuntimeTabStates(metadata: RuntimePageProtocolPayload['metadata']): PageTabState[] {
  if (!metadata || !Array.isArray(metadata.tabs)) return [];
  return metadata.tabs
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((tab, index) => {
      const label = toStringValue(tab.label);
      return {
        id: toStringValue(tab.id) ?? `runtime_tab_${index + 1}`,
        ...(label ? { label } : {}),
        state: normalizeTabState(tab.active ?? tab.selected ?? tab.current),
        evidence: ['runtime metadata tabs'],
      };
    });
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function arrayStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return toStringValue((item as Record<string, unknown>).name)
          ?? toStringValue((item as Record<string, unknown>).title)
          ?? toStringValue((item as Record<string, unknown>).label)
          ?? '';
      }
      return '';
    })
    .filter((item) => item.length > 0);
}

function normalizeTabState(value: unknown): PageTabState['state'] {
  if (value === true || value === 'active' || value === 'selected' || value === 'current') return 'active';
  if (value === false || value === 'inactive' || value === 'unselected') return 'inactive';
  return 'unknown';
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

import type {
  DetectedCapabilities,
  PageEvidence,
  PageSnapshotNode,
  VisualSection,
  VisualTokenEvidence,
  AssetEvidence,
  InteractionEvidence,
} from '../../types/index.js';
import type { RuntimePageProtocolPayload } from '../protocols/runtime-page.js';

const DEFAULT_CAPABILITIES: DetectedCapabilities = {
  runtimeMetadata: false,
  pageList: false,
  tabTraversal: false,
  assetExtraction: false,
  needsOcr: false,
  warnings: [],
};

export function createPageEvidence(input: {
  id: string;
  source: PageEvidence['source'];
  screenshot?: PageEvidence['screenshot'] | undefined;
  viewport?: PageEvidence['viewport'] | undefined;
  page: PageEvidence['page'];
  cssVariables?: Record<string, string> | undefined;
  sections: VisualSection[];
  nodes: PageSnapshotNode[];
  text: string[];
  assets: AssetEvidence[];
  interactions: InteractionEvidence[];
  tokens?: VisualTokenEvidence[] | undefined;
  capabilities?: DetectedCapabilities | undefined;
  runtime?: RuntimePageProtocolPayload | undefined;
  ocr?: PageEvidence['ocr'] | undefined;
  warnings?: string[] | undefined;
}): PageEvidence {
  const capabilities = input.capabilities ?? DEFAULT_CAPABILITIES;
  return {
    id: input.id,
    source: input.source,
    ...(input.screenshot ? { screenshot: input.screenshot } : {}),
    ...(input.viewport ? { viewport: input.viewport } : {}),
    page: input.page,
    ...(input.cssVariables ? { cssVariables: input.cssVariables } : {}),
    sections: input.sections,
    nodes: input.nodes,
    text: input.text,
    assets: input.assets,
    interactions: input.interactions,
    ...(input.tokens && input.tokens.length > 0 ? { tokens: input.tokens } : {}),
    capabilities,
    ...(input.runtime ? { runtime: input.runtime } : {}),
    ...(input.ocr ? { ocr: input.ocr } : {}),
    warnings: [
      ...(input.warnings ?? []),
      ...capabilities.warnings,
      ...(input.runtime?.warnings ?? []),
    ],
    provenance: [
      {
        source: 'dom',
        fields: ['page', 'sections', 'nodes', 'text', 'assets', 'interactions', 'tokens'],
      },
      ...(input.ocr
        ? [{ source: 'ocr' as const, fields: ['ocr', 'text'] }]
        : []),
    ],
  };
}

export function isPageEvidence(value: unknown): value is PageEvidence {
  if (!isRecord(value)) return false;
  return Array.isArray(value.sections)
    && Array.isArray(value.nodes)
    && Array.isArray(value.text)
    && Array.isArray(value.assets)
    && Array.isArray(value.interactions)
    && Array.isArray(value.provenance)
    && isRecord(value.capabilities);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

import type {
  AssetEvidence,
  DetectedCapabilities,
  InteractionEvidence,
  PageEvidence,
  PageSnapshotNode,
  VisualSection,
  VisualTokenEvidence,
} from '../../types/index.js';
import { createPageEvidence } from '../../shared/evidence/normalize.js';

export function buildGenericDomEvidence(input: {
  id: string;
  url: string;
  capturedAt: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number | undefined };
  screenshot?: PageEvidence['screenshot'] | undefined;
  page: PageEvidence['page'];
  cssVariables?: Record<string, string> | undefined;
  sections: VisualSection[];
  nodes: PageSnapshotNode[];
  text: string[];
  assets: AssetEvidence[];
  interactions: InteractionEvidence[];
  tokens: VisualTokenEvidence[];
  ocr?: PageEvidence['ocr'] | undefined;
  warnings?: string[] | undefined;
  capabilities: DetectedCapabilities;
}): PageEvidence {
  return createPageEvidence({
    id: input.id,
    source: {
      kind: 'url',
      url: input.url,
      route: input.page.route,
      capturedAt: input.capturedAt,
    },
    screenshot: input.screenshot,
    viewport: input.viewport,
    page: input.page,
    cssVariables: input.cssVariables,
    sections: input.sections,
    nodes: input.nodes,
    text: input.text,
    assets: input.assets,
    interactions: input.interactions,
    tokens: input.tokens,
    capabilities: input.capabilities,
    ocr: input.ocr,
    warnings: input.warnings,
  });
}

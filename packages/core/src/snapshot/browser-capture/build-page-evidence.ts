import type { PageEvidence } from '../../types/index.js';
import type { RuntimePageProtocolPayload } from '../../shared/protocols/runtime-page.js';
import { mergePageEvidence } from '../../shared/evidence/merge.js';
import {
  buildAnnotatedRuntimeEvidence,
  buildAssetExtractionEvidence,
  buildGenericDomEvidence,
  buildOcrEvidence,
  buildPageListEvidence,
  buildTabTraversalEvidence,
} from '../enrichers/index.js';
import type { RenderedPageExtraction } from './extract-rendered-page.js';

export function buildCapturedPageEvidence(input: {
  id: string;
  url: string;
  capturedAt: string;
  viewport: { width: number; height: number; deviceScaleFactor?: number | undefined };
  screenshotPath?: string | undefined;
  extracted: RenderedPageExtraction;
  capabilities: import('../../types/index.js').DetectedCapabilities;
  runtime?: RuntimePageProtocolPayload | undefined;
}): PageEvidence {
  const { extracted } = input;

  let evidence = buildGenericDomEvidence({
    id: input.id,
    url: input.url,
    capturedAt: input.capturedAt,
    viewport: input.viewport,
    ...(input.screenshotPath
      ? {
        screenshot: {
          path: input.screenshotPath,
          width: extracted.documentSize.width,
          height: extracted.documentSize.height,
        },
      }
      : {}),
    page: {
      title: extracted.title,
      route: extracted.route,
    },
    cssVariables: extracted.cssVariables,
    nodes: extracted.nodes,
    sections: extracted.visualSections,
    text: extracted.text,
    assets: extracted.assets,
    interactions: extracted.interactions,
    tokens: extracted.tokens,
    warnings: [...input.capabilities.warnings, ...(input.runtime?.warnings ?? [])],
    capabilities: input.capabilities,
  });

  evidence = mergePageEvidence(evidence, buildAnnotatedRuntimeEvidence({ evidence, runtime: input.runtime }));
  evidence = mergePageEvidence(evidence, buildPageListEvidence({ runtime: input.runtime }));
  evidence = mergePageEvidence(evidence, buildTabTraversalEvidence({
    evidence,
    existingTabStates: evidence.tabStates,
  }));
  evidence = mergePageEvidence(evidence, buildAssetExtractionEvidence({ evidence }));
  evidence = mergePageEvidence(evidence, buildOcrEvidence({
    evidence,
    needsOcr: input.capabilities.needsOcr,
  }));

  return evidence;
}

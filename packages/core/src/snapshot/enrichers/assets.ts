import type { PageEvidencePatch } from '../../shared/evidence/types.js';
import type { PageComponentHint, PageEvidence } from '../../types/index.js';

export function buildAssetExtractionEvidence(input: {
  evidence: PageEvidence;
}): PageEvidencePatch {
  if (input.evidence.assets.length === 0) return {};
  const hints: PageComponentHint[] = input.evidence.assets.slice(0, 12).map((asset) => ({
    kind: 'heuristic',
    hint: `${asset.kind}:${asset.source ?? asset.nodeId ?? 'inline'}`,
    confidence: 'low',
    evidence: asset.evidence,
  }));
  return {
    componentHints: hints,
    provenance: [
      {
        source: 'heuristic',
        fields: ['componentHints', 'assets'],
      },
    ],
  };
}

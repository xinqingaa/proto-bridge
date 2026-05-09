import type { PageEvidencePatch } from '../../shared/evidence/types.js';
import type { PageEvidence } from '../../types/index.js';

export function buildOcrEvidence(input: {
  evidence: PageEvidence;
  needsOcr: boolean;
}): PageEvidencePatch {
  if (input.evidence.ocr) {
    return {
      ocr: input.evidence.ocr,
      text: input.evidence.ocr.text,
      provenance: [
        {
          source: 'ocr',
          fields: ['ocr', 'text'],
        },
      ],
    };
  }

  if (!input.needsOcr) return {};
  return {
    warnings: ['Capability detector marked this page as likely needing OCR, but no OCR evidence is attached yet.'],
  };
}

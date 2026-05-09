import type {
  CapturePageEvidenceInput,
  CapturePageEvidenceResult,
} from '../../types/index.js';
import { captureRenderedPageEvidence } from '../../snapshot/browser-capture/rendered-page-evidence.js';

export async function capturePageEvidence(
  input: CapturePageEvidenceInput,
): Promise<CapturePageEvidenceResult> {
  return captureRenderedPageEvidence(input);
}

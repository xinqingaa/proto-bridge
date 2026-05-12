import type {
  CapturePageCanonicalInput,
  CapturePageCanonicalResult,
} from '../../types/index.js';
import { captureRenderedPageCanonical } from '../../snapshot/browser-capture/rendered-page-evidence.js';

export async function capturePageCanonical(
  input: CapturePageCanonicalInput,
): Promise<CapturePageCanonicalResult> {
  return captureRenderedPageCanonical(input);
}

export const capturePageEvidence = capturePageCanonical;

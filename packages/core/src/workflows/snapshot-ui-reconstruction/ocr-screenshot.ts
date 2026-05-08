import type {
  OcrScreenshotInput,
  OcrScreenshotResult,
} from '../../types/index.js';
import { persistExternalOcrEvidence } from '../../snapshot/ocr/external-ocr.js';

export async function ocrScreenshot(input: OcrScreenshotInput): Promise<OcrScreenshotResult> {
  return persistExternalOcrEvidence(input);
}

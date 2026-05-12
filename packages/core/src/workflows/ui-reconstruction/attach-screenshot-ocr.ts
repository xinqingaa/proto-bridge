import type {
  AttachScreenshotOcrInput,
  AttachScreenshotOcrResult,
} from '../../types/index.js';
import { persistExternalOcrEvidence } from '../../snapshot/ocr/external-ocr.js';

export async function attachScreenshotOcr(input: AttachScreenshotOcrInput): Promise<AttachScreenshotOcrResult> {
  return persistExternalOcrEvidence(input);
}

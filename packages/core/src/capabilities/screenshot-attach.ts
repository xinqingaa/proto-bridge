import { persistExternalOcrEvidence } from '../snapshot/ocr/external-ocr.js';
import type { ScreenshotAttachCapabilityInput, ScreenshotAttachCapabilityResult } from './types.js';

export async function attachScreenshotCapability(
  input: ScreenshotAttachCapabilityInput,
): Promise<ScreenshotAttachCapabilityResult> {
  const result = await persistExternalOcrEvidence(input);
  return {
    ...result,
    capability: 'screenshot.attach',
    screenshotPath: input.screenshotPath,
  };
}

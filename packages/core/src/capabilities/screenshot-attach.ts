import { attachScreenshotOcr } from '../workflows/ui-reconstruction/attach-screenshot-ocr.js';
import type { ScreenshotAttachCapabilityInput, ScreenshotAttachCapabilityResult } from './types.js';

export async function attachScreenshotCapability(
  input: ScreenshotAttachCapabilityInput,
): Promise<ScreenshotAttachCapabilityResult> {
  const result = await attachScreenshotOcr(input);
  return {
    ...result,
    capability: 'screenshot.attach',
    screenshotPath: input.screenshotPath,
  };
}

import { capturePageCanonical } from '../workflows/ui-reconstruction/capture-page-canonical.js';
import type { RuntimeCaptureCapabilityInput, RuntimeCaptureCapabilityResult } from './types.js';

export async function captureRuntimeCapability(
  input: RuntimeCaptureCapabilityInput,
): Promise<RuntimeCaptureCapabilityResult> {
  const result = await capturePageCanonical(input);
  return {
    ...result,
    capability: 'runtime.capture',
  };
}

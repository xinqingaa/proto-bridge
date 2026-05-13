import { captureRenderedPageCanonical } from '../snapshot/browser-capture/rendered-page-evidence.js';
import type { RuntimeCaptureCapabilityInput, RuntimeCaptureCapabilityResult } from './types.js';

export async function captureRuntimeCapability(
  input: RuntimeCaptureCapabilityInput,
): Promise<RuntimeCaptureCapabilityResult> {
  const result = await captureRenderedPageCanonical(input);
  return {
    ...result,
    capability: 'runtime.capture',
  };
}

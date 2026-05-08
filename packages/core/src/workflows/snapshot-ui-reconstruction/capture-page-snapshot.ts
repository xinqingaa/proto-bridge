import type {
  CapturePageSnapshotInput,
  CapturePageSnapshotResult,
} from '../../types/index.js';
import { captureRenderedPageSnapshot } from '../../snapshot/browser-capture/rendered-page-snapshot.js';

export async function capturePageSnapshot(
  input: CapturePageSnapshotInput,
): Promise<CapturePageSnapshotResult> {
  return captureRenderedPageSnapshot(input);
}

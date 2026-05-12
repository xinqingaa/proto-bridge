import { exportUiReview } from '../workflows/ui-reconstruction/export-ui-review.js';
import type { ExportUiReviewInput } from '../types/index.js';
import type { UiReviewCapabilityResult } from './types.js';

export async function reviewUiCapability(input: ExportUiReviewInput): Promise<UiReviewCapabilityResult> {
  const result = await exportUiReview(input);
  return {
    ...result,
    capability: 'ui.review',
    warnings: input.page.warnings,
  };
}

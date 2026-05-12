import { buildUiPlan } from '../workflows/ui-reconstruction/build-ui-plan.js';
import type { BuildUiPlanInput } from '../types/index.js';
import type { UiPlanCapabilityResult } from './types.js';

export async function planUiCapability(input: BuildUiPlanInput): Promise<UiPlanCapabilityResult> {
  const result = await buildUiPlan(input);
  return {
    ...result,
    capability: 'ui.plan',
    warnings: [...result.plan.target.warnings, ...result.plan.risks],
  };
}

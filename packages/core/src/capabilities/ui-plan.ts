import path from 'node:path';
import { writeCompactJsonFile } from '../artifacts/artifact-writer.js';
import { buildFlutterUiReconstructionPlan } from '../target/flutter-app/index.js';
import type { BuildUiPlanInput, BuildUiPlanResult } from '../types/index.js';
import type { UiPlanCapabilityResult } from './types.js';

export async function planUiCapability(input: BuildUiPlanInput): Promise<UiPlanCapabilityResult> {
  const result = await buildUiPlan(input);
  return {
    ...result,
    capability: 'ui.plan',
    warnings: [...result.plan.target.warnings, ...result.plan.risks],
  };
}

async function buildUiPlan(
  input: BuildUiPlanInput,
): Promise<BuildUiPlanResult> {
  const plan = await buildFlutterUiReconstructionPlan({
    evidence: input.page,
    targetRoot: input.targetRoot,
    targetModule: input.targetModule,
    sourceAwareImplementationPlan: input.sourceAwareImplementationPlan,
    sourceReview: input.sourceReview,
  });
  const planPath = path.join(input.outDir, 'ui-build-plan.json');
  await writeCompactJsonFile(planPath, plan);
  return {
    plan,
    files: {
      uiBuildPlan: planPath,
    },
  };
}

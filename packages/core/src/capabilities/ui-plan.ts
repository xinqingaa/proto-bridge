import path from 'node:path';
import { writeJsonFile } from '../artifacts/artifact-writer.js';
import { buildPageDebugIndex } from '../snapshot/browser-capture/rendered-page-evidence.js';
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
  await writeJsonFile(planPath, plan);
  if (input.page.artifacts.pageDebugIndex) {
    await writeJsonFile(input.page.artifacts.pageDebugIndex, buildPageDebugIndex(input.page, plan));
  }
  return {
    plan,
    files: {
      uiBuildPlan: planPath,
    },
  };
}

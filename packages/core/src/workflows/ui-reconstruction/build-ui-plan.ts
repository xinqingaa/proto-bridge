import path from 'node:path';
import type {
  BuildUiPlanInput,
  BuildUiPlanResult,
} from '../../types/index.js';
import { buildFlutterUiReconstructionPlan } from '../../target/flutter-app/index.js';
import { writeJsonFile } from '../../artifacts/artifact-writer.js';

export async function buildUiPlan(
  input: BuildUiPlanInput,
): Promise<BuildUiPlanResult> {
  const plan = await buildFlutterUiReconstructionPlan({
    evidence: input.page,
    targetRoot: input.targetRoot,
    targetModule: input.targetModule,
  });
  const planPath = path.join(input.outDir, 'ui-build-plan.json');
  await writeJsonFile(planPath, plan);
  return {
    plan,
    files: {
      uiBuildPlan: planPath,
    },
  };
}

export const buildUiImplementationPlan = buildUiPlan;

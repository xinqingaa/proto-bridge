import path from 'node:path';
import type {
  BuildUiImplementationPlanInput,
  BuildUiImplementationPlanResult,
} from '../../types/index.js';
import { buildFlutterUiReconstructionPlan } from '../../target/flutter-app/index.js';
import { writeJsonFile } from '../../artifacts/artifact-writer.js';

export async function buildUiImplementationPlan(
  input: BuildUiImplementationPlanInput,
): Promise<BuildUiImplementationPlanResult> {
  const plan = await buildFlutterUiReconstructionPlan({
    snapshot: input.snapshot,
    targetRoot: input.targetRoot,
    targetModule: input.targetModule,
  });
  const planPath = path.join(input.outDir, 'ui-implementation-plan.json');
  await writeJsonFile(planPath, plan);
  return {
    plan,
    files: {
      uiImplementationPlan: planPath,
    },
  };
}

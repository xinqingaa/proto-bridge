import path from 'node:path';
import { detectTargetAdapter } from './query.js';
import {
  comparePngArtifacts,
  renderFlutterTargetCase,
  replayFlutterTargetScenario,
  FLUTTER_COMPARATOR_VERSION,
} from './flutter-app/review.js';

export { FLUTTER_COMPARATOR_VERSION };

export type RenderTargetCaseInput = {
  targetRoot: string;
  caseId: string;
  attemptId: string;
  expectedTargetHead: string;
};

export type ReplayTargetScenarioInput = {
  targetRoot: string;
  caseId: string;
  expectedTargetHead: string;
};

export async function renderTargetCase(input: RenderTargetCaseInput) {
  const targetRoot = path.resolve(input.targetRoot);
  const detection = await detectTargetAdapter(targetRoot);
  if (detection.adapterId !== 'flutter') {
    throw new Error('No applicable Target Case renderer is registered for this project.');
  }
  return renderFlutterTargetCase({
    targetRoot,
    caseId: input.caseId,
    attemptId: input.attemptId,
    expectedTargetHead: input.expectedTargetHead,
  });
}

export async function replayTargetScenario(input: ReplayTargetScenarioInput) {
  const targetRoot = path.resolve(input.targetRoot);
  const detection = await detectTargetAdapter(targetRoot);
  if (detection.adapterId !== 'flutter') {
    throw new Error('No applicable Target Scenario replay is registered for this project.');
  }
  return replayFlutterTargetScenario({
    targetRoot,
    caseId: input.caseId,
    expectedTargetHead: input.expectedTargetHead,
  });
}

export function compareTargetArtifacts(
  ...args: Parameters<typeof comparePngArtifacts>
): ReturnType<typeof comparePngArtifacts> {
  return comparePngArtifacts(...args);
}

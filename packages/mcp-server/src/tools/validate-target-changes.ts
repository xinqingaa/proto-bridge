import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  buildValidationResult,
  collectChangedFiles,
  scanChangedDartFiles,
} from '../services/git.js';

export async function validateTargetChangesTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const planId = readString(args, 'planId');
  const plan = planId ? context.plans.require(planId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? allowedPathsFromPlan(plan);
  const changedFiles = await collectChangedFiles(targetRoot, readString(args, 'gitBase'));
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanChangedDartFiles(targetRoot, dartFiles);
  return buildValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths,
    fileIssues,
    validationHints: plan?.result.plan.validationHints,
  });
}

function allowedPathsFromPlan(plan: ReturnType<ToolContext['plans']['get']>): string[] {
  if (!plan) return [];
  const plannedDirs = plan.result.plan.fileTree
    .map((file) => file.path.split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  const module = plan.result.plan.target.module;
  return [...new Set([
    ...(module ? [`lib/app/modules/${module}`] : []),
    ...plannedDirs,
    ...plan.result.plan.target.routesFiles,
    ...plan.result.plan.target.translationFiles,
  ])];
}

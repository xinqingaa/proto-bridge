import { validateUiCapability } from '@proto-bridge/core/capabilities';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveProjectRoot, resolveRuntimeConfig, resolveRuntimeTargetRoot } from '../services/config.js';

export async function validateTargetChangesTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const config = await resolveRuntimeConfig(context.options);
  const configTargetRoot = resolveProjectRoot(config?.target, context.options.configDir);
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot') ?? configTargetRoot);
  const pageId = readString(args, 'pageId');
  const page = pageId ? context.pages.require(pageId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? allowedPathsFromPlan(page);
  const expectedFiles = page?.plan?.implementationContract.fileTree.map((file) => file.path) ?? [];
  return await validateUiCapability({
    targetRoot,
    gitBase: readString(args, 'gitBase'),
    allowedPaths,
    validationHints: page?.plan?.validationHints,
    expectedFiles,
    plan: page?.plan,
  } as Parameters<typeof validateUiCapability>[0] & { plan?: unknown }) as unknown as JsonObject;
}

function allowedPathsFromPlan(page: ReturnType<ToolContext['pages']['get']>): string[] {
  if (!page?.plan) return [];
  const plannedDirs = page.plan.implementationContract.fileTree
    .map((file) => file.path.split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  return [...new Set([
    ...plannedDirs,
    ...page.plan.target.routesFiles,
    ...page.plan.target.translationFiles,
  ])];
}

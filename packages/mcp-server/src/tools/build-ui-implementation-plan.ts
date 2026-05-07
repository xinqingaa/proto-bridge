import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildUiImplementationPlan } from '@proto-bridge/core';
import type { PageSnapshot } from '@proto-bridge/core';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import { createUiPlanRunId } from '../services/runs.js';

export async function buildUiImplementationPlanTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const { snapshot, snapshotId, defaultOutDir } = await resolveSnapshot(context, args);
  const outDir = resolvePlanOutputDir(args, targetRoot, defaultOutDir);
  const result = await buildUiImplementationPlan({
    snapshot,
    targetRoot,
    outDir,
    targetModule: readString(args, 'targetModule'),
  });
  const planRun = {
    id: createUiPlanRunId(result.plan.id),
    createdAt: new Date().toISOString(),
    targetRoot,
    snapshotId,
    result,
  };
  context.plans.add(planRun);
  return {
    planId: planRun.id,
    snapshotId,
    createdAt: planRun.createdAt,
    targetRoot,
    files: result.files as unknown as JsonObject,
    summary: {
      module: result.plan.target.module,
      fileCount: result.plan.fileTree.length,
      widgetCount: result.plan.widgetTree.length,
      componentMappingCount: result.plan.componentMappings.length,
      themeMappingCount: result.plan.themeMappings.length,
      businessQuestionCount: result.plan.businessQuestions.length,
      risks: result.plan.risks,
    },
  };
}

async function resolveSnapshot(
  context: ToolContext,
  args: JsonObject,
): Promise<{ snapshot: PageSnapshot; snapshotId: string; defaultOutDir?: string | undefined }> {
  const snapshotId = readString(args, 'snapshotId');
  if (snapshotId) {
    const snapshotRun = context.snapshots.require(snapshotId);
    return {
      snapshot: snapshotRun.result.snapshot,
      snapshotId,
      defaultOutDir: path.dirname(snapshotRun.result.files.pageSnapshot),
    };
  }

  const snapshotPath = readString(args, 'snapshotPath');
  if (!snapshotPath) throw new Error('build_ui_implementation_plan requires snapshotId or snapshotPath.');
  const absolutePath = path.resolve(snapshotPath);
  const snapshot = JSON.parse(await readFile(absolutePath, 'utf8')) as PageSnapshot;
  return {
    snapshot,
    snapshotId: snapshot.id,
    defaultOutDir: path.dirname(absolutePath),
  };
}

function resolvePlanOutputDir(args: JsonObject, targetRoot: string, defaultOutDir: string | undefined): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return defaultOutDir ?? path.join(targetRoot, '.proto-bridge', 'plans', Date.now().toString(36));
}

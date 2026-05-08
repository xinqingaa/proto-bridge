import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { exportReviewMarkdown } from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';
import type { PageSnapshot, UiImplementationPlan } from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function exportReviewMarkdownTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const { snapshot, plan, defaultOutDir } = await resolveInputs(context, args);
  const output = readString(args, 'output');
  const outDir = output
    ? path.isAbsolute(output) ? output : path.resolve(targetRoot, output)
    : defaultOutDir;
  const result = await exportReviewMarkdown({
    snapshot,
    plan,
    outDir,
  });
  return {
    files: result.files as unknown as JsonObject,
    summary: {
      snapshotId: snapshot.id,
      planId: plan.id,
      title: plan.page.title ?? snapshot.page.title,
      sectionCount: snapshot.visualSections.length,
      plannedFileCount: plan.fileTree.length,
      riskCount: plan.risks.length,
    },
  };
}

async function resolveInputs(
  context: ToolContext,
  args: JsonObject,
): Promise<{ snapshot: PageSnapshot; plan: UiImplementationPlan; defaultOutDir: string }> {
  const planId = readString(args, 'planId');
  const planPath = readString(args, 'planPath');
  const snapshotId = readString(args, 'snapshotId');
  const snapshotPath = readString(args, 'snapshotPath');

  let plan: UiImplementationPlan | undefined;
  let planDir: string | undefined;
  if (planId) {
    const planRecord = context.plans.require(planId);
    plan = planRecord.result.plan;
    planDir = path.dirname(planRecord.result.files.uiImplementationPlan);
  } else if (planPath) {
    const absolutePlanPath = path.resolve(planPath);
    plan = JSON.parse(await readFile(absolutePlanPath, 'utf8')) as UiImplementationPlan;
    planDir = path.dirname(absolutePlanPath);
  }
  if (!plan) throw new Error('export_review_markdown requires planId or planPath.');

  let snapshot: PageSnapshot | undefined;
  if (snapshotId) {
    snapshot = context.snapshots.require(snapshotId).result.snapshot;
  } else if (snapshotPath) {
    snapshot = JSON.parse(await readFile(path.resolve(snapshotPath), 'utf8')) as PageSnapshot;
  } else {
    const snapshotRecord = context.snapshots.get(plan.snapshotId);
    snapshot = snapshotRecord?.result.snapshot;
  }
  if (!snapshot) throw new Error('export_review_markdown requires snapshotId/snapshotPath when the snapshot is not in MCP memory.');

  return {
    snapshot,
    plan,
    defaultOutDir: planDir ?? path.dirname(path.resolve(planPath ?? '.')),
  };
}

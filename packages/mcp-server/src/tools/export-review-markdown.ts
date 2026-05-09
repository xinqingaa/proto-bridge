import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { exportReviewMarkdown } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { PageEvidence, UiImplementationPlan } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function exportReviewMarkdownTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const { evidence, plan, defaultOutDir } = await resolveInputs(context, args);
  const output = readString(args, 'output');
  const outDir = output
    ? path.isAbsolute(output) ? output : path.resolve(targetRoot, output)
    : defaultOutDir;
  const result = await exportReviewMarkdown({
    evidence,
    plan,
    outDir,
  });
  return {
    files: result.files as unknown as JsonObject,
    summary: {
      evidenceId: evidence.id,
      planId: plan.id,
      title: plan.page.title ?? evidence.page.title,
      sectionCount: evidence.sections.length,
      plannedFileCount: plan.fileTree.length,
      riskCount: plan.risks.length,
    },
  };
}

async function resolveInputs(
  context: ToolContext,
  args: JsonObject,
): Promise<{ evidence: PageEvidence; plan: UiImplementationPlan; defaultOutDir: string }> {
  const planId = readString(args, 'planId');
  const planPath = readString(args, 'planPath');
  const evidenceId = readString(args, 'evidenceId');
  const evidencePath = readString(args, 'evidencePath');

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

  let evidence: PageEvidence | undefined;
  if (evidenceId) {
    evidence = context.evidences.require(evidenceId).result.evidence;
  } else if (evidencePath) {
    evidence = JSON.parse(await readFile(path.resolve(evidencePath), 'utf8')) as PageEvidence;
  } else {
    const evidenceRecord = context.evidences.get(plan.evidenceId);
    evidence = evidenceRecord?.result.evidence;
  }
  if (!evidence) throw new Error('export_review_markdown requires evidenceId/evidencePath when the evidence is not in MCP memory.');

  return {
    evidence,
    plan,
    defaultOutDir: planDir ?? path.dirname(path.resolve(planPath ?? '.')),
  };
}

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { buildUiImplementationPlan } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { PageEvidence } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import { createUiPlanRecordId } from '../services/session-state.js';

export async function buildUiImplementationPlanTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const { evidence, evidenceId, defaultOutDir } = await resolveEvidence(context, args);
  const outDir = resolvePlanOutputDir(args, targetRoot, defaultOutDir);
  const result = await buildUiImplementationPlan({
    evidence,
    targetRoot,
    outDir,
    targetModule: readString(args, 'targetModule'),
  });
  const planRecord = {
    id: createUiPlanRecordId(result.plan.id),
    createdAt: new Date().toISOString(),
    targetRoot,
    evidenceId,
    result,
  };
  context.plans.add(planRecord);
  return {
    planId: planRecord.id,
    evidenceId,
    createdAt: planRecord.createdAt,
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

async function resolveEvidence(
  context: ToolContext,
  args: JsonObject,
): Promise<{ evidence: PageEvidence; evidenceId: string; defaultOutDir?: string | undefined }> {
  const evidenceId = readString(args, 'evidenceId');
  if (evidenceId) {
    const evidenceRecord = context.evidences.require(evidenceId);
    return {
      evidence: evidenceRecord.result.evidence,
      evidenceId,
      defaultOutDir: path.dirname(evidenceRecord.result.files.pageEvidence),
    };
  }

  const evidencePath = readString(args, 'evidencePath');
  if (!evidencePath) throw new Error('build_ui_implementation_plan requires evidenceId or evidencePath.');
  const absolutePath = path.resolve(evidencePath);
  const evidenceFromFile = JSON.parse(await readFile(absolutePath, 'utf8')) as PageEvidence;
  return {
    evidence: evidenceFromFile,
    evidenceId: evidenceFromFile.id,
    defaultOutDir: path.dirname(absolutePath),
  };
}

function resolvePlanOutputDir(args: JsonObject, targetRoot: string, defaultOutDir: string | undefined): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return defaultOutDir ?? path.join(targetRoot, '.proto-bridge', 'plans', Date.now().toString(36));
}

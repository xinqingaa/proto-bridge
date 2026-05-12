import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { buildUiPlan } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { PageCanonical } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { GeneratedPage, JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function buildUiPlanTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const pageRecord = await resolvePage(context, args, targetRoot);
  const outDir = resolvePlanOutputDir(args, targetRoot, path.dirname(pageRecord.files.pageCanonical));
  const result = await buildUiPlan({
    page: pageRecord.page,
    targetRoot,
    outDir,
    targetModule: readString(args, 'targetModule'),
  });
  pageRecord.plan = result.plan;
  pageRecord.files.uiBuildPlan = result.files.uiBuildPlan;
  pageRecord.page = {
    ...pageRecord.page,
    artifacts: {
      ...pageRecord.page.artifacts,
      uiBuildPlan: result.files.uiBuildPlan,
    },
  };
  await writeFile(pageRecord.files.pageCanonical, `${JSON.stringify(pageRecord.page, null, 2)}\n`, 'utf8');
  context.pages.add(pageRecord);
  return createArtifactToolResponse({
    pageId: pageRecord.id,
    planId: result.plan.id,
    artifactSetId: artifactSetId(pageRecord.id, 'plan'),
    files: result.files as unknown as JsonObject,
    resources: pageResources(pageRecord),
    warnings: [...pageRecord.page.warnings, ...result.plan.target.warnings, ...result.plan.risks],
    nextActions: [
      'Implement the target UI from ui-build-plan.json.',
      'Call export_ui_review to generate a human-readable review artifact.',
      'Call validate_ui_build after target code changes are made.',
    ],
    summary: {
      module: result.plan.target.module,
      fileCount: result.plan.fileTree.length,
      widgetCount: result.plan.widgetTree.length,
      componentMappingCount: result.plan.componentMappings.length,
      themeMappingCount: result.plan.themeMappings.length,
      businessQuestionCount: result.plan.businessQuestions.length,
      riskCount: result.plan.risks.length,
    },
  });
}

async function resolvePage(context: ToolContext, args: JsonObject, targetRoot: string): Promise<GeneratedPage> {
  const pageId = readString(args, 'pageId');
  if (pageId) return context.pages.require(pageId);

  const pageCanonicalPath = readString(args, 'pageCanonicalPath');
  if (!pageCanonicalPath) throw new Error('build_ui_plan requires pageId or pageCanonicalPath.');
  const absolutePath = path.resolve(targetRoot, pageCanonicalPath);
  const page = JSON.parse(await readFile(absolutePath, 'utf8')) as PageCanonical;
  const record: GeneratedPage = {
    id: page.pageId,
    createdAt: new Date().toISOString(),
    targetRoot,
    page,
    files: {
      pageCanonical: absolutePath,
      pageDebugIndex: page.artifacts.pageDebugIndex ?? path.join(path.dirname(absolutePath), 'page-debug-index.json'),
      screenshots: page.screenshots.map((screenshot) => screenshot.path),
      uiBuildPlan: page.artifacts.uiBuildPlan,
      uiBuildReview: page.artifacts.uiBuildReview,
    },
    capabilities: page.capabilities,
  };
  context.pages.add(record);
  return record;
}

function resolvePlanOutputDir(args: JsonObject, targetRoot: string, defaultOutDir: string): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return defaultOutDir;
}

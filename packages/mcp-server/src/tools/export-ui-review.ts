import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { exportUiReview } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function exportUiReviewTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const pageId = readString(args, 'pageId');
  if (!pageId) throw new Error('export_ui_review requires pageId.');
  const pageRecord = context.pages.require(pageId);
  if (!pageRecord.plan) throw new Error(`Page ${pageId} has no UI build plan. Call build_ui_plan first.`);
  const output = readString(args, 'output');
  const outDir = output
    ? path.isAbsolute(output) ? output : path.resolve(targetRoot, output)
    : path.dirname(pageRecord.files.uiBuildPlan ?? pageRecord.files.pageCanonical);
  const result = await exportUiReview({
    page: pageRecord.page,
    plan: pageRecord.plan,
    outDir,
  });
  pageRecord.review = result;
  pageRecord.files.uiBuildReview = result.files.uiBuildReview;
  pageRecord.page = {
    ...pageRecord.page,
    artifacts: {
      ...pageRecord.page.artifacts,
      uiBuildReview: result.files.uiBuildReview,
    },
  };
  await writeFile(pageRecord.files.pageCanonical, `${JSON.stringify(pageRecord.page, null, 2)}\n`, 'utf8');
  context.pages.add(pageRecord);
  return createArtifactToolResponse({
    pageId: pageRecord.id,
    planId: pageRecord.plan.id,
    artifactSetId: artifactSetId(pageRecord.id, 'review'),
    files: result.files as unknown as JsonObject,
    resources: pageResources(pageRecord),
    warnings: pageRecord.page.warnings,
    nextActions: [
      'Use ui-build-review.md for manual review or handoff.',
      'Call validate_ui_build after target code changes are made.',
    ],
    summary: {
      title: pageRecord.plan.page.title ?? pageRecord.page.page.title,
      sectionCount: pageRecord.page.sections.length,
      plannedFileCount: pageRecord.plan.fileTree.length,
      riskCount: pageRecord.plan.risks.length,
    },
  });
}

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { attachScreenshotOcr } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { OcrTextBox, PageCanonical } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function attachScreenshotOcrTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const pageId = readString(args, 'pageId');
  if (!pageId) throw new Error('attach_screenshot_ocr requires pageId.');
  const pageRecord = context.pages.require(pageId);
  const screenshotPath = readString(args, 'screenshotPath') ?? pageRecord.page.screenshots[0]?.path;
  if (!screenshotPath) throw new Error(`Page ${pageId} has no screenshot. Pass screenshotPath explicitly.`);
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const outDir = resolveOutputDir(args, targetRoot, screenshotPath);
  const result = await attachScreenshotOcr({
    screenshotPath: path.resolve(targetRoot, screenshotPath),
    outDir,
    externalText: readStringArray(args, 'externalText'),
    externalBoxes: readExternalBoxes(args),
  });
  pageRecord.ocr = result;
  pageRecord.files.ocrResult = result.files.ocrResult;
  pageRecord.page = attachOcrToPage(pageRecord.page, result.ocr);
  await writeFile(pageRecord.files.pageCanonical, `${JSON.stringify(pageRecord.page, null, 2)}\n`, 'utf8');
  context.pages.add(pageRecord);
  return createArtifactToolResponse({
    pageId: pageRecord.id,
    artifactSetId: artifactSetId(pageRecord.id, 'ocr'),
    files: result.files as unknown as JsonObject,
    resources: pageResources(pageRecord),
    warnings: result.ocr.warnings,
    nextActions: [
      'Call build_ui_plan to rebuild the plan if OCR changed important visible text.',
    ],
    summary: {
      provider: result.ocr.provider,
      status: result.ocr.status,
      textCount: result.ocr.text.length,
      boxCount: result.ocr.boxes.length,
      pageCanonical: pageRecord.files.pageCanonical,
    },
  });
}

function resolveOutputDir(args: JsonObject, targetRoot: string, screenshotPath: string): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return path.dirname(path.resolve(targetRoot, screenshotPath));
}

function attachOcrToPage(
  page: PageCanonical,
  ocr: Awaited<ReturnType<typeof attachScreenshotOcr>>['ocr'],
): PageCanonical {
  const text = [...new Set([...page.text, ...ocr.text])];
  const provenance = page.provenance.some((item) => item.source === 'ocr')
    ? page.provenance
    : [...page.provenance, { source: 'ocr' as const, fields: ['ocr', 'text'] }];
  return {
    ...page,
    text,
    ocr,
    warnings: [...page.warnings, ...ocr.warnings],
    provenance,
  };
}

function readExternalBoxes(args: JsonObject): OcrTextBox[] | undefined {
  const value = args.externalBoxes;
  if (!Array.isArray(value)) return undefined;
  const boxes = value
    .filter((item): item is JsonObject => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const text = typeof item.text === 'string' ? item.text : '';
      const bboxValue = item.bbox;
      const bbox = bboxValue && typeof bboxValue === 'object' && !Array.isArray(bboxValue)
        ? {
          x: typeof bboxValue.x === 'number' ? bboxValue.x : 0,
          y: typeof bboxValue.y === 'number' ? bboxValue.y : 0,
          width: typeof bboxValue.width === 'number' ? bboxValue.width : 0,
          height: typeof bboxValue.height === 'number' ? bboxValue.height : 0,
        }
        : undefined;
      const confidence = typeof item.confidence === 'number' ? item.confidence : undefined;
      return {
        text,
        ...(bbox ? { bbox } : {}),
        ...(typeof confidence === 'number' ? { confidence } : {}),
      };
    })
    .filter((box) => box.text.trim().length > 0);
  return boxes.length ? boxes : undefined;
}

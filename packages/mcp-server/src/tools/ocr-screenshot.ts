import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { ocrScreenshot } from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';
import type { OcrTextBox, PageSnapshot } from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function ocrScreenshotTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const screenshotPath = readString(args, 'screenshotPath');
  if (!screenshotPath) throw new Error('ocr_screenshot requires screenshotPath.');
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const outDir = resolveOutputDir(args, targetRoot, screenshotPath);
  const result = await ocrScreenshot({
    screenshotPath: path.resolve(targetRoot, screenshotPath),
    outDir,
    externalText: readStringArray(args, 'externalText'),
    externalBoxes: readExternalBoxes(args),
  });
  const updatedSnapshotPath = await attachOcrToSnapshot(context, args, result.ocr);
  return {
    files: result.files as unknown as JsonObject,
    summary: {
      provider: result.ocr.provider,
      status: result.ocr.status,
      textCount: result.ocr.text.length,
      boxCount: result.ocr.boxes.length,
      updatedSnapshotPath,
      warnings: result.ocr.warnings,
    },
  };
}

function resolveOutputDir(args: JsonObject, targetRoot: string, screenshotPath: string): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return path.dirname(path.resolve(targetRoot, screenshotPath));
}

async function attachOcrToSnapshot(
  context: ToolContext,
  args: JsonObject,
  ocr: Awaited<ReturnType<typeof ocrScreenshot>>['ocr'],
): Promise<string | undefined> {
  const snapshotId = readString(args, 'snapshotId');
  if (snapshotId) {
    const snapshotRecord = context.snapshots.require(snapshotId);
    snapshotRecord.result.snapshot.ocr = ocr;
    await writeFile(snapshotRecord.result.files.pageSnapshot, `${JSON.stringify(snapshotRecord.result.snapshot, null, 2)}\n`, 'utf8');
    return snapshotRecord.result.files.pageSnapshot;
  }

  const snapshotPath = readString(args, 'snapshotPath');
  if (!snapshotPath) return undefined;
  const absoluteSnapshotPath = path.resolve(snapshotPath);
  const snapshot = JSON.parse(await readFile(absoluteSnapshotPath, 'utf8')) as PageSnapshot;
  snapshot.ocr = ocr;
  await writeFile(absoluteSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return absoluteSnapshotPath;
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

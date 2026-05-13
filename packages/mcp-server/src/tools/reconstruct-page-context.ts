import path from 'node:path';
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';
import type { OcrTextBox } from '@proto-bridge/core';
import type { JsonObject, ToolContext } from '../types.js';
import { readBoolean, readNumber, readObject, readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function reconstructPageContextTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const sourceRoot = readString(args, 'sourceRoot');
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const route = readString(args, 'route');
  const vue = readString(args, 'vuePath') ?? readString(args, 'vue');
  const url = readString(args, 'url');
  const screenshotPath = readString(args, 'screenshotPath');
  const hasAnyPageInput = Boolean(sourceRoot || route || vue || url || screenshotPath);
  if (!hasAnyPageInput) {
    throw new Error('reconstruct_page_context requires at least one of sourceRoot, route, vuePath, url, or screenshotPath.');
  }

  const outDir = resolveOutputDir(args, targetRoot, route ?? vue ?? url ?? 'page');
  const result = await reconstructPageContext({
    source: sourceRoot ? {
      adapter: readString(args, 'sourceAdapter') ?? 'vue3-prototype',
      root: path.resolve(targetRoot, sourceRoot),
    } : undefined,
    target: {
      adapter: readString(args, 'targetAdapter') ?? 'flutter-app',
      root: targetRoot,
    },
    route,
    vue,
    url,
    prototypeUrl: readString(args, 'prototypeUrl'),
    screenshotPath: screenshotPath ? path.resolve(targetRoot, screenshotPath) : undefined,
    ocrText: readStringArray(args, 'ocrText') ?? readStringArray(args, 'externalText'),
    ocrBoxes: readExternalBoxes(args),
    outDir,
    capture: readBoolean(args, 'capture') ?? Boolean(url),
    viewport: readViewport(args),
    saveArtifacts: readBoolean(args, 'saveArtifacts') ?? true,
    targetModule: readString(args, 'targetModule'),
    buildPlan: readBoolean(args, 'buildPlan') ?? true,
    buildReview: readBoolean(args, 'buildReview') ?? true,
    sourceBrief: readBoolean(args, 'sourceBrief') ?? false,
    trace: readBoolean(args, 'trace') ?? false,
  });

  const pageRecord = {
    id: result.page.pageId,
    createdAt: new Date().toISOString(),
    targetRoot,
    page: result.page,
    files: {
      pageCanonical: result.files.pageCanonical,
      pageDebugIndex: result.files.pageDebugIndex,
      screenshots: result.files.screenshots,
      uiBuildPlan: result.files.uiBuildPlan,
      uiBuildReview: result.files.uiBuildReview,
    },
    capabilities: result.page.capabilities,
    plan: result.plan,
    review: result.capabilities.review,
    reconstruction: result,
  };
  context.pages.add(pageRecord);

  return createArtifactToolResponse({
    pageId: pageRecord.id,
    planId: result.plan?.id,
    artifactSetId: artifactSetId(pageRecord.id, 'reconstruct'),
    files: result.files as unknown as JsonObject,
    resources: pageResources(pageRecord),
    warnings: result.warnings,
    nextActions: result.nextActions,
    summary: {
      mergeStrategy: result.page.merge?.strategy,
      capabilities: result.page.merge?.selectedCapabilities ?? [],
      route: result.page.page.route,
      title: result.page.page.title,
      hasSourceFacts: Boolean(result.page.sourceFacts),
      hasRuntimeFacts: Boolean(result.page.runtimeFacts),
      hasTargetFacts: Boolean(result.page.targetFacts),
      manualConfirmationCount: result.page.manualConfirmations?.length ?? 0,
      nodeCount: result.page.nodes.length,
      sectionCount: result.page.sections.length,
      screenshotCount: result.page.screenshots.length,
      hasScreenshotFacts: Boolean(result.page.screenshotFacts),
      trace: readBoolean(args, 'trace') ? result.trace as unknown as JsonObject : undefined,
    },
  });
}

function readViewport(args: JsonObject): { width: number; height: number; deviceScaleFactor?: number | undefined } | undefined {
  const viewport = readObject(args, 'viewport');
  if (!viewport) return undefined;
  const width = readNumber(viewport, 'width');
  const height = readNumber(viewport, 'height');
  if (!width || !height) return undefined;
  const deviceScaleFactor = readNumber(viewport, 'deviceScaleFactor');
  return {
    width,
    height,
    ...(deviceScaleFactor ? { deviceScaleFactor } : {}),
  };
}

function resolveOutputDir(args: JsonObject, targetRoot: string, seed: string): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  return path.join(targetRoot, '.proto-bridge', 'pages', `${slugFromSeed(seed)}-${Date.now().toString(36)}`);
}

function slugFromSeed(value: string): string {
  return value
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'page';
}

function readExternalBoxes(args: JsonObject): OcrTextBox[] | undefined {
  const value = args.ocrBoxes ?? args.externalBoxes;
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

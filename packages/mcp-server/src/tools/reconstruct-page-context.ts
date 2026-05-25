import path from 'node:path';
import { resolveProtoBridgeInput } from '@proto-bridge/core/config';
import { reconstructPageContext } from '@proto-bridge/core/workflows/capability-first';
import type { OcrTextBox } from '@proto-bridge/core';
import type { JsonObject, ToolContext } from '../types.js';
import { readBoolean, readNumber, readObject, readString, readStringArray } from '../utils/args.js';
import { resolveProjectRoot, resolveRuntimeConfig } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function reconstructPageContextTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const config = await resolveRuntimeConfig(context.options);
  const configTargetRoot = resolveProjectRoot(config?.target, context.options.configDir);
  const viewport = readViewport(args);
  const targetRootInput = readString(args, 'targetRoot') ?? configTargetRoot;
  const targetRoot = targetRootInput ? path.resolve(targetRootInput) : undefined;
  const resolved = resolveProtoBridgeInput({
    config,
    configDir: context.options.configDir,
    cwd: process.cwd(),
    outputBaseDir: targetRoot ?? process.cwd(),
    overrides: {
      sourceRoot: readString(args, 'sourceRoot'),
      sourceAdapter: readString(args, 'sourceAdapter'),
      targetRoot: readString(args, 'targetRoot'),
      targetAdapter: readString(args, 'targetAdapter'),
      route: readString(args, 'route'),
      vue: readString(args, 'vuePath') ?? readString(args, 'vue'),
      url: readString(args, 'url'),
      output: readString(args, 'output'),
      profile: readProfile(args),
      capture: readBoolean(args, 'capture'),
      viewport,
      saveArtifacts: readBoolean(args, 'saveArtifacts'),
      trace: readBoolean(args, 'trace'),
      screenshotPath: readString(args, 'screenshotPath'),
      ocrText: readStringArray(args, 'ocrText') ?? readStringArray(args, 'externalText'),
      ocrBoxes: readExternalBoxes(args),
      targetModule: readString(args, 'targetModule'),
      buildPlan: readBoolean(args, 'buildPlan'),
      buildReview: readBoolean(args, 'buildReview'),
    },
    requirePageInput: false,
  });
  const hasAnyPageInput = Boolean(resolved.page.route || resolved.page.vue || resolved.page.url || readString(args, 'screenshotPath'));
  if (!hasAnyPageInput) {
    throw new Error('reconstruct_page_context requires at least one of url, route, vuePath, or screenshotPath.');
  }

  const result = await reconstructPageContext(resolved.input);

  const pageRecord = {
    id: result.page.pageId,
    createdAt: new Date().toISOString(),
    targetRoot: resolved.targetRoot ?? process.cwd(),
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

function readProfile(args: JsonObject): string | false | undefined {
  const value = readString(args, 'profile');
  if (!value) return undefined;
  return value === 'false' ? false : value;
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

import path from 'node:path';
import { capturePageCanonical } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readBoolean, readNumber, readObject, readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  artifactSetId,
  createArtifactToolResponse,
  pageResources,
} from '../artifacts/contracts.js';

export async function capturePageCanonicalTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const url = readString(args, 'url');
  if (!url) throw new Error('capture_page_canonical requires url.');
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const outDir = resolveSnapshotOutputDir(args, targetRoot, url);
  const result = await capturePageCanonical({
    url,
    outDir,
    viewport: readViewport(args),
    saveArtifacts: readBoolean(args, 'saveArtifacts') ?? true,
  });
  const pageRecord = {
    id: result.page.pageId,
    createdAt: new Date().toISOString(),
    targetRoot,
    page: result.page,
    files: result.files,
    capabilities: result.capabilities,
  };
  context.pages.add(pageRecord);
  return createArtifactToolResponse({
    pageId: pageRecord.id,
    artifactSetId: artifactSetId(pageRecord.id, 'capture'),
    files: result.files as unknown as JsonObject,
    resources: pageResources(pageRecord),
    warnings: result.page.warnings,
    nextActions: [
      'Call build_ui_plan with pageId to create ui-build-plan.json.',
      'Call attach_screenshot_ocr if screenshot text needs OCR reinforcement.',
    ],
    summary: {
      url,
      route: result.page.page.route,
      title: result.page.page.title,
      nodeCount: result.page.nodes.length,
      visualSectionCount: result.page.sections.length,
      textCount: result.page.text.length,
      assetCount: result.page.assets.length,
      interactionCount: result.page.interactions.length,
      screenshotCount: result.page.screenshots.length,
      capabilities: result.capabilities as unknown as JsonObject,
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

function resolveSnapshotOutputDir(args: JsonObject, targetRoot: string, url: string): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(targetRoot, output);
  const slug = slugFromUrl(url);
  return path.join(targetRoot, '.proto-bridge', 'pages', `${slug}-${Date.now().toString(36)}`);
}

function slugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const route = parsed.hash.startsWith('#/') ? parsed.hash.slice(1).split('?')[0] : parsed.pathname;
    const last = route?.split('/').filter(Boolean).at(-1) ?? parsed.hostname;
    return sanitizeSlug(last);
  } catch {
    return sanitizeSlug(url);
  }
}

function sanitizeSlug(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'page';
}

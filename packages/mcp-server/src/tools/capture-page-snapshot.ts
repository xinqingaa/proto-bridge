import path from 'node:path';
import { capturePageSnapshot } from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readBoolean, readNumber, readObject, readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import { createSnapshotRecordId } from '../services/session-state.js';

export async function capturePageSnapshotTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const url = readString(args, 'url');
  if (!url) throw new Error('capture_page_snapshot requires url.');
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const outDir = resolveSnapshotOutputDir(args, targetRoot, url);
  const result = await capturePageSnapshot({
    url,
    outDir,
    viewport: readViewport(args),
    saveArtifacts: readBoolean(args, 'saveArtifacts') ?? true,
  });
  const snapshotRecord = {
    id: createSnapshotRecordId(result.snapshot.id),
    createdAt: new Date().toISOString(),
    targetRoot,
    result,
  };
  context.snapshots.add(snapshotRecord);
  return {
    snapshotId: snapshotRecord.id,
    createdAt: snapshotRecord.createdAt,
    targetRoot,
    files: result.files as unknown as JsonObject,
    summary: {
      url,
      route: result.snapshot.page.route,
      title: result.snapshot.page.title,
      nodeCount: result.snapshot.nodes.length,
      visualSectionCount: result.snapshot.visualSections.length,
      textCount: result.snapshot.page.text.length,
      assetCount: result.snapshot.assets.length,
      interactionCount: result.snapshot.interactions.length,
      warnings: result.snapshot.warnings,
    },
  };
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
  return path.join(targetRoot, '.proto-bridge', 'snapshots', `${slug}-${Date.now().toString(36)}`);
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

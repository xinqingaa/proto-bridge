import path from 'node:path';
import { capturePageEvidence } from '@proto-bridge/core/workflows/ui-reconstruction';
import type { JsonObject, ToolContext } from '../types.js';
import { readBoolean, readNumber, readObject, readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import { createEvidenceRecordId } from '../services/session-state.js';

export async function capturePageEvidenceTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const url = readString(args, 'url');
  if (!url) throw new Error('capture_page_evidence requires url.');
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const outDir = resolveSnapshotOutputDir(args, targetRoot, url);
  const result = await capturePageEvidence({
    url,
    outDir,
    viewport: readViewport(args),
    saveArtifacts: readBoolean(args, 'saveArtifacts') ?? true,
  });
  const evidenceRecord = {
    id: createEvidenceRecordId(result.evidence.id),
    createdAt: new Date().toISOString(),
    targetRoot,
    result,
  };
  context.evidences.add(evidenceRecord);
  return {
    evidenceId: evidenceRecord.id,
    createdAt: evidenceRecord.createdAt,
    targetRoot,
    files: result.files as unknown as JsonObject,
    summary: {
      url,
      route: result.evidence.page.route,
      title: result.evidence.page.title,
      nodeCount: result.evidence.nodes.length,
      visualSectionCount: result.evidence.sections.length,
      textCount: result.evidence.text.length,
      assetCount: result.evidence.assets.length,
      interactionCount: result.evidence.interactions.length,
      capabilities: result.capabilities as unknown as JsonObject,
      warnings: result.evidence.warnings,
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
  return path.join(targetRoot, '.proto-bridge', 'evidence', `${slug}-${Date.now().toString(36)}`);
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

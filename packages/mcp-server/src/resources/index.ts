import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import {
  evidenceScreenshotUri,
  evidenceSnapshotUri,
} from '../services/evidence-store-reader.js';
import {
  CONSUMER_GUIDE,
  CONSUMER_GUIDE_URI,
} from '../consumer-guide.js';

export function resourceTemplatesList(): JsonValue[] {
  return [
    {
      uriTemplate: 'proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}',
      name: '固定证据 Snapshot',
      description: '读取 PBWork 与 Agent 共用的固定 Evidence Snapshot。',
      mimeType: 'application/json',
    },
    {
      uriTemplate:
        'proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}/screenshots/{blobId}',
      name: '固定 Snapshot 截图',
      description: '读取挂载在指定 Snapshot active Case 上的截图 Blob。',
      mimeType: 'image/png',
    },
  ];
}

export function resourcesList(_context: ToolContext): JsonValue[] {
  return [
    {
      uri: CONSUMER_GUIDE_URI,
      name: 'ProtoBridge Handoff Consumer 指南',
      mimeType: 'text/markdown',
    },
  ];
}

export async function readResource(
  context: ToolContext,
  params: JsonObject | undefined,
): Promise<JsonObject> {
  const uri = readString(params, 'uri');
  if (!uri) throw new Error('resources/read requires params.uri');

  if (uri === CONSUMER_GUIDE_URI) {
    return textContent(uri, 'text/markdown', CONSUMER_GUIDE);
  }

  const snapshotMatch = uri.match(
    /^proto-bridge:\/\/evidence\/([^/]+)\/snapshots\/([^/]+)$/,
  );
  if (snapshotMatch?.[1] && snapshotMatch[2]) {
    const bundleId = decodeURIComponent(snapshotMatch[1]);
    const snapshotId = decodeURIComponent(snapshotMatch[2]);
    const details = await context.evidence.readSnapshot(bundleId, snapshotId);
    return textContent(
      evidenceSnapshotUri(bundleId, snapshotId),
      'application/json',
      JSON.stringify(
        {
          messages: details.evidence.messages,
          fixedSnapshotId: details.evidence.snapshotId,
          ...details,
        },
        null,
        2,
      ),
    );
  }

  const screenshotMatch = uri.match(
    /^proto-bridge:\/\/evidence\/([^/]+)\/snapshots\/([^/]+)\/screenshots\/([^/]+)$/,
  );
  if (screenshotMatch?.[1] && screenshotMatch[2] && screenshotMatch[3]) {
    const bundleId = decodeURIComponent(screenshotMatch[1]);
    const snapshotId = decodeURIComponent(screenshotMatch[2]);
    const blobId = decodeURIComponent(screenshotMatch[3]);
    const screenshot = await context.evidence.readScreenshot(
      bundleId,
      snapshotId,
      blobId,
    );
    return {
      contents: [
        {
          uri: evidenceScreenshotUri(bundleId, snapshotId, blobId),
          mimeType: screenshot.mediaType,
          blob: Buffer.from(screenshot.bytes).toString('base64'),
        },
      ],
    };
  }

  throw new Error(`Unknown resource uri: ${uri}`);
}

function textContent(uri: string, mimeType: string, text: string): JsonObject {
  return { contents: [{ uri, mimeType, text }] };
}

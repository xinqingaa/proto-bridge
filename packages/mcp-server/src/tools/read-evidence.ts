import type { JsonObject, ToolContext } from "../types.js";
import { readString } from "../utils/args.js";
import {
  evidenceScreenshotUri,
  evidenceSnapshotUri,
} from "../services/evidence-store-reader.js";

export async function listEvidenceBundlesTool(
  context: ToolContext,
): Promise<unknown> {
  const bundles = await context.evidence.listBundles();
  return {
    messages:
      bundles.length > 0
        ? [
            "返回的是每个 Bundle 当前 active Snapshot 的索引；消费证据时请固定 snapshotId。",
          ]
        : ["Evidence Store 中还没有 Bundle。"],
    bundles,
  };
}

export async function readEvidenceSnapshotTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const bundleId = requiredString(args, "bundleId");
  const snapshotId = requiredString(args, "snapshotId");
  const details = await context.evidence.readSnapshot(bundleId, snapshotId);
  return {
    messages: details.evidence.messages,
    fixedSnapshotId: details.evidence.snapshotId,
    resource: evidenceSnapshotUri(bundleId, snapshotId),
    screenshotResources: details.evidence.screens.flatMap((screen) =>
      screen.cases.flatMap((item) =>
        item.screenshotBlobIds.map((blobId) => ({
          screenId: screen.screenId,
          caseId: item.caseId,
          blobId,
          uri: evidenceScreenshotUri(bundleId, snapshotId, blobId),
        })),
      ),
    ),
    ...details,
  };
}

export async function readEvidenceCaseTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const bundleId = requiredString(args, "bundleId");
  const snapshotId = requiredString(args, "snapshotId");
  const caseId = requiredString(args, "caseId");
  const details = await context.evidence.readSnapshot(bundleId, snapshotId);
  const selected = details.evidence.screens
    .flatMap((screen) => screen.cases)
    .find((item) => item.caseId === caseId);
  if (!selected) {
    throw new Error(`Case ${caseId} is not active in Snapshot ${snapshotId}.`);
  }
  return {
    messages: [
      ...details.evidence.messages,
      ...(selected.semanticCoverage === "declared"
        ? []
        : [
            `Case ${caseId} 的语义覆盖为 ${selected.semanticCoverage}；以下只返回实际记录的事实。`,
          ]),
    ],
    fixedSnapshotId: details.evidence.snapshotId,
    case: selected,
    screenshotResources: selected.screenshotBlobIds.map((blobId) => ({
      blobId,
      uri: evidenceScreenshotUri(bundleId, snapshotId, blobId),
    })),
  };
}

function requiredString(args: JsonObject, key: string): string {
  const value = readString(args, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

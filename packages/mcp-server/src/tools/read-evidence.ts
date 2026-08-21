import type { JsonObject, ToolContext } from "../types.js";
import {
  buildCaseDelta,
  buildEvidenceDetail,
  buildHandoffIndex,
  buildReconstructionObligationProjection,
  buildScreenPacket,
  buildImplementationPlan,
  buildImplementationTranche,
  EVIDENCE_DETAIL_PROJECTIONS,
  V2ContractError,
  type EvidenceDetailProjection,
  type AcceptanceDimension,
} from "@proto-bridge/core/v2";
import {
  ReconstructionReviewObservation,
  summarizeReconstructionReview,
} from "@proto-bridge/core/v2";
import {
  readNumber,
  readString,
  readStringArray,
} from "../utils/args.js";
import { mcpRuntimeInfo } from "../runtime-info.js";

export async function inspectEvidenceWorkspaceTool(
  context: ToolContext,
): Promise<unknown> {
  const workspace = await context.evidence.workspace();
  return {
    workspace,
    deliveryTargetRoot: context.options.deliveryTargetRoot,
    runtime: mcpRuntimeInfo(workspace.generation),
    messages: [
      "MCP is bound to this logical Workspace; Store paths are never accepted by Evidence tools.",
      "Use capabilities and contract versions to verify compatibility before reading a Handoff index.",
      "Target tools omit targetRoot to use deliveryTargetRoot from this Workspace; an explicit targetRoot still overrides the bound path.",
    ],
  };
}

export async function readHandoffIndexTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const input = await context.evidence.readConsumerProjectionInput(
    requiredString(args, "handoffId"),
  );
  return buildHandoffIndex(input);
}

export async function readScreenPacketTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const input = await context.evidence.readConsumerProjectionInput(
    requiredString(args, "handoffId"),
  );
  return buildScreenPacket(input, requiredString(args, "screenId"));
}

export async function readImplementationPlanTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoffId = requiredString(args, 'handoffId');
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  return buildImplementationPlan(input, requiredString(args, 'screenId'));
}

export async function readImplementationTrancheTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoffId = requiredString(args, 'handoffId');
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  return buildImplementationTranche(
    input,
    requiredString(args, 'screenId'),
    requiredString(args, 'trancheId'),
  );
}

export async function readCaseDeltaTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const input = await context.evidence.readConsumerProjectionInput(
    requiredString(args, "handoffId"),
  );
  return buildCaseDelta(
    input,
    requiredString(args, "screenId"),
    requiredString(args, "caseId"),
  );
}

export async function readEvidenceDetailTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoffId = requiredString(args, "handoffId");
  const projection = requiredProjection(args);
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  return buildEvidenceDetail(input, {
    handoffId,
    screenId: requiredString(args, "screenId"),
    projection,
    ...(readString(args, "caseId") ? { caseId: readString(args, "caseId")! } : {}),
    ...(readStringArray(args, "regionIds") ? { regionIds: readStringArray(args, "regionIds")! } : {}),
    ...(readStringArray(args, "componentIds") ? { componentIds: readStringArray(args, "componentIds")! } : {}),
    ...(readStringArray(args, "tokenIds") ? { tokenIds: readStringArray(args, "tokenIds")! } : {}),
    ...(readNumber(args, "pageSize") !== undefined ? { pageSize: readNumber(args, "pageSize")! } : {}),
    ...(readString(args, "cursor") ? { cursor: readString(args, "cursor")! } : {}),
  });
}

export async function readReconstructionObligationsTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoffId = requiredString(args, 'handoffId');
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  const dimension = readString(args, 'dimension') as AcceptanceDimension | undefined;
  return buildReconstructionObligationProjection(input, {
    handoffId,
    screenId: requiredString(args, 'screenId'),
    ...(dimension ? { dimension } : {}),
    ...(readNumber(args, 'pageSize') !== undefined ? { pageSize: readNumber(args, 'pageSize')! } : {}),
    ...(readString(args, 'cursor') ? { cursor: readString(args, 'cursor')! } : {}),
  });
}

export async function summarizeReconstructionReviewTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const contract = await context.evidence.readAcceptanceContract(
    requiredString(args, "handoffId"),
  );
  const rawObservations = args.observations;
  const observations = ReconstructionReviewObservation.array().parse(
    Array.isArray(rawObservations) ? rawObservations : [],
  );
  return summarizeReconstructionReview({
    contract,
    addressedCaseIds: readStringArray(args, "addressedCaseIds") ?? [],
    viewedScreenshotBlobIds:
      readStringArray(args, "viewedScreenshotBlobIds") ?? [],
    replayedScenarioCaseIds:
      readStringArray(args, "replayedScenarioCaseIds") ?? [],
    observations,
  });
}

export async function readEvidenceScreenshotTool(
  context: ToolContext,
  args: JsonObject,
): Promise<{
  metadata: JsonObject;
  data: string;
  mimeType: string;
}> {
  const bundleId = requiredString(args, "bundleId");
  const snapshotId = requiredString(args, "snapshotId");
  const blobId = requiredString(args, "blobId");
  const screenshot = await context.evidence.readScreenshot(
    bundleId,
    snapshotId,
    blobId,
  );
  return {
    metadata: {
      fixedSnapshotId: snapshotId,
      blobId: screenshot.record.blobId,
      digest: screenshot.record.digest,
      byteLength: screenshot.record.byteLength,
      mediaType: screenshot.record.mediaType,
      ...(screenshot.record.image
        ? {
            width: screenshot.record.image.width,
            height: screenshot.record.image.height,
          }
        : {}),
      viewedAs: "mcp-image-content",
    },
    data: Buffer.from(screenshot.bytes).toString("base64"),
    mimeType: screenshot.mediaType,
  };
}

function requiredString(args: JsonObject, key: string): string {
  const value = readString(args, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function requiredProjection(args: JsonObject): EvidenceDetailProjection {
  const value = requiredString(args, "projection");
  if (!EVIDENCE_DETAIL_PROJECTIONS.includes(value as EvidenceDetailProjection)) {
    throw new V2ContractError(
      "unsafe-input",
      `projection must be one of: ${EVIDENCE_DETAIL_PROJECTIONS.join(", ")}.`,
    );
  }
  return value as EvidenceDetailProjection;
}

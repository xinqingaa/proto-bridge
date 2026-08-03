import type { JsonObject, ToolContext } from "../types.js";
import { V2ContractError } from "@proto-bridge/core/v2";
import {
  AcceptanceRequirementResult,
  evaluateAcceptance,
} from "@proto-bridge/core/v2";
import {
  readBoolean,
  readString,
  readStringArray,
} from "../utils/args.js";
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

export async function inspectEvidenceWorkspaceTool(
  context: ToolContext,
): Promise<unknown> {
  return {
    workspace: context.evidence.workspace(),
    messages: [
      "MCP is bound to this logical Workspace; Store paths are never accepted by Evidence tools.",
    ],
  };
}

export async function listEvidenceHistoryTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.history(requiredString(args, "bundleId"));
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

export async function readEvidenceRunTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readRun(
    requiredString(args, "bundleId"),
    requiredString(args, "runId"),
  );
}

export async function readEvidenceRevisionTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readRevision(
    requiredString(args, "bundleId"),
    requiredString(args, "snapshotId"),
    requiredString(args, "revisionId"),
  );
}

export async function readEvidenceFragmentTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const revision = await context.evidence.readRevision(
    requiredString(args, "bundleId"),
    requiredString(args, "snapshotId"),
    requiredString(args, "revisionId"),
  );
  const pbId = requiredString(args, "pbId");
  const pbKey = readString(args, "pbKey");
  const prefix = `${pbId}${pbKey ? `.${pbKey}` : ""}`;
  const facts = revision.facts.filter(
    (fact) =>
      fact.factId === prefix ||
      fact.factId.startsWith(`${prefix}.`) ||
      fact.candidates.some((candidate) =>
        candidate.provenance.locator.includes(pbId),
      ),
  );
  if (facts.length === 0) {
    throw new V2ContractError(
      "unknown-reference",
      `Fragment ${pbId}${pbKey ? `#${pbKey}` : ""} has no facts in revision ${revision.revisionId}.`,
    );
  }
  return {
    fixedRevisionId: revision.revisionId,
    fragment: { pbId, ...(pbKey ? { pbKey } : {}) },
    facts,
  };
}

export async function readEvidenceCatalogTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readCatalog(
    requiredString(args, "bundleId"),
    requiredString(args, "snapshotId"),
    requiredString(args, "catalogRevisionId"),
  );
}

export async function readEvidenceIssueTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readIssue(
    requiredString(args, "bundleId"),
    requiredString(args, "issueId"),
  );
}

export async function readEvidenceStalenessTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readStaleness(
    requiredString(args, "bundleId"),
    requiredString(args, "snapshotId"),
    requiredString(args, "reportId"),
  );
}

export async function readAgentHandoffTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoff = await context.evidence.readHandoff(
    requiredString(args, "handoffId"),
  );
  return {
    handoff,
    mandatoryRiskReport: handoff.risks,
    messages: [
      "Consumer must report every risk before implementation, even when the producer acknowledged it.",
      "All reads must continue with this Handoff's fixed snapshotId and revisionId values.",
    ],
  };
}

export async function readAcceptanceContractTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readAcceptanceContract(
    requiredString(args, "handoffId"),
  );
}

export async function evaluateAcceptanceTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const contract = await context.evidence.readAcceptanceContract(
    requiredString(args, "handoffId"),
  );
  const rawResults = args.results;
  const results = AcceptanceRequirementResult.array().parse(
    Array.isArray(rawResults) ? rawResults : [],
  );
  return evaluateAcceptance({
    contract,
    results,
    viewedScreenshotBlobIds:
      readStringArray(args, "viewedScreenshotBlobIds") ?? [],
  });
}

export async function readEvidenceBlobTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return context.evidence.readBlob({
    bundleId: requiredString(args, "bundleId"),
    snapshotId: requiredString(args, "snapshotId"),
    blobId: requiredString(args, "blobId"),
    allowDebug: readBoolean(args, "allowDebug") === true,
    ...(readString(args, "catalogRevisionId")
      ? { catalogRevisionId: readString(args, "catalogRevisionId")! }
      : {}),
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

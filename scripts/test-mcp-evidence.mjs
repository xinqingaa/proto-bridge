#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "../packages/core/dist/v2/index.js";
import { createAgentHandoff } from "../packages/core/dist/v2/capture/index.js";
import { LocalFileStore } from "../packages/core/dist/v2/store/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const reference = fixtures.referenceCaseSlice;
const storeRoot = await mkdtemp(path.join(os.tmpdir(), "pb-mcp-evidence-"));
let writer;
let client;
let targetFixture;

try {
  writer = new LocalFileStore({
    root: storeRoot,
    workspaceId: reference.WORKSPACE_ID,
  });
  await writer.init();
  const screenCatalog = {
    schemaVersion: 1,
    catalogRevisionId: "catalog-task-list-screen-v1",
    workspaceId: reference.WORKSPACE_ID,
    bundleId: reference.BUNDLE_ID,
    prototypeId: reference.PROTOTYPE_ID,
    kind: "screen",
    inputDigest: "sha256:task-list-screen-v1",
    createdAt: "2026-07-30T08:00:00.000Z",
    entries: [
      {
        objectId: reference.SCREEN_ID,
        digest: "sha256:task-list",
        value: { title: "任务列表" },
        blobIds: [],
      },
    ],
  };
  const created = await writer.createBundle({
    bundleId: reference.BUNDLE_ID,
    prototypeId: reference.PROTOTYPE_ID,
    run: reference.RUN_1,
    revisions: [reference.PRIMARY_ACTIVE_REVISION],
    coverage: reference.RUN_1.coverage,
    catalogs: [screenCatalog],
  });
  const fixedSnapshotId = created.snapshot.snapshotId;
  const screenshotBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const screenshot = await writer.putBlob({
    bundleId: reference.BUNDLE_ID,
    kind: "screenshot",
    mediaType: "image/png",
    bytes: screenshotBytes,
    ownerRefs: [
      {
        kind: "revision",
        objectId: reference.PRIMARY_ACTIVE_REVISION.revisionId,
      },
    ],
  });
  await writer.putIssue(reference.BUNDLE_ID, reference.UNKNOWN_ISSUE);
  const staleness = await writer.createStalenessReport({
    bundleId: reference.BUNDLE_ID,
    snapshotId: fixedSnapshotId,
    inputVersion: "consumer-check-v1",
    currentDependencyDigests: {
      "registry:sample.task-list": "registry-task-list-v1",
      "source:sample.task-list": "source-task-list-v1",
    },
  });
  const handoff = await createAgentHandoff({
    store: writer,
    bundleId: reference.BUNDLE_ID,
    snapshotId: fixedSnapshotId,
    selectedCases: reference.RUN_1.selection.cases,
    stalenessReport: staleness,
    currentInputVersion: staleness.inputVersion,
    acknowledgedRiskKinds: ["reconstruction-readiness"],
  });

  client = await startClient([
    "--store-root",
    storeRoot,
    "--workspace",
    reference.WORKSPACE_ID,
  ]);

  const tools = await client.request("tools/list", {});
  for (const name of [
    "inspect_evidence_workspace",
    "read_handoff_index",
    "read_screen_packet",
    "read_implementation_plan",
    "read_implementation_tranche",
    "read_case_delta",
    "read_evidence_detail",
    "read_reconstruction_obligations",
    "read_evidence_screenshot",
    "summarize_reconstruction_review",
    "resolve_target_components",
    "resolve_target_tokens",
    "inspect_target_readiness",
    "read_target_conventions",
    "find_target_examples",
    "validate_target_changes",
    "start_target_review",
    "read_target_review",
    "read_review_obligations",
    "verify_target_claims",
    "render_target_case",
    "replay_target_scenario",
    "compare_target_artifacts",
    "record_review_findings",
    "record_review_assessments",
    "request_review_tranche",
    "finalize_target_review",
  ]) {
    assert(
      tools.tools?.some((tool) => tool.name === name),
      `tools/list is missing ${name}.`,
    );
  }
  assert(
    tools.tools?.length === 27,
    `Expected 27 MCP tools, received ${tools.tools?.length ?? 0}.`,
  );
  for (const removedName of [
    "list_evidence_bundles",
    "list_evidence_history",
    "read_evidence_snapshot",
    "read_evidence_case",
    "read_evidence_run",
    "read_evidence_revision",
    "read_evidence_fragment",
    "read_evidence_catalog",
    "read_evidence_issue",
    "read_evidence_staleness",
    "read_agent_handoff",
    "read_evidence_blob",
    "read_acceptance_contract",
    "reconstruct_page_context",
    "validate_ui_build",
    "validate_target_page",
  ]) {
    assert(
      !tools.tools?.some((tool) => tool.name === removedName),
      `tools/list still exposes removed tool ${removedName}.`,
    );
  }

  const workspace = parseToolJson(
    await client.request("tools/call", {
      name: "inspect_evidence_workspace",
      arguments: {},
    }),
  );
  assert(
    workspace.workspace?.workspaceId === reference.WORKSPACE_ID,
    "MCP is not bound to the expected logical Workspace.",
  );
  assert(
    workspace.runtime?.build?.fingerprint?.startsWith("sha256:") &&
      workspace.runtime?.processStartedAt &&
      workspace.runtime?.contracts?.projectionVersion === 4 &&
      workspace.runtime?.store?.generation?.startsWith("generation-") &&
      workspace.runtime?.capabilities?.includes("handoff-index") &&
      workspace.runtime?.capabilities?.includes("implementation-plan") &&
      workspace.runtime?.capabilities?.includes("implementation-tranche") &&
      workspace.runtime?.capabilities?.includes("target-readiness-contract") &&
      workspace.runtime?.capabilities?.includes("image-content-screenshot"),
    "MCP capability/build handshake is incomplete.",
  );

  const targetComponents = parseToolJson(
    await client.request("tools/call", {
      name: "resolve_target_components",
      arguments: {
        targetRoot: path.join(repoRoot, "apps/flutter_pb_app"),
        componentIds: ["app-bar"],
      },
    }),
  );
  const targetTokens = parseToolJson(
    await client.request("tools/call", {
      name: "resolve_target_tokens",
      arguments: {
        targetRoot: path.join(repoRoot, "apps/flutter_pb_app"),
        tokenIds: ["color.error"],
      },
    }),
  );
  assert(
    targetComponents.resolutions?.[0]?.status === "resolved" &&
      targetComponents.resolutions?.[0]?.candidates?.[0]?.symbol === "CommonAppBar" &&
      targetTokens.resolutions?.[0]?.status === "resolved" &&
      targetTokens.resolutions?.[0]?.candidates?.[0]?.accessor === "TS.colors.error",
    "Target component/token resolver did not honor target-owned declarations and current code.",
  );
  const flutterTargetCommit = targetComponents.targetRevisionKey?.currentRevision;
  assert(
    typeof flutterTargetCommit === "string" && flutterTargetCommit.length > 0,
    "Target resolver did not expose the current Flutter commit.",
  );

  targetFixture = await mkdtemp(path.join(os.tmpdir(), "pb-mcp-target-"));
  await mkdir(path.join(targetFixture, "lib", "theme"), { recursive: true });
  await mkdir(path.join(targetFixture, "lib", "common"), { recursive: true });
  await mkdir(path.join(targetFixture, "docs"), { recursive: true });
  await writeFile(
    path.join(targetFixture, "pubspec.yaml"),
    "name: mcp_target_fixture\ndependencies:\n  flutter:\n    sdk: flutter\n",
  );
  await writeFile(
    path.join(targetFixture, "lib", "common", "card.dart"),
    "class CommonCard extends StatelessWidget { const CommonCard({required this.child}); final Widget child; }\nfinal fixtureUse = CommonCard(child: Text('hint'));\n",
  );
  await writeFile(
    path.join(targetFixture, "lib", "theme", "tokens.dart"),
    "class TS { static final colors = AppColors(); } class AppColors { int get error => 1; }\nfinal fixtureTokenUse = TS.colors.error;\n",
  );
  await writeFile(
    path.join(targetFixture, "proto-bridge.target.json"),
    `${JSON.stringify({
      version: 1,
      technology: "flutter",
      components: {
        "open.hinted": {
          symbol: "CommonCard",
          usageHints: ["CommonCard(child: Text('hint'))"],
        },
        "open.malformed": {
          symbol: "CommonCard",
          accessor: "TS.colors.error",
        },
        "open.empty": {},
      },
      tokens: {
        "open.split-chain": { accessor: "TS.missing.error" },
        "open.wrong-kind": { symbol: "CommonCard" },
      },
    }, null, 2)}\n`,
  );
  await writeFile(
    path.join(targetFixture, "docs", "proto-bridge.md"),
    "# Adapter\n\n## Token mapping\n\n| Evidence token | Target token |\n| --- | --- |\n| `design.token-primary` | `TS.colors.error` |\n",
  );
  const fixtureComponents = parseToolJson(
    await client.request("tools/call", {
      name: "resolve_target_components",
      arguments: {
        targetRoot: targetFixture,
        componentIds: ["open.hinted", "open.malformed", "open.empty"],
      },
    }),
  );
  assert(
    fixtureComponents.resolutions?.map((item) => item.status).join(",") ===
      "resolved,stale,stale" &&
      fixtureComponents.resolutions?.[0]?.validation?.usageFound === true,
    "MCP did not enforce explicit mapping shape and usage hints.",
  );
  const fixtureTokens = parseToolJson(
    await client.request("tools/call", {
      name: "resolve_target_tokens",
      arguments: {
        targetRoot: targetFixture,
        tokenIds: ["open.split-chain", "open.wrong-kind", "design.token-primary"],
      },
    }),
  );
  assert(
    fixtureTokens.resolutions?.map((item) => item.status).join(",") ===
      "stale,stale,resolved" &&
      fixtureTokens.resolutions?.[0]?.validation?.exists === false,
    "MCP did not reject split accessor chains or preserve open token IDs.",
  );

  const readiness = parseToolJson(
    await client.request("tools/call", {
      name: "inspect_target_readiness",
      arguments: {
        handoffId: handoff.handoffId,
        targetRoot: targetFixture,
        screenId: reference.SCREEN_ID,
      },
    }),
  );
  assert(
    readiness.contractVersion === 1 &&
      readiness.screenIds?.[0] === reference.SCREEN_ID &&
      readiness.mapping?.components &&
      readiness.mapping?.tokens &&
      readiness.dimensions?.structure?.status === "unverified" &&
      readiness.expectedReviewAuthority?.interactions ===
        "target-scenario-transition-inspector" &&
      readiness.authoritativeReviewReady === false &&
      readiness.blockers?.length > 0,
    "Target readiness did not report resolver coverage and missing machine authority.",
  );

  const handoffIndex = parseToolJson(
    await client.request("tools/call", {
      name: "read_handoff_index",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    handoffIndex.fixedRefs?.snapshotId === fixedSnapshotId &&
      handoffIndex.screens?.[0]?.screenId === reference.SCREEN_ID &&
      handoffIndex.requiredCapabilities?.includes("evidence-detail") &&
      handoffIndex.requiredCapabilities?.includes("semantic-case-patches") &&
      handoffIndex.omittedCategories?.includes("full-facts") &&
      Array.isArray(handoffIndex.mandatoryRisks),
    "Handoff index did not preserve fixed identity, risks, or projection boundaries.",
  );

  const screenPacket = parseToolJson(
    await client.request("tools/call", {
      name: "read_screen_packet",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
      },
    }),
  );
  assert(
    screenPacket.baselineCaseId === reference.TASK_LIST_CASE_ID &&
      screenPacket.cases?.length === 1 &&
      screenPacket.baseline?.structure?.caseId === reference.TASK_LIST_CASE_ID &&
      screenPacket.canonicalBrief?.primaryScroll &&
      Array.isArray(screenPacket.canonicalBrief?.stateMatrix) &&
      screenPacket.canonicalBrief?.highImpactConstraints?.length >= 1 &&
      screenPacket.implementationInventory?.resolverInput &&
      screenPacket.implementationInventory?.components?.every(
        (item) =>
          Array.isArray(item.occurrences) &&
          item.occurrences.every(
            (occurrence) =>
              typeof occurrence.regionId === "string" &&
              Array.isArray(occurrence.caseIds),
          ),
      ) &&
      screenPacket.screenshotGroups?.[0]?.digest === screenshot.digest,
    "Screen packet did not return the fixed baseline, canonicalBrief, or screenshot group.",
  );

  // Diagnostic tools remain available but are not part of the default consumer path.
  const implementationPlan = parseToolJson(
    await client.request("tools/call", {
      name: "read_implementation_plan",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
      },
    }),
  );
  const firstTranche = implementationPlan.tranches?.[0];
  assert(
    implementationPlan.complete === true &&
      implementationPlan.canonicalObligationCount >= 1 &&
      firstTranche?.trancheId &&
      Array.isArray(firstTranche.caseIds) &&
      implementationPlan.tranches.reduce(
        (total, tranche) => total + tranche.obligationCount,
        0,
      ) === implementationPlan.canonicalObligationCount,
    "Diagnostic implementation plan did not preserve the canonical obligation denominator.",
  );

  const implementationTranche = parseToolJson(
    await client.request("tools/call", {
      name: "read_implementation_tranche",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
        trancheId: firstTranche.trancheId,
      },
    }),
  );
  assert(
    implementationTranche.complete === true &&
      implementationTranche.tranche?.trancheId === firstTranche.trancheId &&
      Object.values(implementationTranche.obligations ?? {}).reduce(
        (total, items) => total + items.length,
        0,
      ) === firstTranche.obligationCount,
    "Diagnostic implementation tranche did not expand exactly its canonical obligations.",
  );

  const obligations = parseToolJson(
    await client.request("tools/call", {
      name: "read_reconstruction_obligations",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
        dimension: "structure",
        pageSize: 1,
      },
    }),
  );
  assert(
    obligations.dimension === "structure" &&
      obligations.total >= 1 &&
      obligations.obligations?.length === 1,
    "Reconstruction obligations were not projected by fixed Screen/dimension.",
  );

  const caseDelta = parseToolJson(
    await client.request("tools/call", {
      name: "read_case_delta",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
        caseId: reference.TASK_LIST_CASE_ID,
      },
    }),
  );
  assert(
    caseDelta.baselineCaseId === reference.TASK_LIST_CASE_ID &&
      caseDelta.patches?.length === 0 &&
      caseDelta.evidenceSignals?.length === 0,
    "Case delta did not treat the selected baseline as unchanged.",
  );

  const evidenceDetail = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_detail",
      arguments: {
        handoffId: handoff.handoffId,
        screenId: reference.SCREEN_ID,
        projection: "structure",
        pageSize: 1,
      },
    }),
  );
  assert(
    evidenceDetail.projection === "structure" &&
      evidenceDetail.items?.length === 1 &&
      evidenceDetail.omittedCategories?.includes("tokens"),
    "Evidence detail did not preserve the requested projection boundary.",
  );
  if (evidenceDetail.continuation) {
    await expectToolErrorCode(
      client.request("tools/call", {
        name: "read_evidence_detail",
        arguments: {
          handoffId: handoff.handoffId,
          screenId: reference.SCREEN_ID,
          projection: "tokens",
          cursor: evidenceDetail.continuation,
        },
      }),
      "invalid-continuation",
    );
  }

  const screenshotBlobId = screenPacket.screenshotGroups?.[0]?.representativeBlobId;
  assert(screenshotBlobId, "Screen packet did not expose a Screenshot blob.");
  const screenshotUri = `proto-bridge://evidence/${encodeURIComponent(reference.BUNDLE_ID)}/snapshots/${encodeURIComponent(fixedSnapshotId)}/screenshots/${encodeURIComponent(screenshotBlobId)}`;
  const screenshotRead = await client.request("resources/read", {
    uri: screenshotUri,
  });
  assert(
    screenshotRead.contents?.[0]?.blob === screenshotBytes.toString("base64"),
    "Screenshot resource bytes changed during MCP transport.",
  );
  const screenshotToolRead = await client.request("tools/call", {
    name: "read_evidence_screenshot",
    arguments: {
      bundleId: reference.BUNDLE_ID,
      snapshotId: fixedSnapshotId,
      blobId: screenshotBlobId,
    },
  });
  assert(
    screenshotToolRead.content?.some(
      (item) =>
        item.type === "image" &&
        item.mimeType === "image/png" &&
        item.data === screenshotBytes.toString("base64"),
    ),
    "Screenshot tool did not return a real MCP ImageContent block.",
  );
  assert(
    screenshotToolRead.structuredContent?.viewedAs === "mcp-image-content" &&
      screenshotToolRead.structuredContent?.width === 1 &&
      screenshotToolRead.structuredContent?.height === 1,
    "Screenshot tool did not return verified PNG metadata.",
  );

  const review = parseToolJson(
    await client.request("tools/call", {
      name: "summarize_reconstruction_review",
      arguments: {
        handoffId: handoff.handoffId,
        addressedCaseIds: [],
        viewedScreenshotBlobIds: [screenshotBlobId],
        replayedScenarioCaseIds: [],
        observations: [],
      },
    }),
  );
  assert(
    review.coverageStatus === "partial" &&
      review.visualReviewStatus === "reviewed" &&
      review.validationAuthority === "consumer-reported-review" &&
      review.overallScore === undefined,
    "Review summary did not report Case omission without a score.",
  );
  await expectToolErrorCode(
    client.request("tools/call", {
      name: "start_target_review",
      arguments: {
        handoffId: handoff.handoffId,
        targetRoot: path.join(repoRoot, "apps/flutter_pb_app"),
        targetBaselineCommit: flutterTargetCommit,
        targetRevision: "revision",
      },
    }),
    "review-service-unavailable",
  );

  const next = await writer.commitRun({
    bundleId: reference.BUNDLE_ID,
    run: reference.RUN_2,
    revisions: [reference.FRAGMENT_SCOPED_ACTIVE_REVISION],
    coverage: reference.SNAPSHOT.coverage,
  });
  assert(
    next.snapshot.snapshotId !== fixedSnapshotId,
    "Fixture did not create a second Snapshot.",
  );

  const projectedAfter = parseToolJson(
    await client.request("tools/call", {
      name: "read_handoff_index",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    projectedAfter.fixedRefs?.snapshotId === fixedSnapshotId &&
      JSON.stringify(projectedAfter.screens) ===
        JSON.stringify(handoffIndex.screens),
    "Progressive projection drifted after the active Snapshot changed.",
  );

  const lifecycle = await writer.getWorkspaceLifecycle();
  await writer.resetWorkspace(lifecycle.generationId);
  await expectToolErrorCode(
    client.request("tools/call", {
      name: "read_handoff_index",
      arguments: { handoffId: handoff.handoffId },
    }),
    "workspace-generation-mismatch",
  );

  process.stdout.write(
    `MCP Evidence E2E passed: ${reference.BUNDLE_ID}/${fixedSnapshotId}\n`,
  );
} finally {
  await client?.close();
  await writer?.close();
  if (targetFixture) await rm(targetFixture, { recursive: true, force: true });
  await rm(storeRoot, { recursive: true, force: true });
}

async function startClient(args) {
  const child = spawn(
    "node",
    [path.join(repoRoot, "packages/mcp-server/dist/index.js"), ...args],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let nextId = 1;
  const pending = new Map();
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message);
      error.data = message.error.data;
      slot.reject(error);
    }
    else slot.resolve(message.result);
  });
  child.once("exit", (code) => {
    for (const slot of pending.values()) {
      slot.reject(
        new Error(`MCP exited with code ${code}: ${stderr || "no stderr"}`),
      );
    }
    pending.clear();
  });
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
        );
      });
    },
    close() {
      lines.close();
      child.stdin.end();
      return new Promise((resolve) => {
        if (child.exitCode !== null) resolve();
        else child.once("exit", resolve);
      });
    },
  };
}

function parseToolJson(result) {
  if (
    result.structuredContent === undefined ||
    result.structuredContent === null ||
    typeof result.structuredContent !== "object" ||
    Array.isArray(result.structuredContent)
  ) {
    throw new Error(
      "MCP tool advertised structured output but returned no structuredContent object.",
    );
  }
  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool did not return text JSON in content.");
  const fromText = JSON.parse(text);
  if (JSON.stringify(fromText) !== JSON.stringify(result.structuredContent)) {
    throw new Error(
      "MCP tool content JSON does not match structuredContent.",
    );
  }
  return result.structuredContent;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectToolErrorCode(promise, code) {
  try {
    await promise;
  } catch (error) {
    const received = error?.data?.errorCode ?? error?.data?.code;
    assert(
      received === code,
      `Expected MCP error code ${code}, received ${received ?? "none"}.`,
    );
    return;
  }
  throw new Error(`Expected MCP tool call to fail with ${code}.`);
}

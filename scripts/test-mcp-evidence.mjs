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
const reference = fixtures.ledgerPlanetTaskList;
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
      "registry:ledger-planet.task-list": "registry-task-list-v1",
      "source:ledger-planet.task-list": "source-task-list-v1",
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
    "read_handoff_index",
    "read_screen_packet",
    "read_case_delta",
    "read_evidence_detail",
    "read_reconstruction_obligations",
    "read_evidence_blob",
    "read_evidence_screenshot",
    "read_acceptance_contract",
    "summarize_reconstruction_review",
    "resolve_target_components",
    "resolve_target_tokens",
    "start_target_review",
    "read_target_review",
    "read_review_obligations",
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
  for (const removedName of [
    "reconstruct_page_context",
    "validate_ui_build",
    "validate_target_page",
  ]) {
    assert(
      !tools.tools?.some((tool) => tool.name === removedName),
      `tools/list still exposes removed V1 tool ${removedName}.`,
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
      workspace.runtime?.contracts?.projectionVersion === 2 &&
      workspace.runtime?.store?.generation?.startsWith("generation-") &&
      workspace.runtime?.capabilities?.includes("handoff-index") &&
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
    path.join(targetFixture, "docs", "proto-bridge.target.json"),
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

  const history = parseToolJson(
    await client.request("tools/call", {
      name: "list_evidence_history",
      arguments: { bundleId: reference.BUNDLE_ID },
    }),
  );
  assert(
    history.catalogs?.[0]?.catalogRevisionId ===
      "catalog-task-list-screen-v1" &&
      history.issues?.[0]?.issueId === reference.UNKNOWN_ISSUE.issueId &&
      history.handoffs?.[0]?.handoffId === handoff.handoffId,
    "MCP history does not expose Catalog, Issue and Handoff refs.",
  );

  const listedBefore = parseToolJson(
    await client.request("tools/call", {
      name: "list_evidence_bundles",
      arguments: {},
    }),
  );
  assert(
    listedBefore.bundles?.[0]?.activeSnapshotId === fixedSnapshotId,
    "Bundle discovery did not expose the writer active Snapshot.",
  );

  const runResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_run",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        runId: reference.RUN_1.runId,
      },
    }),
  );
  assert(
    runResult.coverage?.counts?.selected === 1,
    "Run reader did not expose immutable Run Coverage.",
  );

  const revisionResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_revision",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
        revisionId: reference.PRIMARY_ACTIVE_REVISION.revisionId,
      },
    }),
  );
  assert(
    revisionResult.revisionId === reference.PRIMARY_ACTIVE_REVISION.revisionId,
    "Revision reader did not preserve the requested revision.",
  );

  const fragmentResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_fragment",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
        revisionId: reference.PRIMARY_ACTIVE_REVISION.revisionId,
        pbId: "ledger-planet.task-list.root",
      },
    }),
  );
  assert(
    fragmentResult.facts?.[0]?.factId ===
      "ledger-planet.task-list.root.role",
    "Fragment reader did not return fixed-revision facts.",
  );

  const catalogResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_catalog",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
        catalogRevisionId: "catalog-task-list-screen-v1",
      },
    }),
  );
  assert(
    catalogResult.kind === "screen",
    "Catalog revision is not readable.",
  );

  const issueResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_issue",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        issueId: reference.UNKNOWN_ISSUE.issueId,
      },
    }),
  );
  assert(
    issueResult.nextAction === reference.UNKNOWN_ISSUE.nextAction,
    "Evidence Issue is not readable.",
  );

  const stalenessResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_staleness",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
        reportId: staleness.reportId,
      },
    }),
  );
  assert(
    stalenessResult.snapshotId === fixedSnapshotId,
    "Staleness reader did not enforce the fixed Snapshot.",
  );

  const handoffResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_agent_handoff",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    handoffResult.handoff?.snapshotId === fixedSnapshotId &&
      Array.isArray(handoffResult.mandatoryRiskReport),
    "Handoff reader did not return fixed refs and mandatory risks.",
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
      handoffIndex.omittedCategories?.includes("full-facts"),
    "Handoff index did not preserve fixed identity or projection boundaries.",
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
      screenPacket.screenshotGroups?.[0]?.digest === screenshot.digest,
    "Screen packet did not return the fixed baseline and screenshot group.",
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
      caseDelta.added?.length === 0 &&
      caseDelta.changed?.length === 0,
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

  const fixedBefore = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_snapshot",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
      },
    }),
  );
  assert(
    fixedBefore.fixedSnapshotId === fixedSnapshotId,
    "MCP did not preserve the requested fixed Snapshot ID.",
  );
  assert(
    fixedBefore.evidence?.summary?.screenshots === 1,
    "MCP read model did not expose the attached Screenshot.",
  );
  assert(
    fixedBefore.evidence?.semanticStatus === "limited",
    "MCP must preserve the fixture semantic-coverage limitation.",
  );

  const caseResult = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_case",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
        caseId: reference.TASK_LIST_CASE_ID,
      },
    }),
  );
  assert(
    caseResult.case?.revisionId ===
      reference.PRIMARY_ACTIVE_REVISION.revisionId,
    "Case reader returned a different Evidence Revision.",
  );

  const screenshotResource = fixedBefore.screenshotResources?.find(
    (resource) => resource.blobId === screenshot.blobId,
  )?.uri;
  assert(screenshotResource, "Snapshot tool did not return a screenshot URI.");
  const screenshotRead = await client.request("resources/read", {
    uri: screenshotResource,
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
      blobId: screenshot.blobId,
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

  const acceptance = parseToolJson(
    await client.request("tools/call", {
      name: "read_acceptance_contract",
      arguments: { handoffId: handoff.handoffId },
    }),
  );
  assert(
    acceptance.policy === undefined &&
      acceptance.screenshots?.[0]?.blobIds?.includes(screenshot.blobId),
    "Review Contract did not bind the fixed Screenshot or still contains scoring policy.",
  );
  const review = parseToolJson(
    await client.request("tools/call", {
      name: "summarize_reconstruction_review",
      arguments: {
        handoffId: handoff.handoffId,
        addressedCaseIds: [],
        viewedScreenshotBlobIds: [screenshot.blobId],
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
        targetBaselineCommit: "baseline",
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

  const listedAfter = parseToolJson(
    await client.request("tools/call", {
      name: "list_evidence_bundles",
      arguments: {},
    }),
  );
  assert(
    listedAfter.bundles?.[0]?.activeSnapshotId === next.snapshot.snapshotId,
    "Bundle discovery did not advance to the new active Snapshot.",
  );

  const fixedAfter = parseToolJson(
    await client.request("tools/call", {
      name: "read_evidence_snapshot",
      arguments: {
        bundleId: reference.BUNDLE_ID,
        snapshotId: fixedSnapshotId,
      },
    }),
  );
  assert(
    fixedAfter.fixedSnapshotId === fixedSnapshotId &&
      fixedAfter.evidence?.screens?.[0]?.cases?.length ===
        fixedBefore.evidence?.screens?.[0]?.cases?.length,
    "Reading a fixed Snapshot drifted after active Snapshot changed.",
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

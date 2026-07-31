#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createInterface as createLineReader } from "node:readline";
import { createInterface as createPromptInterface } from "node:readline/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ensureBuilt,
  loadWorkspaceConfig,
  optionValue,
  optionValues,
  repoRoot,
  runCaptured,
  tcpReachable,
  userArgv,
  validateWorkspaceConfigWithCore,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
if (argv.includes("--help")) {
  process.stdout.write(`Usage:
  pnpm pb:journey -- [options]

DEPRECATED: prefer \`pnpm pb -- deliver\` (or PBWork 交付到 Agent).
pb:journey remains for local acceptance regression with an MCP fixed-read check.

Options:
  --config <file>            Workspace config (default: proto-bridge.json)
  --selection <file>         SelectionDraft JSON
  --target <directory>       Agent target (default: apps/flutter_pb_app)
  --intent <text>            Handoff implementation intent
  --accept-warning <id>      Repeat for preflight warnings
  --ack-risk <kind>          Repeat for Handoff risks
  --skip-mcp-check           Create the Handoff without the fixed-read check

Without --selection, the tracked Ledger Planet task-list example is used.
Warnings and Handoff risks are confirmed individually; there is no force flag.
`);
  process.exit(0);
}

const workspace = await loadWorkspaceConfig(argv);
const selectionPath = path.resolve(
  repoRoot,
  optionValue(argv, "--selection") ??
    "examples/selections/ledger-planet-task-list.json",
);
const targetRoot = path.resolve(
  repoRoot,
  optionValue(argv, "--target") ?? "apps/flutter_pb_app",
);
const intent =
  optionValue(argv, "--intent") ??
  "Use the fixed ProtoBridge Evidence to implement or verify the selected prototype scope.";
const acceptedWarningIds = new Set(optionValues(argv, "--accept-warning"));
const acknowledgedRiskKinds = new Set(optionValues(argv, "--ack-risk"));
const skipMcpCheck = argv.includes("--skip-mcp-check");

const targetStat = await stat(targetRoot);
if (!targetStat.isDirectory()) {
  throw new Error(`Agent target is not a directory: ${targetRoot}`);
}

await ensureBuilt([
  "packages/core/dist/v2/index.js",
  "packages/local-service/dist/index.js",
  "packages/cli/dist/index.js",
  "packages/mcp-server/dist/index.js",
]);
await validateWorkspaceConfigWithCore(workspace);

const runtimePort = Number(
  workspace.runtimeUrl.port ||
    (workspace.runtimeUrl.protocol === "https:" ? 443 : 80),
);
if (
  !(await tcpReachable(workspace.runtimeUrl.hostname, runtimePort, 1_000))
) {
  throw new Error(
    `PBWork Runtime is not reachable at ${workspace.runtimeOrigin}. Start pnpm pb:up first.`,
  );
}

const cliPath = path.join(repoRoot, "packages/cli/dist/index.js");
const prompt =
  process.stdin.isTTY && process.stdout.isTTY
    ? createPromptInterface({ input: process.stdin, output: process.stdout })
    : undefined;

try {
  heading("1/5 Preflight");
  let preflight = await runCliJson(
    [
      "preflight",
      "--selection",
      selectionPath,
      ...warningArgs(acceptedWarningIds),
    ],
    [0, 7],
  );
  for (const warning of preflight.value.warnings ?? []) {
    if (acceptedWarningIds.has(warning.warningId)) continue;
    if (!prompt) {
      throw new Error(
        `Preflight requires --accept-warning ${warning.warningId}: ${warning.message}`,
      );
    }
    const accepted = await confirm(
      prompt,
      `Accept warning ${warning.warningId}: ${warning.message}?`,
    );
    if (accepted) acceptedWarningIds.add(warning.warningId);
  }
  if (acceptedWarningIds.size > 0) {
    preflight = await runCliJson([
      "preflight",
      "--selection",
      selectionPath,
      ...warningArgs(acceptedWarningIds),
    ]);
  }
  if (!preflight.value.ready) {
    throw new Error("Preflight remains blocked after explicit confirmations.");
  }
  process.stdout.write(`Cases: ${preflight.value.matrix.length}\n`);

  heading("2/5 Capture");
  const capture = await runCliJson(
    [
      "capture",
      "run",
      "--selection",
      selectionPath,
      ...warningArgs(acceptedWarningIds),
    ],
    [0, 2],
  );
  const bundleId = capture.value.job?.bundleId ?? capture.value.run?.bundleId;
  const runId = capture.value.run?.runId;
  const snapshotId = capture.value.snapshot?.snapshotId;
  if (!bundleId || !runId || !snapshotId) {
    throw new Error("Capture output did not include Bundle, Run and Snapshot IDs.");
  }
  process.stdout.write(
    `Bundle ${bundleId}\nRun ${runId}\nSnapshot ${snapshotId}\n`,
  );

  heading("3/5 Inspect and create Handoff");
  const evidence = await runCliJson(
    ["snapshot", "inspect", "--bundle", bundleId, "--snapshot", snapshotId],
    [0, 2],
  );
  process.stdout.write(
    `Coverage: ${evidence.value.coverageStatus}; delivery: ${evidence.value.deliveryStatus}\n`,
  );

  let handoffResult = await tryCreateHandoff();
  if (!handoffResult.ok) {
    const riskKinds = parseUnacknowledgedRisks(handoffResult.result.stderr);
    if (riskKinds.length === 0) {
      throw cliFailure("handoff create", handoffResult.result);
    }
    for (const riskKind of riskKinds) {
      if (acknowledgedRiskKinds.has(riskKind)) continue;
      if (!prompt) {
        throw new Error(
          `Handoff requires --ack-risk ${riskKind}. Core message: ${handoffResult.result.stderr.trim()}`,
        );
      }
      const accepted = await confirm(
        prompt,
        `Acknowledge Handoff risk ${riskKind} without changing the Evidence?`,
      );
      if (accepted) acknowledgedRiskKinds.add(riskKind);
    }
    handoffResult = await tryCreateHandoff();
  }
  if (!handoffResult.ok) {
    throw cliFailure("handoff create", handoffResult.result);
  }
  const handoff = handoffResult.value;
  process.stdout.write(
    `Handoff ${handoff.handoffId}\nRisks: ${
      handoff.risks?.map((risk) => risk.kind).join(", ") || "none"
    }\n`,
  );

  heading("4/5 MCP fixed-read check");
  let mcpCheck = { skipped: true };
  if (!skipMcpCheck) {
    mcpCheck = await checkMcp({
      storeRoot: workspace.storeRoot,
      workspaceId: workspace.workspaceId,
      handoffId: handoff.handoffId,
      bundleId,
      snapshotId,
    });
    process.stdout.write(
      `MCP fixed-read passed for ${mcpCheck.workspaceId}/${mcpCheck.snapshotId}.\n`,
    );
  } else {
    process.stdout.write("Skipped by --skip-mcp-check.\n");
  }

  heading("5/5 Save receipt and Agent prompt");
  const createdAt = new Date().toISOString();
  const journeyRoot = path.join(
    path.dirname(workspace.configPath),
    ".proto-bridge",
    "journeys",
  );
  const journeyId = createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const journeyDir = path.join(journeyRoot, journeyId);
  await mkdir(journeyDir, { recursive: true });
  const agentPrompt = await createAgentPrompt({
    handoffId: handoff.handoffId,
    workspaceId: workspace.workspaceId,
    bundleId,
    snapshotId,
    targetRoot,
    risks: handoff.risks ?? [],
    implementationIntent: intent,
  });
  const agentPromptPath = path.join(journeyDir, "agent-prompt.md");
  await writeFile(agentPromptPath, agentPrompt, "utf8");
  const receipt = {
    schemaVersion: 1,
    journeyId,
    createdAt,
    configPath: workspace.configPath,
    selectionPath,
    targetRoot,
    workspaceId: workspace.workspaceId,
    storeRoot: workspace.storeRoot,
    bundleId,
    runId,
    snapshotId,
    handoffId: handoff.handoffId,
    acceptedWarningIds: [...acceptedWarningIds],
    acknowledgedRiskKinds: [...acknowledgedRiskKinds],
    coverageStatus: handoff.coverageStatus,
    freshnessStatus: handoff.freshnessStatus,
    mandatoryRisks: handoff.risks ?? [],
    mcpCheck,
    agentPromptPath,
  };
  const receiptPath = path.join(journeyDir, "receipt.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(journeyRoot, "latest.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    [
      `Receipt: ${receiptPath}`,
      `Agent prompt: ${agentPromptPath}`,
      "",
      "Next:",
      `  pnpm pb:mcp -- --print-config`,
      `  Open ${agentPromptPath} and paste it into Cursor or Codex.`,
      "",
    ].join("\n"),
  );

  async function tryCreateHandoff() {
    const result = await runCliRaw([
      "handoff",
      "create",
      "--bundle",
      bundleId,
      "--snapshot",
      snapshotId,
      "--intent",
      intent,
      ...warningArgs(acceptedWarningIds),
      ...riskArgs(acknowledgedRiskKinds),
    ]);
    if (![0, 2, 6].includes(result.code)) return { ok: false, result };
    return { ok: true, value: parseJson(result.stdout, "handoff create") };
  }
} finally {
  prompt?.close();
}

async function runCliJson(args, acceptedCodes = [0]) {
  const result = await runCliRaw(args);
  if (!acceptedCodes.includes(result.code)) {
    throw cliFailure(args.slice(0, 2).join(" "), result);
  }
  return { result, value: parseJson(result.stdout, args.join(" ")) };
}

async function runCliRaw(args) {
  return await runCaptured(process.execPath, [
    cliPath,
    ...args,
    "--config",
    workspace.configPath,
    "--json",
  ]);
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} did not return JSON: ${value.trim()}`);
  }
}

function cliFailure(label, result) {
  return new Error(
    `${label} failed with exit ${result.code}: ${
      result.stderr.trim() || result.stdout.trim()
    }`,
  );
}

function parseUnacknowledgedRisks(message) {
  const match = message.match(/unacknowledged risk kinds: ([^\]\n]+)/);
  return match
    ? [...new Set(match[1].split(",").map((value) => value.trim()))]
    : [];
}

function warningArgs(values) {
  return [...values].flatMap((value) => ["--accept-warning", value]);
}

function riskArgs(values) {
  return [...values].flatMap((value) => ["--ack-risk", value]);
}

async function confirm(reader, question) {
  const answer = await reader.question(`${question} [y/N] `);
  return /^(y|yes)$/i.test(answer.trim());
}

function heading(value) {
  process.stdout.write(`\n${value}\n`);
}

async function checkMcp({
  storeRoot,
  workspaceId,
  handoffId,
  bundleId,
  snapshotId,
}) {
  const client = await startMcpClient([
    "--store-root",
    storeRoot,
    "--workspace",
    workspaceId,
  ]);
  try {
    const workspaceResult = parseToolJson(
      await client.request("tools/call", {
        name: "inspect_evidence_workspace",
        arguments: {},
      }),
    );
    const handoffResult = parseToolJson(
      await client.request("tools/call", {
        name: "read_agent_handoff",
        arguments: { handoffId },
      }),
    );
    const snapshotResult = parseToolJson(
      await client.request("tools/call", {
        name: "read_evidence_snapshot",
        arguments: { bundleId, snapshotId },
      }),
    );
    if (workspaceResult.workspace?.workspaceId !== workspaceId) {
      throw new Error("MCP returned a different Workspace.");
    }
    if (handoffResult.handoff?.snapshotId !== snapshotId) {
      throw new Error("MCP Handoff did not preserve the fixed Snapshot.");
    }
    if (snapshotResult.fixedSnapshotId !== snapshotId) {
      throw new Error("MCP Snapshot read did not preserve the fixed ID.");
    }
    return {
      skipped: false,
      workspaceId,
      handoffId,
      snapshotId,
      mandatoryRiskKinds: (
        handoffResult.mandatoryRiskReport ?? []
      ).map((risk) => risk.kind),
      deliveryStatus: snapshotResult.evidence?.deliveryStatus,
    };
  } finally {
    await client.close();
  }
}

async function startMcpClient(args) {
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, "packages/mcp-server/dist/index.js"), ...args],
    { cwd: repoRoot, env: process.env, stdio: ["pipe", "pipe", "pipe"] },
  );
  let nextId = 1;
  let stderr = "";
  const pending = new Map();
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const lines = createLineReader({ input: child.stdout });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  child.once("exit", (code) => {
    for (const request of pending.values()) {
      request.reject(
        new Error(`MCP exited ${code}: ${stderr.trim() || "no stderr"}`),
      );
    }
    pending.clear();
  });
  return {
    request(method, params) {
      const id = nextId;
      nextId += 1;
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
  const content = result.content?.find((item) => item.type === "text")?.text;
  if (!content) throw new Error("MCP tool did not return text JSON in content.");
  const fromText = JSON.parse(content);
  if (JSON.stringify(fromText) !== JSON.stringify(result.structuredContent)) {
    throw new Error(
      "MCP tool content JSON does not match structuredContent.",
    );
  }
  return result.structuredContent;
}

async function createAgentPrompt({
  handoffId,
  workspaceId,
  bundleId,
  snapshotId,
  targetRoot,
  risks = [],
  implementationIntent,
}) {
  const mod = await import(
    pathToFileURL(
      path.join(repoRoot, "packages/core/dist/v2/agent-prompt.js"),
    ).href
  );
  return mod.buildAgentPrompt({
    handoffId,
    workspaceId,
    bundleId,
    snapshotId,
    targetRoot,
    risks,
    implementationIntent,
  });
}

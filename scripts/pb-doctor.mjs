#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadWorkspaceConfig,
  optionValue,
  repoRoot,
  runCaptured,
  tcpReachable,
  userArgv,
  validateWorkspaceConfigWithCore,
  resolveWorkspaceDeliveryTargetRoot,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
const json = argv.includes("--json");
const requireRunning = argv.includes("--require-running");
const checks = [];

function record(status, name, detail, fix) {
  checks.push({ status, name, detail, ...(fix ? { fix } : {}) });
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
record(
  nodeMajor >= 20 ? "pass" : "fail",
  "Node.js",
  process.versions.node,
  nodeMajor >= 20 ? undefined : "Install Node.js 20 or newer.",
);

const pnpm = await runCaptured("pnpm", ["--version"]);
record(
  pnpm.code === 0 ? "pass" : "fail",
  "pnpm",
  pnpm.code === 0 ? pnpm.stdout.trim() : pnpm.stderr.trim() || "not available",
  pnpm.code === 0 ? undefined : "Install the pnpm version declared in package.json.",
);

let workspace;
try {
  workspace = await loadWorkspaceConfig(argv);
  record("pass", "Workspace config", workspace.configPath);
} catch (error) {
  const configInput = optionValue(argv, "--config");
  const configPath = path.resolve(repoRoot, configInput ?? "proto-bridge.json");
  const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
  record(
    "fail",
    "Workspace config",
    error instanceof Error ? error.message : String(error),
    missing
      ? "Run pnpm pb:init to create the repository default Workspace config."
      : "Run pnpm pb:init -- --reconfigure, or pass --config <file>.",
  );
}

if (workspace) {
  try {
    await validateWorkspaceConfigWithCore(workspace);
    record("pass", "Workspace schema", "validated by Core V2WorkspaceConfig");
    try {
      const deliveryTargetRoot = await resolveWorkspaceDeliveryTargetRoot(
        workspace,
      );
      await access(path.join(deliveryTargetRoot, "pubspec.yaml"));
      await access(path.join(deliveryTargetRoot, "lib"));
      record("pass", "Delivery target", deliveryTargetRoot);
    } catch (error) {
      record(
        "fail",
        "Delivery target",
        error instanceof Error ? error.message : String(error),
        "Set delivery.targetRoot in proto-bridge.json to a Flutter project that contains pubspec.yaml and lib/, then restart pnpm pb:up.",
      );
    }
  } catch (error) {
    record(
      "fail",
      "Workspace schema",
      error instanceof Error ? error.message : String(error),
      "Run pnpm build if Core output is missing, then correct the config.",
    );
  }
  const serviceOrigins = workspace.value?.service?.allowedOrigins ?? [];
  record(
    serviceOrigins.includes(workspace.runtimeOrigin) ? "pass" : "fail",
    "Workbench origin",
    serviceOrigins.includes(workspace.runtimeOrigin)
      ? `${workspace.runtimeOrigin} is allowed`
      : `${workspace.runtimeOrigin} is missing from service.allowedOrigins`,
    serviceOrigins.includes(workspace.runtimeOrigin)
      ? undefined
      : `Add ${JSON.stringify(workspace.runtimeOrigin)} to service.allowedOrigins.`,
  );
  const localServiceHost = ["127.0.0.1", "::1", "localhost"].includes(
    workspace.serviceHost,
  );
  record(
    localServiceHost ? "pass" : "fail",
    "Local Service host",
    workspace.serviceHost,
    localServiceHost ? undefined : "Use a loopback host such as 127.0.0.1.",
  );
  const localRuntimeHost = ["127.0.0.1", "::1", "localhost"].includes(
    workspace.runtimeUrl.hostname,
  );
  record(
    localRuntimeHost ? "pass" : "fail",
    "Runtime host",
    workspace.runtimeUrl.hostname,
    localRuntimeHost ? undefined : "Use a local PBWork Runtime URL.",
  );

  try {
    const storeWorkspace = JSON.parse(
      await readFile(path.join(workspace.storeRoot, "workspace.json"), "utf8"),
    );
    record(
      storeWorkspace.workspaceId === workspace.workspaceId ? "pass" : "fail",
      "Evidence Store",
      `${workspace.storeRoot} (${storeWorkspace.workspaceId})`,
      storeWorkspace.workspaceId === workspace.workspaceId
        ? undefined
        : "Use a Store created for the configured workspaceId.",
    );
  } catch {
    record(
      "fail",
      "Evidence Store",
      `${workspace.storeRoot} is not initialized`,
      "Run pnpm pb:init, or if an existing Store root was destroyed, stop Service and use workspace reinitialize with explicit confirmation.",
    );
  }

  const runtimePort = Number(
    workspace.runtimeUrl.port ||
      (workspace.runtimeUrl.protocol === "https:" ? 443 : 80),
  );
  const runtimeRunning = await tcpReachable(
    workspace.runtimeUrl.hostname,
    runtimePort,
  );
  record(
    runtimeRunning ? "pass" : requireRunning ? "fail" : "info",
    "PBWork Runtime",
    runtimeRunning ? `${workspace.runtimeOrigin} is reachable` : "not running",
    runtimeRunning ? undefined : "Start it with pnpm pb:up.",
  );
  const serviceRunning = await tcpReachable(
    workspace.serviceHost,
    workspace.servicePort,
  );
  record(
    serviceRunning ? "pass" : requireRunning ? "fail" : "info",
    "Local Service",
    serviceRunning
      ? `${workspace.serviceHost}:${workspace.servicePort} is reachable`
      : "not running",
    serviceRunning ? undefined : "Start it with pnpm pb:up.",
  );
}

for (const [name, entry] of [
  ["CLI build", "packages/cli/dist/index.js"],
  ["MCP build", "packages/mcp-server/dist/index.js"],
]) {
  try {
    await access(path.join(repoRoot, entry));
    record("pass", name, entry);
  } catch {
    record("warn", name, "build output is missing", "Run pnpm build.");
  }
}

try {
  const requireFromCore = createRequire(
    path.join(repoRoot, "packages/core/package.json"),
  );
  const playwrightModule = await import(
    pathToFileURL(requireFromCore.resolve("playwright")).href
  );
  const { chromium } = playwrightModule.default ?? playwrightModule;
  const executable = chromium.executablePath();
  await access(executable);
  record("pass", "Playwright Chromium", executable);
} catch {
  record(
    "fail",
    "Playwright Chromium",
    "browser executable is missing",
    "Run pnpm pb:install.",
  );
}

const failed = checks.filter((check) => check.status === "fail");
if (json) {
  process.stdout.write(
    `${JSON.stringify({ ok: failed.length === 0, checks }, null, 2)}\n`,
  );
} else {
  for (const check of checks) {
    const marker = {
      pass: "✓",
      fail: "✗",
      warn: "!",
      info: "·",
    }[check.status];
    process.stdout.write(`${marker} ${check.name}: ${check.detail}\n`);
    if (check.fix && check.status !== "pass") {
      process.stdout.write(`  → ${check.fix}\n`);
    }
  }
  process.stdout.write(
    failed.length === 0
      ? "\nProtoBridge is ready for local use.\n"
      : `\nProtoBridge doctor found ${failed.length} blocking issue(s).\n`,
  );
}
process.exitCode = failed.length === 0 ? 0 : 1;

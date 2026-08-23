#!/usr/bin/env node
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import path from "node:path";
import {
  loadWorkspaceConfig,
  optionValue,
  repoRoot,
  runInherited,
  spawnInherited,
  userArgv,
  validateWorkspaceConfigWithCore,
  resolveWorkspaceDeliveryTargetRoot,
  waitForTcp,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
let workspace;
try {
  workspace = await loadWorkspaceConfig(argv);
} catch (error) {
  const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
  if (missing && process.stdin.isTTY && process.stdout.isTTY && !optionValue(argv, "--config")) {
    await runInherited("pnpm", ["pb:init"]);
    workspace = await loadWorkspaceConfig(argv);
  } else {
    throw new Error(
      missing
        ? "ProtoBridge Workspace config is missing. Run pnpm pb:init, then retry pnpm pb:up."
        : error instanceof Error ? error.message : String(error),
    );
  }
}
const runtimePort = Number(
  workspace.runtimeUrl.port ||
    (workspace.runtimeUrl.protocol === "https:" ? 443 : 80),
);

try {
  await access(path.join(repoRoot, "node_modules"));
} catch {
  throw new Error("ProtoBridge dependencies are not installed. Run pnpm pb:install, then retry pnpm pb:up.");
}

await runInherited("pnpm", ["--filter", "@proto-bridge/core", "build"]);
await validateWorkspaceConfigWithCore(workspace);
const deliveryTargetRoot = await resolveWorkspaceDeliveryTargetRoot(workspace);
const configArg = optionValue(argv, "--config");
await runInherited("pnpm", [
  "pb:doctor",
  "--",
  "--for-up",
  ...(configArg ? ["--config", configArg] : []),
]);

const sharedEnv = {
  ...process.env,
  PB_SERVICE_PORT: String(workspace.servicePort),
  PBWORK_ORIGIN: workspace.runtimeOrigin,
  PBWORK_RUNTIME_ORIGIN: workspace.runtimeOrigin,
  PB_STORE_ROOT: workspace.storeRoot,
  PB_WORKSPACE_ID: workspace.workspaceId,
  PB_MAX_CASES: String(workspace.maxCases),
  PB_DELIVERY_TARGET_ROOT: deliveryTargetRoot,
};

const statePath = path.join(path.dirname(workspace.storeRoot), "runtime", "pb-up.json");
await mkdir(path.dirname(statePath), { recursive: true });
await clearStaleState(statePath, workspace.workspaceId);

const service = spawnInherited(
  "pnpm",
  [
    "--filter",
    "@proto-bridge/local-service",
    "exec",
    "tsx",
    "--conditions=source",
    "src/index.ts",
  ],
  { env: sharedEnv },
);
const workbench = spawnInherited(
  "pnpm",
  [
    "--filter",
    "@proto-bridge/pbwork",
    "exec",
    "vite",
    "--host",
    workspace.runtimeUrl.hostname,
    "--port",
    String(runtimePort),
  ],
  { env: sharedEnv },
);

try {
  await writeFile(statePath, `${JSON.stringify({
    controllerPid: process.pid,
    servicePid: service.pid,
    workbenchPid: workbench.pid,
    workspaceId: workspace.workspaceId,
    runtimePort,
    servicePort: workspace.servicePort,
    startedAt: new Date().toISOString(),
  }, null, 2)}\n`, { flag: "wx" });
} catch (error) {
  service.kill("SIGTERM");
  workbench.kill("SIGTERM");
  if (error instanceof Error && "code" in error && error.code === "EEXIST") {
    throw new Error(`A pb:up state already exists at ${statePath}. Stop the existing PBWork before starting another one.`);
  }
  throw error;
}

let closing = false;
function stop(signal = "SIGTERM") {
  if (closing) return;
  closing = true;
  if (service.exitCode === null) service.kill(signal);
  if (workbench.exitCode === null) workbench.kill(signal);
  try { rmSync(statePath, { force: true }); } catch { /* process shutdown must continue */ }
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

try {
  await Promise.all([
    waitForTcp(workspace.serviceHost, workspace.servicePort),
    waitForTcp(workspace.runtimeUrl.hostname, runtimePort),
  ]);
  process.stdout.write(
    [
      "",
      "ProtoBridge is ready.",
      `Workbench: ${workspace.runtimeOrigin}/workbench/prototypes/all`,
      `Runtime:   ${workspace.runtimeOrigin}`,
      `Workspace: ${workspace.workspaceId}`,
      `Store:     ${workspace.storeRoot}`,
      `Target:    ${deliveryTargetRoot}`,
      "Stop:      Ctrl+C",
      "",
    ].join("\n"),
  );
} catch (error) {
  stop();
  throw error;
}

const exitCode = await new Promise((resolve) => {
  service.once("exit", (code) => {
    stop();
    resolve(code);
  });
  workbench.once("exit", (code) => {
    stop();
    resolve(code);
  });
});
process.exit(Number(exitCode ?? 0));

async function clearStaleState(file, workspaceId) {
  let state;
  try {
    state = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw new Error(`Cannot safely read ${file}; refusing to start PBWork.`);
  }
  if (state.workspaceId !== workspaceId) {
    throw new Error(`A pb:up state for another Workspace exists at ${file}.`);
  }
  const pids = [state.controllerPid, state.servicePid, state.workbenchPid];
  if (pids.some(isAlive)) {
    throw new Error(`PBWork is already running for ${workspaceId}. Stop it before starting another instance.`);
  }
  await rm(file, { force: true });
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

#!/usr/bin/env node
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { optionValue, repoRoot, tcpReachable, userArgv } from "./lib/pb-script-utils.mjs";

const argv = userArgv();
const yes = argv.includes("--yes");
const configInput = optionValue(argv, "--config");
const configPath = path.resolve(repoRoot, configInput ?? "proto-bridge.json");
const defaultConfigPath = path.join(repoRoot, "proto-bridge.json");
if (configPath !== defaultConfigPath) {
  throw new Error("pb:clean only supports the repository default proto-bridge.json. Remove a custom Workspace explicitly instead.");
}

const bridgeRoot = path.join(repoRoot, ".proto-bridge");
const statePath = path.join(bridgeRoot, "runtime", "pb-up.json");
let config;
try {
  config = JSON.parse(await readFile(configPath, "utf8"));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw new Error(`Cannot safely read ${configPath}; refusing to clean.`);
  }
}

if (!yes && !(process.stdin.isTTY && process.stdout.isTTY)) {
  throw new Error("pb:clean is destructive and requires --yes outside an interactive terminal.");
}
if (!yes && !(await confirm(
  "This deletes proto-bridge.json and the entire .proto-bridge directory. Type DELETE to continue: ",
))) {
  process.stdout.write("Clean cancelled. Nothing was deleted.\n");
  process.exit(0);
}

await stopManagedProcesses(statePath, config);

await rm(configPath, { force: true });
await rm(bridgeRoot, { recursive: true, force: true });
process.stdout.write(
  [
    "ProtoBridge local state removed.",
    "Preserved: source code, target projects, node_modules, dist, and Playwright browsers.",
    "Start again with: pnpm pb:install && pnpm pb:init && pnpm pb:up",
    "",
  ].join("\n"),
);

async function stopManagedProcesses(file, workspace) {
  let state;
  try {
    state = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw new Error(`Cannot safely read ${file}; refusing to clean.`);
    }
  }
  if (state) {
    if (workspace?.workspaceId && state.workspaceId !== workspace.workspaceId) {
      throw new Error("pb:up state belongs to a different Workspace; refusing to clean.");
    }
    for (const pid of [state.servicePid, state.workbenchPid, state.controllerPid]) {
      if (Number.isInteger(pid) && pid > 1) {
        try { process.kill(pid, "SIGTERM"); } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
        }
      }
    }
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      if (![state.servicePid, state.workbenchPid, state.controllerPid].some(isAlive)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if ([state.servicePid, state.workbenchPid, state.controllerPid].some(isAlive)) {
      throw new Error("Managed PB processes did not stop within 8 seconds; refusing to delete local state.");
    }
    return;
  }

  const runtimePort = Number(workspace?.runtime?.baseUrl ? new URL(workspace.runtime.baseUrl).port || 80 : 3977);
  const servicePort = Number(workspace?.service?.port ?? 3988);
  if (await tcpReachable("127.0.0.1", runtimePort) || await tcpReachable("127.0.0.1", servicePort)) {
    throw new Error("PB ports are in use but no managed pb:up state was found; refusing to kill unknown processes.");
  }
}

function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function confirm(prompt) {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try { return (await rl.question(prompt)).trim() === "DELETE"; } finally { rl.close(); }
}

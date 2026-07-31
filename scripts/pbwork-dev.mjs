#!/usr/bin/env node
import {
  loadWorkspaceConfig,
  runInherited,
  spawnInherited,
  userArgv,
  validateWorkspaceConfigWithCore,
  waitForTcp,
} from "./lib/pb-script-utils.mjs";

const workspace = await loadWorkspaceConfig(userArgv());
const runtimePort = Number(
  workspace.runtimeUrl.port ||
    (workspace.runtimeUrl.protocol === "https:" ? 443 : 80),
);

await runInherited("pnpm", ["--filter", "@proto-bridge/core", "build"]);
await validateWorkspaceConfigWithCore(workspace);

const sharedEnv = {
  ...process.env,
  PB_SERVICE_PORT: String(workspace.servicePort),
  PBWORK_ORIGIN: workspace.runtimeOrigin,
  PBWORK_RUNTIME_ORIGIN: workspace.runtimeOrigin,
  PB_STORE_ROOT: workspace.storeRoot,
  PB_WORKSPACE_ID: workspace.workspaceId,
  PB_MAX_CASES: String(workspace.maxCases),
};

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

let closing = false;
function stop(signal = "SIGTERM") {
  if (closing) return;
  closing = true;
  if (service.exitCode === null) service.kill(signal);
  if (workbench.exitCode === null) workbench.kill(signal);
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

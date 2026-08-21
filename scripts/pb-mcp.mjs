#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import {
  loadWorkspaceConfig,
  requireBuilt,
  repoRoot,
  shellQuote,
  userArgv,
  validateWorkspaceConfigWithCore,
  resolveWorkspaceDeliveryTargetRoot,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
const workspace = await loadWorkspaceConfig(argv);

if (argv.includes("--print-config")) {
  const command = process.execPath;
  const args = [
    path.join(repoRoot, "scripts/pb-mcp.mjs"),
    ...(workspace.configPath === path.join(repoRoot, "proto-bridge.json")
      ? []
      : ["--config", workspace.configPath]),
  ];
  process.stdout.write(
    `${JSON.stringify(
      {
        workspaceId: workspace.workspaceId,
        storeRoot: workspace.storeRoot,
        deliveryTargetRoot: workspace.value?.delivery?.targetRoot
          ? path.resolve(
              path.dirname(workspace.configPath),
              workspace.value.delivery.targetRoot,
            )
          : undefined,
        stdio: { command, args, cwd: repoRoot },
        cursor: {
          mcpServers: {
            "proto-bridge": { command, args },
          },
        },
        codex: {
          command: `codex mcp add proto-bridge -- ${[
            command,
            ...args,
          ].map(shellQuote).join(" ")}`,
        },
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

await requireBuilt([
  "packages/core/dist/v2/index.js",
  "packages/mcp-server/dist/index.js",
]);
await validateWorkspaceConfigWithCore(workspace);
const deliveryTargetRoot = await resolveWorkspaceDeliveryTargetRoot(workspace);

process.stderr.write(
  `ProtoBridge MCP: workspace=${workspace.workspaceId} store=${workspace.storeRoot} target=${deliveryTargetRoot}\n`,
);
const child = spawn(
  process.execPath,
  [
    path.join(repoRoot, "packages/mcp-server/dist/index.js"),
    "--store-root",
    workspace.storeRoot,
    "--workspace",
    workspace.workspaceId,
    "--target-root",
    deliveryTargetRoot,
    "--service-url",
    `http://${workspace.serviceHost}:${workspace.servicePort}/api/v2`,
    "--service-origin",
    workspace.runtimeOrigin,
  ],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  },
);

child.once("error", (error) => {
  throw error;
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

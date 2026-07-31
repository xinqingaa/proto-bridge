#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import {
  ensureBuilt,
  repoRoot,
  userArgv,
} from "./lib/pb-script-utils.mjs";

await ensureBuilt([
  "packages/core/dist/v2/index.js",
  "packages/local-service/dist/index.js",
  "packages/cli/dist/index.js",
]);

const child = spawn(
  process.execPath,
  [path.join(repoRoot, "packages/cli/dist/index.js"), ...userArgv()],
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

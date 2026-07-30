#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uiPort = 4900 + (process.pid % 300);
const servicePort = uiPort + 1;

await run("pnpm", ["--filter", "@proto-bridge/pbwork", "build"]);
await run(
  "pnpm",
  [
    "--filter",
    "@proto-bridge/pbwork",
    "exec",
    "playwright",
    "test",
    "e2e/runtime-capture-v2.spec.ts",
  ],
  {
    PBWORK_E2E_PORT: String(uiPort),
    PBWORK_E2E_SERVICE_PORT: String(servicePort),
  },
);

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}.`));
    });
  });
}

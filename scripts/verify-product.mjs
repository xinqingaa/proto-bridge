#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const steps = [
  ["pnpm", ["install", "--frozen-lockfile"]],
  ["pnpm", ["docs:verify"]],
  ["pnpm", ["build"]],
  ["pnpm", ["typecheck"]],
  ["pnpm", ["--filter", "@proto-bridge/core", "test"]],
  ["pnpm", ["--filter", "@proto-bridge/local-service", "test"]],
  ["pnpm", ["--filter", "@proto-bridge/cli", "test"]],
  ["pnpm", ["--filter", "@proto-bridge/pbwork", "test"]],
  ["pnpm", ["--filter", "@proto-bridge/pbwork", "build"]],
  ["pnpm", ["test:e2e:runtime"]],
  ["pnpm", ["test:e2e:mcp"]],
  ["pnpm", ["test:e2e:consumer"]],
  ["pnpm", ["test:e2e:evidence-slice"]],
];

for (const [command, args] of steps) {
  process.stdout.write(`\n[product] ${command} ${args.join(" ")}\n`);
  await run(command, args);
}

process.stdout.write("\nProtoBridge product verification passed.\n");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}.`));
    });
  });
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import {
  confirmPrompt,
  exitIfInterrupted,
  repoRoot,
  runInherited,
  userArgv,
} from "./lib/pb-script-utils.mjs";

const input = userArgv();
const yes = input.includes("--yes");
const passthrough = input.filter((value) => value !== "--yes");
const json = passthrough.includes("--json");

if (passthrough.includes("--apply")) {
  process.stderr.write(
    "pb:reset does not accept --apply directly. Use the preview command's planId and generation, or use --yes.\n",
  );
  process.exitCode = 1;
} else {
  await runInherited("pnpm", ["build"]);

  const preview = await runCli(["workspace", "reset", "--json", ...passthrough]);
  if (preview.code !== 0) {
    process.stdout.write(preview.stdout);
    process.stderr.write(preview.stderr);
    process.exitCode = preview.code ?? 1;
  } else {
    let plan;
    try {
      plan = JSON.parse(preview.stdout);
    } catch {
      process.stdout.write(preview.stdout);
      process.stderr.write(
        "pb:reset could not read the reset preview. Run pnpm pb -- workspace reset directly.\n",
      );
      process.exitCode = 1;
    }
    if (plan) {
      let confirmed = yes;
      if (!confirmed && process.stdin.isTTY && process.stdout.isTTY) {
        const answer = await confirmPrompt(
          `Reset Workspace ${plan.workspaceId}: delete ${plan.evidence?.objects ?? 0} Evidence objects, ${plan.deliveries?.objects ?? 0} Deliveries, and ${plan.reviews?.objects ?? 0} Reviews? Type yes to continue: `,
          "yes",
          { ignoreCase: true },
        );
        exitIfInterrupted(answer);
        confirmed = answer.confirmed;
      }
      if (!confirmed) {
        if (!yes && !(process.stdin.isTTY && process.stdout.isTTY)) {
          if (json) process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
          process.stderr.write(
            "pb:reset requires an interactive confirmation. Use pnpm pb:reset -- --yes or run the preview/apply CLI commands manually.\n",
          );
        } else if (!json) {
          process.stdout.write("Reset cancelled. Nothing was deleted.\n");
        }
        process.exitCode = 1;
      } else {
        const result = await runCli([
          "workspace",
          "reset",
          "--apply",
          "--plan-id",
          plan.planId,
          "--generation",
          plan.generationId,
          ...passthrough,
        ]);
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
        process.exitCode = result.code ?? 1;
      }
    }
  }
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "packages/cli/dist/index.js"), ...args],
      { cwd: repoRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

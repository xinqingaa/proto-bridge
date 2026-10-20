#!/usr/bin/env node
import { access, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import {
  optionValue,
  repoRoot,
  userArgv,
} from "./lib/pb-script-utils.mjs";

const argv = userArgv();
const command = argv[0];
const json = argv.includes("--json");
const yes = argv.includes("--yes");
const configPath = path.resolve(
  repoRoot,
  optionValue(argv, "--config") ?? "proto-bridge.json",
);
const targetArg = findTargetArg(argv);

if (!command || command === "--help" || command === "-h") {
  process.stdout.write([
    "Usage: pnpm pb:target show [--json] [--config <file>]",
    "       pnpm pb:target use <flutter-project> [--yes] [--json] [--config <file>]",
    "",
    "show  打印当前 Workspace 的 delivery.targetRoot 及解析后的绝对路径。",
    "use   校验目标像 Flutter 工程后，写入 delivery.targetRoot；需重启 pb:up 和 MCP。",
    "",
    "--config  操作指定 Workspace 配置，默认 proto-bridge.json。",
    "--yes     非交互确认（use 必填；交互终端也可直接确认）。",
    "--json    输出机器可读结果。",
    "",
  ].join("\n"));
  process.exit(0);
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const configDir = path.dirname(configPath);
const currentTarget = resolveTarget(config?.delivery?.targetRoot, configDir);

if (command === "show") {
  const result = {
    config: configPath,
    workspaceId: config?.workspaceId,
    deliveryTargetRoot: config?.delivery?.targetRoot,
    resolvedTargetRoot: currentTarget,
  };
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else {
    process.stdout.write([
      `Config: ${result.config}`,
      `Workspace: ${result.workspaceId ?? "<missing>"}`,
      `delivery.targetRoot: ${result.deliveryTargetRoot ?? "<missing>"}`,
      `Resolved: ${result.resolvedTargetRoot ?? "<missing>"}`,
      "",
    ].join("\n"));
  }
  process.exit(0);
}

if (command !== "use") {
  throw new Error(`Unknown command: ${command}. Use show or use.`);
}
if (!targetArg) {
  throw new Error("Usage: pnpm pb:target use <flutter-project> [--yes]");
}

const nextTarget = await realpath(path.resolve(process.cwd(), targetArg)).catch(() =>
  path.resolve(process.cwd(), targetArg),
);
await assertFlutterTarget(nextTarget);
const relativeTarget = toConfigRelative(configDir, nextTarget);
const previous = config?.delivery?.targetRoot;
const next = {
  ...config,
  delivery: { ...(config?.delivery ?? {}), targetRoot: relativeTarget },
};

if (!yes) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("pb:target use requires --yes in a non-interactive terminal.");
  }
  process.stdout.write([
    `Config: ${configPath}`,
    `Current: ${currentTarget ?? "<missing>"}`,
    `Next:    ${nextTarget}`,
    `Write delivery.targetRoot = ${JSON.stringify(relativeTarget)}`,
    "",
  ].join("\n"));
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = (await rl.question("Apply this change? [y/N]: ")).trim().toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      process.stdout.write("Cancelled. Nothing was changed.\n");
      process.exit(0);
    }
  } finally {
    rl.close();
  }
}

await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
const result = {
  config: configPath,
  workspaceId: config?.workspaceId,
  previousTargetRoot: previous,
  deliveryTargetRoot: relativeTarget,
  resolvedTargetRoot: nextTarget,
  restartRequired: ["pnpm pb:up", "MCP"],
};
if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
else {
  process.stdout.write([
    `Updated ${configPath}`,
    `delivery.targetRoot: ${previous ?? "<missing>"} -> ${relativeTarget}`,
    `Resolved: ${nextTarget}`,
    "Restart pnpm pb:up and the MCP client so Target tools bind to the new project.",
    "",
  ].join("\n"));
}

function resolveTarget(value, base) {
  return typeof value === "string" && value.trim()
    ? path.resolve(base, value)
    : undefined;
}

function findTargetArg(args) {
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--config") {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    return arg;
  }
  return undefined;
}

function toConfigRelative(base, target) {
  const relative = path.relative(base, target) || ".";
  return relative.split(path.sep).join("/");
}

async function assertFlutterTarget(root) {
  let info;
  try {
    info = await stat(root);
  } catch {
    throw new Error(`Target does not exist: ${root}`);
  }
  if (!info.isDirectory()) throw new Error(`Target is not a directory: ${root}`);
  for (const entry of ["pubspec.yaml", "lib"]) {
    try {
      await access(path.join(root, entry));
    } catch {
      throw new Error(
        `Target is not a Flutter project (missing ${entry}): ${root}`,
      );
    }
  }
}

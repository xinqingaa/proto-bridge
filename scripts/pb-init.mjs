#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { repoRoot, runInherited, userArgv } from "./lib/pb-script-utils.mjs";

const argv = userArgv();
const configInput = optionValue(argv, "--config");
const configPath = path.resolve(repoRoot, configInput ?? "proto-bridge.json");
const reconfigure = argv.includes("--reconfigure");
const yes = argv.includes("--yes");

if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write([
    "Usage: pnpm pb:init [--yes] [--reconfigure] [--config <file>]",
    "",
    "Creates a Workspace config and initializes its Store.",
    "--yes          use repository defaults without prompting",
    "--reconfigure  edit an existing config without deleting its Store",
    "--config       operate on an explicit config path",
    "",
  ].join("\n"));
  process.exit(0);
}

const existing = await readJsonIfPresent(configPath);
if (existing && !reconfigure) {
  throw new Error(`ProtoBridge config already exists: ${configPath}. Use pnpm pb:init -- --reconfigure to edit it.`);
}
if (reconfigure && !existing) {
  throw new Error(`Cannot reconfigure missing config: ${configPath}. Run pnpm pb:init first.`);
}

const defaults = {
  workspace: existing?.workspaceId ?? "pbwork-local",
  runtime: existing?.runtime?.baseUrl ?? "http://127.0.0.1:3977",
  serviceHost: existing?.service?.host ?? "127.0.0.1",
  servicePort: String(existing?.service?.port ?? 3988),
  store: existing?.store?.root ?? ".proto-bridge/store",
  maxCases: String(existing?.capture?.maxCases ?? 200),
  target: existing?.delivery?.targetRoot ?? "apps/flutter_pb_app",
};

let values = defaults;
if (!yes && process.stdin.isTTY && process.stdout.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const mode = existing
      ? await rl.question("Reconfigure this Workspace using current values? [Y/n]: ")
      : await rl.question("Use repository defaults? [Y/n]: ");
    if (mode.trim().toLowerCase() === "n" || mode.trim().toLowerCase() === "no") {
      values = {
        workspace: await ask(rl, "Workspace ID", defaults.workspace),
        runtime: await ask(rl, "Runtime URL", defaults.runtime),
        serviceHost: await ask(rl, "Service host", defaults.serviceHost),
        servicePort: await ask(rl, "Service port", defaults.servicePort),
        store: await ask(rl, "Store root", defaults.store),
        maxCases: await ask(rl, "Maximum capture cases", defaults.maxCases),
        target: await ask(rl, "Delivery target root", defaults.target),
      };
    }
  } finally {
    rl.close();
  }
} else if (!yes && !process.stdin.isTTY) {
  throw new Error("pb:init requires an interactive terminal or --yes.");
}

const initArgs = [
  "pb",
  "--",
  "workspace",
  "init",
  "--config",
  path.relative(repoRoot, configPath),
  "--workspace",
  values.workspace,
  "--runtime",
  values.runtime,
  "--service-host",
  values.serviceHost,
  "--service-port",
  values.servicePort,
  "--store",
  values.store,
  "--max-cases",
  values.maxCases,
  "--target",
  values.target,
];

if (existing) {
  const next = await buildConfig(values, configPath, existing);
  process.stdout.write([
    "Workspace reconfiguration preview:",
    JSON.stringify(next, null, 2),
    "",
  ].join("\n"));
  if (!yes && !(await confirmDelete("Write this configuration? Type yes to continue: "))) {
    process.stdout.write("Initialization cancelled. Nothing was changed.\n");
    process.exit(0);
  }
  await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  process.stdout.write(`Updated ${configPath}; existing Store was preserved.\n`);
} else {
  await runInherited("pnpm", initArgs);
  process.stdout.write(`Created ${configPath} and initialized its Store.\n`);
}

async function buildConfig(input, targetPath, previous) {
  const corePath = path.join(repoRoot, "packages/core/dist/v2/index.js");
  try { await access(corePath); } catch { await runInherited("pnpm", ["--filter", "@proto-bridge/core", "build"]); }
  const { V2WorkspaceConfig } = await import(corePath);
  return V2WorkspaceConfig.parse({
    ...previous,
    schemaVersion: previous.schemaVersion ?? 1,
    workspaceId: input.workspace,
    runtime: { ...previous.runtime, baseUrl: input.runtime },
    store: { ...previous.store, root: input.store },
    capture: { ...previous.capture, maxCases: Number(input.maxCases) },
    delivery: { ...previous.delivery, targetRoot: input.target },
    service: { ...previous.service, host: input.serviceHost, port: Number(input.servicePort) },
  });
}

async function readJsonIfPresent(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw new Error(`Cannot safely read ${file}; refusing to initialize.`);
  }
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

async function ask(rl, label, fallback) {
  const answer = (await rl.question(`${label} [${fallback}]: `)).trim();
  return answer || fallback;
}

async function confirmDelete(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try { return (await rl.question(prompt)).trim().toLowerCase() === "yes"; }
  finally { rl.close(); }
}

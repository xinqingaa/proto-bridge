import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function userArgv(argv = process.argv.slice(2)) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}

export function optionValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

export function optionValues(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== name) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires a value.`);
    }
    values.push(value);
    index += 1;
  }
  return values;
}

export function withoutOptions(argv, namesWithValues) {
  const names = new Set(namesWithValues);
  const result = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (names.has(argv[index])) {
      index += 1;
      continue;
    }
    result.push(argv[index]);
  }
  return result;
}

export async function loadWorkspaceConfig(argv = process.argv.slice(2)) {
  const input = optionValue(argv, "--config") ?? "proto-bridge.json";
  const configPath = path.resolve(repoRoot, input);
  const value = JSON.parse(await readFile(configPath, "utf8"));
  const runtimeUrl = new URL(requiredString(value?.runtime?.baseUrl, "runtime.baseUrl"));
  const storeRoot = path.resolve(
    path.dirname(configPath),
    requiredString(value?.store?.root, "store.root"),
  );
  return {
    configPath,
    value,
    runtimeUrl,
    runtimeOrigin: runtimeUrl.origin,
    storeRoot,
    workspaceId: requiredString(value?.workspaceId, "workspaceId"),
    serviceHost: requiredString(value?.service?.host, "service.host"),
    servicePort: requiredNumber(value?.service?.port, "service.port"),
    maxCases: requiredNumber(value?.capture?.maxCases, "capture.maxCases"),
  };
}

export async function validateWorkspaceConfigWithCore(workspace) {
  const core = await import(
    pathToFileURL(path.join(repoRoot, "packages/core/dist/v2/index.js")).href
  );
  return core.V2WorkspaceConfig.parse(workspace.value);
}

export async function resolveWorkspaceDeliveryTargetRoot(workspace) {
  const [{ V2WorkspaceConfig }, { resolveDeliveryTargetRoot }] = await Promise.all([
    import(pathToFileURL(path.join(repoRoot, "packages/core/dist/v2/index.js")).href),
    import(pathToFileURL(path.join(repoRoot, "packages/core/dist/v2/store/index.js")).href),
  ]);
  const config = V2WorkspaceConfig.parse(workspace.value);
  return resolveDeliveryTargetRoot({
    config,
    configDir: path.dirname(workspace.configPath),
  });
}

export async function ensureBuilt(entries, message = "Building ProtoBridge packages…") {
  const missing = [];
  for (const entry of entries) {
    try {
      await access(path.join(repoRoot, entry));
    } catch {
      missing.push(entry);
    }
  }
  if (missing.length === 0) return;
  process.stderr.write(`${message}\n`);
  await runInherited("pnpm", ["build"]);
}

export async function requireBuilt(entries) {
  const missing = [];
  for (const entry of entries) {
    try {
      await access(path.join(repoRoot, entry));
    } catch {
      missing.push(entry);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `ProtoBridge build output is missing (${missing.join(", ")}). Run pnpm build before starting MCP.`,
    );
  }
}

export function runInherited(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited ${code ?? `with ${signal}`}.`,
          ),
        );
      }
    });
  });
}

export function spawnInherited(command, args, options = {}) {
  return spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
    ...options,
  });
}

export async function runCaptured(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

export async function tcpReachable(host, port, timeoutMs = 500) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (reachable) => {
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function waitForTcp(host, port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await tcpReachable(host, port, 300)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${host}:${port}.`);
}

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function isPromptInterrupt(error) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? error.name : undefined;
  const code = "code" in error ? error.code : undefined;
  return name === "AbortError" || code === "ABORT_ERR";
}

export async function confirmPrompt(
  prompt,
  expected,
  options = {},
) {
  const io = options.io ?? { input: process.stdin, output: process.stderr };
  const normalize = options.ignoreCase
    ? (value) => value.trim().toLowerCase()
    : (value) => value.trim();
  const createInterface =
    options.createInterface ??
    (await import("node:readline/promises")).createInterface;
  const rl = createInterface({ input: io.input, output: io.output });
  try {
    const answer = await rl.question(prompt);
    return {
      confirmed: normalize(answer) === normalize(expected),
      interrupted: false,
    };
  } catch (error) {
    if (isPromptInterrupt(error)) {
      return { confirmed: false, interrupted: true };
    }
    throw error;
  } finally {
    rl.close();
  }
}

export function exitIfInterrupted(
  result,
  message = "Cancelled. Nothing was deleted.",
) {
  if (!result.interrupted) return;
  process.stderr.write(`\n${message}\n`);
  process.exit(130);
}

function requiredString(value, pathLabel) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Workspace config requires ${pathLabel}.`);
  }
  return value;
}

function requiredNumber(value, pathLabel) {
  if (!Number.isFinite(value)) {
    throw new Error(`Workspace config requires numeric ${pathLabel}.`);
  }
  return value;
}

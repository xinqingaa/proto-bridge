import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ProjectConfig, ProtoBridgeConfig, ServerOptions } from '../types.js';

const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';

export function resolveRuntimeTargetRoot(targetRootInput: string | undefined): string {
  return path.resolve(targetRootInput ?? process.cwd());
}

export async function resolveRuntimeConfig(options: ServerOptions): Promise<ProtoBridgeConfig | undefined> {
  if (options.configLoaded) return options.config;
  options.configLoaded = true;

  let text: string;
  try {
    text = await readFile(options.configPath, 'utf8');
  } catch {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) throw new Error('config root must be a JSON object');
    options.config = parsed as ProtoBridgeConfig;
    return options.config;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ProtoBridge config ${options.configPath}: ${message}`);
  }
}

export function resolveProjectRoot(project: ProjectConfig | undefined, configDir: string): string | undefined {
  if (!project?.root) return undefined;
  return path.isAbsolute(project.root) ? project.root : path.resolve(configDir, project.root);
}

export function parseServerOptions(argv: string[]): ServerOptions {
  const configInput = readConfigArg(argv) ?? DEFAULT_CONFIG_FILE;
  const configPath = path.isAbsolute(configInput) ? configInput : path.resolve(process.cwd(), configInput);
  return {
    configPath,
    configDir: path.dirname(configPath),
    configLoaded: false,
  };
}

function readConfigArg(argv: string[]): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg.startsWith('--config=')) return arg.slice('--config='.length);
    if (arg === '--config') {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error('--config requires a file path.');
      return next;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

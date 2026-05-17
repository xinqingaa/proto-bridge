import path from 'node:path';
import {
  DEFAULT_CONFIG_FILE,
  readProtoBridgeConfigFile,
  resolveConfigPath,
  type ProtoBridgeProjectConfig,
} from '@proto-bridge/core/config';
import type { ProtoBridgeConfig, ServerOptions } from '../types.js';

export function resolveRuntimeTargetRoot(targetRootInput: string | undefined): string {
  return path.resolve(targetRootInput ?? process.cwd());
}

export function resolveOptionalRoot(rootInput: string | undefined, baseDir: string): string | undefined {
  if (!rootInput) return undefined;
  return path.isAbsolute(rootInput) ? rootInput : path.resolve(baseDir, rootInput);
}

export async function resolveRuntimeConfig(options: ServerOptions): Promise<ProtoBridgeConfig | undefined> {
  if (options.configLoaded) return options.config;
  options.configLoaded = true;

  options.config = await readProtoBridgeConfigFile(options.configPath, { required: false });
  return options.config;
}

export function resolveProjectRoot(project: ProtoBridgeProjectConfig | undefined, configDir: string): string | undefined {
  if (!project?.root) return undefined;
  return path.isAbsolute(project.root) ? project.root : path.resolve(configDir, project.root);
}

export function parseServerOptions(argv: string[]): ServerOptions {
  const configPath = resolveConfigPath(readConfigArg(argv) ?? DEFAULT_CONFIG_FILE, process.cwd());
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

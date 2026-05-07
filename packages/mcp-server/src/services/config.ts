import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ProtoBridgeConfig, ResolvedConfig, ServerOptions } from '../types.js';

export async function loadConfig(
  options: ServerOptions,
  configPathInput: string | undefined,
): Promise<ResolvedConfig> {
  const configPath = path.resolve(configPathInput ?? options.config ?? 'proto-bridge.config.json');
  const text = await readFile(configPath, 'utf8');
  return {
    configPath,
    configDir: path.dirname(configPath),
    config: JSON.parse(text) as ProtoBridgeConfig,
  };
}

export function resolveProjectRoot(config: ResolvedConfig, root: string | undefined, label: string): string {
  if (!root) throw new Error(`Missing ${label} in ${config.configPath}`);
  return path.isAbsolute(root) ? root : path.resolve(config.configDir, root);
}

export function resolveRuntimeTargetRoot(targetRootInput: string | undefined): string {
  return path.resolve(targetRootInput ?? process.cwd());
}

export function parseServerOptions(argv: string[]): ServerOptions {
  const options: ServerOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config') {
      const value = argv[index + 1];
      if (value) options.config = value;
      index += 1;
    }
  }
  return options;
}

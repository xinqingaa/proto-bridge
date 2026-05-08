import path from 'node:path';
import type { ServerOptions } from '../types.js';

export function resolveRuntimeTargetRoot(targetRootInput: string | undefined): string {
  return path.resolve(targetRootInput ?? process.cwd());
}

export function parseServerOptions(argv: string[]): ServerOptions {
  void argv;
  return {};
}

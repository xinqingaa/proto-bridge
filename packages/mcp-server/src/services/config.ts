import path from 'node:path';
import type { ServerOptions } from '../types.js';

export function resolveRuntimeTargetRoot(targetRootInput: string | undefined): string {
  return path.resolve(targetRootInput ?? process.cwd());
}

export function parseServerOptions(argv: string[]): ServerOptions {
  const storeRootInput =
    readOptionArg(argv, '--store-root') ?? process.env.PB_STORE_ROOT;
  const workspaceId =
    readOptionArg(argv, '--workspace') ?? process.env.PB_WORKSPACE_ID;
  const serviceUrl = readOptionArg(argv, '--service-url') ?? process.env.PB_SERVICE_URL;
  const serviceOrigin = readOptionArg(argv, '--service-origin') ?? process.env.PB_SERVICE_ORIGIN;
  return {
    ...(storeRootInput
      ? { storeRoot: path.resolve(process.cwd(), storeRootInput) }
      : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(serviceUrl ? { serviceUrl } : {}),
    ...(serviceOrigin ? { serviceOrigin } : {}),
  };
}

function readOptionArg(
  argv: string[],
  option: '--store-root' | '--workspace' | '--service-url' | '--service-origin',
): string | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg.startsWith(`${option}=`)) return arg.slice(`${option}=`.length);
    if (arg === option) {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`${option} requires a value.`);
      }
      return next;
    }
  }
  return undefined;
}

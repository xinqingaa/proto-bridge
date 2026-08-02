import { readTargetConventions } from '@proto-bridge/core/target';
import type { JsonObject } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function getTargetConventionsTool(args: JsonObject): Promise<unknown> {
  return readTargetConventions({
    targetRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot')),
    module: readString(args, 'module'),
    roles: readStringArray(args, 'roles'),
    symbols: readStringArray(args, 'symbols'),
  });
}

import { readTargetConventions } from '@proto-bridge/core/target';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function getTargetConventionsTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return readTargetConventions({
    targetRoot: resolveRuntimeTargetRoot(
      readString(args, 'targetRoot'),
      context.options.deliveryTargetRoot,
    ),
    module: readString(args, 'module'),
    roles: readStringArray(args, 'roles'),
    symbols: readStringArray(args, 'symbols'),
  });
}

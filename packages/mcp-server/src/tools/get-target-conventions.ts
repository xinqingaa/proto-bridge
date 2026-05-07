import { getFlutterTargetConventions } from '@proto-bridge/core';
import type { FlutterComponentRole } from '@proto-bridge/core';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { loadConfig, resolveProjectRoot } from '../services/config.js';

export async function getTargetConventionsTool(context: ToolContext, args: JsonObject): Promise<unknown> {
  const resolved = await loadConfig(context.options, readString(args, 'config'));
  return getFlutterTargetConventions({
    flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    module: readString(args, 'module'),
    roles: readStringArray(args, 'roles') as FlutterComponentRole[] | undefined,
    symbols: readStringArray(args, 'symbols'),
  });
}

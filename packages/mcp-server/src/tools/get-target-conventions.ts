import { getFlutterTargetConventions } from '@proto-bridge/core/target/flutter-app';
import type { FlutterComponentRole } from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveProjectRoot, resolveRuntimeConfig, resolveRuntimeTargetRoot } from '../services/config.js';

export async function getTargetConventionsTool(context: ToolContext, args: JsonObject): Promise<unknown> {
  const config = await resolveRuntimeConfig(context.options);
  const configTargetRoot = resolveProjectRoot(config?.target, context.options.configDir);
  return getFlutterTargetConventions({
    flutterRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot') ?? configTargetRoot),
    module: readString(args, 'module'),
    roles: readStringArray(args, 'roles') as FlutterComponentRole[] | undefined,
    symbols: readStringArray(args, 'symbols'),
  });
}

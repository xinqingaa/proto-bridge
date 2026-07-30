import { getFlutterTargetConventions } from '@proto-bridge/core/target/flutter-app/query';
import type { FlutterComponentRole } from '@proto-bridge/core/target/flutter-app/query';
import type { JsonObject } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function getTargetConventionsTool(args: JsonObject): Promise<unknown> {
  return getFlutterTargetConventions({
    flutterRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot')),
    module: readString(args, 'module'),
    roles: readStringArray(args, 'roles') as FlutterComponentRole[] | undefined,
    symbols: readStringArray(args, 'symbols'),
  });
}

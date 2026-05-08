import { findFlutterTargetExamples } from '@proto-bridge/core/target/flutter-app';
import type { FindFlutterTargetExamplesInput, FlutterComponentRole } from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, ToolContext } from '../types.js';
import { readNumber, readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function findTargetExamplesTool(context: ToolContext, args: JsonObject): Promise<unknown> {
  const input: FindFlutterTargetExamplesInput = {
    flutterRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot')),
    module: readString(args, 'module'),
    pattern: readString(args, 'pattern'),
    roles: readStringArray(args, 'roles') as FlutterComponentRole[] | undefined,
    symbols: readStringArray(args, 'symbols'),
    screenId: readString(args, 'screenId'),
    limit: readNumber(args, 'limit'),
  };
  return findFlutterTargetExamples(input);
}

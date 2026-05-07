import { findFlutterTargetExamples } from '@proto-bridge/core';
import type { FindFlutterTargetExamplesInput, FlutterComponentRole } from '@proto-bridge/core';
import type { JsonObject, ToolContext } from '../types.js';
import { readNumber, readString, readStringArray } from '../utils/args.js';
import { loadConfig, resolveProjectRoot } from '../services/config.js';

export async function findTargetExamplesTool(context: ToolContext, args: JsonObject): Promise<unknown> {
  const resolved = await loadConfig(context.options, readString(args, 'config'));
  const input: FindFlutterTargetExamplesInput = {
    flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    module: readString(args, 'module'),
    pattern: readString(args, 'pattern'),
    roles: readStringArray(args, 'roles') as FlutterComponentRole[] | undefined,
    symbols: readStringArray(args, 'symbols'),
    screenId: readString(args, 'screenId'),
    limit: readNumber(args, 'limit'),
  };
  return findFlutterTargetExamples(input);
}

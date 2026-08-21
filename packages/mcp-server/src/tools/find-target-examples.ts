import { findTargetExamples } from '@proto-bridge/core/target';
import type { FindTargetExamplesInput } from '@proto-bridge/core/target';
import type { JsonObject, ToolContext } from '../types.js';
import { readNumber, readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function findTargetExamplesTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const input: FindTargetExamplesInput = {
    targetRoot: resolveRuntimeTargetRoot(
      readString(args, 'targetRoot'),
      context.options.deliveryTargetRoot,
    ),
    module: readString(args, 'module'),
    pattern: readString(args, 'pattern'),
    roles: readStringArray(args, 'roles'),
    symbols: readStringArray(args, 'symbols'),
    screenId: readString(args, 'screenId'),
    limit: readNumber(args, 'limit'),
    gitBase: readString(args, 'gitBase'),
    excludePaths: readStringArray(args, 'excludePaths'),
    candidateOutputRoot: readString(args, 'candidateOutputRoot'),
  };
  return findTargetExamples(input);
}

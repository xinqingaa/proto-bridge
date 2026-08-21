import {
  resolveTargetComponents,
  resolveTargetTokens,
  type ResolveTargetMappingsInput,
} from '@proto-bridge/core/target';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';

export async function resolveTargetComponentsTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return resolveTargetComponents(resolveInput(context, args, 'componentIds'));
}

export async function resolveTargetTokensTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  return resolveTargetTokens(resolveInput(context, args, 'tokenIds'));
}

function resolveInput(
  context: ToolContext,
  args: JsonObject,
  key: 'componentIds' | 'tokenIds',
): ResolveTargetMappingsInput {
  const ids = readStringArray(args, key) ?? [];
  if (ids.length === 0) throw new Error(`${key} must contain at least one ID.`);
  return {
    targetRoot: resolveRuntimeTargetRoot(
      readString(args, 'targetRoot'),
      context.options.deliveryTargetRoot,
    ),
    ids,
    ...(readString(args, 'gitBase') ? { gitBase: readString(args, 'gitBase')! } : {}),
    ...(readStringArray(args, 'excludePaths') ? { excludePaths: readStringArray(args, 'excludePaths')! } : {}),
    ...(readString(args, 'candidateOutputRoot') ? { candidateOutputRoot: readString(args, 'candidateOutputRoot')! } : {}),
  };
}

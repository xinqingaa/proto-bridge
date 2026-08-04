import {
  resolveTargetComponents,
  resolveTargetTokens,
  type ResolveTargetMappingsInput,
} from '@proto-bridge/core/target';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import type { JsonObject } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';

export async function resolveTargetComponentsTool(args: JsonObject): Promise<unknown> {
  return resolveTargetComponents(resolveInput(args, 'componentIds'));
}

export async function resolveTargetTokensTool(args: JsonObject): Promise<unknown> {
  return resolveTargetTokens(resolveInput(args, 'tokenIds'));
}

function resolveInput(args: JsonObject, key: 'componentIds' | 'tokenIds'): ResolveTargetMappingsInput {
  const ids = readStringArray(args, key) ?? [];
  if (ids.length === 0) throw new Error(`${key} must contain at least one ID.`);
  return {
    targetRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot')),
    ids,
    ...(readString(args, 'gitBase') ? { gitBase: readString(args, 'gitBase')! } : {}),
    ...(readStringArray(args, 'excludePaths') ? { excludePaths: readStringArray(args, 'excludePaths')! } : {}),
    ...(readString(args, 'candidateOutputRoot') ? { candidateOutputRoot: readString(args, 'candidateOutputRoot')! } : {}),
  };
}

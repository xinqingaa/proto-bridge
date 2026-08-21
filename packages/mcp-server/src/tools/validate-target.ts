import { validateTargetChanges } from '@proto-bridge/core/target';
import type { ValidateTargetChangesInput } from '@proto-bridge/core/target';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function validateTargetChangesTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const input: ValidateTargetChangesInput = {
    targetRoot: resolveRuntimeTargetRoot(
      readString(args, 'targetRoot'),
      context.options.deliveryTargetRoot,
    ),
    ...(readString(args, 'gitBase')
      ? { gitBase: readString(args, 'gitBase')! }
      : {}),
    ...(readStringArray(args, 'allowedPaths')
      ? { allowedPaths: readStringArray(args, 'allowedPaths')! }
      : {}),
    ...(readStringArray(args, 'expectedFiles')
      ? { expectedFiles: readStringArray(args, 'expectedFiles')! }
      : {}),
    ...(Array.isArray(args.resolvedMappings)
      ? {
          resolvedMappings: args.resolvedMappings.filter(
            (item): item is {
              id: string;
              kind: 'component' | 'token';
              symbol?: string;
              accessor?: string;
              importPath?: string;
            } =>
              item !== null &&
              typeof item === 'object' &&
              !Array.isArray(item) &&
              typeof item.id === 'string' &&
              (item.kind === 'component' || item.kind === 'token'),
          ),
        }
      : {}),
  };
  return validateTargetChanges(input);
}

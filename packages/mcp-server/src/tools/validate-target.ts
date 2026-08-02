import { validateTargetChanges } from '@proto-bridge/core/target';
import type { ValidateTargetChangesInput } from '@proto-bridge/core/target';
import type { JsonObject } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export async function validateTargetChangesTool(args: JsonObject): Promise<unknown> {
  const input: ValidateTargetChangesInput = {
    targetRoot: resolveRuntimeTargetRoot(readString(args, 'targetRoot')),
    ...(readString(args, 'gitBase')
      ? { gitBase: readString(args, 'gitBase')! }
      : {}),
    ...(readStringArray(args, 'allowedPaths')
      ? { allowedPaths: readStringArray(args, 'allowedPaths')! }
      : {}),
    ...(readStringArray(args, 'expectedFiles')
      ? { expectedFiles: readStringArray(args, 'expectedFiles')! }
      : {}),
  };
  return validateTargetChanges(input);
}

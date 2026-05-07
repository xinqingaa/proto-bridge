import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { loadConfig, resolveProjectRoot } from '../services/config.js';
import {
  buildValidationResult,
  collectChangedFiles,
  defaultAllowedPaths,
  scanChangedDartFiles,
} from '../services/git.js';

export async function validateTargetChangesTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const resolved = await loadConfig(context.options, readString(args, 'config'));
  const targetRoot = resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root');
  const runId = readString(args, 'runId');
  const run = runId ? context.runs.require(runId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? defaultAllowedPaths(run);
  const changedFiles = await collectChangedFiles(targetRoot, readString(args, 'gitBase'));
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanChangedDartFiles(targetRoot, dartFiles);
  return buildValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths,
    fileIssues,
    run,
  });
}

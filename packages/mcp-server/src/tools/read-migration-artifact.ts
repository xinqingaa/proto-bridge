import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { JsonObject, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';

export async function readMigrationArtifactTool(context: ToolContext, args: JsonObject): Promise<string> {
  const directPath = readString(args, 'path');
  if (directPath) return readFile(path.resolve(directPath), 'utf8');

  const runId = readString(args, 'runId');
  const artifact = readString(args, 'artifact') ?? 'spec';
  if (!runId) throw new Error('read_migration_artifact requires runId or path.');
  const run = context.runs.require(runId);
  const filePath = artifact === 'context' ? run.result.files.migrationContext : run.result.files.migrationSpec;
  return readFile(filePath, 'utf8');
}

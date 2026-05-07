import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { JsonObject, MigrationContext, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { buildMigrationBrief } from '../services/brief.js';

export async function getMigrationBriefTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  return buildMigrationBrief(await contextFromArgs(context, args));
}

export async function contextFromArgs(context: ToolContext, args: JsonObject): Promise<MigrationContext> {
  const runId = readString(args, 'runId');
  if (runId) return context.runs.require(runId).result.context;
  const contextPath = readString(args, 'contextPath');
  if (!contextPath) throw new Error('Provide runId or contextPath.');
  return JSON.parse(await readFile(path.resolve(contextPath), 'utf8')) as MigrationContext;
}

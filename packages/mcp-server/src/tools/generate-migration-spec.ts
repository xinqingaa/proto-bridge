import {
  generateMigrationSpec,
} from '@proto-bridge/core';
import type { GenerateMigrationSpecInput } from '@proto-bridge/core';
import type { GeneratedRun, JsonObject, ToolContext } from '../types.js';
import { readBoolean, readString } from '../utils/args.js';
import { buildMigrationBrief } from '../services/brief.js';
import { loadConfig, resolveProjectRoot } from '../services/config.js';
import { resolveOutputDir, resolvePageInput } from '../services/page-input.js';
import { createRunId } from '../services/runs.js';

export async function generateMigrationSpecTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const run = await generateRun(context, args);
  return buildRunSummary(run);
}

async function generateRun(context: ToolContext, args: JsonObject): Promise<GeneratedRun> {
  const resolved = await loadConfig(context.options, readString(args, 'config'));
  const pageInput = resolvePageInput(args, resolved.config);
  const outDir = resolveOutputDir(args, resolved, pageInput);
  const capture = readBoolean(args, 'capture') ?? resolved.config.capture ?? false;
  const prototypeUrl = readString(args, 'prototypeUrl') ?? pageInput.url ?? resolved.config.prototypeUrl ?? resolved.config.url;
  const input: GenerateMigrationSpecInput = {
    source: {
      adapter: resolved.config.source?.adapter ?? 'vue3-prototype',
      root: resolveProjectRoot(resolved, resolved.config.source?.root, 'source.root'),
    },
    target: {
      adapter: resolved.config.target?.adapter ?? 'flutter-app',
      root: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    },
    route: pageInput.route,
    vue: pageInput.vue,
    prototypeUrl,
    outDir,
    capture,
  };
  const result = await generateMigrationSpec(input);
  const run = {
    id: createRunId(result.context),
    createdAt: new Date().toISOString(),
    configPath: resolved.configPath,
    result,
  };
  context.runs.add(run);
  return run;
}

function buildRunSummary(run: GeneratedRun): JsonObject {
  return {
    runId: run.id,
    createdAt: run.createdAt,
    files: run.result.files as unknown as JsonObject,
    resourceUris: {
      spec: `proto-bridge://runs/${run.id}/spec`,
      context: `proto-bridge://runs/${run.id}/context`,
    },
    brief: buildMigrationBrief(run.result.context),
  };
}

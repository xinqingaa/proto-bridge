import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolJson, toolText } from '../server/responses.js';
import { generateMigrationSpecTool } from './generate-migration-spec.js';
import { getMigrationBriefTool } from './get-migration-brief.js';
import { readMigrationArtifactTool } from './read-migration-artifact.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target-changes.js';

export function toolsList(): JsonValue[] {
  return [
    {
      name: 'generate_migration_spec',
      description: 'Generate ProtoBridge migration context/spec from a prototype URL, route, or Vue file.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string', description: 'Path to proto-bridge.config.json. Defaults to server --config or ./proto-bridge.config.json.' },
          url: { type: 'string', description: 'Prototype URL. Hash routes are extracted automatically.' },
          route: { type: 'string', description: 'Prototype route, for example /prototype/etf-detail.' },
          vue: { type: 'string', description: 'Vue SFC path, absolute or relative to source.root.' },
          output: { type: 'string', description: 'Override output directory for this run.' },
          outputRoot: { type: 'string', description: 'Override output root used to derive page output directory.' },
          prototypeUrl: { type: 'string', description: 'Runtime URL for capture.' },
          capture: { type: 'boolean', description: 'Run Playwright capture.' },
        },
      },
    },
    {
      name: 'get_migration_brief',
      description: 'Return an agent-friendly brief from a generated run or migration-context.json.',
      inputSchema: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          contextPath: { type: 'string' },
        },
      },
    },
    {
      name: 'read_migration_artifact',
      description: 'Read the generated migration spec or context for a run.',
      inputSchema: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          artifact: { type: 'string', enum: ['spec', 'context'] },
          path: { type: 'string', description: 'Direct file path fallback.' },
        },
      },
    },
    {
      name: 'get_target_conventions',
      description: 'Read YouFi Flutter target conventions, common components, routes, i18n, assets, and theme usage.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          module: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'find_target_examples',
      description: 'Find similar YouFi Flutter examples and snippets by module, page pattern, roles, and symbols.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          module: { type: 'string' },
          pattern: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
          screenId: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'validate_target_changes',
      description: 'Inspect target git changes for scope, obvious placeholder UI, TODOs, and ProtoBridge checklist alignment.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          runId: { type: 'string' },
          gitBase: { type: 'string', description: 'Optional git base ref for diff --name-only.' },
          allowedPaths: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ];
}

export async function callTool(context: ToolContext, params: JsonObject | undefined): Promise<JsonObject> {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (!name) throw new Error('tools/call requires params.name');

  if (name === 'generate_migration_spec') return toolJson(await generateMigrationSpecTool(context, args));
  if (name === 'get_migration_brief') return toolJson(await getMigrationBriefTool(context, args));
  if (name === 'read_migration_artifact') return toolText(await readMigrationArtifactTool(context, args));
  if (name === 'get_target_conventions') return toolJson(await getTargetConventionsTool(context, args));
  if (name === 'find_target_examples') return toolJson(await findTargetExamplesTool(context, args));
  if (name === 'validate_target_changes') return toolJson(await validateTargetChangesTool(context, args));

  throw new Error(`Unknown tool: ${name}`);
}

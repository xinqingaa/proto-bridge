import { readFile } from 'node:fs/promises';
import { getFlutterTargetConventions } from '@proto-bridge/core';
import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { loadConfig, resolveProjectRoot } from '../services/config.js';

export function resourcesList(context: ToolContext): JsonValue[] {
  const runResources = context.runs.values().flatMap((run) => [
    {
      uri: `proto-bridge://runs/${run.id}/spec`,
      name: `ProtoBridge migration spec ${run.id}`,
      mimeType: 'text/markdown',
    },
    {
      uri: `proto-bridge://runs/${run.id}/context`,
      name: `ProtoBridge migration context ${run.id}`,
      mimeType: 'application/json',
    },
  ]);
  return [
    {
      uri: 'proto-bridge://target/conventions',
      name: 'ProtoBridge target conventions',
      mimeType: 'application/json',
    },
    ...runResources,
  ];
}

export async function readResource(context: ToolContext, params: JsonObject | undefined): Promise<JsonObject> {
  const uri = readString(params, 'uri');
  if (!uri) throw new Error('resources/read requires params.uri');

  if (uri === 'proto-bridge://target/conventions') {
    const resolved = await loadConfig(context.options, undefined);
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    });
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(conventions, null, 2) }],
    };
  }

  const match = uri.match(/^proto-bridge:\/\/runs\/([^/]+)\/(spec|context)$/);
  if (!match?.[1] || !match[2]) throw new Error(`Unknown resource uri: ${uri}`);
  const run = context.runs.require(match[1]);
  const filePath = match[2] === 'spec' ? run.result.files.migrationSpec : run.result.files.migrationContext;
  const mimeType = match[2] === 'spec' ? 'text/markdown' : 'application/json';
  return {
    contents: [{ uri, mimeType, text: await readFile(filePath, 'utf8') }],
  };
}

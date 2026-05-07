import { readFile } from 'node:fs/promises';
import { getFlutterTargetConventions } from '@proto-bridge/core';
import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export function resourcesList(context: ToolContext): JsonValue[] {
  const snapshotResources = context.snapshots.values().map((snapshot) => ({
    uri: `proto-bridge://snapshots/${snapshot.id}/page-snapshot`,
    name: `ProtoBridge page snapshot ${snapshot.id}`,
    mimeType: 'application/json',
  }));
  const planResources = context.plans.values().map((plan) => ({
    uri: `proto-bridge://plans/${plan.id}/ui-implementation-plan`,
    name: `ProtoBridge UI implementation plan ${plan.id}`,
    mimeType: 'application/json',
  }));
  return [
    {
      uri: 'proto-bridge://target/conventions',
      name: 'ProtoBridge target conventions',
      mimeType: 'application/json',
    },
    ...snapshotResources,
    ...planResources,
  ];
}

export async function readResource(context: ToolContext, params: JsonObject | undefined): Promise<JsonObject> {
  const uri = readString(params, 'uri');
  if (!uri) throw new Error('resources/read requires params.uri');

  if (uri === 'proto-bridge://target/conventions') {
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveRuntimeTargetRoot(undefined),
    });
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(conventions, null, 2) }],
    };
  }

  const snapshotMatch = uri.match(/^proto-bridge:\/\/snapshots\/([^/]+)\/page-snapshot$/);
  if (snapshotMatch?.[1]) {
    const snapshot = context.snapshots.require(snapshotMatch[1]);
    return {
      contents: [{ uri, mimeType: 'application/json', text: await readFile(snapshot.result.files.pageSnapshot, 'utf8') }],
    };
  }

  const planMatch = uri.match(/^proto-bridge:\/\/plans\/([^/]+)\/ui-implementation-plan$/);
  if (!planMatch?.[1]) throw new Error(`Unknown resource uri: ${uri}`);
  const plan = context.plans.require(planMatch[1]);
  return {
    contents: [{ uri, mimeType: 'application/json', text: await readFile(plan.result.files.uiImplementationPlan, 'utf8') }],
  };
}

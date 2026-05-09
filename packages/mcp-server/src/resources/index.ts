import { readFile } from 'node:fs/promises';
import { getFlutterTargetConventions } from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';

export function resourcesList(context: ToolContext): JsonValue[] {
  const evidenceResources = context.evidences.values().map((evidence) => ({
    uri: `proto-bridge://evidences/${evidence.id}/page-evidence`,
    name: `ProtoBridge page evidence ${evidence.id}`,
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
    ...evidenceResources,
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

  const evidenceMatch = uri.match(/^proto-bridge:\/\/evidences\/([^/]+)\/page-evidence$/);
  if (evidenceMatch?.[1]) {
    const evidence = context.evidences.require(evidenceMatch[1]);
    return {
      contents: [{ uri, mimeType: 'application/json', text: await readFile(evidence.result.files.pageEvidence, 'utf8') }],
    };
  }

  const planMatch = uri.match(/^proto-bridge:\/\/plans\/([^/]+)\/ui-implementation-plan$/);
  if (!planMatch?.[1]) throw new Error(`Unknown resource uri: ${uri}`);
  const plan = context.plans.require(planMatch[1]);
  return {
    contents: [{ uri, mimeType: 'application/json', text: await readFile(plan.result.files.uiImplementationPlan, 'utf8') }],
  };
}

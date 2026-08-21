import {
  analyzeTargetReadiness,
  detectTargetAdapter,
  inspectTargetAuthority,
  resolveTargetComponents,
  resolveTargetTokens,
} from '@proto-bridge/core/target';
import {
  buildScreenPacket,
  compileReconstructionObligations,
  V2ContractError,
} from '@proto-bridge/core/v2';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';

export async function inspectTargetReadinessTool(
  context: ToolContext,
  args: JsonObject,
): Promise<unknown> {
  const handoffId = required(args, 'handoffId');
  const targetRoot = resolveRuntimeTargetRoot(
    readString(args, 'targetRoot'),
    context.options.deliveryTargetRoot,
  );
  const input = await context.evidence.readConsumerProjectionInput(handoffId);
  const requestedScreenId = readString(args, 'screenId');
  const availableScreenIds = input.evidence.screens.map((screen) => screen.screenId);
  const screenIds = requestedScreenId ? [requestedScreenId] : availableScreenIds;
  if (requestedScreenId && !availableScreenIds.includes(requestedScreenId)) {
    throw new V2ContractError('unknown-reference', `Screen ${requestedScreenId} is not in Handoff ${handoffId}.`);
  }
  const packets = screenIds.map((screenId) => buildScreenPacket(input, screenId));
  const componentIds = unique(packets.flatMap((packet) => packet.implementationInventory.resolverInput.componentIds));
  const tokenIds = unique(packets.flatMap((packet) => packet.implementationInventory.resolverInput.tokenIds));
  const options = {
    targetRoot,
    ...(readString(args, 'gitBase') ? { gitBase: readString(args, 'gitBase')! } : {}),
    ...(readStringArray(args, 'excludePaths') ? { excludePaths: readStringArray(args, 'excludePaths')! } : {}),
    ...(readString(args, 'candidateOutputRoot') ? { candidateOutputRoot: readString(args, 'candidateOutputRoot')! } : {}),
  };
  const [detection, components, tokens, authority] = await Promise.all([
    detectTargetAdapter(targetRoot),
    resolveTargetComponents({ ...options, ids: componentIds }),
    resolveTargetTokens({ ...options, ids: tokenIds }),
    inspectTargetAuthority(options),
  ]);
  const revisionKeys = [components.targetRevisionKey, tokens.targetRevisionKey, authority.targetRevisionKey];
  if (revisionKeys.some((item) =>
    item.contentDigest !== revisionKeys[0]?.contentDigest
    || item.currentRevision !== revisionKeys[0]?.currentRevision
  )) {
    throw new V2ContractError('unknown-reference', 'Target content changed while readiness was being inspected.');
  }
  const obligations = compileReconstructionObligations(input.acceptance)
    .filter((item) => screenIds.includes(item.screenId));
  const report = analyzeTargetReadiness({
    adapter: {
      id: detection.adapterId,
      supported: authority.supported,
      confidence: detection.confidence,
      reason: detection.reason,
    },
    targetRevisionKey: authority.targetRevisionKey,
    components,
    tokens,
    authorities: authority.authorities,
    requiredDimensions: unique(obligations.map((item) => item.dimension)),
    requiredCaseIds: unique(packets.flatMap((packet) => packet.cases.map((item) => item.caseId))),
    requiredScenarioIds: unique(packets.flatMap((packet) => packet.scenarioMap.map((item) => item.scenarioId))),
    ...(authority.declaredCaseIds ? { declaredCaseIds: authority.declaredCaseIds } : {}),
    ...(authority.declaredScenarioIds ? { declaredScenarioIds: authority.declaredScenarioIds } : {}),
    warnings: authority.warnings,
  });
  return {
    handoffId,
    screenIds,
    inventory: { componentIds, tokenIds },
    ...report,
  };
}

function required(args: JsonObject, key: string): string {
  const value = readString(args, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

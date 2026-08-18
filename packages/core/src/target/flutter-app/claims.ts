import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReconstructionObligation } from '../../review/obligations.js';
import type {
  ReviewVerifierResult,
  TargetScenarioTransition,
  TargetStateSnapshot,
} from '../../review/contracts.js';
import {
  compareStructureIR,
  type StructureIR,
} from '../../v2/consumer-projection.js';
import type {
  TargetImplementationClaim,
  TargetOccurrenceLocator,
  VerifyTargetClaimsInput,
} from '../claims.js';
import {
  resolveFlutterTargetComponents,
  resolveFlutterTargetTokens,
} from './resolver.js';

export async function verifyFlutterTargetClaims(
  input: VerifyTargetClaimsInput,
): Promise<ReviewVerifierResult[]> {
  for (const claim of input.claims) {
    if (claim.dimension === 'components' || claim.dimension === 'tokens') {
      assertFlutterOccurrenceLocator(claim.occurrence);
    }
  }
  const obligationById = new Map(input.obligations.map((item) => [item.obligationId, item]));
  const componentClaims = input.claims.filter((item): item is Extract<TargetImplementationClaim, { dimension: 'components' }> => item.dimension === 'components');
  const tokenClaims = input.claims.filter((item): item is Extract<TargetImplementationClaim, { dimension: 'tokens' }> => item.dimension === 'tokens');
  const componentIds = componentClaims.flatMap((claim) => expectedString(obligationById.get(claim.obligationId), 'componentId'));
  const tokenIds = tokenClaims.flatMap((claim) => expectedString(obligationById.get(claim.obligationId), 'tokenId'));
  const [components, tokens] = await Promise.all([
    resolveFlutterTargetComponents({ targetRoot: input.targetRoot, ids: componentIds }),
    resolveFlutterTargetTokens({ targetRoot: input.targetRoot, ids: tokenIds }),
  ]);
  const componentById = new Map(components.resolutions.map((item) => [item.id, item]));
  const tokenById = new Map(tokens.resolutions.map((item) => [item.id, item]));
  const structureByCase = new Map((input.runtimeStructures ?? []).map((item) => [item.caseId, item]));
  const expectedStructureByCase = new Map(input.expectedStructures.map((item) => [item.caseId, item.structure]));
  const stateByCase = new Map((input.runtimeStates ?? []).map((item) => [item.caseId, item]));
  const transitionByCase = new Map((input.runtimeTransitions ?? []).map((item) => [item.caseId, item]));
  const results: ReviewVerifierResult[] = [];

  for (const claim of input.claims) {
    const obligation = obligationById.get(claim.obligationId)!;
    if (claim.dimension === 'structure') {
      results.push(structureResult(claim, obligation, expectedStructureByCase.get(claim.caseId), structureByCase.get(claim.caseId)));
      continue;
    }
    if (claim.dimension === 'components') {
      const componentId = expectedString(obligation, 'componentId')[0];
      const resolution = componentId ? componentById.get(componentId) : undefined;
      if (!componentId || resolution?.status !== 'resolved') {
        results.push(result(claim, 'unverified', `Component mapping ${componentId ?? '<missing>'} is not resolved at the fixed Target revision.`));
        continue;
      }
      if (!resolution.candidates.some((item) => item.symbol === claim.symbol)) {
        results.push(result(claim, 'deviation', `Claimed symbol ${claim.symbol} does not match the resolved component mapping ${componentId}.`));
        continue;
      }
      results.push(await verifyComponentOccurrence(input.targetRoot, claim));
      continue;
    }
    if (claim.dimension === 'states') {
      results.push(stateResult(claim, obligation, stateByCase.get(claim.caseId)));
      continue;
    }
    if (claim.dimension === 'interactions') {
      results.push(interactionResult(claim, obligation, transitionByCase.get(claim.caseId)));
      continue;
    }
    const tokenId = expectedString(obligation, 'tokenId')[0];
    const resolution = tokenId ? tokenById.get(tokenId) : undefined;
    if (!tokenId || resolution?.status !== 'resolved') {
      results.push(result(claim, 'unverified', `Token mapping ${tokenId ?? '<missing>'} is not resolved at the fixed Target revision.`));
      continue;
    }
    if (!resolution.candidates.some((item) => item.accessor === claim.accessor)) {
      results.push(result(claim, 'deviation', `Claimed accessor ${claim.accessor} does not match the resolved token mapping ${tokenId}.`));
      continue;
    }
    results.push(await verifyTokenOccurrence(input.targetRoot, claim));
  }
  return results;
}

function stateResult(
  claim: Extract<TargetImplementationClaim, { dimension: 'states' }>,
  obligation: ReconstructionObligation,
  actual: TargetStateSnapshot | undefined,
): ReviewVerifierResult {
  if (obligation.kind !== 'keyed-state-snapshot') return result(claim, 'unverified', `State obligation kind ${obligation.kind} has no typed verifier.`);
  if (!actual) return result(claim, 'unverified', 'State requires a Flutter MCP Runtime observation receipt from the fixed App session.');
  const expected = objectValue(obligation.expected);
  if (!expected) return result(claim, 'unverified', 'Source State snapshot is not an object.');
  if (expected.semanticCoverage !== 'declared') return result(claim, 'unverified', `Source State semantic coverage is ${String(expected.semanticCoverage)}.`);
  if (!actual.complete || actual.unknownKeys.length > 0) {
    return semanticResult(claim, 'unverified', `Target State snapshot is incomplete; unknown keys: ${actual.unknownKeys.join(', ') || '<unspecified>'}.`, { stateProof: actual });
  }
  const mismatches = compareStateSnapshot(expected, actual);
  return semanticResult(
    claim,
    mismatches.some((item) => item.startsWith('source-')) ? 'unverified' : mismatches.length ? 'deviation' : 'matched',
    mismatches.length ? `Target State differs: ${mismatches.join(', ')}.` : 'Target State matches shell, visible Regions, keyed collections and declared values.',
    { stateProof: actual },
  );
}

function interactionResult(
  claim: Extract<TargetImplementationClaim, { dimension: 'interactions' }>,
  obligation: ReconstructionObligation,
  transition: TargetScenarioTransition | undefined,
): ReviewVerifierResult {
  if (!transition) return result(claim, 'unverified', 'Interaction requires a Flutter MCP Scenario receipt from the fixed App session.');
  const expected = objectValue(obligation.expected);
  if (!expected) return result(claim, 'unverified', 'Source Interaction expectation is not an object.');
  if (!transition.preState.complete || !transition.postState.complete || transition.preState.unknownKeys.length > 0 || transition.postState.unknownKeys.length > 0) {
    return semanticResult(claim, 'unverified', 'Target Scenario pre-state or post-state is incomplete.', { transitionProof: transition });
  }
  const mismatches = obligation.kind === 'action'
    ? compareAction(expected, transition, obligation)
    : obligation.kind === 'scenario-checkpoint'
      ? compareTransition(expected, transition, obligation)
      : [`unsupported-kind:${obligation.kind}`];
  if (mismatches.some((item) => item.startsWith('unsupported-kind:'))) return result(claim, 'unverified', `Interaction obligation kind ${obligation.kind} has no typed verifier.`);
  return semanticResult(
    claim,
    mismatches.some((item) => item.startsWith('source-')) ? 'unverified' : mismatches.length ? 'deviation' : 'matched',
    mismatches.length ? `Target Interaction differs: ${mismatches.join(', ')}.` : 'Target Interaction matches required pre-state, actions, post-state and visible result.',
    { transitionProof: transition },
  );
}

function structureResult(
  claim: Extract<TargetImplementationClaim, { dimension: 'structure' }>,
  obligation: ReconstructionObligation,
  expectedStructure: StructureIR | undefined,
  actualStructure: StructureIR | undefined,
): ReviewVerifierResult {
  if (obligation.kind !== 'semantic-region-topology') return result(claim, 'unverified', `Structure obligation kind ${obligation.kind} has no Target IR verifier.`);
  if (!actualStructure || !expectedStructure) return result(claim, 'unverified', 'Structure requires a Flutter MCP Runtime Structure receipt from the fixed App session.');
  const expected = objectValue(obligation.expected);
  if (!expected) return result(claim, 'unverified', 'Structure obligation expected value is not an object.');
  const expectedRegion = expectedStructure.regions.find((item) => item.regionId === obligation.subject);
  if (!expectedRegion) return result(claim, 'unverified', `Source Structure IR is missing Region ${obligation.subject}.`);
  if (expectedRegion.unknownFields.length > 0) return result(claim, 'unverified', `Source Structure Region ${obligation.subject} has unknown fields: ${expectedRegion.unknownFields.join(', ')}.`);
  const actualRegion = actualStructure.regions.find((item) => item.regionId === obligation.subject);
  if (!actualRegion) return result(claim, 'deviation', `Target Structure IR is missing Region ${obligation.subject}.`);
  if (actualRegion.unknownFields.length > 0) return result(claim, 'unverified', `Target Structure Region ${obligation.subject} has unknown fields: ${actualRegion.unknownFields.join(', ')}.`);
  const mismatches = compareStructureIRForSubject(obligation.subject, expectedStructure, actualStructure, expected);
  return mismatches.length
    ? result(claim, 'deviation', `Target Structure Region ${obligation.subject} differs: ${mismatches.join(', ')}.`)
    : result(claim, 'matched', `Target Structure Region ${obligation.subject} matches parent, scroll owner, positioning, order and bbox relations.`);
}

function compareStateSnapshot(expected: Record<string, unknown>, actual: TargetStateSnapshot): string[] {
  const mismatches: string[] = [];
  const shell = objectValue(expected.shell);
  if (typeof shell?.screenId !== 'string' || typeof shell.variantId !== 'string') return ['source-shell-unknown'];
  if (shell.screenId !== actual.shell.screenId) mismatches.push('shell.screenId');
  if (shell.variantId !== actual.shell.variantId) mismatches.push('shell.variantId');
  const expectedVisible = stringArray(expected.visibleRegionIds);
  if (!expectedVisible || !sameStringSet(expectedVisible, actual.visibleRegionIds)) mismatches.push('visibleRegionIds');
  const expectedCollections = collectionMap(expected.keyedCollections);
  if (!expectedCollections) mismatches.push('keyedCollections.source-unknown');
  else {
    const actualCollections = new Map(actual.keyedCollections.map((item) => [item.collectionId, [...item.keys].sort()]));
    for (const [collectionId, keys] of expectedCollections) if (!sameStringArray(keys, actualCollections.get(collectionId) ?? [])) mismatches.push(`collection:${collectionId}`);
  }
  const actualValues = new Map(actual.values.map((item) => [`${item.regionId}\0${item.key}`, item.value]));
  for (const value of Array.isArray(expected.values) ? expected.values : []) {
    const item = objectValue(value);
    if (typeof item?.regionId !== 'string' || typeof item.key !== 'string' || !isStateScalar(item.value)) mismatches.push('state-values.source-unknown');
    else if (actualValues.get(`${item.regionId}\0${item.key}`) !== item.value) mismatches.push(`value:${item.regionId}.${item.key}`);
  }
  return [...new Set(mismatches)];
}

function compareAction(expected: Record<string, unknown>, transition: TargetScenarioTransition, obligation: ReconstructionObligation): string[] {
  const prefix = `${obligation.screenId}.action.`;
  const actionId = typeof expected.actionId === 'string' ? expected.actionId : obligation.subject.startsWith(prefix) ? obligation.subject.slice(prefix.length) : undefined;
  const expectedKind = typeof expected.kind === 'string' ? expected.kind : undefined;
  const expectedTarget = fragmentRegionId(expected.target);
  if (!actionId || !expectedKind || !expectedTarget) return ['source-action-unknown'];
  const actual = transition.actions.find((item) => item.actionId === actionId);
  if (!actual) return [`action-not-executed:${actionId}`];
  return [...(actual.kind !== expectedKind ? [`action-kind:${actionId}`] : []), ...(actual.targetRegionId !== expectedTarget ? [`action-target:${actionId}`] : [])];
}

function compareTransition(expected: Record<string, unknown>, transition: TargetScenarioTransition, obligation: ReconstructionObligation): string[] {
  const mismatches: string[] = [];
  const checkpoint = objectValue(expected.checkpoint);
  if (!checkpoint) return ['source-checkpoint-unknown'];
  const scenarioPrefix = `${obligation.screenId}.scenario.`;
  const checkpointId = typeof checkpoint.checkpointId === 'string' ? checkpoint.checkpointId : undefined;
  const scenarioId = typeof expected.scenarioId === 'string' ? expected.scenarioId : checkpointId && obligation.subject.startsWith(scenarioPrefix) && obligation.subject.endsWith(`.${checkpointId}`) ? obligation.subject.slice(scenarioPrefix.length, -(checkpointId.length + 1)) : undefined;
  if (!scenarioId || scenarioId !== transition.scenarioId) mismatches.push('scenarioId');
  if (typeof expected.ownerScreenId === 'string' && expected.ownerScreenId !== transition.screenId) mismatches.push('screenId');
  if (typeof expected.initialVariantId !== 'string' || expected.initialVariantId !== transition.preState.shell.variantId) mismatches.push('preState.variantId');
  if (typeof checkpoint.checkpointId !== 'string' || checkpoint.checkpointId !== transition.checkpointId) mismatches.push('checkpointId');
  if (typeof checkpoint.screenId !== 'string' || checkpoint.screenId !== transition.postState.shell.screenId) mismatches.push('postState.screenId');
  if (typeof checkpoint.variantId !== 'string' || checkpoint.variantId !== transition.postState.shell.variantId) mismatches.push('postState.variantId');
  const actionIds = stringArray(expected.actionIds);
  if (!actionIds || !sameStringArray(actionIds, transition.actions.map((item) => item.actionId))) mismatches.push('actions');
  for (const required of Array.isArray(checkpoint.requiredFragments) ? checkpoint.requiredFragments : []) {
    const regionId = fragmentRegionId(required);
    if (!regionId || !transition.postState.visibleRegionIds.includes(regionId)) mismatches.push(`required-visible:${regionId ?? '<unknown>'}`);
  }
  for (const forbidden of Array.isArray(checkpoint.forbiddenFragments) ? checkpoint.forbiddenFragments : []) {
    const regionId = fragmentRegionId(forbidden);
    if (!regionId || transition.postState.visibleRegionIds.includes(regionId)) mismatches.push(`forbidden-visible:${regionId ?? '<unknown>'}`);
  }
  const postExpected: Record<string, unknown> = {
    shell: { screenId: checkpoint.screenId, variantId: checkpoint.variantId },
    visibleRegionIds: transition.postState.visibleRegionIds,
    keyedCollections: Array.isArray(checkpoint.expectedFragmentKeys) ? checkpoint.expectedFragmentKeys.map((value) => { const item = objectValue(value); return { collectionId: fragmentRegionId(item?.fragment), keys: item?.keys }; }) : [],
    values: Array.isArray(checkpoint.expectedStates) ? checkpoint.expectedStates.map((value) => { const item = objectValue(value); return { regionId: fragmentRegionId(item?.fragment), key: item?.key, value: item?.value }; }) : [],
  };
  mismatches.push(...compareStateSnapshot(postExpected, transition.postState).filter((item) => !item.startsWith('visibleRegionIds')));
  if (!sameStringSet(transition.visibleResult.visibleRegionIds, transition.postState.visibleRegionIds)) mismatches.push('visibleResult');
  return [...new Set(mismatches)];
}

function compareStructureIRForSubject(subject: string, expected: StructureIR, actual: StructureIR, expectedValue: Record<string, unknown>): string[] {
  const region = actual.regions.find((item) => item.regionId === subject);
  if (!region) return ['missing-region'];
  const mismatches: string[] = [];
  const expectedParent = fragmentRegionId(expectedValue.semanticParent);
  if ((expectedParent ?? undefined) !== region.parentRegionId) mismatches.push('parent');
  const expectedAncestors = Array.isArray(expectedValue.semanticAncestors) ? expectedValue.semanticAncestors.flatMap((item) => fragmentRegionId(item) ?? []) : undefined;
  if (expectedAncestors && JSON.stringify(expectedAncestors) !== JSON.stringify(region.ancestorRegionIds)) mismatches.push('ancestors');
  const expectedScroll = expectedScrollOwner(expectedValue.scrollOwner);
  if (expectedScroll && JSON.stringify(expectedScroll) !== JSON.stringify(region.scrollOwner)) mismatches.push('scroll-owner');
  if (typeof expectedValue.positioning === 'string' && expectedValue.positioning !== region.positioning) mismatches.push('positioning');
  if (typeof expectedValue.documentOrder === 'number' && expectedValue.documentOrder !== region.documentOrder) mismatches.push('document-order');
  if (typeof expectedValue.role === 'string' && expectedValue.role !== region.role) mismatches.push('role');
  if (typeof expectedValue.visible === 'boolean' && expectedValue.visible !== region.visible) mismatches.push('visible');
  for (const mismatch of compareStructureIR(expected, actual)) if (mismatch.regionId === subject || JSON.stringify(mismatch.expected).includes(subject) || JSON.stringify(mismatch.actual).includes(subject)) mismatches.push(mismatch.kind);
  return [...new Set(mismatches)];
}

function collectionMap(value: unknown): Map<string, string[]> | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = new Map<string, string[]>();
  for (const entry of value) {
    const item = objectValue(entry);
    const keys = stringArray(item?.keys);
    if (typeof item?.collectionId !== 'string' || !keys) return undefined;
    result.set(item.collectionId, [...keys].sort());
  }
  return result;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value as string[] : undefined;
}

function sameStringSet(left: string[], right: string[]): boolean {
  return sameStringArray([...left].sort(), [...right].sort());
}

function sameStringArray(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isStateScalar(value: unknown): value is string | number | boolean | null {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

async function verifyComponentOccurrence(
  targetRoot: string,
  claim: Extract<TargetImplementationClaim, { dimension: 'components' }>,
): Promise<ReviewVerifierResult> {
  const source = await readOccurrenceSource(targetRoot, claim.occurrence);
  if ('error' in source) return result(claim, 'deviation', source.error);
  const invocation = invocationAt(source.text, source.masked, claim.symbol, claim.occurrence);
  if (!invocation) return result(claim, 'deviation', `No ${claim.symbol} constructor invocation starts at the claimed occurrence.`);
  if (claim.ownerSymbol || claim.targetSlot) {
    if (!claim.ownerSymbol || !claim.targetSlot) return result(claim, 'unverified', 'A component parent binding requires both ownerSymbol and targetSlot.');
    const owner = containingInvocation(source.masked, claim.ownerSymbol, invocation.start);
    const slot = owner ? namedArgument(source.masked, owner.open + 1, owner.close, claim.targetSlot) : undefined;
    if (!owner || !slot || invocation.start < slot.start || invocation.end > slot.end) {
      return result(claim, 'deviation', `${claim.symbol} is not used in ${claim.ownerSymbol}.${claim.targetSlot} at the claimed occurrence.`);
    }
  }
  return result(claim, 'matched', `Resolved component ${claim.symbol} is invoked at the claimed Dart occurrence and slot.`);
}

async function verifyTokenOccurrence(
  targetRoot: string,
  claim: Extract<TargetImplementationClaim, { dimension: 'tokens' }>,
): Promise<ReviewVerifierResult> {
  const source = await readOccurrenceSource(targetRoot, claim.occurrence);
  if ('error' in source) return result(claim, 'deviation', source.error);
  const owner = invocationAt(source.text, source.masked, claim.ownerSymbol, claim.occurrence);
  if (!owner) return result(claim, 'deviation', `No ${claim.ownerSymbol} constructor invocation starts at the claimed occurrence.`);
  const slot = namedArgument(source.masked, owner.open + 1, owner.close, claim.targetSlot);
  if (!slot) return result(claim, 'deviation', `${claim.ownerSymbol} has no ${claim.targetSlot} named argument at the claimed occurrence.`);
  const value = source.masked.slice(slot.start, slot.end);
  if (!accessorPattern(claim.accessor).test(value)) {
    return result(claim, 'deviation', `${claim.accessor} is not used in ${claim.ownerSymbol}.${claim.targetSlot} at the claimed occurrence.`);
  }
  return result(claim, 'matched', `Resolved token ${claim.accessor} is used in ${claim.ownerSymbol}.${claim.targetSlot} at the claimed Dart occurrence.`);
}

function assertFlutterOccurrenceLocator(locator: TargetOccurrenceLocator): void {
  const normalized = locator.path.split(path.sep).join('/');
  if (!normalized.startsWith('lib/') || !normalized.endsWith('.dart')) {
    throw new Error('Flutter Target occurrence must be a positive location inside lib/**/*.dart.');
  }
}

async function readOccurrenceSource(
  targetRoot: string,
  locator: TargetOccurrenceLocator,
): Promise<{ text: string; masked: string } | { error: string }> {
  const relative = locator.path.split(path.sep).join('/');
  if (!relative.startsWith('lib/') || !relative.endsWith('.dart')) {
    return { error: 'Flutter Target occurrence must be inside lib/**/*.dart.' };
  }
  const resolved = path.resolve(targetRoot, relative);
  if (!resolved.startsWith(`${path.resolve(targetRoot)}${path.sep}`)) return { error: 'Target occurrence escapes targetRoot.' };
  try {
    const text = await readFile(resolved, 'utf8');
    return { text, masked: maskDartNonCode(text) };
  } catch {
    return { error: `Target occurrence file ${relative} does not exist.` };
  }
}

type Invocation = { start: number; open: number; close: number; end: number };

function invocationAt(text: string, masked: string, symbol: string, locator: TargetOccurrenceLocator): Invocation | undefined {
  const lineStart = offsetForLine(text, locator.line);
  if (lineStart === undefined) return undefined;
  const lineEnd = text.indexOf('\n', lineStart) < 0 ? text.length : text.indexOf('\n', lineStart);
  const matches = [...masked.slice(lineStart, lineEnd).matchAll(new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`, 'g'))]
    .map((match) => lineStart + (match.index ?? 0));
  const starts = locator.column === undefined
    ? matches
    : matches.filter((item) => item === lineStart + locator.column! - 1);
  if (starts.length !== 1) return undefined;
  return invocationFromStart(masked, starts[0]!, symbol);
}

function containingInvocation(masked: string, symbol: string, childOffset: number): Invocation | undefined {
  const matches = [...masked.matchAll(new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`, 'g'))]
    .flatMap((match) => {
      const invocation = invocationFromStart(masked, match.index ?? 0, symbol);
      return invocation && invocation.start < childOffset && invocation.end > childOffset ? [invocation] : [];
    });
  return matches.sort((a, b) => (a.end - a.start) - (b.end - b.start))[0];
}

function invocationFromStart(masked: string, start: number, symbol: string): Invocation | undefined {
  const open = masked.indexOf('(', start + symbol.length);
  if (open < 0) return undefined;
  const close = matchingDelimiter(masked, open, '(', ')');
  return close === undefined ? undefined : { start, open, close, end: close + 1 };
}

function namedArgument(masked: string, start: number, end: number, name: string): { start: number; end: number } | undefined {
  let depth = 0;
  for (let index = start; index < end; index += 1) {
    const char = masked[index]!;
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) depth -= 1;
    if (depth !== 0 || !identifierAt(masked, index, name)) continue;
    let cursor = index + name.length;
    while (/\s/.test(masked[cursor] ?? '')) cursor += 1;
    if (masked[cursor] !== ':') continue;
    cursor += 1;
    while (/\s/.test(masked[cursor] ?? '')) cursor += 1;
    const valueStart = cursor;
    let valueDepth = 0;
    for (; cursor < end; cursor += 1) {
      const valueChar = masked[cursor]!;
      if ('([{'.includes(valueChar)) valueDepth += 1;
      else if (')]}'.includes(valueChar)) valueDepth -= 1;
      if (valueDepth === 0 && valueChar === ',') break;
    }
    return { start: valueStart, end: cursor };
  }
  return undefined;
}

function matchingDelimiter(text: string, start: number, open: string, close: string): number | undefined {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === open) depth += 1;
    else if (text[index] === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

function maskDartNonCode(text: string): string {
  const chars = [...text];
  let index = 0;
  while (index < chars.length) {
    if (chars[index] === '/' && chars[index + 1] === '/') {
      while (index < chars.length && chars[index] !== '\n') chars[index++] = ' ';
      continue;
    }
    if (chars[index] === '/' && chars[index + 1] === '*') {
      chars[index++] = ' '; chars[index++] = ' ';
      while (index < chars.length && !(chars[index] === '*' && chars[index + 1] === '/')) if (chars[index++] !== '\n') chars[index - 1] = ' ';
      if (index < chars.length) { chars[index++] = ' '; chars[index++] = ' '; }
      continue;
    }
    if (chars[index] === "'" || chars[index] === '"') {
      const quote = chars[index]!;
      const triple = chars[index + 1] === quote && chars[index + 2] === quote;
      const length = triple ? 3 : 1;
      for (let count = 0; count < length; count += 1) chars[index++] = ' ';
      while (index < chars.length) {
        if (chars[index] === '\\') {
          chars[index++] = ' ';
          if (index < chars.length && chars[index] !== '\n') chars[index++] = ' ';
          continue;
        }
        const closed = triple
          ? chars[index] === quote && chars[index + 1] === quote && chars[index + 2] === quote
          : chars[index] === quote;
        if (closed) {
          for (let count = 0; count < length; count += 1) chars[index++] = ' ';
          break;
        }
        if (chars[index++] !== '\n') chars[index - 1] = ' ';
      }
      continue;
    }
    index += 1;
  }
  return chars.join('');
}

function result(claim: TargetImplementationClaim, status: ReviewVerifierResult['status'], detail: string): ReviewVerifierResult {
  if (claim.dimension === 'structure' || claim.dimension === 'states' || claim.dimension === 'interactions') {
    return { obligationId: claim.obligationId, dimension: claim.dimension, status, detail };
  }
  return {
    obligationId: claim.obligationId,
    dimension: claim.dimension,
    status,
    detail,
    targetOccurrence: {
      ...claim.occurrence,
      ...(claim.dimension === 'components' ? { symbol: claim.symbol } : { accessor: claim.accessor }),
      ...('ownerSymbol' in claim && claim.ownerSymbol ? { ownerSymbol: claim.ownerSymbol } : {}),
      ...('targetSlot' in claim && claim.targetSlot ? { targetSlot: claim.targetSlot } : {}),
    },
  };
}

function semanticResult(
  claim: Extract<TargetImplementationClaim, { dimension: 'states' | 'interactions' }>,
  status: ReviewVerifierResult['status'],
  detail: string,
  proof: Pick<ReviewVerifierResult, 'stateProof' | 'transitionProof'>,
): ReviewVerifierResult {
  return { obligationId: claim.obligationId, dimension: claim.dimension, status, detail, ...proof };
}

function expectedString(obligation: ReconstructionObligation | undefined, key: string): string[] {
  const value = objectValue(obligation?.expected)?.[key];
  return typeof value === 'string' ? [value] : [];
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function fragmentRegionId(value: unknown): string | undefined {
  const object = objectValue(value);
  return typeof object?.pbId === 'string'
    ? `${object.pbId}${typeof object.pbKey === 'string' ? `.${object.pbKey}` : ''}`
    : undefined;
}

function expectedScrollOwner(value: unknown): StructureIR['regions'][number]['scrollOwner'] | undefined {
  if (value === 'viewport') return { kind: 'viewport' };
  const object = objectValue(value);
  if (object?.kind === 'viewport') return { kind: 'viewport' };
  if (object?.kind === 'fragment') {
    const regionId = fragmentRegionId(object.fragment);
    return regionId ? { kind: 'region', regionId } : undefined;
  }
  return undefined;
}

function offsetForLine(text: string, line: number): number | undefined {
  if (line === 1) return 0;
  let current = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n' && ++current === line) return index + 1;
  }
  return undefined;
}

function identifierAt(text: string, index: number, value: string): boolean {
  return text.slice(index, index + value.length) === value
    && !/[A-Za-z0-9_$]/.test(text[index - 1] ?? '')
    && !/[A-Za-z0-9_$]/.test(text[index + value.length] ?? '');
}

function accessorPattern(accessor: string): RegExp {
  return new RegExp(`\\b${accessor.split('.').map(escapeRegExp).join('\\s*\\.\\s*')}\\b`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

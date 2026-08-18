import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReconstructionObligation } from '../../review/obligations.js';
import type { ReviewVerifierResult } from '../../review/contracts.js';
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
  const results: ReviewVerifierResult[] = [];

  for (const claim of input.claims) {
    const obligation = obligationById.get(claim.obligationId)!;
    if (claim.dimension === 'structure') {
      results.push(result(claim, 'unverified', 'Structure requires a Flutter MCP Widget Inspector receipt from the fixed Runtime session.'));
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
      results.push(result(claim, 'unverified', 'State requires a Flutter MCP Runtime observation receipt from the fixed App session.'));
      continue;
    }
    if (claim.dimension === 'interactions') {
      results.push(result(claim, 'unverified', 'Interaction requires a Flutter MCP Scenario receipt from the fixed App session.'));
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

function expectedString(obligation: ReconstructionObligation | undefined, key: string): string[] {
  const value = objectValue(obligation?.expected)?.[key];
  return typeof value === 'string' ? [value] : [];
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
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

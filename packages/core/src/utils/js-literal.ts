import type { ModuleConfig } from '../types/index.js';

export function extractExportedArrayLiteral(source: string, exportName: string): string | undefined {
  const marker = new RegExp(`export\\s+const\\s+${escapeRegExp(exportName)}\\s*=`);
  const match = marker.exec(source);
  if (!match) return undefined;

  const start = source.indexOf('[', match.index + match[0].length);
  if (start < 0) return undefined;

  const end = findMatchingBracket(source, start);
  if (end < 0) return undefined;

  return source.slice(start, end + 1);
}

export function evaluateModuleArray(literal: string, label: string): ModuleConfig[] {
  try {
    const value = Function(`"use strict"; return (${literal});`)() as unknown;
    if (!Array.isArray(value)) {
      throw new Error(`${label} did not evaluate to an array`);
    }
    return value as ModuleConfig[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse ${label}: ${message}`);
  }
}

function findMatchingBracket(source: string, start: number): number {
  let depth = 0;
  let quote: '"' | "'" | '`' | undefined;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) quote = undefined;
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

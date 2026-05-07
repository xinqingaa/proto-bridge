import type { JsonObject } from '../types.js';

export function readObject(value: JsonObject | undefined, key: string): JsonObject | undefined {
  const item = value?.[key];
  if (item && typeof item === 'object' && !Array.isArray(item)) return item as JsonObject;
  return undefined;
}

export function readString(value: JsonObject | undefined, key: string): string | undefined {
  const item = value?.[key];
  return typeof item === 'string' && item.trim() ? item : undefined;
}

export function readBoolean(value: JsonObject | undefined, key: string): boolean | undefined {
  const item = value?.[key];
  return typeof item === 'boolean' ? item : undefined;
}

export function readNumber(value: JsonObject | undefined, key: string): number | undefined {
  const item = value?.[key];
  return typeof item === 'number' ? item : undefined;
}

export function readStringArray(value: JsonObject | undefined, key: string): string[] | undefined {
  const item = value?.[key];
  if (!Array.isArray(item)) return undefined;
  return item.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

export function dedupe<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

export function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function normalizeRoute(route: string): string {
  if (!route) return route;
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

export function resolveFrom(root: string, candidate: string): string {
  return path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate);
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(filePath: string): Promise<string | undefined> {
  if (!(await pathExists(filePath))) return undefined;
  return readFile(filePath, 'utf8');
}

export async function readJsonIfExists(filePath: string): Promise<Record<string, unknown> | undefined> {
  const text = await readTextIfExists(filePath);
  if (!text) return undefined;
  return JSON.parse(text) as Record<string, unknown>;
}

export function basenameWithoutExt(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function firstSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return toPosixPath(value).split('/').find(Boolean);
}

export function relativeOrAbsolute(root: string, filePath: string): string {
  const relativePath = path.relative(root, filePath);
  return relativePath.startsWith('..') ? filePath : toPosixPath(relativePath);
}

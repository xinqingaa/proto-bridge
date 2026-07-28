import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { V2ContractError } from '../contracts/errors.js';

/**
 * Writes `value` to `filePath` by first writing a sibling temp file and
 * then renaming it into place. POSIX `rename` within the same directory is
 * atomic, so a reader never observes a half-written file, and a crash
 * mid-write leaves the previous content (or nothing) untouched
 * (pb-v2-implementation-guide.md "写入中断后 Reader 仍读取旧完整 Snapshot").
 */
export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.tmp-${path.basename(filePath)}-${randomBytes(6).toString('hex')}`);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tempPath, serialized, { encoding: 'utf8', flag: 'w' });
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
}

function isEnoent(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}

/**
 * Writes an immutable persisted object (Case Evidence Revision, Run,
 * Snapshot, ...): the first write wins. A later `put` with the exact same
 * id and identical content is a no-op (retries/`reused` Attempts must be
 * idempotent); a later `put` with the same id but different content is a
 * Contract error, never a silent overwrite (pb-v2-spec.md "写入后不可修改").
 */
export async function writeImmutableJson(filePath: string, objectKind: string, value: unknown): Promise<void> {
  const existing = await readJson<unknown>(filePath);
  if (existing === undefined) {
    await writeJsonAtomic(filePath, value);
    return;
  }
  if (isDeepStrictEqual(existing, value)) return;
  throw new V2ContractError(
    'immutable-violation',
    `${objectKind} at ${filePath} is already persisted with different content; historical objects cannot be modified.`,
  );
}

export async function listJsonIds(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    return entries.filter((entry) => entry.endsWith('.json') && !entry.startsWith('.tmp-')).map((entry) => entry.slice(0, -'.json'.length));
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

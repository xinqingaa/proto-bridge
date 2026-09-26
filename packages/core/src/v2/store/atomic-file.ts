import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
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
  try {
    const temp = await open(tempPath, 'w');
    try {
      await temp.writeFile(serialized, 'utf8');
      await temp.sync();
    } finally {
      await temp.close();
    }
    await rename(tempPath, filePath);
    await syncDirectory(dir);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

/** Flush directory-entry changes after an atomic rename. */
export async function syncDirectory(directoryPath: string): Promise<void> {
  const directory = await open(directoryPath, 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
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

export async function writeImmutableBytes(filePath: string, objectKind: string, value: Uint8Array): Promise<void> {
  try {
    const existing = await readFile(filePath);
    if (Buffer.compare(existing, Buffer.from(value)) === 0) return;
    throw new V2ContractError(
      'immutable-violation',
      `${objectKind} at ${filePath} is already persisted with different content; historical objects cannot be modified.`,
    );
  } catch (error) {
    if (!isEnoent(error)) throw error;
  }
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tempPath = path.join(dir, `.tmp-${path.basename(filePath)}-${randomBytes(6).toString('hex')}`);
  await writeFile(tempPath, value, { flag: 'wx' });
  try {
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function fileByteLength(filePath: string): Promise<number> {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    if (isEnoent(error)) return 0;
    throw error;
  }
}

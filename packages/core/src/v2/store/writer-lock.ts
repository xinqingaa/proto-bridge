import { mkdir, open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { V2ContractError } from '../contracts/errors.js';
import { writerLockPath } from './paths.js';

type LockPayload = {
  pid: number;
  acquiredAt: string;
};

function isProcessAlive(pid: number): boolean {
  try {
    // Signal 0 performs no-op existence/permission check without killing anything.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * The on-disk lock only distinguishes processes by pid, so it cannot by
 * itself catch two `LocalFileStore` instances racing for the same root
 * from *within* the same process (e.g. two Store objects in one Node.js
 * test or service). This in-memory registry closes that gap.
 */
const rootsLockedByThisProcess = new Set<string>();

/**
 * Single-writer advisory lock for one local Workspace root. Two writers
 * racing for the same root must never both believe they hold it
 * (pb-v2-spec.md 候选实现性质测试 "两个 writer 不能互相覆盖").
 *
 * A lock left behind by a process that is no longer alive (e.g. a crashed
 * writer) is treated as stale and reclaimed automatically so a Store
 * restart is never permanently blocked by its own previous crash.
 */
export async function acquireWriterLock(root: string): Promise<() => Promise<void>> {
  await mkdir(root, { recursive: true });
  const resolvedRoot = path.resolve(root);
  const lockFile = writerLockPath(root);
  const payload: LockPayload = { pid: process.pid, acquiredAt: new Date().toISOString() };

  if (rootsLockedByThisProcess.has(resolvedRoot)) {
    throw new V2ContractError('writer-lock-held', `Workspace ${resolvedRoot} is already locked for writing by this same process.`);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockFile, 'wx');
      try {
        await handle.writeFile(JSON.stringify(payload));
      } finally {
        await handle.close();
      }
      rootsLockedByThisProcess.add(resolvedRoot);
      return async () => {
        rootsLockedByThisProcess.delete(resolvedRoot);
        await rm(lockFile, { force: true });
      };
    } catch (error) {
      if (!isEexist(error)) throw error;
      const holder = await readLockPayload(lockFile);
      if (holder && holder.pid !== process.pid && isProcessAlive(holder.pid)) {
        throw new V2ContractError(
          'writer-lock-held',
          `Workspace ${resolvedRoot} is already locked for writing by pid ${holder.pid} (acquired ${holder.acquiredAt}).`,
        );
      }
      // Stale lock (holder missing/dead, an unreadable/corrupt lock file, or a
      // leftover lock from an earlier crash within this same pid): reclaim it and retry once.
      await rm(lockFile, { force: true });
    }
  }
  throw new V2ContractError('writer-lock-held', `Could not acquire writer lock for ${resolvedRoot} after reclaiming a stale lock.`);
}

async function readLockPayload(lockFile: string): Promise<LockPayload | undefined> {
  try {
    const raw = await readFile(lockFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LockPayload>;
    if (typeof parsed.pid === 'number' && typeof parsed.acquiredAt === 'string') return parsed as LockPayload;
    return undefined;
  } catch {
    return undefined;
  }
}

function isEexist(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'EEXIST';
}

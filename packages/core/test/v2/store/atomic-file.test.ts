import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';
import { writeImmutableBytes } from '../../../src/v2/store/atomic-file.js';

type FsEvent =
  | { kind: 'open'; path: string; flags: string }
  | { kind: 'sync'; path: string; flags: string }
  | { kind: 'rename'; from: string; to: string };

const fsSpy = vi.hoisted(() => ({
  events: [] as FsEvent[],
  failSyncOnFlags: undefined as string | undefined,
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const [openPath, flags] = args;
      const flagText = String(flags ?? 'r');
      const pathText = String(openPath);
      fsSpy.events.push({ kind: 'open', path: pathText, flags: flagText });
      const handle = await actual.open(...args);
      return new Proxy(handle, {
        get(target, property) {
          if (property === 'sync') {
            return async () => {
              fsSpy.events.push({ kind: 'sync', path: pathText, flags: flagText });
              if (fsSpy.failSyncOnFlags === flagText) {
                throw new Error('injected sync failure');
              }
              return target.sync();
            };
          }
          const value = Reflect.get(target, property, target) as unknown;
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
    rename: async (...args: Parameters<typeof actual.rename>) => {
      fsSpy.events.push({ kind: 'rename', from: String(args[0]), to: String(args[1]) });
      return actual.rename(...args);
    },
  };
});

describe('writeImmutableBytes durability', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'pb-atomic-file-'));
    fsSpy.events.length = 0;
    fsSpy.failSyncOnFlags = undefined;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const tempLeftovers = async () => (await readdir(dir)).filter((entry) => entry.startsWith('.tmp-'));

  it('syncs the temp file before rename and syncs the parent directory after', async () => {
    const target = path.join(dir, 'blob.bin');
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);

    await writeImmutableBytes(target, 'Blob content', bytes);

    const renameIndex = fsSpy.events.findIndex((event) => event.kind === 'rename');
    expect(renameIndex).toBeGreaterThanOrEqual(0);
    const rename = fsSpy.events[renameIndex] as Extract<FsEvent, { kind: 'rename' }>;
    expect(rename.to).toBe(target);
    expect(path.basename(rename.from)).toMatch(/^\.tmp-blob\.bin-/);

    const tempSyncIndex = fsSpy.events.findIndex((event) => event.kind === 'sync' && event.path === rename.from);
    expect(tempSyncIndex).toBeGreaterThanOrEqual(0);
    expect(tempSyncIndex).toBeLessThan(renameIndex);
    const tempOpen = fsSpy.events.find((event) => event.kind === 'open' && event.path === rename.from);
    expect(tempOpen).toMatchObject({ flags: 'wx' });

    const dirSyncIndex = fsSpy.events.findIndex((event) => event.kind === 'sync' && event.path === dir);
    expect(dirSyncIndex).toBeGreaterThan(renameIndex);

    expect(new Uint8Array(await readFile(target))).toEqual(bytes);
    expect(await tempLeftovers()).toEqual([]);
  });

  it('rejects, leaves no final file and removes the temp file when sync fails', async () => {
    const target = path.join(dir, 'blob.bin');
    fsSpy.failSyncOnFlags = 'wx';

    await expect(writeImmutableBytes(target, 'Blob content', new Uint8Array([9, 9]))).rejects.toThrow(
      'injected sync failure',
    );

    await expect(stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await tempLeftovers()).toEqual([]);
    expect(fsSpy.events.some((event) => event.kind === 'rename')).toBe(false);
  });

  it('keeps first-write-wins semantics: identical bytes are a no-op, different bytes are rejected', async () => {
    const target = path.join(dir, 'blob.bin');
    const bytes = new Uint8Array([1, 2, 3]);
    await writeImmutableBytes(target, 'Blob content', bytes);

    fsSpy.events.length = 0;
    await writeImmutableBytes(target, 'Blob content', new Uint8Array([1, 2, 3]));
    expect(fsSpy.events).toEqual([]);

    const rejection = await writeImmutableBytes(target, 'Blob content', new Uint8Array([3, 2, 1])).catch(
      (error: unknown) => error,
    );
    expect(rejection).toBeInstanceOf(V2ContractError);
    expect(rejection).toMatchObject({ code: 'immutable-violation' });

    expect(new Uint8Array(await readFile(target))).toEqual(bytes);
    expect(await tempLeftovers()).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { deepFreeze, fixtures } from '../../src/v2/index.js';

const f = fixtures.projectTaskList;

describe('deepFreeze', () => {
  it('prevents in-place mutation of a persisted Run after it is frozen', () => {
    const run = deepFreeze(structuredClone(f.RUN_1));
    expect(() => {
      (run as { terminationReason: string }).terminationReason = 'failed';
    }).toThrow(TypeError);
    expect(run.terminationReason).toBe('completed');
  });

  it('freezes nested arrays and objects, not just the top level', () => {
    const snapshot = deepFreeze(structuredClone(f.SNAPSHOT));
    expect(Object.isFrozen(snapshot.activeSlots)).toBe(true);
    expect(Object.isFrozen(snapshot.activeSlots[0])).toBe(true);
    expect(() => {
      (snapshot.activeSlots[0] as { revisionId: string }).revisionId = 'tampered';
    }).toThrow(TypeError);
  });
});

describe('historical objects survive a persistence round-trip unchanged', () => {
  it('a Run serialized and re-parsed as JSON is content-identical to the original', () => {
    const roundTripped = JSON.parse(JSON.stringify(f.RUN_1));
    expect(roundTripped).toEqual(f.RUN_1);
  });

  it('a Bundle Snapshot serialized and re-parsed as JSON is content-identical to the original', () => {
    const roundTripped = JSON.parse(JSON.stringify(f.SNAPSHOT));
    expect(roundTripped).toEqual(f.SNAPSHOT);
  });

  it('a Handoff serialized and re-parsed as JSON is content-identical to the original', () => {
    const roundTripped = JSON.parse(JSON.stringify(f.HANDOFF));
    expect(roundTripped).toEqual(f.HANDOFF);
  });
});

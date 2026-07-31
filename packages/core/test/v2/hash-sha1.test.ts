import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha1Hex } from '../../src/v2/contracts/hash-sha1.js';

describe('sha1Hex', () => {
  it('matches node:crypto createHash("sha1") for ASCII and unicode', () => {
    for (const sample of [
      '',
      'abc',
      '{"fragments":[]}',
      '任务列表 · 空态',
      'a'.repeat(200),
    ]) {
      const expected = createHash('sha1').update(sample, 'utf8').digest('hex');
      expect(sha1Hex(sample)).toBe(expected);
    }
  });
});

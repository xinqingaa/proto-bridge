import { describe, expect, it } from 'vitest';
import {
  assertConsumerQualityGates,
  measureConsumerQuality,
} from '../../src/v2/index.js';

describe('consumer quality gates', () => {
  it('measures compact payload behavior and preserves tranche denominator', () => {
    const measurement = measureConsumerQuality({
      baselinePayloads: [{ regions: ['root', 'list'], state: { visible: ['root'] } }],
      deltaPayloads: [{ kind: 'state', regionIndex: 1, after: 'ready' }, { kind: 'value', regionIndex: 1, key: 'selected', after: 'a' }],
      detailTraversalCount: 1,
      continuationTokens: ['cursor-a', 'cursor-b'],
      expectedContinuationTokens: ['cursor-a', 'cursor-b'],
      canonicalObligationCount: 7,
      trancheObligationCounts: [2, 3, 2],
    });
    expect(measurement.denominatorPreserved).toBe(true);
    expect(measurement.continuationStable).toBe(true);
    expect(measurement.deltaAmplification).toBeGreaterThan(0);
    expect(() => assertConsumerQualityGates(measurement, {
      maxExactPayloadRepetitionRatio: 0.5,
      maxDeltaAmplification: 2,
      maxDetailTraversalCount: 2,
      requireStableContinuation: true,
      requireDenominatorPreserved: true,
    })).not.toThrow();
  });

  it('rejects repeated payloads, unstable continuation and denominator loss', () => {
    const measurement = measureConsumerQuality({
      baselinePayloads: [{ repeated: true }],
      deltaPayloads: [{ repeated: true }, { repeated: true }],
      detailTraversalCount: 4,
      continuationTokens: ['cursor-a', 'cursor-a'],
      expectedContinuationTokens: ['cursor-a', 'cursor-b'],
      canonicalObligationCount: 5,
      trancheObligationCounts: [1, 1],
    });
    expect(() => assertConsumerQualityGates(measurement, {
      maxExactPayloadRepetitionRatio: 0.1,
      maxDeltaAmplification: 1,
      maxDetailTraversalCount: 2,
      requireStableContinuation: true,
      requireDenominatorPreserved: true,
    })).toThrowError(expect.objectContaining({ code: 'unsafe-input' }));
  });
});

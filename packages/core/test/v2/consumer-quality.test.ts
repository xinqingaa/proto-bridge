import { describe, expect, it } from 'vitest';
import {
  assertConsumerQualityGates,
  measureConsumerQuality,
} from '../../src/v2/index.js';

describe('consumer quality gates', () => {
  it('measures compact payload behavior without requiring tranche denominator by default', () => {
    const measurement = measureConsumerQuality({
      baselinePayloads: [{ regions: ['root', 'list'], state: { visible: ['root'] } }],
      deltaPayloads: [{ kind: 'state', regionId: 'list', after: 'ready' }, { kind: 'value', regionId: 'list', key: 'selected', after: 'a' }],
      detailTraversalCount: 1,
      continuationTokens: ['cursor-a', 'cursor-b'],
      expectedContinuationTokens: ['cursor-a', 'cursor-b'],
    });
    expect(measurement.denominatorPreserved).toBeUndefined();
    expect(measurement.continuationStable).toBe(true);
    expect(measurement.deltaAmplification).toBeGreaterThan(0);
    expect(() => assertConsumerQualityGates(measurement, {
      maxExactPayloadRepetitionRatio: 0.5,
      maxDeltaAmplification: 5,
      maxDetailTraversalCount: 2,
      requireStableContinuation: true,
    })).not.toThrow();
  });

  it('rejects repeated payloads and unstable continuation on the default gate', () => {
    const measurement = measureConsumerQuality({
      baselinePayloads: [{ repeated: true }],
      deltaPayloads: [{ repeated: true }, { repeated: true }],
      detailTraversalCount: 4,
      continuationTokens: ['cursor-a', 'cursor-a'],
      expectedContinuationTokens: ['cursor-a', 'cursor-b'],
    });
    expect(() => assertConsumerQualityGates(measurement, {
      maxExactPayloadRepetitionRatio: 0.1,
      maxDeltaAmplification: 1,
      maxDetailTraversalCount: 2,
      requireStableContinuation: true,
    })).toThrowError(expect.objectContaining({ code: 'unsafe-input' }));
  });

  it('treats tranche denominator preservation as an explicit diagnostic gate', () => {
    const measurement = measureConsumerQuality({
      baselinePayloads: [{ ok: true }],
      deltaPayloads: [],
      detailTraversalCount: 0,
      continuationTokens: [],
      canonicalObligationCount: 7,
      trancheObligationCounts: [2, 3, 2],
    });
    expect(measurement.denominatorPreserved).toBe(true);
    expect(() => assertConsumerQualityGates(measurement, {
      requireDenominatorPreserved: true,
    })).not.toThrow();

    const broken = measureConsumerQuality({
      baselinePayloads: [{ ok: true }],
      deltaPayloads: [],
      detailTraversalCount: 0,
      continuationTokens: [],
      canonicalObligationCount: 5,
      trancheObligationCounts: [1, 1],
    });
    expect(() => assertConsumerQualityGates(broken, {
      requireDenominatorPreserved: true,
    })).toThrowError(expect.objectContaining({ code: 'unsafe-input' }));
  });
});

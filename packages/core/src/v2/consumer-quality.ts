import { V2ContractError } from './contracts/errors.js';

export type ConsumerQualityInput = {
  baselinePayloads: unknown[];
  deltaPayloads: unknown[];
  detailTraversalCount: number;
  continuationTokens: string[];
  expectedContinuationTokens?: string[];
  canonicalObligationCount: number;
  trancheObligationCounts: number[];
};

export type ConsumerQualityMeasurement = {
  baselineChars: number;
  deltaChars: number;
  totalChars: number;
  exactPayloadRepetitionRatio: number;
  deltaAmplification: number;
  detailTraversalCount: number;
  continuationStable: boolean;
  canonicalObligationCount: number;
  trancheObligationCount: number;
  denominatorPreserved: boolean;
};

export type ConsumerQualityGate = {
  maxExactPayloadRepetitionRatio?: number;
  maxDeltaAmplification?: number;
  maxDetailTraversalCount?: number;
  requireStableContinuation?: boolean;
  requireDenominatorPreserved?: boolean;
};

export function measureConsumerQuality(input: ConsumerQualityInput): ConsumerQualityMeasurement {
  const baselineChars = payloadChars(input.baselinePayloads);
  const deltaChars = payloadChars(input.deltaPayloads);
  const all = [...input.baselinePayloads, ...input.deltaPayloads].map(serialize);
  const unique = new Set(all);
  const totalChars = baselineChars + deltaChars;
  const duplicateChars = all.reduce((sum, value) => sum + value.length, 0)
    - [...unique].reduce((sum, value) => sum + value.length, 0);
  const continuationStable = input.expectedContinuationTokens
    ? same(input.continuationTokens, input.expectedContinuationTokens)
    : new Set(input.continuationTokens).size === input.continuationTokens.length;
  const trancheObligationCount = input.trancheObligationCounts.reduce((sum, value) => sum + value, 0);
  return {
    baselineChars,
    deltaChars,
    totalChars,
    exactPayloadRepetitionRatio: totalChars === 0 ? 0 : duplicateChars / totalChars,
    deltaAmplification: baselineChars === 0 ? 0 : deltaChars / baselineChars,
    detailTraversalCount: input.detailTraversalCount,
    continuationStable,
    canonicalObligationCount: input.canonicalObligationCount,
    trancheObligationCount,
    denominatorPreserved: trancheObligationCount === input.canonicalObligationCount,
  };
}

export function assertConsumerQualityGates(
  measurement: ConsumerQualityMeasurement,
  gate: ConsumerQualityGate = {},
): void {
  const failures: string[] = [];
  if (gate.maxExactPayloadRepetitionRatio !== undefined && measurement.exactPayloadRepetitionRatio > gate.maxExactPayloadRepetitionRatio) failures.push('exact payload repetition ratio exceeded');
  if (gate.maxDeltaAmplification !== undefined && measurement.deltaAmplification > gate.maxDeltaAmplification) failures.push('delta amplification exceeded');
  if (gate.maxDetailTraversalCount !== undefined && measurement.detailTraversalCount > gate.maxDetailTraversalCount) failures.push('detail traversal count exceeded');
  if (gate.requireStableContinuation && !measurement.continuationStable) failures.push('continuation is not stable');
  if (gate.requireDenominatorPreserved && !measurement.denominatorPreserved) failures.push('implementation tranche denominator was not preserved');
  if (failures.length) throw new V2ContractError('unsafe-input', `Consumer quality gate failed: ${failures.join('; ')}`, { measurement, failures });
}

function serialize(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

function payloadChars(values: unknown[]): number {
  return values.reduce<number>((sum, value) => sum + serialize(value).length, 0);
}

function same(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

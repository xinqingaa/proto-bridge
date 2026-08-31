import { PROMPT_ASSETS } from './generated-assets.js';

const CONSUMER_CONTRACT_ASSETS = [
  'handoff-consumer',
  'target-contract',
  'implementation-discipline',
  'verification',
  'acceptance-discipline',
  'final-report',
] as const;

export function buildConsumerContractText(): string {
  return CONSUMER_CONTRACT_ASSETS.map((name) => PROMPT_ASSETS[name]).join(
    '\n\n',
  );
}

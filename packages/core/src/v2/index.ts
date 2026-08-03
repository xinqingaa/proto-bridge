/**
 * Browser-safe ProtoBridge Evidence contracts and read models.
 * Producers and consumers import this boundary instead of duplicating
 * schemas, status vocabularies, or reference rules.
 */
export * from './contracts/index.js';
export * from './resolver/index.js';
export * from './evidence-read-model.js';
export * from './evidence-inventory.js';
export * from './acceptance-contract.js';
export * from './reconstruction-review.js';
export * from './prompts/agent-prompt.js';
export * from './workspace-config.js';
export * as fixtures from './fixtures/index.js';

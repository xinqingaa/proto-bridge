export {
  capturePrototypePage,
  defaultAdapterRegistry,
  generateMigrationSpec,
} from '@proto-bridge/core';

export type {
  CapturePrototypePageInput,
  GenerateMigrationSpecInput,
  SourceAdapter,
  TargetAdapter,
} from '@proto-bridge/core';

if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('ProtoBridge MCP server skeleton is present. Full MCP transport is planned for Phase 6.');
}

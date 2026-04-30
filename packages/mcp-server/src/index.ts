export {
  analyzeFlutterContext,
  analyzePrototypePage,
  capturePrototypePage,
  generateMigrationSpec,
  mapTokens,
} from '@proto-bridge/core';

export type {
  AnalyzeFlutterContextInput,
  AnalyzePrototypePageInput,
  CapturePrototypePageInput,
  GenerateMigrationSpecInput,
  MapTokensInput,
} from '@proto-bridge/core';

if (import.meta.url === `file://${process.argv[1]}`) {
  console.error('ProtoBridge MCP server skeleton is present. Full MCP transport is planned for Phase 6.');
}

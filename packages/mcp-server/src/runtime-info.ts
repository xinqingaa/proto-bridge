import {
  CONSUMER_PROJECTION_CAPABILITIES,
  CONSUMER_PROJECTION_VERSION,
} from '@proto-bridge/core/v2';
import {
  MCP_BUILD_FINGERPRINT,
  MCP_PACKAGE_VERSION,
} from './generated-build-info.js';

export const MCP_TOOL_CONTRACT_VERSION = 2 as const;
export const MCP_PROCESS_STARTED_AT = new Date().toISOString();

export function mcpRuntimeInfo(generation: string | 'legacy-unavailable' = 'legacy-unavailable') {
  return {
    build: {
      packageVersion: MCP_PACKAGE_VERSION,
      fingerprint: MCP_BUILD_FINGERPRINT,
    },
    processStartedAt: MCP_PROCESS_STARTED_AT,
    contracts: {
      toolVersion: MCP_TOOL_CONTRACT_VERSION,
      projectionVersion: CONSUMER_PROJECTION_VERSION,
    },
    store: {
      layout: 'local-file-store/content-addressed-blobs-v2',
      generation,
    },
    capabilities: [
      ...CONSUMER_PROJECTION_CAPABILITIES,
      'target-component-resolver',
      'target-token-resolver',
      'target-readiness-contract',
      'target-example-exclusions',
    ],
  };
}

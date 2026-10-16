import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadLocalServiceLaunchConfig,
  type LocalServiceLaunchConfig,
} from '@proto-bridge/core/v2/store';
import { ProtoBridgeLocalService, type LocalServiceOptions } from './service.js';

export * from './service.js';
export * from './flutter-mcp-provider.js';

/** Maps the Core-resolved launch config onto Service options without reinterpreting it. */
export function localServiceOptionsFromLaunchConfig(
  launch: LocalServiceLaunchConfig,
): LocalServiceOptions {
  return {
    host: launch.host,
    port: launch.port,
    allowedOrigins: launch.allowedOrigins,
    runtimeBaseUrl: launch.runtimeBaseUrl,
    storeRoot: launch.storeRoot,
    workspaceId: launch.workspaceId,
    deliveryTargetRoot: launch.deliveryTargetRoot,
    maxCases: launch.maxCases,
    ...(launch.maxStoreBytes === undefined
      ? {}
      : { maxStoreBytes: launch.maxStoreBytes }),
  };
}

function configArgument(argv: string[]): string {
  const index = argv.indexOf('--config');
  const value = index === -1 ? undefined : argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(
      'Local Service requires --config <proto-bridge.json>. Start it through pnpm pb:up or proto-bridge service start.',
    );
  }
  return value;
}

async function main(): Promise<void> {
  const launch = await loadLocalServiceLaunchConfig(
    configArgument(process.argv.slice(2)),
  );
  const service = new ProtoBridgeLocalService(
    localServiceOptionsFromLaunchConfig(launch),
  );
  const address = await service.start();
  process.stdout.write(
    `ProtoBridge Local Service listening on http://${address.host}:${address.port}\n`,
  );
  const shutdown = async () => {
    await service.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === invokedPath) {
  await main();
}

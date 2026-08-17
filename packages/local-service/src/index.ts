import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CAPTURE_MAX_CASES } from '@proto-bridge/core/v2';
import { ProtoBridgeLocalService } from './service.js';

export * from './service.js';

function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number.`);
  return parsed;
}

async function main(): Promise<void> {
  const port = envNumber('PB_SERVICE_PORT', 3988);
  const service = new ProtoBridgeLocalService({
    host: '127.0.0.1',
    port,
    allowedOrigins: [
      process.env.PBWORK_ORIGIN ?? 'http://127.0.0.1:3977',
      `http://127.0.0.1:${port}`,
    ],
    runtimeBaseUrl:
      process.env.PBWORK_RUNTIME_ORIGIN ?? 'http://127.0.0.1:3977',
    storeRoot:
      process.env.PB_STORE_ROOT ??
      path.resolve(process.cwd(), '.proto-bridge/store'),
    workspaceId: process.env.PB_WORKSPACE_ID ?? 'pbwork-local',
    maxCases: envNumber('PB_MAX_CASES', DEFAULT_CAPTURE_MAX_CASES),
  });
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

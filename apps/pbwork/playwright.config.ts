import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const deliveryTargetRoot = path.join(repoRoot, "apps/flutter_pb_app");
const channel = process.env.PLAYWRIGHT_CHANNEL;
// Keep automatically selected UI ports in a browser-safe range. Chromium
// rejects some conventional ports (including 5060) before the test can run.
const port = Number(process.env.PBWORK_E2E_PORT ?? 42_000 + (process.pid % 5_000));
const servicePort = Number(process.env.PBWORK_E2E_SERVICE_PORT ?? port + 1);
// Playwright loads this config again in workers. Pin the chosen ports in the
// parent environment so every worker uses the same webServer URLs.
process.env.PBWORK_E2E_PORT ??= String(port);
process.env.PBWORK_E2E_SERVICE_PORT ??= String(servicePort);
const storeRootCommand = process.env.PBWORK_E2E_STORE_ROOT
  ? JSON.stringify(process.env.PBWORK_E2E_STORE_ROOT)
  : "$(mktemp -d)";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    ...(channel ? { channel } : {}),
  },
  webServer: [
    {
      command:
        `PB_SERVICE_PORT=${servicePort} ` +
        `PBWORK_ORIGIN=http://127.0.0.1:${port} ` +
        `PBWORK_RUNTIME_ORIGIN=http://127.0.0.1:${port} ` +
        `PB_STORE_ROOT=${storeRootCommand} ` +
        `PB_DELIVERY_TARGET_ROOT=${JSON.stringify(deliveryTargetRoot)} ` +
        `pnpm --filter @proto-bridge/local-service exec tsx --conditions=source src/index.ts`,
      port: servicePort,
      reuseExistingServer: false,
    },
    {
      command:
        `PB_SERVICE_PORT=${servicePort} ` +
        `pnpm exec vite preview --host 127.0.0.1 --port ${port}`,
      port,
      reuseExistingServer: false,
    },
  ],
});

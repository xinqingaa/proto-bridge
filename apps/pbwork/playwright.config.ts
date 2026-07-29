import { defineConfig, devices } from "@playwright/test";

const channel = process.env.PLAYWRIGHT_CHANNEL;
const port = Number(process.env.PBWORK_E2E_PORT ?? 3977);
const servicePort = Number(process.env.PBWORK_E2E_SERVICE_PORT ?? 3988);

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
        `PB_V2_SERVICE_PORT=${servicePort} ` +
        `PBWORK_ORIGIN=http://127.0.0.1:${port} ` +
        `PBWORK_RUNTIME_ORIGIN=http://127.0.0.1:${port} ` +
        `PB_V2_STORE_ROOT=$(mktemp -d) ` +
        `pnpm --filter @proto-bridge/local-service exec tsx --conditions=source src/index.ts`,
      port: servicePort,
      reuseExistingServer: false,
    },
    {
      command:
        `PB_V2_SERVICE_PORT=${servicePort} ` +
        `pnpm exec vite preview --host 127.0.0.1 --port ${port}`,
      port,
      reuseExistingServer: false,
    },
  ],
});

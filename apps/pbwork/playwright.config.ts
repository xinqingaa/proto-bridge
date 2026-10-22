import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
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
// Local Service only starts from a Workspace config, like pnpm pb:up. Write
// one per run (pinned for workers) with an isolated Store unless provided.
process.env.PBWORK_E2E_CONFIG ??= writeE2eWorkspaceConfig();
const serviceConfigPath = process.env.PBWORK_E2E_CONFIG;

function writeE2eWorkspaceConfig(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pbwork-e2e-"));
  const configPath = path.join(dir, "proto-bridge.json");
  writeFileSync(
    configPath,
    `${JSON.stringify({
      schemaVersion: 1,
      workspaceId: "pbwork-local",
      runtime: { baseUrl: `http://127.0.0.1:${port}`, allowedOrigins: [] },
      store: {
        root: process.env.PBWORK_E2E_STORE_ROOT ?? path.join(dir, "store"),
        retainArchivedSnapshots: 1,
      },
      capture: { maxCases: 500 },
      delivery: { targetRoot: deliveryTargetRoot },
      service: { host: "127.0.0.1", port: servicePort, allowedOrigins: [] },
    }, null, 2)}\n`,
  );
  return configPath;
}

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
        `pnpm --filter @proto-bridge/local-service exec tsx --conditions=source src/index.ts ` +
        `--config ${JSON.stringify(serviceConfigPath)}`,
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

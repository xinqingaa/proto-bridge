import { defineConfig, devices } from "@playwright/test";

const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3977",
    ...devices["Desktop Chrome"],
    ...(channel ? { channel } : {}),
  },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 3977",
    port: 3977,
    reuseExistingServer: !process.env.CI,
  },
});

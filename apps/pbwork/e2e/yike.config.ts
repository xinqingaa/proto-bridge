import { defineConfig } from "@playwright/test";
const port = Number(process.env.PBWORK_YIKE_PORT ?? 43977);
export default defineConfig({
  testDir: ".",
  testMatch: ["yike-journeys.browser.ts", "yike-runtime.browser.ts"],
  outputDir: "../test-results/yike",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Shanghai",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    cwd: process.cwd(),
    command: `pnpm exec vite --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: false,
  },
});

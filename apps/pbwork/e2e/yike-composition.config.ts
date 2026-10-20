import { defineConfig } from "@playwright/test";
const port = Number(process.env.PBWORK_B3_PORT ?? 43977);
export default defineConfig({
  testDir: ".",
  testMatch: [
    "yike-composition.browser.ts",
    "yike-foundation.browser.ts",
    "yike-pages.browser.ts",
    "yike-rework.browser.ts",
    "yike-review-fixes.browser.ts",
    "yike-experience.browser.ts",
    "yike-review-sheet.browser.ts",
    "yike-controls.browser.ts",
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 900, height: 820 },
  },
  webServer: {
    cwd: process.cwd(),
    command: `pnpm exec vite --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: false,
  },
});

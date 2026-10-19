import { defineConfig } from "@playwright/test";
const port = 43979;
export default defineConfig({
  testDir: ".",
  testMatch: ["authoring-tools.spec.ts", "page-environment.browser.ts"],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1050 },
  },
  webServer: {
    cwd: process.cwd(),
    command: `pnpm exec vite --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: false,
  },
});

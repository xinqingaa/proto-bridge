#!/usr/bin/env node
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import path from "node:path";
import { repoRoot, runInherited } from "./lib/pb-script-utils.mjs";

process.stdout.write("ProtoBridge: installing workspace dependencies...\n");
await runInherited("pnpm", ["install", "--ignore-scripts"]);

if (process.env.PB_SKIP_BROWSER_INSTALL === "1") {
  process.stdout.write(
    "ProtoBridge: skipped Playwright Chromium installation (PB_SKIP_BROWSER_INSTALL=1).\n",
  );
  process.stdout.write("ProtoBridge install is ready. Next: pnpm pb:init\n");
  process.exit(0);
}

try {
  const requireFromCore = createRequire(
    path.join(repoRoot, "packages/core/package.json"),
  );
  const playwrightModule = await import(
    pathToFileURL(requireFromCore.resolve("playwright")).href
  );
  const { chromium } = playwrightModule.default ?? playwrightModule;
  const executable = chromium.executablePath();
  await access(executable);
  process.stdout.write("ProtoBridge: Playwright Chromium is ready.\n");
} catch {
  process.stdout.write("ProtoBridge: installing Playwright Chromium...\n");
  await runInherited("pnpm", ["exec", "playwright", "install", "chromium"]);
}

process.stdout.write("ProtoBridge install is ready. Next: pnpm pb:init\n");

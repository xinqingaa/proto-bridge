import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import {
  preflightInstrumentedRuntime,
  discoverInstrumentedRuntimeManifest,
  PlaywrightCaseCaptureDriver,
} from "@proto-bridge/core/v2/capture";
import { finalizePrototype } from "./support/finalize";

const id = process.env.PBWORK_SCAFFOLD_PROTOTYPE;
test("generated skeleton passes Preflight, repeats its clock Case and finalizes unchanged", async ({
  page,
}, testInfo) => {
  test.skip(
    !id,
    "Run through pnpm test:e2e:scaffold to generate an isolated skeleton.",
  );
  test.setTimeout(240_000);
  const runtimeBaseUrl = String(testInfo.project.use.baseURL);
  const manifest = await discoverInstrumentedRuntimeManifest({
    runtimeBaseUrl,
    prototypeId: id!,
  });
  const { preflight } = await preflightInstrumentedRuntime({
    runtimeBaseUrl,
    draft: {
      prototypeId: id!,
      themePack: {
        packId: manifest.theme.packId,
        packDigest: manifest.theme.packDigest,
        theme: manifest.theme.defaultTheme,
        mode: manifest.theme.defaultMode,
      },
      screens: [
        {
          screenId: `${id}.home`,
          variants: { mode: "explicit", variantIds: ["default"] },
          deviceIds: ["iphone-14"],
          scenarios: { mode: "none" },
          captureScope: {
            fragments: [],
            screenshots: { mode: "all" },
            sourcePolicy: false,
            debugPolicy: false,
            evidenceInputMode: "instrumented",
            minEvidenceLevel: "instrumented-runtime",
          },
        },
      ],
      acceptedWarningIds: [],
    },
  });
  const driver = new PlaywrightCaseCaptureDriver();
  const entry = preflight.matrix[0]!;
  const first = await driver.captureCase({ entry, preflight, runtimeBaseUrl });
  const second = await driver.captureCase({ entry, preflight, runtimeBaseUrl });
  const clockFact = (result: typeof first) =>
    result.facts.find((f) => f.factId === `${id}.home.clock.text`)
      ?.effectiveValue;
  expect(clockFact(first)).toContain("2026/7/28");
  expect(clockFact(second)).toBe(clockFact(first));
  expect(
    first.binaries.filter((b) => b.kind === "screenshot").length,
  ).toBeGreaterThan(0);
  expect(
    second.binaries
      .filter((b) => b.kind === "screenshot")
      .map((b) => Buffer.from(b.bytes)),
  ).toEqual(
    first.binaries
      .filter((b) => b.kind === "screenshot")
      .map((b) => Buffer.from(b.bytes)),
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  const row = await finalizePrototype(page, id!);
  await row.getByRole("button", { name: "查看定稿产物" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  const match = new URL(page.url()).pathname.match(
    /^\/workbench\/evidence\/([^/]+)\/([^/]+)/,
  )!;
  await page.getByRole("button", { name: "查看提示词" }).click();
  await expect(page.getByTestId("saved-agent-prompt")).toBeVisible();
  await page.getByText("固定引用", { exact: true }).click();
  const handoffId = (await page.getByTestId("handoff-id").innerText()).trim();
  await writeFile(
    process.env.PBWORK_E2E_RESULT_PATH ??
      testInfo.outputPath("scaffold-evidence.json"),
    JSON.stringify(
      {
        prototypeId: id,
        stage: "final",
        bundleId: match[1],
        snapshotId: match[2],
        handoffId,
        caseId: entry.selectedCase.caseId,
        clockText: clockFact(first),
        screenshotsIdentical: true,
      },
      null,
      2,
    ),
  );
});

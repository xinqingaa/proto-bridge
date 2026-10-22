import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { LocalFileStore } from "@proto-bridge/core/v2/store";
import { buildEvidenceReadModel } from "@proto-bridge/core/v2/evidence-read-model";
import { test, expect, type Page } from "@playwright/test";
import {
  PlaywrightCaseCaptureDriver,
  capturePreflightToStore,
  createAgentHandoff,
  evaluateAgentHandoff,
  preflightSelection,
  type SelectionDraft,
} from "@proto-bridge/core/v2/capture";
test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Shanghai",
});
async function runtimeRequest(page: Page, payload: unknown): Promise<any> {
  await page.waitForFunction(() =>
    Boolean((window as any).__PROTO_BRIDGE_CAPTURE_V2__),
  );
  return page.evaluate(
    async (payload) =>
      (window as any).__PROTO_BRIDGE_CAPTURE_V2__.request({
        protocolVersion: 3,
        requestId: `yike-review-${crypto.randomUUID()}`,
        payload,
      }),
    payload,
  );
}

async function prepareCurrent(
  page: Page,
  screenId: string,
  variantId = "default",
) {
  const described = await runtimeRequest(page, { kind: "describe" });
  const manifest = described.payload.manifest;
  const theme = {
    packId: manifest.theme.packId,
    packDigest: manifest.theme.packDigest,
    theme: "mechanical",
    mode: "light",
  };
  const result = await runtimeRequest(page, {
    kind: "prepare",
    expected: { prototypeId: "yike", screenId, variantId, theme },
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return { manifest, theme };
}
test("Core Capture preserves settings camelCase keys and produces its screenshot", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=mechanical&mode=light",
  );
  const described = await runtimeRequest(page, { kind: "describe" });
  expect(described.ok, JSON.stringify(described)).toBe(true);
  const manifest = described.payload.manifest;
  const draft: SelectionDraft = {
    prototypeId: "yike",
    themePack: {
      packId: manifest.theme.packId,
      packDigest: manifest.theme.packDigest,
      theme: manifest.theme.defaultTheme,
      mode: manifest.theme.defaultMode,
    },
    screens: [
      {
        screenId: "yike.settings",
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
  };
  const preflight = preflightSelection(draft, manifest, { maxCases: 500 });
  const captured = await new PlaywrightCaseCaptureDriver().captureCase({
    entry: preflight.matrix[0]!,
    preflight,
    runtimeBaseUrl: new URL(page.url()).origin,
  });
  expect(captured.evidenceLevel).toBe("instrumented-runtime");
  expect(captured.diagnostics.pageErrors).toEqual([]);
  for (const key of [
    "pomodoroMinutes",
    "shortBreakMinutes",
    "longBreakMinutes",
    "longBreakEvery",
  ]) {
    expect(
      captured.facts.find(
        (fact) =>
          fact.factId ===
          `yike.settings.configuration.row.pomodoro-${key}.identity`,
      )?.effectiveValue,
    ).toEqual({
      screenId: "yike.settings",
      pbId: "yike.settings.configuration.row",
      pbKey: `pomodoro-${key}`,
    });
  }
  expect(
    captured.binaries.some(
      (binary) => binary.kind === "screenshot" && binary.bytes.byteLength > 0,
    ),
  ).toBe(true);
});

test("declared states prepare, expose semantic snapshots and reset", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-10-19T12:00:00+08:00"));
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest, theme } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const variant of screen.variants) {
      const query = new URLSearchParams({
        variant: variant.variantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, variant.variantId);
      const expected = {
        prototypeId: "yike",
        screenId: screen.screenId,
        variantId: variant.variantId,
        theme,
        viewport: { width: 390, height: 844 },
      };
      const ready = await runtimeRequest(page, {
        kind: "readiness",
        expected,
        requiredFragments: variant.requiredFragments,
      });
      expect(
        ready.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(ready)}`,
      ).toBe(true);
      const snapshot = await runtimeRequest(page, {
        kind: "semantic-snapshot",
        fragments: variant.requiredFragments,
      });
      expect(
        snapshot.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(snapshot)}`,
      ).toBe(true);
      const reset = await runtimeRequest(page, { kind: "reset" });
      expect(
        reset.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(reset)}`,
      ).toBe(true);
    }
  }
});
test("declared interaction scenarios verify their checkpoints", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const scenario of screen.scenarios) {
      const variant = screen.variants.find(
        (v: any) => v.variantId === scenario.initialVariantId,
      );
      const query = new URLSearchParams({
        variant: scenario.initialVariantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, scenario.initialVariantId);
      for (const actionId of scenario.actionIds) {
        const action = await runtimeRequest(page, {
          kind: "execute-action",
          scenarioId: scenario.scenarioId,
          actionId,
        });
        expect(
          action.ok,
          `${scenario.scenarioId}/${actionId}: ${JSON.stringify(action)}`,
        ).toBe(true);
      }
      for (const checkpoint of scenario.checkpoints) {
        const verified = await runtimeRequest(page, {
          kind: "verify-checkpoint",
          scenarioId: scenario.scenarioId,
          checkpointId: checkpoint.checkpointId,
        });
        expect(
          verified.ok,
          `${scenario.scenarioId}: ${JSON.stringify(verified)}`,
        ).toBe(true);
      }
    }
  }
});

test("DS artwork identity and observed views survive theme and countdown changes", async ({
  page,
}) => {
  for (const theme of ["mechanical", "water", "sundial"]) {
    for (const mode of ["light", "dark"]) {
      for (const variant of ["default", "countdown-setup"]) {
        await page.goto(
          `/prototype/yike/focus?variant=${variant}&theme=${theme}&mode=${mode}`,
        );
        const snapshot = await runtimeRequest(page, {
          kind: "semantic-snapshot",
          fragments: [],
        });
        expect(snapshot.ok, JSON.stringify(snapshot)).toBe(true);
        const usage = snapshot.payload.nodes.find(
          (node: any) => node.props?.artwork,
        )?.props.artwork;
        expect(usage).toBeDefined();
        const assetId = `${theme}-${mode}${theme === "mechanical" && variant === "countdown-setup" ? "-plain" : ""}`;
        expect(usage.declared).toMatchObject({
          packId: "yike",
          assetId,
          file: `assets/${assetId}.svg`,
        });
        expect(usage.sourceDigest).toMatch(/^sha1:[a-f0-9]{40}$/);
        expect(usage.images.length).toBeGreaterThan(0);
        const icons = snapshot.payload.nodes.flatMap(
          (node: any) => node.props?.icons ?? [],
        );
        expect(icons.some((icon: any) => icon.name === "settings")).toBe(true);
        expect(
          icons.every(
            (icon: any) => icon.owner && icon.sourceFile && icon.colorMode,
          ),
        ).toBe(true);
      }
    }
  }
});

test("Core Capture keeps all six rendering environments while reset restores business preferences", async ({
  page,
}) => {
  await page.goto("/prototype/yike/__manifest__");
  const {
    payload: { manifest },
  } = await runtimeRequest(page, { kind: "describe" });
  const preflight = preflightSelection(
    {
      prototypeId: "yike",
      themePack: {
        packId: manifest.theme.packId,
        packDigest: manifest.theme.packDigest,
        theme: manifest.theme.defaultTheme,
        mode: manifest.theme.defaultMode,
      },
      screens: [
        {
          screenId: "yike.settings",
          variants: { mode: "explicit", variantIds: [] },
          deviceIds: ["iphone-14"],
          scenarios: { mode: "explicit", scenarioIds: ["reset-data"] },
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
    manifest,
  );
  expect(preflight.matrix).toHaveLength(6);
  const driver = await new PlaywrightCaseCaptureDriver().openSession();
  try {
    for (const entry of preflight.matrix) {
      const result = await driver.captureCase({
        entry,
        preflight,
        runtimeBaseUrl: new URL(page.url()).origin,
      });
      expect(
        result.facts.find((fact) => fact.factId === "yike.focus.runtime.theme")
          ?.effectiveValue,
      ).toMatchObject({
        theme: entry.selectedCase.caseKey.theme,
        mode: entry.selectedCase.caseKey.themeId,
      });
      expect(
        result.binaries.some(
          (binary) =>
            binary.kind === "screenshot" && binary.bytes.byteLength > 0,
        ),
      ).toBe(true);
    }
  } finally {
    await driver.dispose();
  }
});

test("appearance reuse preserves all six observations and executes shared actions once", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/prototype/yike/__manifest__");
  const {
    payload: { manifest },
  } = await runtimeRequest(page, { kind: "describe" });
  const preflight = preflightSelection(
    {
      prototypeId: "yike",
      themePack: {
        packId: manifest.theme.packId,
        packDigest: manifest.theme.packDigest,
        theme: manifest.theme.defaultTheme,
        mode: manifest.theme.defaultMode,
      },
      screens: [
        {
          screenId: "yike.focus",
          variants: { mode: "explicit", variantIds: ["default"] },
          deviceIds: ["iphone-14"],
          scenarios: { mode: "explicit", scenarioIds: ["discard-focus"] },
          captureScope: {
            fragments: [],
            screenshots: { mode: "all" },
            sourcePolicy: false,
            debugPolicy: false,
            evidenceInputMode: "instrumented",
            minEvidenceLevel: "instrumented-runtime",
          },
        },
        {
          screenId: "yike.settings",
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
    manifest,
  );
  expect(preflight.matrix).toHaveLength(18);
  const results = new Map<
    string,
    { facts: unknown; screenshotCount: number }
  >();
  for (const reuseAppearances of [true, false]) {
    const driver = new PlaywrightCaseCaptureDriver(undefined, {
      reuseAppearances,
    });
    const session = await driver.openSession();
    try {
      // Selection identity is unchanged; only execution order groups equal business inputs.
      const entries = [...preflight.matrix].sort(
        (a, b) => Number(Boolean(a.scenario)) - Number(Boolean(b.scenario)),
      );
      for (const entry of entries) {
        const result = await session.captureCase({
          entry,
          preflight,
          runtimeBaseUrl: new URL(page.url()).origin,
        });
        const screenId = entry.selectedCase.caseKey.screenId;
        expect(
          result.facts.find(
            (fact) => fact.factId === `${screenId}.runtime.theme`,
          )?.effectiveValue,
        ).toMatchObject({
          theme: entry.selectedCase.caseKey.theme,
          mode: entry.selectedCase.caseKey.themeId,
        });
        expect(result.diagnostics.pageErrors).toEqual([]);
        const comparable = {
          facts: result.facts.filter(
            (fact) => !fact.factId.endsWith(".runtime.execution"),
          ),
          screenshotCount: result.binaries.filter(
            (binary) =>
              binary.kind === "screenshot" && binary.bytes.byteLength > 0,
          ).length,
        };
        expect(comparable.screenshotCount).toBeGreaterThan(0);
        if (reuseAppearances)
          results.set(entry.selectedCase.caseId, comparable);
        else expect(comparable).toEqual(results.get(entry.selectedCase.caseId));
      }
    } finally {
      await session.dispose();
    }
    expect(driver.metrics.sharedAppearanceCases).toBe(
      reuseAppearances ? 10 : 0,
    );
    expect(driver.metrics.contextsCreated).toBe(reuseAppearances ? 8 : 18);
    expect(driver.metrics.actionsExecuted).toBe(reuseAppearances ? 1 : 6);
    expect(driver.metrics.appearanceFallbacks).toBe(0);
    console.log(
      JSON.stringify({
        label: "Yike paired appearance sample",
        reuseAppearances,
        driver: driver.metrics,
      }),
    );
  }
});

test("full yike Capture creates its first Bundle and Handoff with DS references only", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await page.goto("/prototype/yike/__manifest__");
  const described = await runtimeRequest(page, { kind: "describe" });
  const manifest = described.payload.manifest;
  const root = await mkdtemp(path.join(os.tmpdir(), "yike-reference-capture-"));
  const store = new LocalFileStore({
    root,
    workspaceId: "yike-reference-test",
  });
  await store.init();
  try {
    const draft: SelectionDraft = {
      prototypeId: "yike",
      themePack: {
        packId: manifest.theme.packId,
        packDigest: manifest.theme.packDigest,
        theme: manifest.theme.defaultTheme,
        mode: manifest.theme.defaultMode,
      },
      screens: manifest.screens.map((screen: any) => ({
        screenId: screen.screenId,
        variants: {
          mode: "explicit",
          variantIds: screen.variants.map((variant: any) => variant.variantId),
        },
        deviceIds: ["iphone-14"],
        scenarios: screen.scenarios.length
          ? {
              mode: "explicit",
              scenarioIds: screen.scenarios.map(
                (scenario: any) => scenario.scenarioId,
              ),
            }
          : { mode: "none" },
        captureScope: {
          fragments: [],
          screenshots: { mode: "all" },
          sourcePolicy: false,
          debugPolicy: false,
          evidenceInputMode: "instrumented",
          minEvidenceLevel: "instrumented-runtime",
        },
      })),
      acceptedWarningIds: [],
    };
    const preflight = preflightSelection(draft, manifest, { maxCases: 500 });
    expect(preflight.ready, JSON.stringify(preflight.diagnostics)).toBe(true);
    expect(preflight.matrix).toHaveLength(414);
    const pairs = new Map<string, number>();
    for (const entry of preflight.matrix) {
      const key = `${entry.selectedCase.caseKey.theme}/${entry.selectedCase.caseKey.themeId}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
    expect([...pairs.values()]).toEqual([69, 69, 69, 69, 69, 69]);
    const driver = new PlaywrightCaseCaptureDriver(undefined, {
      reuseAppearances: process.env.PB_CAPTURE_INDEPENDENT !== "1",
    });
    const result = await capturePreflightToStore({
      store,
      bundleId: "bundle-yike-reference-test",
      preflight,
      runtimeBaseUrl: new URL(page.url()).origin,
      driver,
    });
    expect(
      result.run.attempts.filter((attempt) => attempt.result !== "captured"),
    ).toEqual([]);
    expect(result.run.attempts.length).toBe(preflight.matrix.length);
    if (process.env.PB_CAPTURE_INDEPENDENT !== "1") {
      expect(driver.metrics.sharedAppearanceCases).toBeGreaterThan(200);
      expect(driver.metrics.contextsCreated).toBeLessThan(200);
    }
    const screenshots = (
      await store.listBlobRecords(result.snapshot.bundleId)
    ).filter((blob) => blob.kind === "screenshot");
    expect(
      new Set(
        screenshots.flatMap((blob) =>
          blob.ownerRefs
            .filter((owner) => owner.kind === "revision")
            .map((owner) => owner.objectId),
        ),
      ).size,
    ).toBe(414);
    for (const entry of preflight.matrix.filter(
      (entry) =>
        entry.selectedCase.caseKey.screenId === "yike.focus" &&
        entry.selectedCase.caseKey.variantId === "default" &&
        !entry.scenario,
    )) {
      const slot = result.snapshot.activeSlots.find(
        (slot) => slot.caseId === entry.selectedCase.caseId,
      )!;
      const revision = await store.getEvidenceRevision(
        result.snapshot.bundleId,
        slot.revisionId,
      );
      const actual = revision!.facts.find(
        (fact) => fact.factId === "yike.focus.runtime.theme",
      )!.effectiveValue;
      expect(actual).toMatchObject({
        theme: entry.selectedCase.caseKey.theme,
        mode: entry.selectedCase.caseKey.themeId,
      });
      expect(
        revision!.facts.some(
          (fact) =>
            fact.factId.startsWith("yike.checkin.") ||
            fact.factId.startsWith("yike.review."),
        ),
      ).toBe(false);
    }
    const focus = result.snapshot.activeSlots.find(
      (slot) =>
        slot.caseId.startsWith(
          "yike.focus::default::light::iphone-14::theme=mechanical",
        ) && !slot.caseId.includes("scenario="),
    )!;
    const revision = await store.getEvidenceRevision(
      result.snapshot.bundleId,
      focus.revisionId,
    );
    const fixedProps = revision!.facts
      .filter((fact) => fact.factId.endsWith(".props"))
      .map((fact) => fact.effectiveValue);
    expect(fixedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artwork: expect.objectContaining({
            declared: expect.objectContaining({ assetId: "mechanical-light" }),
            sourceDigest: expect.stringMatching(/^sha1:/),
          }),
        }),
        expect.objectContaining({
          icons: expect.arrayContaining([
            expect.objectContaining({ name: "settings" }),
          ]),
        }),
      ]),
    );
    expect(
      (await store.listBlobRecords(result.snapshot.bundleId)).some(
        (blob) => blob.kind === "theme-asset",
      ),
    ).toBe(false);
    const stalenessReport = await store.createStalenessReport({
      bundleId: result.snapshot.bundleId,
      snapshotId: result.snapshot.snapshotId,
      inputVersion: preflight.inputVersion,
      currentDependencyDigests: Object.fromEntries([
        ["manifest:yike", preflight.manifestDigest],
        ...manifest.screens.map((screen: any) => [
          `runtime:${screen.screenId}`,
          preflight.inputVersion,
        ]),
      ]),
    });
    const handoffInput = {
      store,
      bundleId: result.snapshot.bundleId,
      snapshotId: result.snapshot.snapshotId,
      stalenessReport,
    };
    const evaluation = await evaluateAgentHandoff(handoffInput);
    const handoff = await createAgentHandoff({
      ...handoffInput,
      currentInputVersion: preflight.inputVersion,
      acknowledgedRiskKinds: evaluation.risks.map((risk) => risk.kind),
    });
    expect(handoff.snapshotId).toBe(result.snapshot.snapshotId);
    const revisions = await Promise.all(
      result.snapshot.activeSlots.map(
        async (slot) =>
          (await store.getEvidenceRevision(
            result.snapshot.bundleId,
            slot.revisionId,
          ))!,
      ),
    );
    const evidence = buildEvidenceReadModel({
      snapshot: result.snapshot,
      runs: [result.run],
      revisions,
      blobs: await store.listBlobRecords(result.snapshot.bundleId),
    });
    expect(evidence.themeCoverage?.status).toBe("complete");
    expect(
      evidence.themeCoverage?.combinations.map((combination) => ({
        expected: combination.expectedCaseCount,
        captured: combination.capturedCaseCount,
      })),
    ).toEqual(Array(6).fill({ expected: 69, captured: 69 }));
    const observed = evidence.screens.flatMap((screen) => screen.cases);
    expect(observed).toHaveLength(414);
    expect(
      observed.every(
        (item) =>
          item.execution?.sourceExecutionStatus === "matched" &&
          item.execution.sourceRevisionId,
      ),
    ).toBe(true);
    expect(
      observed.filter((item) => item.execution?.mode === "shared-appearance"),
    ).toHaveLength(driver.metrics.sharedAppearanceCases);
    console.log(
      JSON.stringify({
        label: "Yike full theme Capture",
        cases: result.run.attempts.length,
        driver: driver.metrics,
        runSeconds:
          (Date.parse(result.run.endedAt) - Date.parse(result.run.startedAt)) /
          1000,
        mechanicalLightCaseSeconds: result.run.attempts
          .filter((attempt) =>
            attempt.caseId.includes("::light::iphone-14::theme=mechanical"),
          )
          .reduce(
            (sum, attempt) =>
              sum +
              (Date.parse(attempt.endedAt) - Date.parse(attempt.startedAt)) /
                1000,
            0,
          ),
        screenshots: screenshots.length,
        firstBundleSnapshotHandoff: true,
      }),
    );
  } finally {
    await store.close();
    await rm(root, { recursive: true, force: true });
  }
});

for (const tag of ["img", "svg-image"]) {
  test(`Core Capture rejects a visible missing ${tag} but accepts a hidden one`, async ({
    page,
  }) => {
    await page.goto("/prototype/yike/__manifest__");
    const described = await runtimeRequest(page, { kind: "describe" });
    const manifest = described.payload.manifest;
    let hidden = false;
    const server = createServer((request, response) => {
      if (request.url?.startsWith("/missing.svg"))
        return void response.writeHead(404).end();
      const content =
        tag === "img"
          ? '<img width="100" height="100" src="/missing.svg">'
          : '<svg width="100" height="100"><image width="100" height="100" href="/missing.svg" /></svg>';
      response.setHeader("content-type", "text/html");
      response.end(
        `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div data-pb-id="broken-picture" style="${hidden ? "display:none" : ""}">${content}</div></body></html>`,
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address() as { port: number };
      const preflight = preflightSelection(
        {
          prototypeId: "yike",
          themePack: {
            packId: manifest.theme.packId,
            packDigest: manifest.theme.packDigest,
            theme: manifest.theme.defaultTheme,
            mode: manifest.theme.defaultMode,
          },
          screens: [
            {
              screenId: "yike.focus",
              variants: { mode: "explicit", variantIds: ["default"] },
              deviceIds: ["iphone-14"],
              scenarios: { mode: "none" },
              captureScope: {
                fragments: [],
                screenshots: { mode: "all" },
                sourcePolicy: false,
                debugPolicy: false,
                evidenceInputMode: "screenshot-only",
                minEvidenceLevel: "screenshot-only",
              },
            },
          ],
          acceptedWarningIds: [],
        },
        manifest,
      );
      const input = {
        entry: preflight.matrix[0]!,
        preflight,
        runtimeBaseUrl: `http://127.0.0.1:${address.port}`,
      };
      await expect(
        new PlaywrightCaseCaptureDriver().captureCase(input),
      ).rejects.toThrow("Page image failed to load: broken-picture");
      hidden = true;
      expect(
        (
          await new PlaywrightCaseCaptureDriver().captureCase(input)
        ).binaries.some((binary) => binary.kind === "screenshot"),
      ).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
}

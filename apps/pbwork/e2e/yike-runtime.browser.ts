import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { LocalFileStore } from "@proto-bridge/core/v2/store";
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
  const preflight = preflightSelection(draft, manifest);
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

test("full yike Capture creates its first Bundle and Handoff with DS references only", async ({
  page,
}) => {
  test.setTimeout(360_000);
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
    const preflight = preflightSelection(draft, manifest);
    expect(preflight.ready, JSON.stringify(preflight.diagnostics)).toBe(true);
    const result = await capturePreflightToStore({
      store,
      bundleId: "bundle-yike-reference-test",
      preflight,
      runtimeBaseUrl: new URL(page.url()).origin,
      driver: new PlaywrightCaseCaptureDriver(),
    });
    expect(
      result.run.attempts.filter((attempt) => attempt.result !== "captured"),
    ).toEqual([]);
    expect(result.run.attempts.length).toBe(preflight.matrix.length);
    const focus = result.snapshot.activeSlots.find(
      (slot) =>
        slot.caseId.startsWith("yike.focus::default::") &&
        !slot.caseId.includes("scenario="),
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
    console.log(
      `Yike reference-only Capture: ${result.run.attempts.length} Cases; first Bundle, Snapshot and Handoff committed.`,
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

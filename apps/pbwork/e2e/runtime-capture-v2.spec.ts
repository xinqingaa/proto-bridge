import { expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  PlaywrightCaseCaptureDriver,
  capturePreflightToStore,
  preflightSelection,
  type SelectionDraft,
} from "@proto-bridge/core/v2/capture";
import { fixtures } from "@proto-bridge/core/v2";
import { LocalFileStore } from "@proto-bridge/core/v2/store";
import type { RuntimeCaptureManifest } from "@proto-bridge/core/v2/runtime-contract";

test("V2 Runtime protocol captures default, stable repeated rows, Scenario Checkpoint and reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/task-list?variant=default&theme=light",
  );
  await expect(page.getByTestId("runtime-root")).toBeVisible();

  async function request(
    requestId: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await page.evaluate(
          async ({ id, body }) => {
            const api = (
              window as unknown as Record<
                string,
                { request(input: unknown): Promise<unknown> }
              >
            ).__PROTO_BRIDGE_CAPTURE_V2__;
            if (!api) throw new Error("V2 Runtime Capture Protocol missing");
            return api.request({
              protocolVersion: 2,
              requestId: id,
              payload: body,
            });
          },
          { id: requestId, body: payload },
        );
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("Execution context was destroyed") ||
          attempt >= 2
        ) {
          throw error;
        }
        await page.waitForLoadState("domcontentloaded");
        await page.waitForFunction(() =>
          Boolean(
            (window as unknown as Record<string, unknown>)
              .__PROTO_BRIDGE_CAPTURE_V2__,
          ),
        );
      }
    }
  }

  const described = await request("e2e-describe", { kind: "describe" });
  expect(described.ok).toBe(true);
  const taskList = described.payload.manifest.screens.find(
    (screen: { screenId: string }) =>
      screen.screenId === "ledger-planet.task-list",
  );
  expect(
    taskList.variants
      .filter((variant: { critical: boolean }) => variant.critical)
      .map((variant: { variantId: string }) => variant.variantId),
  ).toEqual(["claimable"]);
  expect(taskList.actions[0].actionId).toBe("open-claimable-task");
  expect(taskList.scenarios[0].checkpoints[0].checkpointId).toBe(
    "claimable-task-detail",
  );

  const prepared = await request("e2e-prepare", {
    kind: "prepare",
    expected: {
      prototypeId: "ledger-planet",
      screenId: "ledger-planet.task-list",
      variantId: "default",
      themeId: "light",
    },
  });
  expect(prepared.ok).toBe(true);

  const ready = await request("e2e-ready", {
    kind: "readiness",
    expected: {
      prototypeId: "ledger-planet",
      screenId: "ledger-planet.task-list",
      variantId: "default",
      themeId: "light",
      viewport: { width: 390, height: 844 },
    },
    requiredFragments: [
      {
        screenId: "ledger-planet.task-list",
        pbId: "ledger-planet.task-list.list.row",
        pbKey: "t2",
      },
    ],
  });
  expect(ready.ok).toBe(true);

  const snapshot = await request("e2e-snapshot", {
    kind: "semantic-snapshot",
    fragments: [],
  });
  expect(snapshot.ok).toBe(true);
  const rows = snapshot.payload.nodes.filter(
    (node: { fragment: { pbId: string } }) =>
      node.fragment.pbId === "ledger-planet.task-list.list.row",
  );
  expect(
    rows.map((node: { fragment: { pbKey: string } }) => node.fragment.pbKey),
  ).toEqual(["t1", "t2", "t3"]);
  const repeatedSnapshot = await request("e2e-snapshot-repeat", {
    kind: "semantic-snapshot",
    fragments: [],
  });
  expect(repeatedSnapshot.payload).toEqual(snapshot.payload);

  const action = await request("e2e-action", {
    kind: "execute-action",
    scenarioId: "open-claimable-task",
    actionId: "open-claimable-task",
  });
  expect(action.ok).toBe(true);

  const checkpoint = await request("e2e-checkpoint", {
    kind: "verify-checkpoint",
    scenarioId: "open-claimable-task",
    checkpointId: "claimable-task-detail",
  });
  expect(checkpoint.ok).toBe(true);
  expect(checkpoint.payload.actual).toMatchObject({
    screenId: "ledger-planet.task-detail",
    variantId: "claimable",
    themeId: "light",
  });

  const reset = await request("e2e-reset", { kind: "reset" });
  expect(reset.ok, JSON.stringify(reset)).toBe(true);
  expect(reset.payload.actual).toMatchObject({
    screenId: "ledger-planet.task-list",
    variantId: "default",
    themeId: "light",
  });
});

test("the fixed three-page regression baseline still resolves", async ({
  page,
}) => {
  for (const path of [
    "/prototype/ledger-planet/task-list?variant=default&theme=light",
    "/prototype/ledger-planet/ledger-list?variant=default&theme=light",
    "/prototype/field-service/create-work-order?variant=default&theme=light",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("runtime-root")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("Core Playwright orchestrator commits default, critical, Fragment and Scenario Evidence to the V2 Store", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/task-list?variant=default&theme=light",
  );
  await page.waitForFunction(() =>
    Boolean(
      (window as unknown as Record<string, unknown>)
        .__PROTO_BRIDGE_CAPTURE_V2__,
    ),
  );
  const manifest = (await page.evaluate(async () => {
    const api = (
      window as unknown as Record<
        string,
        { request(input: unknown): Promise<any> }
      >
    ).__PROTO_BRIDGE_CAPTURE_V2__;
    if (!api) throw new Error("V2 Runtime Capture Protocol missing");
    const response = await api.request({
      protocolVersion: 2,
      requestId: "e2e-store-describe",
      payload: { kind: "describe" },
    });
    return response.payload.manifest;
  })) as RuntimeCaptureManifest;

  const baseScope = {
    fragments: [],
    screenshots: { mode: "all" as const },
    sourcePolicy: false,
    debugPolicy: true,
    evidenceInputMode: "instrumented" as const,
    minEvidenceLevel: "instrumented-runtime" as const,
  };
  const fullDraft: SelectionDraft = {
    prototypeId: "ledger-planet",
    screens: [
      {
        screenId: "ledger-planet.task-list",
        variants: { mode: "default-and-critical" },
        themeIds: ["light"],
        deviceIds: ["iphone-14"],
        scenarios: {
          mode: "explicit",
          scenarioIds: ["open-claimable-task"],
        },
        captureScope: baseScope,
      },
    ],
    acceptedWarningIds: [],
  };
  const fragment = {
    screenId: "ledger-planet.task-list",
    pbId: "ledger-planet.task-list.list.row",
    pbKey: "t2",
  };
  const fragmentDraft: SelectionDraft = {
    prototypeId: "ledger-planet",
    screens: [
      {
        screenId: "ledger-planet.task-list",
        variants: { mode: "default" },
        themeIds: ["light"],
        deviceIds: ["iphone-14"],
        scenarios: { mode: "none" },
        captureScope: {
          ...baseScope,
          fragments: [fragment],
          screenshots: { mode: "selected", targets: [fragment] },
        },
      },
    ],
    acceptedWarningIds: [],
  };

  const storeRoot = await mkdtemp(path.join(os.tmpdir(), "pb-v2-browser-e2e-"));
  const reference = fixtures.ledgerPlanetTaskList;
  const store = new LocalFileStore({
    root: storeRoot,
    workspaceId: reference.WORKSPACE_ID,
  });
  try {
    await store.init();
    await store.createBundle({
      bundleId: reference.BUNDLE_ID,
      prototypeId: reference.PROTOTYPE_ID,
      run: reference.RUN_1,
      revisions: [reference.PRIMARY_ACTIVE_REVISION],
      coverage: reference.RUN_1.coverage,
    });
    const runtimeBaseUrl = new URL(page.url()).origin;
    const driver = new PlaywrightCaseCaptureDriver();
    const full = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: preflightSelection(fullDraft, manifest),
      runtimeBaseUrl,
      driver,
    });
    expect(full.run.attempts).toHaveLength(3);
    expect(
      full.run.attempts.map((attempt) => ({
        caseId: attempt.caseId,
        result: attempt.result,
        reason: attempt.reason,
      })),
    ).toEqual(
      full.run.attempts.map((attempt) => ({
        caseId: attempt.caseId,
        result: "captured",
        reason: undefined,
      })),
    );
    expect(full.snapshot.coverage.counts.captured).toBe(3);

    const scoped = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: preflightSelection(fragmentDraft, manifest),
      runtimeBaseUrl,
      driver,
    });
    expect(scoped.run.attempts[0]?.result).toBe("captured");
    expect(
      scoped.snapshot.activeSlots.some(
        (slot) =>
          slot.kind === "scoped" &&
          slot.caseId === scoped.run.selection.cases[0]?.caseId,
      ),
    ).toBe(true);
    expect(scoped.storedBlobIds).toHaveLength(1);

    const genericDraft: SelectionDraft = {
      prototypeId: "ledger-planet",
      screens: [
        {
          screenId: "ledger-planet.task-list",
          variants: { mode: "default" },
          themeIds: ["light"],
          deviceIds: ["iphone-14"],
          scenarios: { mode: "none" },
          captureScope: {
            fragments: [],
            screenshots: { mode: "all" },
            sourcePolicy: false,
            debugPolicy: false,
            evidenceInputMode: "generic-runtime",
            minEvidenceLevel: "generic-runtime",
          },
        },
      ],
      acceptedWarningIds: [],
    };
    const generic = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: preflightSelection(genericDraft, manifest),
      runtimeBaseUrl,
      driver,
    });
    expect(generic.run.attempts[0]?.result).toBe("captured");
    expect(
      (
        await store.getEvidenceRevision(
          reference.BUNDLE_ID,
          generic.run.attempts[0]!.revisionId!,
        )
      )?.evidenceLevel,
    ).toBe("generic-runtime");

    const screenshotDraft: SelectionDraft = {
      prototypeId: "ledger-planet",
      screens: [
        {
          screenId: "ledger-planet.task-list",
          variants: { mode: "explicit", variantIds: ["empty"] },
          themeIds: ["light"],
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
    };
    const screenshotOnly = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: preflightSelection(screenshotDraft, manifest),
      runtimeBaseUrl,
      driver,
    });
    expect(screenshotOnly.run.attempts[0]?.result).toBe("captured");
    expect(
      (
        await store.getEvidenceRevision(
          reference.BUNDLE_ID,
          screenshotOnly.run.attempts[0]!.revisionId!,
        )
      )?.evidenceLevel,
    ).toBe("screenshot-only");
  } finally {
    await store.close();
    await rm(storeRoot, { recursive: true, force: true });
  }
});

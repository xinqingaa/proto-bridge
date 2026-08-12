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

test("the fixed three-page regression baseline still resolves", async ({
  page,
}) => {
  for (const path of [
    "/prototype/cold-chain-ops/exception-queue?variant=default&theme=light",
    "/prototype/cold-chain-ops/shipment-detail?variant=default&theme=light&shipment=SH-2048",
    "/prototype/cold-chain-ops/resolution-form?variant=default&theme=light&shipment=SH-2048",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("runtime-root")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("cold-chain-ops satisfies every authored Variant and required Scenario boundary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

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

  await page.goto(
    "/prototype/cold-chain-ops/exception-queue?variant=default&theme=light",
  );
  await page.waitForFunction(() =>
    Boolean(
      (window as unknown as Record<string, unknown>)
        .__PROTO_BRIDGE_CAPTURE_V2__,
    ),
  );
  const described = await request("cold-chain-describe", { kind: "describe" });
  expect(described.ok, JSON.stringify(described)).toBe(true);
  expect(described.payload.manifest.authoringDiagnostics).toEqual([]);

  const exceptionQueue = described.payload.manifest.screens.find(
    (screen: { screenId: string }) =>
      screen.screenId === "cold-chain-ops.exception-queue",
  );
  expect(exceptionQueue).toBeTruthy();
  for (const variant of exceptionQueue.variants) {
    expect(
      variant.structureAssertions ?? [],
      `${variant.variantId} must not author scroll-owner mirrors`,
    ).toEqual([]);
  }

  const screens = described.payload.manifest.screens.filter(
    (screen: { prototypeId: string }) =>
      screen.prototypeId === "cold-chain-ops",
  );
  expect(screens).toHaveLength(3);

  for (const screen of screens) {
    for (const variant of screen.variants.filter(
      (item: { requiredFragments?: unknown[] }) =>
        (item.requiredFragments?.length ?? 0) > 0,
    )) {
      await page.goto(
        `/prototype/cold-chain-ops/${screen.screenSlug}?variant=${variant.variantId}&theme=light&shipment=SH-2048`,
      );
      await page.waitForFunction(() =>
        Boolean(
          (window as unknown as Record<string, unknown>)
            .__PROTO_BRIDGE_CAPTURE_V2__,
        ),
      );
      const suffix = `${screen.screenSlug}-${variant.variantId}`;
      const prepare = await request(`cold-chain-prepare-${suffix}`, {
        kind: "prepare",
        expected: {
          prototypeId: "cold-chain-ops",
          screenId: screen.screenId,
          variantId: variant.variantId,
          themeId: "light",
        },
      });
      const readiness = await request(`cold-chain-ready-${suffix}`, {
        kind: "readiness",
        expected: {
          prototypeId: "cold-chain-ops",
          screenId: screen.screenId,
          variantId: variant.variantId,
          themeId: "light",
          viewport: { width: 390, height: 844 },
        },
        requiredFragments: variant.requiredFragments,
      });
      const snapshot = await request(`cold-chain-snapshot-${suffix}`, {
        kind: "semantic-snapshot",
        fragments: variant.requiredFragments,
      });
      expect(prepare.ok, `${suffix}: ${JSON.stringify(prepare)}`).toBe(true);
      expect(readiness.ok, `${suffix}: ${JSON.stringify(readiness)}`).toBe(
        true,
      );
      expect(snapshot.ok, `${suffix}: ${JSON.stringify(snapshot)}`).toBe(true);
      expect(snapshot.payload.nodes).toHaveLength(
        variant.requiredFragments.length,
      );
      expect(
        snapshot.payload.nodes.every(
          (node: {
            visible: boolean;
            bbox: { width: number; height: number };
          }) => node.visible && node.bbox.width > 0 && node.bbox.height > 0,
        ),
      ).toBe(true);

      if (
        screen.screenId === "cold-chain-ops.exception-queue" &&
        variant.variantId === "default"
      ) {
        const scrollListOwner = {
          kind: "fragment",
          fragment: {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.scroll-list",
          },
        };
        for (const slot of ["summary", "search", "filters", "list"]) {
          const pbId = `cold-chain-ops.exception-queue.${slot}`;
          const node = snapshot.payload.nodes.find(
            (candidate: { fragment: { pbId: string } }) =>
              candidate.fragment.pbId === pbId,
          );
          expect(node, pbId).toBeTruthy();
          expect(node.scrollOwner).toEqual(scrollListOwner);
          expect(node.scrollOwner.fragment.pbId).not.toMatch(/^ds\./);
        }
        const topology = await request(`cold-chain-topology-${suffix}`, {
          kind: "semantic-snapshot",
          fragments: [
            {
              screenId: "cold-chain-ops.exception-queue",
              pbId: "cold-chain-ops.exception-queue.scroll-list",
            },
          ],
        });
        expect(topology.ok, JSON.stringify(topology)).toBe(true);
        expect(topology.payload.nodes[0]?.fragment.pbId).toBe(
          "cold-chain-ops.exception-queue.scroll-list",
        );
        expect(topology.payload.nodes[0]?.role).toBe("scroll-list");
      }
    }
  }

  for (const screen of screens) {
    for (const scenarioId of screen.requiredScenarioIds) {
      const scenario = screen.scenarios.find(
        (candidate: { scenarioId: string }) =>
          candidate.scenarioId === scenarioId,
      );
      await page.goto(
        `/prototype/cold-chain-ops/${screen.screenSlug}?variant=${scenario.initialVariantId}&theme=light&shipment=SH-2048`,
      );
      await page.waitForFunction(() =>
        Boolean(
          (window as unknown as Record<string, unknown>)
            .__PROTO_BRIDGE_CAPTURE_V2__,
        ),
      );
      const prepare = await request(
        `cold-chain-scenario-prepare-${scenarioId}`,
        {
          kind: "prepare",
          expected: {
            prototypeId: "cold-chain-ops",
            screenId: screen.screenId,
            variantId: scenario.initialVariantId,
            themeId: "light",
          },
        },
      );
      expect(prepare.ok, JSON.stringify(prepare)).toBe(true);
      const initialVariant = screen.variants.find(
        (candidate: { variantId: string }) =>
          candidate.variantId === scenario.initialVariantId,
      );
      const ready = await request(`cold-chain-scenario-ready-${scenarioId}`, {
        kind: "readiness",
        expected: {
          prototypeId: "cold-chain-ops",
          screenId: screen.screenId,
          variantId: scenario.initialVariantId,
          themeId: "light",
          viewport: { width: 390, height: 844 },
        },
        requiredFragments: initialVariant.requiredFragments,
      });
      expect(ready.ok, `${scenarioId}: ${JSON.stringify(ready)}`).toBe(true);
      for (const actionId of scenario.actionIds) {
        const action = await request(
          `cold-chain-scenario-action-${scenarioId}-${actionId}`,
          { kind: "execute-action", scenarioId, actionId },
        );
        expect(action.ok, `${scenarioId}: ${JSON.stringify(action)}`).toBe(
          true,
        );
      }
      for (const checkpoint of scenario.checkpoints) {
        const verified = await request(
          `cold-chain-scenario-checkpoint-${scenarioId}-${checkpoint.checkpointId}`,
          {
            kind: "verify-checkpoint",
            scenarioId,
            checkpointId: checkpoint.checkpointId,
          },
        );
        expect(verified.ok, `${scenarioId}: ${JSON.stringify(verified)}`).toBe(
          true,
        );
      }
      const reset = await request(`cold-chain-scenario-reset-${scenarioId}`, {
        kind: "reset",
      });
      expect(reset.ok, `${scenarioId}: ${JSON.stringify(reset)}`).toBe(true);
    }
  }
});


test("Core Playwright orchestrator commits explicit Variant, Fragment and Scenario Evidence to the V2 Store", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/cold-chain-ops/exception-queue?variant=default&theme=light",
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
    prototypeId: "cold-chain-ops",
    screens: [
      {
        screenId: "cold-chain-ops.exception-queue",
        variants: { mode: "explicit", variantIds: ["default"] },
        themeIds: ["light"],
        deviceIds: ["iphone-14"],
        scenarios: {
          mode: "explicit",
          scenarioIds: ["focus-critical", "inspect-primary-exception"],
        },
        captureScope: baseScope,
      },
    ],
    acceptedWarningIds: [],
  };
  const fragment = {
    screenId: "cold-chain-ops.exception-queue",
    pbId: "cold-chain-ops.exception-queue.list.row",
    pbKey: "ex-017",
  };
  const fragmentDraft: SelectionDraft = {
    prototypeId: "cold-chain-ops",
    screens: [
      {
        screenId: "cold-chain-ops.exception-queue",
        variants: { mode: "explicit", variantIds: ["default"] },
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
    acceptedWarningIds: ["warning-interaction-coverage"],
  };

  const storeRoot = await mkdtemp(path.join(os.tmpdir(), "pb-v2-browser-e2e-"));
  const reference = fixtures.referenceCaseSlice;
  const store = new LocalFileStore({
    root: storeRoot,
    workspaceId: reference.WORKSPACE_ID,
  });
  try {
    await store.init();
    await store.createBundle({
      bundleId: reference.BUNDLE_ID,
      prototypeId: "cold-chain-ops",
      run: {
        ...reference.RUN_1,
        selection: {
          ...reference.RUN_1.selection,
          prototypeId: "cold-chain-ops",
        },
      },
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
      full.run.attempts.every((attempt) => attempt.result === "captured"),
    ).toBe(true);
    expect(full.snapshot.coverage.counts.captured).toBe(3);
    expect(full.run.coverage.factQuality).toMatchObject({
      heuristic: 0,
      unknown: 0,
      conflict: 0,
    });

    const selectedCaseFor = (variantId: string, scenarioId?: string) => {
      const selected = full.run.selection.cases.find(
        (candidate) =>
          candidate.caseKey.variantId === variantId &&
          candidate.caseKey.scenario?.scenarioId === scenarioId,
      );
      expect(selected).toBeDefined();
      return selected!;
    };
    const revisionFor = async (variantId: string, scenarioId?: string) => {
      const selected = selectedCaseFor(variantId, scenarioId);
      const attempt = full.run.attempts.find(
        (candidate) => candidate.caseId === selected.caseId,
      );
      expect(attempt?.result).toBe("captured");
      expect(attempt?.revisionId).toBeDefined();
      const revision = await store.getEvidenceRevision(
        reference.BUNDLE_ID,
        attempt!.revisionId!,
      );
      expect(revision).toBeDefined();
      return revision!;
    };
    const fact = (
      revision: Awaited<ReturnType<typeof revisionFor>>,
      factId: string,
    ) => {
      const found = revision.facts.find(
        (candidate) => candidate.factId === factId,
      );
      expect(found, `missing ${factId}`).toBeDefined();
      return found!;
    };

    const defaultRevision = await revisionFor("default");
    expect(defaultRevision.requiredFactsResolved).toBe(
      defaultRevision.requiredFactsTotal,
    );
    expect(
      fact(
        defaultRevision,
        "cold-chain-ops.exception-queue.runtime.semantic-coverage",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        status: "declared",
        scopeSource: "variant-contract",
      },
    });
    for (const [rowId, snippets] of [
      ["ex-017", ["上海虹桥", "生物制剂", "SH-2048"]],
      ["ex-031", ["苏州园区", "细胞样本"]],
      ["ex-024", ["无锡新吴", "胰岛素"]],
    ] as const) {
      const text = String(
        fact(
          defaultRevision,
          `cold-chain-ops.exception-queue.list.row.${rowId}.text`,
        ).effectiveValue,
      );
      for (const snippet of snippets) expect(text).toContain(snippet);
    }
    expect(
      fact(defaultRevision, "cold-chain-ops.exception-queue.list.row.ex-017.tag")
        .effectiveValue,
    ).toBe("button");
    expect(
      fact(
        defaultRevision,
        "cold-chain-ops.exception-queue.list.row.ex-017.bbox",
      ).effectiveValue,
    ).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(
      fact(
        defaultRevision,
        "cold-chain-ops.exception-queue.action.open-primary-exception",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        kind: "click",
        target: {
          pbId: "cold-chain-ops.exception-queue.list.row",
          pbKey: "ex-017",
        },
      },
    });

    const criticalRevision = await revisionFor(
      "critical-only",
      "focus-critical",
    );
    expect(
      fact(
        criticalRevision,
        "cold-chain-ops.exception-queue.list.row.ex-017.text",
      ).effectiveValue,
    ).toContain("上海虹桥");
    expect(
      criticalRevision.facts.some((candidate) =>
        candidate.factId.includes("list.row.ex-024"),
      ),
    ).toBe(false);

    const scenarioRevision = await revisionFor(
      "active-excursion",
      "inspect-primary-exception",
    );
    expect(
      fact(
        scenarioRevision,
        "cold-chain-ops.exception-queue.scenario.inspect-primary-exception.shipment-opened",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        ownerScreenId: "cold-chain-ops.exception-queue",
        actionIds: ["open-primary-exception"],
        checkpoint: {
          screenId: "cold-chain-ops.shipment-detail",
          variantId: "active-excursion",
        },
      },
    });
    const detailText = String(
      fact(scenarioRevision, "cold-chain-ops.shipment-detail.root.text")
        .effectiveValue,
    );
    for (const snippet of ["持续超温 47 分钟", "10.8", "箱温"]) {
      expect(detailText).toContain(snippet);
    }
    expect(
      full.run.attempts.every((attempt) =>
        attempt.revisionId
          ? [defaultRevision, criticalRevision, scenarioRevision]
              .find((revision) => revision.revisionId === attempt.revisionId)
              ?.facts.every((candidate) =>
                candidate.candidates.every(
                  (value) => value.provenance.source !== "heuristic",
                ),
              )
          : false,
      ),
    ).toBe(true);
    const fullBlobs = await store.listBlobRecords(reference.BUNDLE_ID);
    for (const revision of [
      defaultRevision,
      criticalRevision,
      scenarioRevision,
    ]) {
      expect(
        fullBlobs.some(
          (blob) =>
            blob.kind === "screenshot" &&
            blob.ownerRefs.some(
              (owner) =>
                owner.kind === "revision" &&
                owner.objectId === revision.revisionId,
            ),
        ),
      ).toBe(true);
    }

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
    const scopedAttempt = scoped.run.attempts[0]!;
    const scopedRevision = await store.getEvidenceRevision(
      reference.BUNDLE_ID,
      scopedAttempt.revisionId!,
    );
    expect(scopedRevision).toBeDefined();
    expect(
      fact(
        scopedRevision!,
        "cold-chain-ops.exception-queue.runtime.semantic-coverage",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        status: "declared",
        scopeSource: "selection",
        requiredFragments: [fragment],
      },
    });
    expect(
      scopedRevision!.facts
        .filter((candidate) =>
          candidate.factId.startsWith(
            "cold-chain-ops.exception-queue.list.row.",
          ),
        )
        .every((candidate) =>
          candidate.factId.startsWith(
            "cold-chain-ops.exception-queue.list.row.ex-017.",
          ),
        ),
    ).toBe(true);
    const repeatedScoped = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: preflightSelection(fragmentDraft, manifest),
      runtimeBaseUrl,
      driver,
    });
    expect(repeatedScoped.run.attempts[0]?.result).toBe("reused");
    expect(repeatedScoped.run.attempts[0]?.revisionId).toBe(
      scopedAttempt.revisionId,
    );
    expect(repeatedScoped.storedBlobIds).toHaveLength(0);

    const genericDraft: SelectionDraft = {
      prototypeId: "cold-chain-ops",
      screens: [
        {
          screenId: "cold-chain-ops.exception-queue",
          variants: { mode: "explicit", variantIds: ["default"] },
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
      acceptedWarningIds: ["warning-interaction-coverage"],
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
      prototypeId: "cold-chain-ops",
      screens: [
        {
          screenId: "cold-chain-ops.exception-queue",
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
      acceptedWarningIds: ["warning-interaction-coverage"],
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

import { expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  PlaywrightCaseCaptureDriver,
  capturePreflightToStore,
  evaluateAgentHandoff,
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
    taskList.variants.map(
      (variant: { variantId: string }) => variant.variantId,
    ),
  ).toEqual(["default", "empty"]);
  expect(
    taskList.variants.find(
      (variant: { variantId: string }) => variant.variantId === "default",
    ).requiredFragments,
  ).toEqual([
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.root",
    },
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.filters",
    },
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.list",
    },
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.list.row",
      pbKey: "t1",
    },
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.list.row",
      pbKey: "t2",
    },
    {
      screenId: "ledger-planet.task-list",
      pbId: "ledger-planet.task-list.list.row",
      pbKey: "t3",
    },
  ]);
  expect(
    taskList.actions.map((item: { actionId: string }) => item.actionId),
  ).toEqual(["select-todo", "select-done", "open-claimable-task"]);
  expect(
    taskList.scenarios.map((item: { scenarioId: string }) => item.scenarioId),
  ).toEqual(["filter-todo", "filter-done", "open-claimable-task"]);

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

  const todoAction = await request("e2e-action-todo", {
    kind: "execute-action",
    scenarioId: "filter-todo",
    actionId: "select-todo",
  });
  expect(todoAction.ok).toBe(true);
  const todoCheckpoint = await request("e2e-checkpoint-todo", {
    kind: "verify-checkpoint",
    scenarioId: "filter-todo",
    checkpointId: "todo-selected",
  });
  expect(todoCheckpoint.ok, JSON.stringify(todoCheckpoint)).toBe(true);
  await request("e2e-reset-after-todo", { kind: "reset" });

  const doneAction = await request("e2e-action-done", {
    kind: "execute-action",
    scenarioId: "filter-done",
    actionId: "select-done",
  });
  expect(doneAction.ok).toBe(true);
  const doneCheckpoint = await request("e2e-checkpoint-done", {
    kind: "verify-checkpoint",
    scenarioId: "filter-done",
    checkpointId: "done-selected",
  });
  expect(doneCheckpoint.ok, JSON.stringify(doneCheckpoint)).toBe(true);
  await request("e2e-reset-after-done", { kind: "reset" });

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
    "/prototype/ledger-planet/task-detail?variant=default&theme=light",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("runtime-root")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("all PB-compliant Ledger Planet samples satisfy their authored Evidence boundary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const screenSlug of ["task-list", "task-detail", "ledger-list"]) {
    await page.goto(
      `/prototype/ledger-planet/${screenSlug}?variant=default&theme=light`,
    );
    await page.waitForFunction(() =>
      Boolean(
        (window as unknown as Record<string, unknown>)
          .__PROTO_BRIDGE_CAPTURE_V2__,
      ),
    );
    const result = await page.evaluate(async (slug) => {
      const api = (
        window as unknown as Record<
          string,
          { request(input: unknown): Promise<any> }
        >
      ).__PROTO_BRIDGE_CAPTURE_V2__;
      if (!api) throw new Error("Runtime Capture Protocol missing");
      const describe = await api.request({
        protocolVersion: 2,
        requestId: `compliance-describe-${slug}`,
        payload: { kind: "describe" },
      });
      const screenId = `ledger-planet.${slug}`;
      const screen = describe.payload.manifest.screens.find(
        (candidate: { screenId: string }) => candidate.screenId === screenId,
      );
      const defaultVariant = screen.variants.find(
        (variant: { variantId: string }) =>
          variant.variantId === screen.defaultVariantId,
      );
      const requiredFragments = defaultVariant.requiredFragments;
      const prepare = await api.request({
        protocolVersion: 2,
        requestId: `compliance-prepare-${slug}`,
        payload: {
          kind: "prepare",
          expected: {
            prototypeId: "ledger-planet",
            screenId,
            variantId: screen.defaultVariantId,
            themeId: "light",
          },
        },
      });
      const readiness = await api.request({
        protocolVersion: 2,
        requestId: `compliance-ready-${slug}`,
        payload: {
          kind: "readiness",
          expected: {
            prototypeId: "ledger-planet",
            screenId,
            variantId: screen.defaultVariantId,
            themeId: "light",
            viewport: { width: 390, height: 844 },
          },
          requiredFragments,
        },
      });
      const snapshot = await api.request({
        protocolVersion: 2,
        requestId: `compliance-snapshot-${slug}`,
        payload: { kind: "semantic-snapshot", fragments: requiredFragments },
      });
      return { requiredFragments, prepare, readiness, snapshot };
    }, screenSlug);

    expect(result.requiredFragments.length).toBeGreaterThan(0);
    expect(result.prepare.ok).toBe(true);
    expect(result.readiness.ok).toBe(true);
    expect(
      result.snapshot.ok,
      `${screenSlug}: ${JSON.stringify(result.snapshot)}`,
    ).toBe(true);
    expect(result.snapshot.payload.nodes).toHaveLength(
      result.requiredFragments.length,
    );
    expect(
      result.snapshot.payload.nodes.every(
        (node: { visible: boolean; bbox: { width: number; height: number } }) =>
          node.visible && node.bbox.width > 0 && node.bbox.height > 0,
      ),
    ).toBe(true);
    expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
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
        variants: {
          mode: "explicit",
          variantIds: manifest.screens[0]!.variants.map(
            (variant) => variant.variantId,
          ),
        },
        themeIds: ["light"],
        deviceIds: ["iphone-14"],
        scenarios: {
          mode: "explicit",
          scenarioIds: ["filter-todo", "filter-done", "open-claimable-task"],
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
    expect(full.run.attempts).toHaveLength(4);
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
    expect(full.snapshot.coverage.counts.captured).toBe(4);
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
        "ledger-planet.task-list.runtime.semantic-coverage",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        status: "declared",
        scopeSource: "variant-contract",
      },
    });
    for (const [rowId, snippets] of [
      ["t1", ["记一笔", "今日完成 1 笔记账", "3 星币", "去完成"]],
      ["t2", ["查看本周图表", "打开图表分析页", "5 星币", "待领取"]],
      ["t3", ["连续记账 3 天", "成长任务", "¥3 体验券"]],
    ] as const) {
      const text = String(
        fact(defaultRevision, `ledger-planet.task-list.list.row.${rowId}.text`)
          .effectiveValue,
      );
      for (const snippet of snippets) expect(text).toContain(snippet);
    }
    expect(
      fact(defaultRevision, "ledger-planet.task-list.list.row.t2.tag")
        .effectiveValue,
    ).toBe("button");
    expect(
      fact(defaultRevision, "ledger-planet.task-list.list.row.t2.bbox")
        .effectiveValue,
    ).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(
      fact(
        defaultRevision,
        "ledger-planet.task-list.action.open-claimable-task",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        kind: "click",
        target: {
          pbId: "ledger-planet.task-list.list.row",
          pbKey: "t2",
        },
      },
    });

    const todoRevision = await revisionFor("default", "filter-todo");
    expect(
      fact(todoRevision, "ledger-planet.task-list.list.row.t1.text")
        .effectiveValue,
    ).toContain("记一笔");
    expect(
      todoRevision.facts.some((candidate) =>
        candidate.factId.includes("list.row.t2"),
      ),
    ).toBe(false);

    const doneRevision = await revisionFor("default", "filter-done");
    expect(
      fact(doneRevision, "ledger-planet.task-list.list.row.t2.text")
        .effectiveValue,
    ).toContain("待领取");
    expect(
      doneRevision.facts.some((candidate) =>
        candidate.factId.includes("list.row.t1"),
      ),
    ).toBe(false);

    const scenarioRevision = await revisionFor(
      "claimable",
      "open-claimable-task",
    );
    expect(
      fact(
        scenarioRevision,
        "ledger-planet.task-list.scenario.open-claimable-task.claimable-task-detail",
      ),
    ).toMatchObject({
      resolution: "resolved",
      effectiveValue: {
        ownerScreenId: "ledger-planet.task-list",
        actionIds: ["open-claimable-task"],
        checkpoint: {
          screenId: "ledger-planet.task-detail",
          variantId: "claimable",
        },
      },
    });
    const detailText = String(
      fact(scenarioRevision, "ledger-planet.task-detail.root.text")
        .effectiveValue,
    );
    for (const snippet of ["查看本周图表", "已达成", "领取奖励"]) {
      expect(detailText).toContain(snippet);
    }
    expect(
      full.run.attempts.every((attempt) =>
        attempt.revisionId
          ? [defaultRevision, todoRevision, doneRevision, scenarioRevision]
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
      todoRevision,
      doneRevision,
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
        "ledger-planet.task-list.runtime.semantic-coverage",
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
          candidate.factId.startsWith("ledger-planet.task-list.list.row."),
        )
        .every((candidate) =>
          candidate.factId.startsWith("ledger-planet.task-list.list.row.t2."),
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
      prototypeId: "ledger-planet",
      screens: [
        {
          screenId: "ledger-planet.task-list",
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

    const sparseDraft: SelectionDraft = {
      prototypeId: "ledger-planet",
      screens: [
        {
          screenId: "ledger-planet.analytics",
          variants: { mode: "explicit", variantIds: ["default"] },
          themeIds: ["light"],
          deviceIds: ["iphone-14"],
          scenarios: { mode: "none" },
          captureScope: baseScope,
        },
      ],
      acceptedWarningIds: [],
    };
    const sparsePreflight = preflightSelection(sparseDraft, manifest);
    const sparse = await capturePreflightToStore({
      store,
      bundleId: reference.BUNDLE_ID,
      preflight: sparsePreflight,
      runtimeBaseUrl,
      driver,
    });
    expect(sparse.run.attempts[0]?.result).toBe("captured");
    expect(sparse.run.coverage.factQuality).toMatchObject({
      heuristic: 0,
      unknown: 1,
      conflict: 0,
    });
    const sparseRevision = await store.getEvidenceRevision(
      reference.BUNDLE_ID,
      sparse.run.attempts[0]!.revisionId!,
    );
    expect(sparseRevision).toBeDefined();
    expect(
      fact(
        sparseRevision!,
        "ledger-planet.analytics.runtime.semantic-coverage",
      ),
    ).toMatchObject({
      resolution: "unknown",
      issueRef: "semantic-coverage-contract-missing",
      candidates: [
        {
          value: {
            status: "undeclared",
          },
        },
      ],
    });
    expect(sparseRevision!.requiredFactsResolved).toBeLessThan(
      sparseRevision!.requiredFactsTotal,
    );
    expect(
      sparseRevision!.facts.every((candidate) =>
        candidate.candidates.every(
          (value) => value.provenance.source !== "heuristic",
        ),
      ),
    ).toBe(true);

    const sparseStaleness = await store.createStalenessReport({
      bundleId: reference.BUNDLE_ID,
      snapshotId: sparse.snapshot.snapshotId,
      inputVersion: sparsePreflight.inputVersion,
      currentDependencyDigests: {
        "manifest:ledger-planet": sparsePreflight.manifestDigest,
        "runtime:ledger-planet.analytics": sparsePreflight.inputVersion,
      },
    });
    const sparseHandoff = await evaluateAgentHandoff({
      store,
      bundleId: reference.BUNDLE_ID,
      snapshotId: sparse.snapshot.snapshotId,
      selectedCases: sparse.run.selection.cases,
      stalenessReport: sparseStaleness,
    });
    expect(sparseHandoff.coverageStatus).toBe("complete");
    expect(sparseHandoff.freshnessStatus).toBe("fresh");
    expect(sparseHandoff.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "required-unknown",
          refs: ["ledger-planet.analytics.runtime.semantic-coverage"],
        }),
      ]),
    );
  } finally {
    await store.close();
    await rm(storeRoot, { recursive: true, force: true });
  }
});

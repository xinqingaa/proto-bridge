import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";

describe("PBWork V2 capture store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("builds current Screen and stable Fragment Drafts through one shape", () => {
    const store = useCaptureStore();
    store.beginCurrentScreen({
      prototypeId: "ledger-planet",
      screenId: "ledger-planet.task-list",
      variantId: "default",
      themeId: "light",
      deviceId: "iphone-14",
      returnTo:
        "/workbench/prototypes/ledger-planet/screens/task-list?variant=default&theme=light",
    });
    expect(store.entryKind).toBe("current-screen");
    expect(store.draft?.screens[0]?.variants).toEqual({
      mode: "explicit",
      variantIds: ["default"],
    });
    expect(store.draft?.screens[0]?.scenarios).toEqual({
      mode: "explicit",
      scenarioIds: [
        "filter-todo",
        "filter-done",
        "open-claimable-task",
      ],
    });

    expect(
      store.beginFragment({
        prototypeId: "ledger-planet",
        screenId: "ledger-planet.task-list",
        variantId: "default",
        themeId: "light",
        deviceId: "iphone-14",
        returnTo: "/workbench/prototypes/ledger-planet/screens/task-list",
        fragment: {
          screenId: "ledger-planet.task-list",
          pbId: "ledger-planet.task-list.list.row",
          pbKey: "t2",
        },
      }),
    ).toBe(true);
    expect(store.draft?.screens[0]?.captureScope.fragments[0]).toMatchObject({
      pbId: "ledger-planet.task-list.list.row",
      pbKey: "t2",
    });
    expect(store.draft?.screens[0]?.captureScope.screenshots.mode).toBe(
      "selected",
    );
  });

  it("builds custom and whole-Prototype Drafts without making all the default", () => {
    const store = useCaptureStore();
    store.beginCustom("ledger-planet");
    expect(store.draft?.screens).toHaveLength(1);
    store.toggleCustomScreen("ledger-planet.ledger-list", true);
    expect(store.draft?.screens).toHaveLength(2);

    store.beginPrototype("ledger-planet");
    expect(store.draft?.screens).toHaveLength(18);
    expect(
      store.draft?.screens.every(
        (screen) =>
          screen.variants.mode === "default" &&
          screen.scenarios.mode === "none",
      ),
    ).toBe(true);
    store.setAllVariantMode("all");
    store.setAllScenarioMode("critical");
    expect(
      store.draft?.screens.every((screen) => screen.variants.mode === "all"),
    ).toBe(true);
  });

  it("invalidates Preflight whenever CaptureRequest fields change", async () => {
    const store = useCaptureStore();
    store.beginCustom("ledger-planet");
    vi.spyOn(captureServiceClient, "createPreflight").mockResolvedValue({
      preflightId: "preflight-test",
      createdAt: "2026-07-29T08:00:00.000Z",
      expiresAt: "2026-07-29T08:05:00.000Z",
      result: {
        inputVersion: "runtime-v1",
        manifestDigest: "sha256:test",
        selection: {
          prototypeId: "ledger-planet",
          cases: [],
          acceptedWarningIds: [],
        },
        matrix: [],
        warnings: [
          {
            warningId: "warning-source-unavailable",
            message: "Source unavailable",
            caseIds: [],
          },
        ],
        unacceptedWarningIds: ["warning-source-unavailable"],
        ready: false,
      },
    } as any);
    await store.runPreflight();
    expect(store.preflight?.preflightId).toBe("preflight-test");
    store.toggleWarning("warning-source-unavailable", true);
    expect(store.warningsAccepted).toBe(true);
    store.setSourcePolicy(true);
    expect(store.preflight).toBeNull();
    expect(store.acceptedWarningIds).toEqual([]);
  });

  it("supports explicit per-Screen Variant and Scenario editing", () => {
    const store = useCaptureStore();
    store.beginCurrentScreen({
      prototypeId: "ledger-planet",
      screenId: "ledger-planet.task-list",
      variantId: "default",
      themeId: "light",
      deviceId: "iphone-14",
      returnTo: "/workbench/prototypes/ledger-planet/screens/task-list",
    });
    store.toggleVariantId("ledger-planet.task-list", "empty", true);
    expect(store.draft?.screens[0]?.variants).toEqual({
      mode: "explicit",
      variantIds: ["default", "empty"],
    });
    store.toggleScenarioId(
      "ledger-planet.task-list",
      "filter-todo",
      false,
    );
    expect(store.draft?.screens[0]?.scenarios).toEqual({
      mode: "explicit",
      scenarioIds: ["filter-done", "open-claimable-task"],
    });
  });
});

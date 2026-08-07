import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import { resolveSelectionMatrix } from "@proto-bridge/core/v2/capture";
import { buildRuntimeCaptureManifest } from "@/runtime/capture-protocol";

describe("PBWork V2 capture store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("builds current Screen and stable Fragment Drafts through one shape", () => {
    const store = useCaptureStore();
    store.beginCurrentScreen({
      prototypeId: "cold-chain-ops",
      screenId: "cold-chain-ops.exception-queue",
      variantId: "default",
      themeId: "light",
      deviceId: "iphone-14",
      returnTo:
        "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
    });
    expect(store.entryKind).toBe("current-screen");
    expect(store.draft?.screens[0]?.variants).toEqual({
      mode: "explicit",
      variantIds: [
        "default",
        "critical-only",
        "loading",
        "empty",
        "error",
      ],
    });
    expect(store.draft?.screens[0]?.scenarios).toEqual({
      mode: "explicit",
      scenarioIds: ["focus-critical", "inspect-primary-exception"],
    });

    expect(
      store.beginFragment({
        prototypeId: "cold-chain-ops",
        screenId: "cold-chain-ops.exception-queue",
        variantId: "default",
        themeId: "light",
        deviceId: "iphone-14",
        returnTo:
          "/workbench/prototypes/cold-chain-ops/screens/exception-queue",
        fragment: {
          screenId: "cold-chain-ops.exception-queue",
          pbId: "cold-chain-ops.exception-queue.list.row",
          pbKey: "ex-017",
        },
      }),
    ).toBe(true);
    expect(store.draft?.screens[0]?.captureScope.fragments[0]).toMatchObject({
      pbId: "cold-chain-ops.exception-queue.list.row",
      pbKey: "ex-017",
    });
    expect(store.draft?.screens[0]?.captureScope.screenshots.mode).toBe(
      "selected",
    );
  });

  it("builds custom and whole-Prototype Drafts with explicit authored scope", () => {
    const store = useCaptureStore();
    store.beginCustom("cold-chain-ops");
    expect(store.draft?.screens).toHaveLength(1);
    store.toggleCustomScreen("cold-chain-ops.shipment-detail", true);
    expect(store.draft?.screens).toHaveLength(2);

    store.beginPrototype("cold-chain-ops");
    expect(store.draft?.screens).toHaveLength(3);
    expect(
      store.draft?.screens.every(
        (screen) =>
          screen.variants.mode === "explicit" &&
          (screen.scenarios.mode === "none" ||
            screen.scenarios.mode === "explicit"),
      ),
    ).toBe(true);
    expect(
      store.draft?.screens.every(
        (screen) => screen.variants.mode === "explicit",
      ),
    ).toBe(true);
  });

  it("invalidates Preflight whenever CaptureRequest fields change", async () => {
    const store = useCaptureStore();
    store.beginCustom("cold-chain-ops");
    vi.spyOn(captureServiceClient, "createPreflight").mockResolvedValue({
      preflightId: "preflight-test",
      createdAt: "2026-07-29T08:00:00.000Z",
      expiresAt: "2026-07-29T08:05:00.000Z",
      result: {
        inputVersion: "runtime-v1",
        manifestDigest: "sha256:test",
        selection: {
          prototypeId: "cold-chain-ops",
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

  it("expands cold-chain whole-Prototype and one-Screen defaults to 24 and 7 Cases", () => {
    const store = useCaptureStore();
    const manifest = buildRuntimeCaptureManifest("cold-chain-ops");

    store.beginPrototype("cold-chain-ops");
    expect(resolveSelectionMatrix(store.draft!, manifest).matrix).toHaveLength(
      24,
    );

    store.beginCurrentScreen({
      prototypeId: "cold-chain-ops",
      screenId: "cold-chain-ops.exception-queue",
      variantId: "default",
      themeId: "light",
      deviceId: "iphone-14",
      returnTo: "/workbench/prototypes/cold-chain-ops/screens/exception-queue",
    });
    expect(resolveSelectionMatrix(store.draft!, manifest).matrix).toHaveLength(
      7,
    );

    store.toggleScenarioId(
      "cold-chain-ops.exception-queue",
      "focus-critical",
      false,
    );
    expect(resolveSelectionMatrix(store.draft!, manifest).matrix).toHaveLength(
      6,
    );
  });

  it("supports explicit per-Screen Variant and Scenario editing", () => {
    const store = useCaptureStore();
    store.beginCurrentScreen({
      prototypeId: "cold-chain-ops",
      screenId: "cold-chain-ops.exception-queue",
      variantId: "default",
      themeId: "light",
      deviceId: "iphone-14",
      returnTo: "/workbench/prototypes/cold-chain-ops/screens/exception-queue",
    });
    store.toggleVariantId("cold-chain-ops.exception-queue", "empty", true);
    expect(store.draft?.screens[0]?.variants).toEqual({
      mode: "explicit",
      variantIds: [
        "default",
        "critical-only",
        "loading",
        "empty",
        "error",
      ],
    });
    store.toggleScenarioId(
      "cold-chain-ops.exception-queue",
      "focus-critical",
      false,
    );
    expect(store.draft?.screens[0]?.scenarios).toEqual({
      mode: "explicit",
      scenarioIds: ["inspect-primary-exception"],
    });
  });
});

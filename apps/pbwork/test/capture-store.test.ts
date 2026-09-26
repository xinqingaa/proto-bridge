import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { captureServiceClient } from "@/capture/service-client";
import { resolveSelectionMatrix } from "@proto-bridge/core/v2/capture";
import { DEFAULT_CAPTURE_MAX_CASES } from "@proto-bridge/core/v2";
import { LOCAL_SERVICE_PROTOCOL_VERSION } from "@proto-bridge/core/v2/service-contract";
import { buildRuntimeCaptureManifest } from "@/runtime/capture-protocol";
import { prototypes } from "@/prototypes/registry";

describe("PBWork V2 capture store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
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
        "warning-only",
        "attention-only",
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

  it("expands cold-chain whole-Prototype and one-Screen defaults to 26 and 9 Cases", () => {
    const store = useCaptureStore();
    const manifest = buildRuntimeCaptureManifest("cold-chain-ops");

    store.beginPrototype("cold-chain-ops");
    expect(resolveSelectionMatrix(store.draft!, manifest).matrix).toHaveLength(
      26,
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
      9,
    );

    store.toggleScenarioId(
      "cold-chain-ops.exception-queue",
      "focus-critical",
      false,
    );
    expect(
      resolveSelectionMatrix(store.draft!, manifest).matrix,
    ).toHaveLength(8);
  });

  it("keeps a whole Hengdong Prototype under the default Case cap", () => {
    const store = useCaptureStore();
    const manifest = buildRuntimeCaptureManifest("hengdong");
    store.beginPrototype("hengdong");
    const count = resolveSelectionMatrix(store.draft!, manifest).matrix.length;
    expect(count).toBe(101);
    expect(count).toBeLessThanOrEqual(DEFAULT_CAPTURE_MAX_CASES);
  });

  it("publishes authored Variant route query in the Runtime Manifest", () => {
    const manifest = buildRuntimeCaptureManifest("hengdong");
    const today = manifest.screens.find(
      (screen) => screen.screenId === "hengdong.today",
    );

    expect(
      today?.variants.find(
        (variant) => variant.variantId === "record-detail-open",
      )?.routeQuery,
    ).toEqual({ record: "record-20260812" });
    expect(
      today?.variants.find(
        (variant) => variant.variantId === "day-empty-feedback",
      )?.routeQuery,
    ).toEqual({ date: "2026-08-11" });
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
        "warning-only",
        "attention-only",
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

  it("drops local lifecycle after CLI reset when the session generation changes", async () => {
    localStorage.clear();
    const lifecycle = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    lifecycle.replaceRecord({
      prototypeId: prototype.id,
      stage: "final",
      operation: { kind: "idle" },
      artifacts: {
        jobId: "job-1",
        bundleId: "bundle-1",
        snapshotId: "snapshot-1",
        handoffId: "handoff-1",
        deliveryId: "delivery-1",
        agentPromptPath: "/delivery/agent-prompt.md",
        receiptPath: "/delivery/receipt.json",
        finalizedAt: "2026-08-24T00:00:00.000Z",
        operationKey: "00000000-0000-4000-8000-000000000001",
        requestDigest: `sha256:${"a".repeat(64)}`,
      },
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    vi.spyOn(captureServiceClient, "connect").mockResolvedValue({
      protocolVersion: LOCAL_SERVICE_PROTOCOL_VERSION,
      serviceInstanceId: "service-1",
      sessionToken: "token-new",
      workspaceId: "pbwork-local",
      generationId: "generation-new",
      expiresAt: "2026-08-24T01:00:00.000Z",
      finalizedOrphanJobIds: [],
      deliveryTargetRoot: "/tmp/target",
    });
    vi.spyOn(captureServiceClient, "consoleState").mockResolvedValue({
      workspaceId: "pbwork-local",
      generationId: "generation-new",
      bundles: [],
      jobs: [],
    });
    vi.spyOn(captureServiceClient, "evidenceInventory").mockResolvedValue({
      workspaceId: "pbwork-local",
      generatedAt: "2026-08-24T00:00:00.000Z",
      prototypes: [],
    });
    vi.spyOn(captureServiceClient, "prototypeLifecycle").mockResolvedValue({
      schemaVersion: 1,
      workspaceId: "pbwork-local",
      generationId: "generation-new",
      revision: 0,
      records: {},
      history: [],
      updatedAt: "2026-08-24T00:00:00.000Z",
    } as never);

    const store = useCaptureStore();
    store.session = {
      workspaceId: "pbwork-local",
      generationId: "generation-old",
    } as never;
    store.beginPrototype("cold-chain-ops");
    await store.refreshConsole();

    expect(lifecycle.effectiveLifecycle(prototype)).toBe("active");
    expect(lifecycle.recordFor(prototype.id)?.artifacts).toBeNull();
    expect(store.draft).toBeNull();
    expect(store.notice).toMatchObject({
      title: "Workspace 已重置",
    });
  });
});

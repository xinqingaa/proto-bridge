import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  createPrototypeCaptureDraft,
  useCaptureStore,
} from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { captureServiceClient } from "@/capture/service-client";
import { resolveSelectionMatrix } from "@proto-bridge/core/v2/capture";
import { DEFAULT_CAPTURE_MAX_CASES } from "@proto-bridge/core/v2";
import { buildRuntimeCaptureManifest } from "@/runtime/capture-protocol";
import { LOCAL_SERVICE_PROTOCOL_VERSION } from "@proto-bridge/core/v2/service-contract";
import { prototypes } from "@/prototypes/registry";

describe("PBWork V2 capture store", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("builds the formal whole-Prototype Selection within the default Case cap", () => {
    const draft = createPrototypeCaptureDraft("cold-chain-ops");
    const manifest = buildRuntimeCaptureManifest("cold-chain-ops");
    expect(draft).not.toBeNull();
    const count = resolveSelectionMatrix(draft!, manifest).matrix.length;
    expect(count).toBe(26);
    expect(count).toBeLessThanOrEqual(DEFAULT_CAPTURE_MAX_CASES);
    expect(createPrototypeCaptureDraft("unknown-prototype")).toBeNull();
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
      receipts: [],
      handoffs: [],
      unreadableSnapshots: [],
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
    await store.refreshConsole();

    expect(lifecycle.effectiveLifecycle(prototype)).toBe("active");
    expect(lifecycle.recordFor(prototype.id)?.artifacts).toBeNull();
    expect(store.notice).toMatchObject({
      title: "Workspace 已重置",
    });
    expect(captureServiceClient.evidenceInventory).not.toHaveBeenCalled();
  });
});

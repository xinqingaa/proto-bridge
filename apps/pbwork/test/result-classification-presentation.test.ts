import { describe, expect, it } from "vitest";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";
import type { PrototypeLifecycleRecord } from "@proto-bridge/core/v2";
import {
  classifyWorkbenchResults,
  listClassifiedCaptureResults,
  presentEvidenceResult,
  presentJobResult,
  presentPrototypeResult,
  presentSnapshotResult,
} from "@/capture/result-classification";

const now = "2026-09-26T02:00:00.000Z";
const digest = `sha256:${"c".repeat(64)}`;
const operationKey = "00000000-0000-4000-8000-0000000000b7";
const counts = {
  selected: 2,
  captured: 2,
  reused: 0,
  failed: 0,
  skipped: 0,
  unsupported: 0,
  cancelled: 0,
  interrupted: 0,
  missing: 0,
  stale: 0,
};

function snapshot(bundleId: string, snapshotId: string, runId: string, prototypeId: string) {
  return {
    schemaVersion: 1 as const,
    snapshotId,
    workspaceId: "pbwork-local",
    bundleId,
    prototypeId,
    sourceRunId: runId,
    committedAt: now,
    activeSlots: [],
    latestAttempts: [],
    catalogRefs: [],
    coverage: {
      counts,
      evidenceLevelBreakdown: {},
      factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
      denominator: 2,
    },
  };
}

function job(id: string, bundleId: string, runId: string, prototypeId: string, linked = false) {
  return {
    schemaVersion: 1 as const,
    jobId: id,
    workspaceId: "pbwork-local",
    bundleId,
    selection: { prototypeId, cases: [], acceptedWarningIds: [] },
    inputVersion: "registry-v1",
    status: "completed" as const,
    acceptedAt: now,
    startedAt: now,
    endedAt: now,
    runId,
    journal: [],
    ...(linked ? { operationKey, operationRequestDigest: digest } : {}),
  };
}

const officialRecord: PrototypeLifecycleRecord = {
  prototypeId: "cold-chain-ops",
  stage: "final",
  operation: { kind: "idle" },
  artifacts: {
    jobId: "job-official",
    bundleId: "bundle-official",
    snapshotId: "snapshot-official",
    handoffId: "handoff-official",
    deliveryId: "delivery-official",
    agentPromptPath: "/tmp/agent-prompt.md",
    receiptPath: "/tmp/receipt.json",
    finalizedAt: now,
    operationKey,
    requestDigest: digest,
  },
  createdAt: now,
  updatedAt: now,
};

function consoleState(): CaptureConsoleState {
  return {
    workspaceId: "pbwork-local",
    generationId: "generation-b7",
    jobs: [
      job("job-official", "bundle-official", "run-official", "cold-chain-ops", true),
      job("job-cli", "bundle-cli", "run-cli", "hengdong"),
    ],
    receipts: [
      {
        deliveryId: "delivery-official",
        bundleId: "bundle-official",
        snapshotId: "snapshot-official",
        handoffId: "handoff-official",
        source: "gui",
      },
      {
        deliveryId: "delivery-cli",
        bundleId: "bundle-cli",
        snapshotId: "snapshot-cli",
        handoffId: "handoff-cli",
        source: "cli",
      },
      {
        deliveryId: "delivery-unknown",
        bundleId: "bundle-unknown",
        snapshotId: "snapshot-unknown",
        handoffId: "handoff-unknown",
      },
    ],
    handoffs: [
      {
        handoffId: "handoff-official",
        bundleId: "bundle-official",
        snapshotId: "snapshot-official",
      },
    ],
    unreadableSnapshots: [],
    bundles: [
      {
        bundle: {
          schemaVersion: 1,
          bundleId: "bundle-official",
          workspaceId: "pbwork-local",
          prototypeId: "cold-chain-ops",
          status: "writable",
          createdAt: now,
        },
        snapshots: [snapshot("bundle-official", "snapshot-official", "run-official", "cold-chain-ops")],
        activeSnapshot: snapshot("bundle-official", "snapshot-official", "run-official", "cold-chain-ops"),
      },
      {
        bundle: {
          schemaVersion: 1,
          bundleId: "bundle-cli",
          workspaceId: "pbwork-local",
          prototypeId: "hengdong",
          status: "writable",
          createdAt: now,
        },
        snapshots: [snapshot("bundle-cli", "snapshot-cli", "run-cli", "hengdong")],
        activeSnapshot: snapshot("bundle-cli", "snapshot-cli", "run-cli", "hengdong"),
      },
      {
        bundle: {
          schemaVersion: 1,
          bundleId: "bundle-unknown",
          workspaceId: "pbwork-local",
          prototypeId: "hengdong",
          status: "writable",
          createdAt: now,
        },
        snapshots: [snapshot("bundle-unknown", "snapshot-unknown", "run-unknown", "hengdong")],
        activeSnapshot: snapshot("bundle-unknown", "snapshot-unknown", "run-unknown", "hengdong"),
      },
    ],
  };
}

describe("result classification presentation", () => {
  it("gives the official result the same label on every surface", () => {
    const facts = classifyWorkbenchResults({
      records: { "cold-chain-ops": officialRecord },
      consoleState: consoleState(),
    });
    const expected = {
      kind: "officially-finalized",
      classificationLabel: "已正式定稿",
      originLabel: "GUI",
      statusLabel: "",
      headline: "已正式定稿 · GUI",
    };
    expect(presentSnapshotResult(facts, "bundle-official", "snapshot-official")).toEqual(expected);
    expect(presentJobResult(facts, "job-official")).toEqual(expected);
    expect(presentPrototypeResult(facts, "cold-chain-ops")).toEqual(expected);
    expect(presentEvidenceResult(facts, "bundle-official", "snapshot-official")).toEqual(expected);
  });

  it("keeps a complete CLI result diagnostic on overview, task, and review labels", () => {
    const facts = classifyWorkbenchResults({
      records: { "cold-chain-ops": officialRecord },
      consoleState: consoleState(),
    });
    const expected = {
      kind: "diagnostic-only",
      classificationLabel: "仅诊断",
      originLabel: "CLI",
      statusLabel: "",
      headline: "仅诊断 · CLI",
    };
    expect(presentSnapshotResult(facts, "bundle-cli", "snapshot-cli")).toEqual(expected);
    expect(presentJobResult(facts, "job-cli")).toEqual(expected);
    expect(presentEvidenceResult(facts, "bundle-cli", "snapshot-cli")).toEqual(expected);
    expect(expected.headline).not.toContain("已定稿");
    expect(expected.headline).not.toContain("可交付");
    expect(presentPrototypeResult(facts, "cold-chain-ops")?.headline).toBe("已正式定稿 · GUI");
  });

  it("labels a receipt without source as unknown and does not call it deliverable", () => {
    const facts = classifyWorkbenchResults({
      records: { "cold-chain-ops": officialRecord },
      consoleState: consoleState(),
    });
    const copy = presentEvidenceResult(facts, "bundle-unknown", "snapshot-unknown");
    expect(copy).toMatchObject({
      kind: "diagnostic-only",
      originLabel: "来源未知",
      headline: "仅诊断 · 来源未知",
    });
    expect(copy.headline).not.toContain("可交付");
    expect(copy.headline).not.toContain("已定稿");
  });

  it("lists the formal binding and the unbound result with different headlines", () => {
    const listed = listClassifiedCaptureResults({
      records: { "cold-chain-ops": officialRecord },
      consoleState: consoleState(),
    });
    expect(listed.map((item) => item.headline)).toEqual([
      "已正式定稿 · GUI",
      "仅诊断 · CLI",
      "仅诊断 · 来源未知",
    ]);
  });
});

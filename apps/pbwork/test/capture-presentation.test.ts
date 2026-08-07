import { describe, expect, it } from "vitest";
import type { CaptureJob } from "@proto-bridge/core/v2";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";
import {
  buildCaptureTaskPresentations,
  translateCaptureFailure,
} from "@/capture/presentation";

const scope = {
  fragments: [],
  screenshots: { mode: "all" as const },
  sourcePolicy: false,
  debugPolicy: false,
  evidenceInputMode: "instrumented" as const,
  minEvidenceLevel: "instrumented-runtime" as const,
};
const selectedCase = {
  caseId: "cold-chain-ops.exception-queue::default::light::iphone-14",
  caseKey: {
    screenId: "cold-chain-ops.exception-queue",
    variantId: "default",
    themeId: "light",
    deviceId: "iphone-14",
  },
  captureScope: scope,
};

function job(
  id: string,
  status: CaptureJob["status"],
  acceptedAt: string,
  cases = [selectedCase],
): CaptureJob {
  return {
    schemaVersion: 1,
    jobId: id,
    workspaceId: "pbwork-local",
    bundleId: `bundle-${id}`,
    selection: {
      prototypeId: "cold-chain-ops",
      cases,
      acceptedWarningIds: [],
    },
    inputVersion: "registry-v1",
    status,
    acceptedAt,
    ...(status === "queued"
      ? {}
      : {
          startedAt: acceptedAt,
          runId: `run-${id}`,
          ...(["completed", "failed", "cancelled", "interrupted"].includes(
            status,
          )
            ? { endedAt: acceptedAt }
            : {}),
        }),
    journal:
      status === "failed"
        ? [
            {
              at: acceptedAt,
              event: "case-finished",
              detail:
                "cold-chain-ops.exception-queue::default::light::iphone-14:failed:Duplicate semantic Fragment identity cold-chain-ops.exception-queue.filters#.",
            },
          ]
        : [],
  } as CaptureJob;
}

function state(jobs: CaptureJob[]): CaptureConsoleState {
  const completed = jobs.filter((item) => item.status === "completed");
  return {
    workspaceId: "pbwork-local",
    generationId: "generation-test",
    jobs,
    bundles: completed.map((item) => ({
      bundle: {
        schemaVersion: 1,
        bundleId: item.bundleId,
        workspaceId: "pbwork-local",
        prototypeId: "cold-chain-ops",
        status: "writable",
        createdAt: item.acceptedAt,
      },
      activeSnapshot: {
        schemaVersion: 1,
        snapshotId: `snapshot-${item.jobId}`,
        workspaceId: "pbwork-local",
        bundleId: item.bundleId,
        prototypeId: "cold-chain-ops",
        sourceRunId: item.runId!,
        committedAt: item.acceptedAt,
        activeSlots: item.selection.cases.map((entry) => ({
          caseId: entry.caseId,
          scopeKey: "scope",
          kind: "primary" as const,
          revisionId: `revision-${entry.caseId}`,
        })),
        latestAttempts: [],
        catalogRefs: [],
        coverage: {
          counts: {
            selected: item.selection.cases.length,
            captured: item.selection.cases.length,
            reused: 0,
            failed: 0,
            skipped: 0,
            unsupported: 0,
            cancelled: 0,
            interrupted: 0,
            missing: 0,
            stale: 0,
          },
          evidenceLevelBreakdown: {
            "instrumented-source-runtime": 0,
            "instrumented-runtime": item.selection.cases.length,
            "generic-runtime": 0,
            "screenshot-only": 0,
          },
          factQuality: {
            traceable: 0,
            heuristic: 0,
            unknown: 0,
            conflict: 0,
          },
          denominator: item.selection.cases.length,
        },
      },
    })),
  } as CaptureConsoleState;
}

describe("capture task presentation", () => {
  it("marks an older failure resolved when a later successful task covers the same scope", () => {
    const failed = job("job-failed", "failed", "2026-07-30T06:19:32.962Z");
    const completed = job(
      "job-completed",
      "completed",
      "2026-07-30T06:23:04.974Z",
    );

    const presentations = buildCaptureTaskPresentations(
      state([completed, failed]),
    );
    expect(presentations.find((item) => item.job === failed)).toMatchObject({
      status: "resolved",
      statusLabel: "已由后续采集解决",
      resolvedBy: completed,
      resultPath:
        "/workbench/evidence/bundle-job-completed/snapshot-job-completed",
    });
    expect(
      presentations.filter((item) => item.status === "needs-attention"),
    ).toHaveLength(0);
  });

  it("keeps an uncovered failure actionable", () => {
    const failed = job("job-failed", "failed", "2026-07-30T06:19:32.962Z");
    const presentations = buildCaptureTaskPresentations(state([failed]));
    expect(presentations[0]).toMatchObject({
      status: "needs-attention",
      statusLabel: "采集失败",
    });
  });

  it("translates duplicate semantic identities into a readable diagnosis", () => {
    expect(
      translateCaptureFailure(
        "cold-chain-ops.exception-queue::default::light::iphone-14:failed:Duplicate semantic Fragment identity cold-chain-ops.exception-queue.filters#.",
      ),
    ).toMatchObject({
      title: "异常队列存在重复采集标识",
      message: "系统发现两个区域使用了相同标识，无法判断应记录哪一个。",
    });
  });
});

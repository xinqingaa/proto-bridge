import { describe, expect, it } from "vitest";
import type { CaptureJob } from "@proto-bridge/core/v2";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";
import {
  buildCaptureTaskPresentations,
  formatCaptureError,
  groupCaptureFailures,
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
    receipts: [],
    handoffs: [],
    unreadableSnapshots: [],
    bundles: completed.map((item) => ({
      bundle: {
        schemaVersion: 1,
        bundleId: item.bundleId,
        workspaceId: "pbwork-local",
        prototypeId: "cold-chain-ops",
        status: "writable",
        createdAt: item.acceptedAt,
      },
      snapshots: [],
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

  it("keeps each completed Job linked to its own immutable Snapshot", () => {
    const older = {
      ...job("job-older", "completed", "2026-07-30T06:20:00.000Z"),
      bundleId: "bundle-shared",
    } as CaptureJob;
    const latest = {
      ...job("job-latest", "completed", "2026-07-30T06:30:00.000Z"),
      bundleId: "bundle-shared",
    } as CaptureJob;
    const generated = state([latest, older]);
    const snapshots = generated.bundles.map((item) => ({
      ...item.activeSnapshot!,
      bundleId: "bundle-shared",
    }));
    generated.bundles = [
      {
        bundle: {
          ...generated.bundles[0]!.bundle,
          bundleId: "bundle-shared",
        },
        activeSnapshot: snapshots[0]!,
        snapshots,
      },
    ];

    const presentations = buildCaptureTaskPresentations(generated);
    expect(
      presentations.find((item) => item.job.jobId === "job-older")?.resultPath,
    ).toBe("/workbench/evidence/bundle-shared/snapshot-job-older");
    expect(
      presentations.find((item) => item.job.jobId === "job-latest")?.resultPath,
    ).toBe("/workbench/evidence/bundle-shared/snapshot-job-latest");
  });

  it("translates duplicate semantic identities into a readable diagnosis", () => {
    expect(
      translateCaptureFailure(
        "cold-chain-ops.exception-queue::default::light::iphone-14:failed:Duplicate semantic Fragment identity cold-chain-ops.exception-queue.filters#.",
      ),
    ).toMatchObject({
      title: "异常队列存在重复采集标识",
      message: expect.stringContaining("两个区域使用了相同标识"),
    });
  });

  it("groups the real hengdong failures by cause with authoring actions", () => {
    const groups = groupCaptureFailures([
      {
        caseId: "hengdong.today::default::light::iphone-14",
        reason: "Required Fragment hengdong.today.recent/ is occluded at its center point.",
      },
      {
        caseId: "hengdong.workout-complete::default::light::iphone-14",
        reason: "Required Fragment hengdong.workout-complete.save/ is occluded at its center point.",
      },
      {
        caseId:
          "hengdong.activity-history::default::light::iphone-14::scenario=hengdong.activity-history.delete-and-undo-history@history-record-restored",
        reason: "Fragment hengdong.activity-history.delete-record/ is missing.",
      },
      {
        caseId: "hengdong.progress::selected-date::light::iphone-14",
        reason:
          "Required Fragment hengdong.progress.date-view.week.day/date-2026-08-12 has data-pb-id without data-pb-role.",
      },
      {
        caseId: "hengdong.progress::filter-open::light::iphone-14",
        reason:
          'payload.nodes.[88].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, \'.\', \'-\', \'_\'); CSS selectors, DOM paths, and array indices are not allowed (got "全部")',
      },
    ]);

    expect(groups.map((group) => [group.kind, group.cases.length])).toEqual([
      ["occluded", 2],
      ["missing-fragment", 1],
      ["missing-role", 1],
      ["invalid-identity", 1],
    ]);
    expect(groups[0]!.action).toContain("重新采集不能解决");
    expect(groups[0]!.cases[0]).toMatchObject({
      fragment: "hengdong.today.recent",
    });
    expect(groups[1]!.cases[0]!.label).toContain("场景「");
    expect(groups[2]!.cases[0]!.fragment).toBe(
      "hengdong.progress.date-view.week.day#date-2026-08-12",
    );
  });

  it("does not report a completed Job with failed Cases as a success", () => {
    const partial = job(
      "job-partial",
      "completed",
      "2026-07-30T06:19:32.962Z",
    );
    const generated = state([partial]);
    const counts = generated.bundles[0]!.activeSnapshot!.coverage.counts;
    counts.captured = 0;
    counts.failed = 1;

    expect(buildCaptureTaskPresentations(generated)[0]).toMatchObject({
      status: "needs-attention",
      statusLabel: "部分失败 · 1 项",
      resultPath:
        "/workbench/evidence/bundle-job-partial/snapshot-job-partial",
    });
  });

  it("translates illegal pbKey schema failures into an authoring diagnosis", () => {
    expect(
      translateCaptureFailure(
        'payload.manifest.screens.hengdong.settings-goals.variants.weekly-open.requiredFragments.hengdong.settings-goals.weekly-option#3.pbKey: pbKey must be a stable lowercase identifier (letters, digits, \'.\', \'-\', \'_\'); CSS selectors, DOM paths, and array indices are not allowed (got "3")',
      ),
    ).toMatchObject({
      title: "原型身份不合法",
    });
  });

  it("explains Case capacity errors in Chinese", () => {
    const error = Object.assign(
      new Error(
        "Selection expands to 101 Cases; the configured maximum is 100.",
      ),
      {
        code: "capacity-exceeded",
        details: { selected: 101, maxCases: 100 },
      },
    );
    expect(formatCaptureError(error)).toBe(
      "采集上限不够：需要 101 项，当前上限 100。",
    );
  });

  it("rewrites raw Zod issue dumps into a capture start message", () => {
    const error = Object.assign(
      new Error(
        JSON.stringify(
          [
            {
              validation: "regex",
              code: "invalid_string",
              message: "Invalid",
              path: [
                "payload",
                "manifest",
                "screens",
                6,
                "variants",
                2,
                "requiredFragments",
                1,
                "pbKey",
              ],
            },
          ],
          null,
          2,
        ),
      ),
      { code: "command-failed" },
    );
    expect(formatCaptureError(error)).toContain("采集无法开始");
    expect(formatCaptureError(error)).toContain(
      "payload.manifest.screens.6.variants.2.requiredFragments.1.pbKey: Invalid",
    );
  });
});

import { expect, test, type Page } from "@playwright/test";
import {
  Bundle,
  BundleSnapshot,
  CaptureJob,
  Run,
  V2_SCHEMA_MAJOR,
  computeCaseId,
  computeScopeKey,
  normalizeCaptureScope,
} from "@proto-bridge/core/v2";

test.use({ viewport: { width: 1440, height: 1050 } });

const prototypeId = "cold-chain-ops";
const bundleId = "a1-browser-failed-bundle";
const snapshotId = "a1-browser-failed-snapshot";
const runId = "a1-browser-failed-run";
const jobId = "a1-browser-failed-job";
const attemptId = "a1-browser-failed-attempt";
const now = "2026-09-25T10:00:00.000Z";
const caseKey = {
  screenId: "cold-chain-ops.exception-queue",
  variantId: "default",
  themeId: "light",
  deviceId: "iphone-14",
};
const caseId = computeCaseId(caseKey);
const captureScope = normalizeCaptureScope({
  fragments: [],
  screenshots: { mode: "all" },
  sourcePolicy: false,
  debugPolicy: false,
  evidenceInputMode: "instrumented",
  minEvidenceLevel: "instrumented-runtime",
});
const scopeKey = computeScopeKey(captureScope);
const reason =
  "Required Fragment cold-chain-ops.exception-queue.list/ is occluded at its center point.";
const selection = {
  prototypeId,
  cases: [{ caseId, caseKey, captureScope }],
  acceptedWarningIds: [],
};
const counts = {
  selected: 1,
  captured: 0,
  reused: 0,
  failed: 1,
  skipped: 0,
  unsupported: 0,
  cancelled: 0,
  interrupted: 0,
  missing: 0,
  stale: 0,
};
const coverage = {
  counts,
  evidenceLevelBreakdown: {},
  factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
  denominator: 1,
};

// The browser sees a terminal Core-shaped Job and its exact failed Snapshot.
// Only Service responses are isolated; no formal prototype source is changed.
const bundle = Bundle.parse({
  schemaVersion: V2_SCHEMA_MAJOR,
  bundleId,
  workspaceId: "pbwork-local",
  prototypeId,
  status: "writable",
  createdAt: now,
});
const run = Run.parse({
  schemaVersion: V2_SCHEMA_MAJOR,
  runId,
  workspaceId: "pbwork-local",
  bundleId,
  selection,
  inputVersion: "a1-browser-fixture",
  startedAt: now,
  endedAt: now,
  terminationReason: "completed",
  attempts: [
    {
      schemaVersion: V2_SCHEMA_MAJOR,
      attemptId,
      runId,
      caseId,
      captureScope,
      scopeKey,
      result: "failed",
      reason,
      startedAt: now,
      endedAt: now,
    },
  ],
  coverage,
});
const snapshot = BundleSnapshot.parse({
  schemaVersion: V2_SCHEMA_MAJOR,
  snapshotId,
  workspaceId: "pbwork-local",
  bundleId,
  prototypeId,
  sourceRunId: runId,
  committedAt: now,
  activeSlots: [],
  latestAttempts: [{ caseId, scopeKey, attemptId, runId }],
  catalogRefs: [],
  coverage,
});
const job = CaptureJob.parse({
  schemaVersion: V2_SCHEMA_MAJOR,
  jobId,
  workspaceId: "pbwork-local",
  bundleId,
  selection,
  inputVersion: "a1-browser-fixture",
  status: "completed",
  acceptedAt: now,
  startedAt: now,
  endedAt: now,
  runId,
  journal: [
    { at: now, event: "queued" },
    { at: now, event: "discovering", detail: runId },
    { at: now, event: "case-finished", detail: `${caseId}:failed:${reason}` },
    { at: now, event: "finalized", detail: "completed" },
  ],
});
const details = {
  bundle,
  activeSnapshot: snapshot,
  runs: [run],
  activeRevisions: [],
  blobs: [],
  stalenessReports: [],
  handoffs: [],
};

async function routeFailedCapture(page: Page) {
  let lifecycleDocument: any;
  await page.route("**/__pb_v2/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/__pb_v2/prototype-lifecycle") {
      if (route.request().method() === "GET") {
        if (!lifecycleDocument) {
          const response = await route.fetch();
          const envelope = await response.json();
          const timestamp = new Date().toISOString();
          lifecycleDocument = {
            schemaVersion: 1,
            workspaceId: envelope.data.workspaceId,
            generationId: envelope.data.generationId,
            revision: 0,
            records: {
              [prototypeId]: {
                prototypeId,
                stage: "review",
                operation: {
                  kind: "failed",
                  operationKey: "00000000-0000-4000-8000-000000000041",
                  action: "finalize",
                  message: "整原型采集未完整：0/1 项有效，1 项失败。",
                  failedAt: timestamp,
                  failedCases: [{ caseId, reason }],
                },
                artifacts: null,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            },
            history: [],
            updatedAt: timestamp,
          };
        }
        return route.fulfill({ json: { ok: true, data: lifecycleDocument } });
      }
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON() as { document: unknown };
        lifecycleDocument = body.document;
        return route.fulfill({ json: { ok: true, data: lifecycleDocument } });
      }
    }
    if (route.request().method() !== "GET") return route.continue();
    if (path === "/__pb_v2/console") {
      const response = await route.fetch();
      const envelope = await response.json();
      return route.fulfill({
        json: {
          ok: true,
          data: {
            ...envelope.data,
            jobs: [job],
            bundles: [{ bundle, activeSnapshot: snapshot, snapshots: [snapshot] }],
          },
        },
      });
    }
    if (path === `/__pb_v2/jobs/${jobId}`) {
      return route.fulfill({ json: { ok: true, data: job } });
    }
    if (
      path === `/__pb_v2/bundles/${bundleId}` ||
      path === `/__pb_v2/bundles/${bundleId}/snapshots/${snapshotId}`
    ) {
      return route.fulfill({ json: { ok: true, data: details } });
    }
    return route.continue();
  });
}

test("failed finalization reaches a visible grouped terminal state and survives refresh", async ({
  page,
}) => {
  await routeFailedCapture(page);
  await page.goto("/workbench/prototypes/all");
  const row = page.locator("article").filter({ hasText: "冷链异常处置台" });
  await expect(row.getByText("定稿失败")).toBeVisible({ timeout: 15_000 });
  await row.getByRole("button", { name: "定稿并采集" }).click();
  const sheet = page.getByTestId("lifecycle-finalization-sheet");
  const failure = sheet.getByTestId("finalization-failure");
  await expect(failure).toContainText("0/1 项有效，1 项失败");
  await expect(sheet.getByTestId("capture-failure-group")).toHaveCount(1);
  await expect(sheet.getByText("正在采集整个原型")).toHaveCount(0);

  await sheet.getByRole("button", { name: "收起定稿流程" }).click();
  await page.getByTestId("capture-job-center").click();
  await expect(page.getByText("部分失败 · 1 项")).toBeVisible();
  await page.getByTestId("capture-job-center").click();
  await page.goto(`/workbench/evidence/${bundleId}/${snapshotId}`);
  const verdict = page.getByTestId("evidence-verdict");
  await expect(verdict).toContainText("采集不完整：0/1 项有效");
  await verdict.getByRole("button", { name: "查看 1 项失败" }).click();
  await expect(verdict.getByTestId("capture-failure-group")).toHaveCount(1);

  await page.goto("/workbench/prototypes/all");
  await page.reload();
  await row.getByRole("button", { name: "定稿并采集" }).click();
  await expect(failure).toContainText("0/1 项有效，1 项失败");
  await expect(sheet.getByTestId("capture-failure-group")).toHaveCount(1);

  let preflights = 0;
  await page.route("**/__pb_v2/preflights", async (route) => {
    preflights += 1;
    await route.continue();
  });
  await sheet.getByRole("button", { name: "修复后重新检查" }).click();
  await expect.poll(() => preflights).toBe(1);
  await expect(sheet.getByText("预检完成，等待确认候选方案已经收敛。")).toBeVisible();
  await expect(failure).toHaveCount(0);
});

test("a sheet closed during confirmation reopens through 继续定稿", async ({
  page,
}) => {
  await page.goto("/workbench/prototypes/all");
  const row = page.locator("article").filter({ hasText: "冷链异常处置台" });
  await row.getByRole("button", { name: "送交待确定" }).click();
  await page.getByRole("button", { name: "确认送交待确定" }).click();
  await row.getByRole("button", { name: "定稿并采集" }).click();
  const sheet = page.getByTestId("lifecycle-finalization-sheet");
  await expect(sheet.getByText("预检完成，等待确认候选方案已经收敛。")).toBeVisible({ timeout: 30_000 });
  await sheet.getByRole("button", { name: "收起定稿流程" }).click();
  await expect(sheet).toBeHidden();
  const resume = row.getByRole("button", { name: "继续定稿" });
  await expect(resume).toBeEnabled();
  await resume.click();
  await expect(sheet.getByText("预检完成，等待确认候选方案已经收敛。")).toBeVisible({ timeout: 30_000 });
});

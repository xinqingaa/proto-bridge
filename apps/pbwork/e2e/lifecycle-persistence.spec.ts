import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

const prototypeId = "cold-chain-ops";
const operationKey = "00000000-0000-4000-8000-000000000031";
const startedAt = "2026-09-25T12:00:00.000Z";
const digest = `sha256:${"d".repeat(64)}`;

test("a pending risk confirmation survives another tab and a page reload", async ({
  context,
}) => {
  let document: any = {
    schemaVersion: 1,
    workspaceId: "pbwork-local",
    generationId: "lifecycle-browser-test",
    revision: 1,
    records: {
      [prototypeId]: {
        prototypeId,
        stage: "review",
        operation: {
          kind: "finalizing",
          operationKey,
          requestDigest: digest,
          phase: "awaiting-risks",
          startedAt,
          jobId: "browser-job",
          bundleId: "browser-bundle",
          snapshotId: "browser-snapshot",
          acceptedWarningIds: [],
          acknowledgedRiskKinds: [],
        },
        artifacts: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    },
    history: [],
    updatedAt: startedAt,
  };
  const snapshotDetails = {
    bundle: {
      bundleId: "browser-bundle",
      workspaceId: "pbwork-local",
      prototypeId,
      status: "writable",
      createdAt: startedAt,
    },
    activeSnapshot: {
      snapshotId: "browser-snapshot",
      bundleId: "browser-bundle",
      coverage: {
        counts: {
          selected: 1,
          captured: 1,
          reused: 0,
          failed: 0,
          skipped: 0,
          unsupported: 0,
          cancelled: 0,
          interrupted: 0,
          missing: 0,
          stale: 0,
        },
      },
    },
    runs: [],
    activeRevisions: [],
    blobs: [],
    stalenessReports: [],
    handoffs: [],
  };

  await context.route("**/__pb_v2/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/__pb_v2", "");
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data }),
      });

    if (path === "/session" && route.request().method() === "POST") {
      return respond({
        protocolVersion: 5,
        serviceInstanceId: "lifecycle-browser-service",
        sessionToken: "browser-test-token",
        workspaceId: "pbwork-local",
        generationId: document.generationId,
        expiresAt: "2026-09-25T20:00:00.000Z",
        finalizedOrphanJobIds: [],
        deliveryTargetRoot: "/tmp/pbwork-target",
      }, 201);
    }
    if (path === "/console") {
      return respond({
        workspaceId: "pbwork-local",
        generationId: document.generationId,
        bundles: [],
        jobs: [],
      });
    }
    if (path === "/evidence-inventory") {
      return respond({
        workspaceId: "pbwork-local",
        generatedAt: startedAt,
        prototypes: [],
      });
    }
    if (path === "/prototype-lifecycle" && route.request().method() === "GET") {
      return respond(document);
    }
    if (path === "/prototype-lifecycle" && route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as {
        expectedRevision: number;
        document: Record<string, unknown>;
      };
      if (body.expectedRevision !== document.revision) {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: { code: "revision-conflict", message: "Revision changed." },
          }),
        });
      }
      document = body.document;
      return respond(document);
    }
    if (path === "/bundles/browser-bundle/snapshots/browser-snapshot") {
      return respond(snapshotDetails);
    }
    if (path === "/handoffs/preview") {
      return respond({
        risks: [
          {
            kind: "reconstruction-readiness",
            message: "需要在目标实现中人工复核重建完整度。",
            refs: ["browser-snapshot"],
          },
        ],
        coverageStatus: "complete",
        freshnessStatus: "fresh",
        persisted: false,
      });
    }
    return route.continue();
  });

  const firstTab = await context.newPage();
  await firstTab.goto("/workbench/prototypes/all");
  const row = firstTab.locator("article").filter({ hasText: "冷链异常处置台" });
  await expect(row.getByRole("button", { name: "继续定稿" })).toBeVisible();
  await row.getByRole("button", { name: "继续定稿" }).click();
  const firstSheet = firstTab.getByTestId("lifecycle-finalization-sheet");
  await expect(firstSheet.getByText("需要在目标实现中人工复核重建完整度。")).toBeVisible();
  await firstSheet.getByRole("button", { name: "收起定稿流程" }).click();

  const secondTab = await context.newPage();
  await secondTab.goto("/workbench/prototypes/all");
  const secondRow = secondTab.locator("article").filter({ hasText: "冷链异常处置台" });
  await expect(secondRow.getByRole("button", { name: "继续定稿" })).toBeVisible();
  await secondRow.getByRole("button", { name: "继续定稿" }).click();
  const secondSheet = secondTab.getByTestId("lifecycle-finalization-sheet");
  await expect(secondSheet.getByText("需要在目标实现中人工复核重建完整度。")).toBeVisible();
  await secondSheet.getByRole("checkbox", { name: "已了解" }).check();
  await secondSheet.getByRole("button", { name: "确认并生成提示词" }).click();
  await expect(secondSheet.getByText("正在固定交付产物")).toBeVisible();
  await expect.poll(() => document.records[prototypeId].operation.phase).toBe("building-prompt");
  expect(document.records[prototypeId].operation.acknowledgedRiskKinds).toEqual([
    "reconstruction-readiness",
  ]);

  await secondTab.reload();
  const reloadedRow = secondTab.locator("article").filter({ hasText: "冷链异常处置台" });
  await expect(reloadedRow.getByRole("button", { name: "查看定稿进度" })).toBeVisible();
  await reloadedRow.getByRole("button", { name: "查看定稿进度" }).click();
  await expect(secondTab.getByTestId("lifecycle-finalization-sheet").getByText("正在固定交付产物")).toBeVisible();
  expect(await secondTab.evaluate(() => localStorage.getItem("pbwork.prototype-lifecycle.v2"))).toBeNull();
});

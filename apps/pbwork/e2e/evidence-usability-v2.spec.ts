import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

async function finishFromComposer(
  page: import("@playwright/test").Page,
): Promise<void> {
  await expect(page.getByText(/个将执行的采集项/).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("可以开始")).toBeVisible();
  await page.getByTestId("composer-start-capture").click();
  await expect(page.getByTestId("capture-composer")).not.toBeVisible();
}

async function openFinishedResult(
  page: import("@playwright/test").Page,
): Promise<void> {
  await expect(page.getByTestId("capture-job-center")).toHaveAttribute(
    "aria-label",
    /采集完成/,
    { timeout: 30_000 },
  );
  await expect(
    page.locator(".v-snackbar").getByText("证据采集完成", { exact: true }),
  ).toBeVisible();
  const popover = page.locator(".job-popover");
  if (!(await popover.isVisible())) {
    await page.getByTestId("capture-job-center").click();
  }
  await popover
    .getByRole("button", { name: "查看采集结果", exact: true })
    .click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible({
    timeout: 15_000,
  });
}

test("task-list captures in place, reports background completion, and renders high-quality readable evidence", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/task-list?variant=default&theme=light",
  );
  const originalUrl = page.url();
  await expect(page.getByTestId("capture-current-screen")).toBeEnabled();
  await page.getByTestId("capture-current-screen").click();

  await expect(page).toHaveURL(originalUrl);
  await expect(page.getByTestId("capture-composer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前页面" })).toBeVisible();
  await expect(page.getByText("任务列表").first()).toBeVisible();
  await expect(page.getByText("后台任务")).toBeVisible();

  await finishFromComposer(page);
  await page.getByLabel("原型", { exact: true }).click();
  await expect(page).toHaveURL(/\/workbench\/prototypes\/all$/);
  await openFinishedResult(page);

  await expect(page).toHaveURL(/\/workbench\/evidence\/[^/]+\/[^/]+$/);
  await expect(page.getByText("2 / 2 个视图采集成功")).toBeVisible();
  await expect(page.getByText("本次采集的页面与状态")).toBeVisible();
  await expect(page.getByText("任务列表 · 默认").first()).toBeVisible();
  await expect(page.getByText("任务详情 · 可领奖").first()).toBeVisible();
  await expect(
    page.getByRole("img", { name: /任务列表.*采集截图/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("页面内容").first()).toBeVisible();
  await expect(page.getByText("页面区域").first()).toBeVisible();
  await page.getByText("技术详情与原始事实").click();
  await expect(page.getByText(/严格保持 Store JSON 顺序/)).toBeVisible();

  if (process.env.PBWORK_E2E_RESULT_PATH) {
    const [, bundleId, snapshotId] =
      page.url().match(/\/workbench\/evidence\/([^/]+)\/([^/]+)$/) ?? [];
    if (!bundleId || !snapshotId) {
      throw new Error("Evidence Viewer URL did not expose fixed IDs.");
    }
    await writeFile(
      process.env.PBWORK_E2E_RESULT_PATH,
      JSON.stringify({ bundleId, snapshotId }),
      "utf8",
    );
  }
});

test("a sparse analytics prototype keeps the screenshot but reports semantic limits honestly", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/analytics?variant=default&theme=light",
  );
  await expect(page.getByTestId("capture-current-screen")).toBeEnabled();
  await page.getByTestId("capture-current-screen").click();
  await finishFromComposer(page);
  await openFinishedResult(page);

  await expect(page.getByText("1 / 1 个视图采集成功")).toBeVisible();
  await expect(page.getByText("1 个视图尚未设置明确验收范围")).toBeVisible();
  await expect(
    page.getByText(/这个页面状态尚未设置明确的验收元素/),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /图表分析.*采集截图/ }).first(),
  ).toBeVisible();
});

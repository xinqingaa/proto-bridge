import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

async function finishFromComposer(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByTestId("composer-run-preflight").click();
  await expect(page.getByText(/个采集项/).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("可以开始")).toBeVisible();
  await page.getByTestId("composer-start-capture").click();
  await expect(page.getByTestId("capture-composer")).not.toBeVisible();
}

async function openFinishedResult(
  page: import("@playwright/test").Page,
): Promise<void> {
  await expect(page.getByTestId("capture-job-center")).toContainText(
    "采集完成",
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
  await expect(page.getByText("证据可以继续交付")).toBeVisible();
  await expect(
    page.getByText("执行覆盖").locator("..").getByText("complete"),
  ).toBeVisible();
  await expect(
    page.getByText("语义完整性").locator("..").getByText("declared"),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /任务列表.*采集截图/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("可读证据").first()).toBeVisible();
  await expect(page.getByText("页面内容").first()).toBeVisible();
  await expect(page.getByText("来源与技术详情").first()).toBeVisible();

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

  await expect(page.getByText("证据已保存，但需要注意限制")).toBeVisible();
  await expect(page.getByText("无法证明完整").first()).toBeVisible();
  await expect(page.getByText(/没有可证明的完整语义覆盖/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /图表分析.*采集截图/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("不会用占位图冒充采集截图")).toHaveCount(0);
});

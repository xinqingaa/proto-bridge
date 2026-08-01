import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

async function waitForCompletedJob(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: "采集任务" }).click();
  const tasks = page.getByTestId("recent-capture-jobs");
  await expect(tasks).toBeVisible({ timeout: 15_000 });
  await expect(tasks.getByText("采集完成").first()).toBeVisible({
    timeout: 30_000,
  });
}

test("current Screen goes through Deliver FlowSheet and readable result", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/task-list?variant=default&theme=light",
  );
  const current = page.getByTestId("capture-current-screen");
  await expect(current).toBeEnabled();
  await current.click();

  await expect(page.getByTestId("capture-composer")).toBeVisible();
  await expect(page.getByTestId("composer-start-capture")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("composer-start-capture").click();
  await expect(page.getByText("结果与风险").first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "查看详情" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  await expect(page.getByText(/个视图采集成功/)).toBeVisible();
  await expect(page.locator(".visual-evidence img").first()).toBeVisible();
});

test("stable Fragment is shown in deliver scope and can finish to task center", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/task-list?variant=default&theme=light",
  );
  const inspectButton = page.getByRole("button", { name: "选择与评审" });
  await expect(inspectButton).toBeEnabled();
  await inspectButton.click();
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame
    .locator(
      '[data-pb-id="ledger-planet.task-list.list.row"][data-pb-key="t2"]',
    )
    .click({ modifiers: ["Alt"] });
  await page.getByTestId("capture-selected-fragment").click();
  await expect(
    page
      .getByTestId("capture-composer")
      .getByText("ledger-planet.task-list.list.row#t2"),
  ).toBeVisible();
  await page.getByTestId("composer-start-capture").click();
  await page.getByLabel("关闭交付流程").click();
  await page.getByRole("link", { name: "采集证据", exact: true }).click();
  await waitForCompletedJob(page);
  await page
    .getByTestId("recent-capture-jobs")
    .getByRole("button")
    .filter({ hasText: "采集完成" })
    .first()
    .click();
  await expect(page.getByText(/个视图采集成功/)).toBeVisible();
});

test("page-close Job is recovered from Service state", async ({
  page,
  browser,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/ledger-list?variant=default&theme=light",
  );
  const current = page.getByTestId("capture-current-screen");
  await expect(current).toBeEnabled();
  await current.click();
  await expect(page.getByTestId("composer-start-capture")).toBeVisible({
    timeout: 20_000,
  });
  const jobResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/jobs"),
  );
  await page.getByTestId("composer-start-capture").click();
  const jobResponse = (await jobResponsePromise).json() as Promise<{
    data: { job: { jobId: string } };
  }>;
  const jobId = (await jobResponse).data.job.jobId;
  await page.close();

  const next = await browser.newPage();
  await next.goto("/workbench/capture");
  await next.getByRole("tab", { name: "采集任务" }).click();
  await expect(next.getByTestId("recent-capture-jobs")).toBeVisible({
    timeout: 15_000,
  });
  const recoveryAction = next
    .getByTestId("recent-capture-jobs")
    .locator(`[data-job-id="${jobId}"]`)
    .filter({ hasText: "采集完成" });
  await expect(recoveryAction).toBeVisible({ timeout: 30_000 });
  await recoveryAction.click();
  await expect(next.getByTestId("evidence-viewer")).toBeVisible({
    timeout: 30_000,
  });
});

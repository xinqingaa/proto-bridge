import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

test("current Screen goes through Deliver FlowSheet and readable result", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
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
  await page.getByRole("button", { name: "查看采集结果" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  await expect(page.locator(".result-workspace")).toBeVisible();
  await expect(page.locator(".preview-stage img").first()).toBeVisible();
});

test("stable Fragment is shown in deliver scope and can finish to task center", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  const inspectButton = page.getByRole("button", { name: "选择与评审" });
  await expect(inspectButton).toBeEnabled();
  await inspectButton.click();
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame
    .locator(
      '[data-pb-id="cold-chain-ops.exception-queue.list.row"][data-pb-key="ex-017"]',
    )
    .click({ modifiers: ["Alt"] });
  await page.getByTestId("capture-selected-fragment").click();
  await expect(
    page
      .getByTestId("capture-composer")
      .getByText("cold-chain-ops.exception-queue.list.row#ex-017"),
  ).toBeVisible();
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
  await page.getByLabel("关闭交付流程").click();
  await page.getByRole("link", { name: "采集", exact: true }).click();
  const task = page
    .getByTestId("recent-capture-jobs")
    .locator(`[data-job-id="${jobId}"]`);
  await expect(task.filter({ hasText: "采集完成" })).toBeVisible({
    timeout: 60_000,
  });
  await task.click();
  await expect(page.locator(".result-workspace")).toBeVisible();
});

test("page-close Job is recovered from Service state", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/shipment-detail?variant=default&theme=light&shipment=SH-2048",
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
  await expect(page.getByText(/[1-9]\d* \/ 7 个采集项/)).toBeVisible({
    timeout: 60_000,
  });
  await page.close();

  const next = await browser.newPage();
  await next.goto("/workbench/capture");
  await expect(next.getByTestId("recent-capture-jobs")).toBeVisible({
    timeout: 15_000,
  });
  const recoveryAction = next
    .getByTestId("recent-capture-jobs")
    .locator(`[data-job-id="${jobId}"]`);
  await expect(recoveryAction).toBeVisible({ timeout: 30_000 });
  await recoveryAction.click();
  await expect(next.getByTestId("capture-composer")).toBeVisible();
});

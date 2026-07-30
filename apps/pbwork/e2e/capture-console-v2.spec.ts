import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

async function waitForCompletedJob(page: import("@playwright/test").Page) {
  const jobPanel = page.locator(".job-panel");
  await expect(jobPanel).toBeVisible({ timeout: 15_000 });
  await expect(
    jobPanel.getByRole("heading", { name: "completed" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Snapshot Evidence")).toBeVisible({
    timeout: 15_000,
  });
}

test("current Screen goes through Preflight, background Job, Snapshot and fixed Handoff", async ({
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
  await page.getByRole("link", { name: "采集证据", exact: true }).click();
  await expect(page.getByTestId("capture-console")).toBeVisible();
  await expect(page.getByText("Local Service 已连接")).toBeVisible();
  await waitForCompletedJob(page);
  await expect(page.locator(".screenshot-grid img").first()).toBeVisible();

  await page.getByRole("button", { name: "检查 Handoff 风险" }).click();
  await expect(page.getByTestId("create-handoff")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("create-handoff").click();
  await expect(page.locator(".handoff-result")).toContainText("Snapshot：");
});

test("stable Fragment is preflighted and source warning blocks Job until explicitly accepted", async ({
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
  await page.getByText(/采集环境/).click();
  await page.getByLabel("同时采集源码证据").check();
  await expect(page.getByText(/Source Evidence|源码证据/).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("composer-start-capture")).toBeDisabled();
  await page.getByRole("checkbox", { name: "确认", exact: true }).check();
  await expect(page.getByTestId("composer-start-capture")).toBeEnabled();
  await page.getByTestId("composer-start-capture").click();
  await page.getByRole("link", { name: "采集证据", exact: true }).click();
  await waitForCompletedJob(page);
  await expect(page.locator(".status-pill")).toHaveText("complete");
});

test("whole Prototype expands only the Matrix, while a page-close Job is recovered from Service state", async ({
  page,
  browser,
}) => {
  await page.goto("/workbench/capture");
  await expect(page.getByText("Local Service 已连接")).toBeVisible();
  await page.getByRole("button", { name: /采集整个原型/ }).click();
  await page
    .getByRole("combobox", { name: "所有页面的状态范围" })
    .press("Enter");
  await page.getByRole("option", { name: "全部状态" }).click();
  await page
    .getByRole("combobox", { name: "所有页面的交互场景" })
    .press("Enter");
  await page.getByRole("option", { name: "全部场景" }).click();
  await expect(
    page.getByRole("heading", { name: "55 个将执行的采集项" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("还有 49 项将在后台执行")).toBeVisible();
  await page.getByRole("button", { name: "关闭采集确认" }).click();

  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/ledger-list?variant=default&theme=light",
  );
  const current = page.getByTestId("capture-current-screen");
  await expect(current).toBeEnabled();
  await current.click();
  await expect(page.getByTestId("composer-start-capture")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("composer-start-capture").click();
  await page.close();

  const next = await browser.newPage();
  await next.goto("/workbench/capture");
  await expect(next.getByTestId("recent-capture-jobs")).toBeVisible({
    timeout: 15_000,
  });
  const recoveryAction = next
    .getByTestId("recent-capture-jobs")
    .getByRole("button", { name: /查看进度|处理任务|查看结果/ })
    .first();
  const recoveryLabel = await recoveryAction.textContent();
  await recoveryAction.click();
  if (recoveryLabel?.includes("查看结果")) {
    await expect(next.getByTestId("evidence-viewer")).toBeVisible();
  } else {
    await waitForCompletedJob(next);
    await expect(next.locator(".evidence-panel")).toBeVisible();
  }
  await next.close();
});

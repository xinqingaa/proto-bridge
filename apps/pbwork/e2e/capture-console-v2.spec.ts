import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

async function waitForCompletedJob(page: import("@playwright/test").Page) {
  const jobPanel = page.locator(".job-panel");
  await expect(jobPanel).toBeVisible();
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
  await page.getByRole("button", { name: "关闭采集确认" }).click();
  await page.goto("/workbench/capture");
  await expect(page.getByTestId("capture-console")).toBeVisible();
  await expect(page.getByText("Local Service 已连接")).toBeVisible();
  await page.getByTestId("run-preflight").click();
  await expect(page.getByText("Case Matrix")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "2 个 Case" })).toBeVisible();
  await page.getByTestId("create-capture-job").click();
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
  await page.getByRole("button", { name: "关闭采集确认" }).click();
  await page.goto("/workbench/capture");

  await page.getByLabel("请求 Source Evidence").check();
  await page.getByTestId("run-preflight").click();
  await expect(page.getByText("warning-source-unavailable")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("create-capture-job")).toBeDisabled();
  await page.getByLabel("明确接受").check();
  await expect(page.getByTestId("create-capture-job")).toBeEnabled();
  await page.getByTestId("create-capture-job").click();
  await waitForCompletedJob(page);
  await expect(page.locator(".status-pill")).toHaveText("complete");
});

test("whole Prototype expands only the Matrix, while a page-close Job is recovered from Service state", async ({
  page,
  browser,
}) => {
  await page.goto("/workbench/capture");
  await expect(page.getByText("Local Service 已连接")).toBeVisible();
  await page.getByRole("button", { name: /整个 Prototype/ }).click();
  await page.getByTestId("prototype-variant-policy").selectOption("all");
  await page.getByTestId("prototype-scenario-policy").selectOption("all");
  await page.getByTestId("run-preflight").click();
  await expect(page.getByRole("heading", { name: "55 个 Case" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("已显示前 50 项")).toBeVisible();

  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/ledger-list?variant=default&theme=light",
  );
  const current = page.getByTestId("capture-current-screen");
  await expect(current).toBeEnabled();
  await current.click();
  await page.getByRole("button", { name: "关闭采集确认" }).click();
  await page.goto("/workbench/capture");
  await page.getByTestId("run-preflight").click();
  await expect(page.getByText("Case Matrix")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("create-capture-job").click();
  await expect(page.locator(".job-panel")).toBeVisible();
  await page.close();

  const next = await browser.newPage();
  await next.goto("/workbench/capture");
  await expect(next.getByTestId("recent-capture-jobs")).toBeVisible({
    timeout: 15_000,
  });
  await next
    .getByTestId("recent-capture-jobs")
    .getByRole("button", { name: "恢复任务" })
    .first()
    .click();
  await waitForCompletedJob(next);
  await expect(next.locator(".evidence-panel")).toBeVisible();
  await next.close();
});

import { expect, test, type Page } from "@playwright/test";

async function selectPreviewSetting(page: Page, label: string, option: string) {
  await page.getByLabel(label).press("ArrowDown");
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/workbench/foundations/tokens/color");
});

test("overview is the default workbench destination", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/workbench\/overview$/);
  await expect(page.getByTestId("workbench-overview")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "冷链异常处置台" }),
  ).toBeVisible();
  await expect(page.getByTestId("resource-panel")).toHaveCount(0);
});

test("primary and secondary navigation update the URL and resource view", async ({
  page,
}) => {
  const componentsLink = page.getByRole("link", { name: "组件", exact: true });
  await expect(componentsLink).toBeVisible();
  await componentsLink.click();
  await expect(page).toHaveURL(/\/workbench\/components\/button$/);
  await expect(page.getByRole("heading", { name: "Button" })).toBeVisible();

  await page.getByRole("button", { name: "展开 展示组件", exact: true }).click();
  await page.getByRole("link", { name: "Chip", exact: true }).click();
  await expect(page).toHaveURL(/\/workbench\/components\/chip$/);
  await expect(page.getByRole("heading", { name: "Chip" })).toBeVisible();

  const foundationsLink = page.getByRole("link", {
    name: "设计基础",
    exact: true,
  });
  await foundationsLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/workbench\/foundations\/tokens\/color$/);

  await page.getByRole("button", { name: "展开 主题" }).click();
  await page.getByRole("link", { name: "浅色主题", exact: true }).click();
  await expect(page).toHaveURL(/\/workbench\/foundations\/themes\/light$/);
  await expect(page.getByRole("heading", { name: "浅色主题" })).toBeVisible();
});

test("collapsing side panels expands the content track", async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=default&mode=light",
  );
  const content = page.getByTestId("content-canvas");
  const initialBox = await content.boundingBox();
  expect(initialBox).not.toBeNull();

  await page.getByRole("button", { name: "收起元素检查" }).click();
  await expect
    .poll(async () => (await content.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initialBox!.width + 250);
  const inspectorCollapsedBox = await content.boundingBox();
  expect(inspectorCollapsedBox).not.toBeNull();
  expect(inspectorCollapsedBox!.width).toBeGreaterThan(initialBox!.width + 250);
  await expect(
    page.getByRole("button", { name: "展开元素检查" }),
  ).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "收起资源导航" }).click();
  await expect
    .poll(async () => (await content.boundingBox())?.width ?? 0)
    .toBeGreaterThan(inspectorCollapsedBox!.width + 150);
  const bothCollapsedBox = await content.boundingBox();
  expect(bothCollapsedBox).not.toBeNull();
  expect(bothCollapsedBox!.width).toBeGreaterThan(
    inspectorCollapsedBox!.width + 150,
  );
  await expect(
    page.getByRole("button", { name: "展开资源导航" }),
  ).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "切换原型树" }).click();
  const collapsedTree = page.locator(".collapsed-tree-popover");
  await expect(
    collapsedTree.locator(
      'a[href="/workbench/prototypes/cold-chain-ops/screens/exception-queue"]',
    ),
  ).toBeVisible();
  await collapsedTree
    .locator('a[href="/workbench/prototypes/cold-chain-ops/screens/shipment-detail"]')
    .click();
  await expect(page).toHaveURL(/\/screens\/shipment-detail/);
});

test("element inspector is hidden outside the canvas", async ({ page }) => {
  await page.goto("/workbench/foundations/tokens/color");
  await expect(page.getByTestId("inspector-panel")).toHaveCount(0);
  await expect(page.getByTestId("resource-page-shell")).toBeVisible();

  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=default&mode=light",
  );
  await expect(page.getByTestId("inspector-panel")).toBeVisible();
  await expect(page.locator(".inspector-panel .panel-title")).toHaveText(
    "元素检查",
  );
});

test("cold-chain variants update the live Runtime in place", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/shipment-detail?variant=default&theme=default&mode=light",
  );
  const runtime = page.frameLocator("iframe");
  const runtimeUrl = () =>
    runtime
      .locator("body")
      .evaluate((body) => body.ownerDocument.location.href);
  const root = runtime.locator(
    '[data-pb-id="cold-chain-ops.shipment-detail.root"]',
  );

  await expect(root).toBeVisible();
  // Mark the Runtime document: a reload or remount would drop the marker.
  await runtime
    .locator("body")
    .evaluate((body) => {
      (body.ownerDocument.defaultView as Window & { __pbMarker?: string }).__pbMarker =
        "kept";
    });

  await page.getByRole("button", { name: "预览设置" }).click();
  await selectPreviewSetting(page, "Variant", "持续超温");
  await expect(page).toHaveURL(/variant=active-excursion/);
  await expect.poll(runtimeUrl).toContain("variant=active-excursion");

  await selectPreviewSetting(page, "Variant", "处置操作打开");
  await expect(page).toHaveURL(/variant=action-sheet-open/);
  await expect.poll(runtimeUrl).toContain("variant=action-sheet-open");
  await expect(runtime.locator('[data-pb-role="sheet"]')).toBeVisible();

  await selectPreviewSetting(page, "Variant", "运输正常");
  await expect(page).toHaveURL(/variant=default/);
  await expect.poll(runtimeUrl).toContain("variant=default");
  await expect(root).toBeVisible();
  await expect(runtime.locator('[data-pb-role="sheet"]')).toHaveCount(0);

  const marker = await runtime
    .locator("body")
    .evaluate(
      (body) =>
        (body.ownerDocument.defaultView as Window & { __pbMarker?: string })
          .__pbMarker,
    );
  expect(marker).toBe("kept");
});

test("Workbench screen tree bypasses in-app confirmations", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/resolution-form?variant=confirm-dialog-open&theme=default&mode=light",
  );
  const runtime = page.frameLocator("iframe");
  const runtimeUrl = () =>
    runtime
      .locator("body")
      .evaluate((body) => body.ownerDocument.location.href);

  await expect(
    runtime.getByText("确认提交处置记录？", { exact: true }),
  ).toBeVisible();

  await page
    .locator(
      'a[href="/workbench/prototypes/cold-chain-ops/screens/exception-queue"]',
    )
    .click();
  await expect(page).toHaveURL(/\/screens\/exception-queue/);
  await expect
    .poll(runtimeUrl)
    .toContain("/prototype/cold-chain-ops/exception-queue");
  await expect(
    runtime.locator('[data-pb-id="cold-chain-ops.exception-queue.root"]'),
  ).toBeVisible();
  await expect(
    runtime.getByText("确认提交处置记录？", { exact: true }),
  ).toHaveCount(0);

  await page
    .locator(
      'a[href="/workbench/prototypes/cold-chain-ops/screens/shipment-detail"]',
    )
    .click();
  await expect(page).toHaveURL(/\/screens\/shipment-detail/);
  await expect
    .poll(runtimeUrl)
    .toContain("/prototype/cold-chain-ops/shipment-detail");
  await expect(
    runtime.locator('[data-pb-id="cold-chain-ops.shipment-detail.root"]'),
  ).toBeVisible();
});

test("search and settings controls have usable behavior", async ({ page }) => {
  await page.getByRole("button", { name: "搜索资源" }).click();
  await page.getByRole("textbox", { name: "名称", exact: true }).fill("浅色");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "浅色主题", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workbench\/foundations\/themes\/light$/);

  await page.getByRole("button", { name: "工作台设置" }).click();
  await expect(page.getByText("工作台偏好", { exact: true })).toBeVisible();
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/workbench/foundations/tokens/colors");
});

test("primary and secondary navigation update the URL and resource view", async ({
  page,
}) => {
  const componentsLink = page.getByRole("link", { name: "组件", exact: true });
  await expect(componentsLink).toBeVisible();
  await componentsLink.click();
  await expect(page).toHaveURL(/\/workbench\/components\/button$/);
  await expect(page.getByRole("heading", { name: "按钮" })).toBeVisible();

  await page.getByRole("link", { name: "Chip", exact: true }).click();
  await expect(page).toHaveURL(/\/workbench\/components\/chip$/);
  await expect(page.getByRole("heading", { name: "Chip" })).toBeVisible();

  const foundationsLink = page.getByRole("link", {
    name: "设计基础",
    exact: true,
  });
  await foundationsLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/workbench\/foundations\/tokens\/colors$/);

  await page.getByRole("link", { name: "浅色主题", exact: true }).click();
  await expect(page).toHaveURL(/\/workbench\/foundations\/themes\/light$/);
  await expect(page.getByRole("heading", { name: "浅色主题" })).toBeVisible();
});

test("collapsing side panels expands the content track", async ({ page }) => {
  const content = page.getByTestId("content-canvas");
  const initialBox = await content.boundingBox();
  expect(initialBox).not.toBeNull();

  await page.getByRole("button", { name: "收起上下文检查" }).click();
  await expect
    .poll(async () => (await content.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initialBox!.width + 250);
  const inspectorCollapsedBox = await content.boundingBox();
  expect(inspectorCollapsedBox).not.toBeNull();
  expect(inspectorCollapsedBox!.width).toBeGreaterThan(initialBox!.width + 250);
  await expect(
    page.getByRole("button", { name: "展开上下文检查" }),
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

import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1100 } });

test("field-service ships seven routable screens and real navigation", async ({ page }) => {
  await page.goto("/prototype/field-service/dashboard?variant=default&theme=light");
  await expect(page.getByRole("heading", { name: "早上好，李明" })).toBeVisible();
  await page.getByRole("button", { name: "查看工单" }).click();
  await expect(page).toHaveURL(
    /\/prototype\/field-service\/work-order-detail\?variant=default&theme=light/,
  );
  await expect(page.getByRole("heading", { name: "中央空调异常检修" })).toBeVisible();
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(
    /\/prototype\/field-service\/dashboard\?variant=default&theme=light/,
  );
  await page.getByRole("button", { name: "查看工单" }).click();
  await expect(page.getByRole("button", { name: "打开 Dialog" })).toHaveCount(0);
  await page.getByRole("button", { name: "完成工单" }).click();
  await expect(page.getByRole("dialog", { name: "确认完成工单？" })).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("dialog", { name: "确认完成工单？" })).toHaveCount(0);

  await page.goto("/prototype/field-service/create-work-order?variant=validation-error&theme=light");
  await expect(page.getByText("请填写问题描述")).toBeVisible();

  await page.goto("/prototype/field-service/work-order-detail?variant=dialog-open&theme=dark");
  const dialog = page.getByRole("dialog", { name: "确认完成工单？" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(41, 44, 48)");
  await expect(page.getByTestId("runtime-root")).toHaveClass(/runtime-app/);
});

test("workbench follows Runtime navigation and keeps review mode healthy", async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/field-service/screens/dashboard?variant=default&theme=light",
  );
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame.getByRole("button", { name: "查看工单" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/field-service\/screens\/work-order-detail\?variant=default&theme=light/,
  );

  await page.getByRole("button", { name: "选择与评审" }).click();
  await frame.getByRole("button", { name: "完成工单" }).click();
  await expect(page.getByTestId("inspector-body").getByText("color.on-action", { exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "完成工单" }).press("Escape");
  await frame.getByRole("button", { name: "完成工单" }).press("Escape");
  await expect(page.getByRole("button", { name: "选择与评审" })).toBeVisible();
});

test("create work order submits and opens the created detail", async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/field-service/screens/create-work-order?variant=default&theme=light",
  );
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame.getByRole("textbox", { name: "问题描述" }).fill("冷却塔异常振动");
  await frame.getByRole("button", { name: "创建工单" }).click();
  await expect(frame.getByText("工单已创建，正在打开详情")).toBeVisible();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/field-service\/screens\/work-order-detail\?variant=created&theme=light/,
  );
  await expect(frame.getByRole("heading", { name: "冷却塔异常振动" })).toBeVisible();
});

test("prototype dark theme also updates canvas chrome and safe area", async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/field-service/screens/dashboard?variant=default&theme=light",
  );
  await page.getByRole("button", { name: "预览设置" }).click();
  await page.getByLabel("原型主题").selectOption("dark");
  await expect(page.getByRole("toolbar", { name: "画布工具栏" })).toHaveClass(/is-dark/);
  await expect(page.getByTestId("phone-stage")).toHaveClass(/is-dark/);
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await expect(frame.getByTestId("runtime-root")).toHaveClass(/v-theme--pbworkDark/);
  await expect(frame.getByRole("navigation", { name: "底部导航" })).toHaveCSS(
    "padding-bottom",
    "20px",
  );
});

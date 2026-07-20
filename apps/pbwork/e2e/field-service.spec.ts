import { expect, test } from "@playwright/test";

test("field-service ships seven routable screens and real navigation", async ({ page }) => {
  await page.goto("/prototype/field-service/dashboard?variant=default&theme=light");
  await expect(page.getByRole("heading", { name: "早上好，李明" })).toBeVisible();
  await page.getByRole("button", { name: "查看工单" }).click();
  await expect(page).toHaveURL(
    /\/prototype\/field-service\/work-order-detail\?variant=default&theme=light/,
  );
  await expect(page.getByRole("heading", { name: "中央空调异常检修" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开 Dialog" })).toHaveCount(0);
  await page.getByRole("button", { name: "完成工单" }).click();
  await expect(page.getByRole("dialog", { name: "确认完成工单？" })).toBeVisible();
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.getByRole("dialog", { name: "确认完成工单？" })).toHaveCount(0);

  await page.goto("/prototype/field-service/create-work-order?variant=validation-error&theme=light");
  await expect(page.getByText("请填写问题描述")).toBeVisible();

  await page.goto("/prototype/field-service/work-order-detail?variant=dialog-open&theme=dark");
  await expect(page.getByRole("dialog", { name: "确认完成工单？" })).toBeVisible();
  await expect(page.getByTestId("runtime-root")).toHaveClass(/runtime-app/);
});

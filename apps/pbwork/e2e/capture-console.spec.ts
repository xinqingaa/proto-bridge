import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1050 } });

test("lifecycle console starts new prototypes in active and does not skip review", async ({
  page,
}) => {
  await page.goto("/workbench/prototypes/all");

  await expect(page.getByRole("heading", { name: "原型生命周期" })).toBeVisible();
  await expect(page.getByLabel("原型生命周期筛选")).toContainText("进行中");
  await expect(page.getByLabel("原型生命周期筛选")).toContainText("待确定");
  await expect(page.getByLabel("原型生命周期筛选")).toContainText("已定稿");
  await expect(page.getByLabel("原型生命周期筛选")).toContainText("已归档");

  const coldChain = page.locator("article").filter({ hasText: "冷链异常处置台" });
  await expect(coldChain).toContainText("进行中");
  await expect(coldChain.getByRole("button", { name: "送交待确定" })).toBeVisible();
  await expect(coldChain.getByRole("button", { name: /采集/ })).toHaveCount(0);
  await expect(coldChain.getByRole("button", { name: /删除/ })).toHaveCount(0);

  await coldChain.getByRole("button", { name: "送交待确定" }).click();
  await expect(page.getByRole("heading", { name: "送交待确定" })).toBeVisible();
  await expect(page.getByText("不会提前采集 Evidence")).toBeVisible();
  await page.getByRole("button", { name: "确认送交待确定" }).click();

  await expect(coldChain).toContainText("待确定");
  await expect(coldChain.getByRole("button", { name: "定稿并采集" })).toBeVisible();
  await expect(coldChain.getByRole("button", { name: "退回进行中" })).toBeVisible();
});

test("finalized capture page is read-only and hides all manual capture entry points", async ({
  page,
}) => {
  await page.goto("/workbench/capture");

  await expect(page.getByRole("heading", { name: "定稿采集" })).toBeVisible();
  await expect(page.getByText("还没有定稿产物")).toBeVisible();
  await expect(page.getByText("已定稿或已归档原型")).toBeVisible();
  await expect(page.getByRole("button", { name: /采集当前页面/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /重新采集/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /生成.*提示词/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /删除|清理/ })).toHaveCount(0);
});

import { expect, type Locator, type Page } from "@playwright/test";
async function acceptAll(locator: Locator) {
  for (const checkbox of await locator
    .getByRole("checkbox", { name: "我已了解" })
    .all()) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
}

export async function finalizePrototype(page: Page, label: string) {
  await page.goto("/workbench/prototypes/all");
  const row = page.locator("article").filter({ hasText: label });

  await row.getByRole("button", { name: "送交待确定" }).click();
  await page.getByRole("button", { name: "确认送交待确定" }).click();
  await expect(row).toContainText("待确定");

  await row.getByRole("button", { name: "定稿并采集" }).click();
  const sheet = page.getByTestId("lifecycle-finalization-sheet");
  await expect(
    sheet.getByText("预检完成，等待确认候选方案已经收敛。"),
  ).toBeVisible({
    timeout: 90_000,
  });
  await sheet
    .getByRole("checkbox", {
      name: "候选方案已经收敛，正式入口和 Registry 只保留唯一方案",
    })
    .check();
  await acceptAll(sheet);
  await sheet.getByRole("button", { name: "按计划开始采集" }).click();

  await expect
    .poll(
      async () => {
        if (await row.getByText("已定稿", { exact: true }).isVisible())
          return "final";
        if (
          await sheet
            .getByRole("button", { name: "确认并生成提示词" })
            .isVisible()
        ) {
          return "risks";
        }
        const failure = sheet.getByTestId("finalization-failure");
        if (await failure.isVisible())
          return `failed:${await failure.innerText()}`;
        return "capturing";
      },
      { timeout: 180_000, intervals: [1_000] },
    )
    .toMatch(/^(final|risks)$/);

  if (
    await sheet.getByRole("button", { name: "确认并生成提示词" }).isVisible()
  ) {
    await acceptAll(sheet);
    await sheet.getByRole("button", { name: "确认并生成提示词" }).click();
  }

  await expect(row.getByText("已定稿", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(row).toContainText("已正式定稿");
  await sheet.getByRole("button", { name: "完成" }).click();
  await expect(sheet).toBeHidden();
  return row;
}

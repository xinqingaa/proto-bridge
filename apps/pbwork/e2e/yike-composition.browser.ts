import { expect, test } from "@playwright/test";
for (const theme of ["mechanical", "water", "sundial"])
  for (const mode of ["light", "dark"]) {
    test(`${theme}/${mode}: B3 editor, settings, confirmation and undo`, async ({
      page,
    }) => {
      await page.goto(
        `/e2e/fixtures/yike-composition.html?theme=${theme}&mode=${mode}`,
      );
      const a = page.locator("#host-A"),
        b = page.locator("#host-B");
      const editor = a.locator('[data-pb-id="preview.A.editor"]');
      const newButton = a.getByRole("button", {
        name: "新建习惯",
        exact: true,
      });
      await newButton.click();
      await expect(editor).toBeVisible();
      await editor.getByRole("button", { name: "保存", exact: true }).click();
      await expect(
        editor.getByText("写一个习惯名称", { exact: false }),
      ).toBeVisible();
      const name = editor.getByRole("textbox", { name: "习惯名称" });
      await name.fill("  每天读书  ");
      await editor.getByRole("button", { name: "保存", exact: true }).click();
      await expect(editor).toBeHidden();
      await expect(newButton).toBeFocused();
      await expect(a.locator('p[role="status"]')).toContainText(
        "已保存：每天读书",
      );
      await expect(b.locator('p[role="status"]')).not.toContainText("每天读书");
      const edit = a.getByRole("button", { name: "编辑习惯", exact: true });
      await edit.click();
      await expect(name).toHaveValue("每天读书");
      await name.fill("未保存的修改");
      await page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll("#host-A [class]")).some(
            (element) =>
              Array.from(element.classList).some((name) =>
                /-(enter|leave)-active$/.test(name),
              ),
          ),
      );
      await page.keyboard.press("Escape");
      await expect(editor).toBeHidden();
      await expect(edit).toBeFocused();
      await edit.click();
      await expect(name).toHaveValue("每天读书");
      await expect(
        a.locator('[class*="-enter-active"], [class*="-leave-active"]'),
      ).toHaveCount(0);
      await name.focus();
      await page.keyboard.press("Tab");
      expect(
        await editor.evaluate((e) => e.contains(document.activeElement)),
      ).toBe(true);
      await editor.getByRole("button", { name: "关闭", exact: true }).click();
      await a.getByRole("button", { name: "提醒状态", exact: true }).click();
      await expect(editor.locator('input[type="time"]')).toHaveValue("22:30");
      await editor
        .getByRole("button", { name: "保存", exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        editor.getByRole("button", { name: "保存", exact: true }),
      ).toBeInViewport();
      await editor.getByRole("button", { name: "关闭", exact: true }).click();
      await a.getByRole("button", { name: "失败状态", exact: true }).click();
      await expect(editor.getByRole("alert")).toContainText("保存失败");
      await expect(name).not.toHaveValue("");
      await editor.getByRole("button", { name: "保存", exact: true }).click();
      await expect(editor).toBeHidden();
      await a.getByText("长休间隔", { exact: true }).click();
      const setting = a.locator('[data-pb-id="preview.A.setting"]');
      await expect(setting).toBeVisible();
      await setting.getByRole("button", { name: "增加", exact: false }).click();
      await setting.getByRole("button", { name: "确认", exact: true }).click();
      await expect(a.getByText("每 5 轮", { exact: true })).toBeVisible();
      await a.getByRole("button", { name: "删除确认", exact: true }).click();
      const confirm = a.locator('[data-pb-id="preview.A.confirm"]');
      await confirm.getByRole("button", { name: "取消", exact: true }).click();
      await expect(a.locator('p[role="status"]')).toContainText("已保存");
      await a.getByRole("button", { name: "删除确认", exact: true }).click();
      await confirm.getByRole("button", { name: "删除", exact: true }).click();
      await expect(a.locator('p[role="status"]')).toContainText("已确认删除");
      await a.getByRole("button", { name: "今日打卡", exact: true }).click();
      await a.getByRole("button", { name: "撤销", exact: true }).click();
      await expect(
        a.getByRole("button", { name: "今日打卡", exact: true }),
      ).toBeVisible();
      await expect(a.locator('p[role="status"]')).toContainText("已撤销");
      await expect(b.locator(".v-overlay--active")).toHaveCount(0);
      await b.getByRole("button", { name: "新建习惯", exact: true }).click();
      const bEditor = b.locator('[data-pb-id="preview.B.editor"]');
      await bEditor
        .getByRole("textbox", { name: "习惯名称" })
        .fill("独立设备B");
      await bEditor.getByRole("button", { name: "保存", exact: true }).click();
      await expect(b.locator('p[role="status"]')).toContainText("独立设备B");
      await edit.click();
      await expect(name).toHaveValue("每天读书");
      await editor.getByRole("button", { name: "关闭", exact: true }).click();
      await a.getByRole("button", { name: "周频率", exact: true }).click();
      await expect(
        a.locator(".v-overlay--active .v-overlay__content"),
      ).toHaveCSS("transform", "none");
      await expect(bEditor).toBeHidden();
      await page.screenshot({
        path: `../../output/yike-b3/${theme}-${mode}.png`,
      });
    });
  }

test("窄屏缩短可用高度时表单仍可键盘操作、滚动保存并复位", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 540 });
  await page.goto(
    "/e2e/fixtures/yike-composition.html?theme=water&mode=dark&compact=1",
  );
  const host = page.locator("#host-A");
  await host.getByRole("button", { name: "提醒状态", exact: true }).click();
  const editor = host.locator('[data-pb-id="preview.A.editor"]');
  const name = editor.getByRole("textbox", { name: "习惯名称" });
  await name.fill("这是一个较长但可保存的习惯名称，用来检查窄屏编辑");
  await name.press("Tab");
  expect(await editor.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await editor.getByRole("radio", { name: "每周", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "增加每周次数", exact: true }),
  ).toBeVisible();
  const save = editor.getByRole("button", { name: "保存", exact: true });
  await save.scrollIntoViewIfNeeded();
  const bounds = await save.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(540);
  await page.screenshot({ path: "../../output/yike-b3/narrow-scroll.png" });
  await save.click();
  await expect(editor).toBeHidden();
  await expect(host.locator('p[role="status"]')).toContainText("已保存");
  await host.getByRole("button", { name: "复位", exact: true }).click();
  await host.getByRole("button", { name: "编辑习惯", exact: true }).click();
  await expect(name).toHaveValue("读 20 页书");
});

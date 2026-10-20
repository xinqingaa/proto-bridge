import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00+08:00") });
});
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '[class*="-enter-active"], [class*="-leave-active"]',
      ),
  );
}
const primarySelector = '[data-pb-id="yike.focus.primary-action"]:visible';
for (const [theme, mode, width, height] of [
  ["mechanical", "light", 390, 844],
  ["water", "dark", 360, 640],
  ["sundial", "light", 390, 844],
] as const) {
  test(`focus action hierarchy is stable in ${theme}/${mode}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const positions: number[] = [];
    for (const [variant, label, secondary] of [
      ["countdown-running", "暂停", ["取消计时"]],
      ["countdown-paused", "继续", ["结束并记录", "取消计时"]],
      ["countdown-due", "完成", ["再计 1 分钟"]],
      ["finished", "开始休息", ["跳过休息"]],
      ["short-break-finished", "准备下一轮", []],
    ] as const) {
      // Each variant uses its own deterministic fixture, including after prior interactions.
      await page.goto(
        `/prototype/yike/focus?variant=${variant}&theme=${theme}&mode=${mode}`,
      );
      const primary = page.locator(primarySelector);
      await expect(primary).toHaveText(label);
      await settle(page);
      const bounds = (await primary.boundingBox())!;
      positions.push(bounds.y);
      expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThan(1);
      const actions = page.locator(".yike-secondary-actions:visible");
      await expect(actions.getByRole("button")).toHaveText([...secondary]);
      for (const button of await actions.getByRole("button").all()) {
        await expect(button).toHaveClass(/kind-quiet/);
        await expect(button).not.toHaveClass(/is-glass/);
        const box = (await button.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await expect(actions).not.toContainText("到点了");
      await expect(actions).not.toContainText("提示音已开启");
      if (variant === "countdown-due") {
        const feedback = page.locator(
          '[data-pb-id="yike.focus.completion-feedback"]:visible',
        );
        await expect(feedback).toHaveText("提示音已开启");
        expect((await feedback.boundingBox())!.y).toBeLessThan(bounds.y);
        await page.screenshot({
          path: `../../output/yike-focus-actions/due-${theme}-${mode}.png`,
          animations: "disabled",
        });
        await page
          .getByRole("button", { name: "再计 1 分钟", exact: true })
          .click();
        await expect(primary).toHaveText("暂停");
        await expect(feedback).not.toBeVisible();
        await settle(page);
        expect(
          Math.abs((await primary.boundingBox())!.y - bounds.y),
        ).toBeLessThan(1);
      }
      if (theme === "sundial" && variant === "countdown-paused")
        await page.screenshot({
          path: "../../output/yike-focus-actions/paused-sundial-light.png",
          animations: "disabled",
        });
      if (theme === "water" && variant === "short-break-finished")
        await page.screenshot({
          path: "../../output/yike-focus-actions/break-finished-water-dark.png",
          animations: "disabled",
        });
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    await page.getByRole("button", { name: "准备下一轮", exact: true }).click();
    await expect(page.locator(primarySelector)).toHaveText("开始专注");
  });
}

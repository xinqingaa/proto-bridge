import { expect, test, type Page } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Shanghai",
});
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00+08:00") });
});
const settle = (page: Page) =>
  page.waitForFunction(
    () =>
      !document.querySelector(
        '[class*="-enter-active"], [class*="-leave-active"]',
      ),
  );

for (const theme of ["mechanical", "water", "sundial"])
  for (const mode of ["light", "dark"]) {
    test(`readout rolls down and stays inside its dial in ${theme}/${mode}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        `/prototype/yike/focus?variant=countdown-setup&theme=${theme}&mode=${mode}`,
      );
      const dial = page.locator(".yike-dial:visible");
      const digits = dial.locator('[data-pb-id="yike.focus.timer.digits"]');
      await expect(digits).toHaveAttribute("aria-label", "05:00");
      await settle(page);
      await page.screenshot({
        path: `../../output/yike-palette/${theme}-${mode}.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "开始 5 分钟", exact: true })
        .click();
      await page.clock.fastForward(1000);
      await expect(
        dial.locator(".digit-down-enter-active").first(),
      ).toBeAttached();
      await expect(
        dial.locator(".digit-down-enter-active").first(),
      ).not.toHaveText(":");
      if (theme === "water") {
        // Both painted copies must change in the same direction and show the same time.
        await expect(dial.locator(".digits")).toHaveCount(2);
        const names = await dial
          .locator(".digits")
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute("aria-label")),
          );
        expect(new Set(names).size).toBe(1);
      }
      await settle(page);
      await expect(digits).toHaveText("04:59");
      const bounds = await dial.evaluate((el) => {
        const d = el.querySelector(".digits")!.getBoundingClientRect();
        const container = (
          el.querySelector(".knob") ?? el
        ).getBoundingClientRect();
        return {
          left: d.left - container.left,
          right: container.right - d.right,
        };
      });
      expect(bounds.left).toBeGreaterThan(5);
      expect(bounds.right).toBeGreaterThan(5);
      await page.getByRole("button", { name: "暂停", exact: true }).click();
      await settle(page);
      const paused = await digits.getAttribute("aria-label");
      await page.clock.fastForward(3000);
      await expect(digits).toHaveAttribute("aria-label", paused!);
      expect(errors).toEqual([]);
    });
  }

test("stopwatch rolls upwards, reduced motion changes digits directly", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=stopwatch-running&theme=mechanical&mode=light",
  );
  await page.clock.fastForward(1000);
  await expect(
    page.locator(".yike-dial:visible .digit-up-enter-active").first(),
  ).toBeAttached();
  await settle(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const readout = page.locator(".yike-dial:visible .digits").first();
  const before = await readout.getAttribute("aria-label");
  await page.clock.fastForward(1000);
  await expect(readout).not.toHaveAttribute("aria-label", before!);
  await expect(
    page.locator(".yike-dial:visible .digit-up-enter-active"),
  ).toHaveCount(0);
  await expect(page.locator(".yike-dial:visible .digits")).toHaveCount(1);
});

test("hour readings reserve their size across the hour boundary", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=countdown-setup&theme=mechanical&mode=light",
  );
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.focus.custom-sheet"]');
  await sheet
    .getByRole("listbox", { name: "小时", exact: true })
    .press("ArrowDown");
  await sheet.getByRole("listbox", { name: "分钟", exact: true }).press("Home");
  await sheet.getByRole("button", { name: "确认时长", exact: true }).click();
  await settle(page);
  const digits = page.locator(".yike-dial:visible .digits").first();
  await expect(digits).toHaveAttribute("aria-label", "1:00:00");
  const size = await digits.getAttribute("transform");
  await page
    .locator('[data-pb-id="yike.focus.primary-action"]:visible')
    .click();
  await page.clock.fastForward(1000);
  await settle(page);
  await expect(digits).toHaveAttribute("aria-label", "59:59");
  await expect(digits).toHaveAttribute("transform", size!);
});

test("review period and chart share direction without growing all bars again", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/review?variant=with-records&theme=water&mode=light",
  );
  await page.getByRole("button", { name: "上一期", exact: true }).click();
  await expect(page.locator(".chart-content")).toBeVisible();
  await settle(page);
  expect(
    await page
      .locator(".yike-review")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--yike-review-offset"),
      ),
  ).toContain("-8px");
  await page.getByRole("button", { name: "下一期", exact: true }).click();
  await settle(page);
  await expect(page.locator(".bars").first()).toBeVisible();
  expect(
    await page
      .locator(".bars")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("kept-mounted modes reveal measured digits when first selected", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=water&mode=light",
  );
  for (const label of ["正计时", "倒计时", "番茄钟"]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await settle(page);
    const dial = page.locator(".yike-dial:visible");
    await expect
      .poll(() =>
        dial
          .locator(".digits")
          .first()
          .evaluate((el) => {
            const clips = Array.from(el.querySelectorAll("clipPath rect"));
            return (
              clips.length > 0 &&
              clips.every((clip) => Number(clip.getAttribute("height")) > 0)
            );
          }),
      )
      .toBe(true);
  }
});

for (const theme of ["mechanical", "water", "sundial"]) {
  test(`maximum countdown stays inside ${theme}`, async ({ page }) => {
    await page.goto(
      `/prototype/yike/focus?variant=countdown-setup&theme=${theme}&mode=dark`,
    );
    await page.getByRole("button", { name: "自定义", exact: true }).click();
    const sheet = page.locator('[data-pb-id="yike.focus.custom-sheet"]');
    for (const label of ["小时", "分钟", "秒"])
      await sheet
        .getByRole("listbox", { name: label, exact: true })
        .press("End");
    await sheet.getByRole("button", { name: "确认时长", exact: true }).click();
    await settle(page);
    const dial = page.locator(".yike-dial:visible");
    await expect(dial.locator(".digits").first()).toHaveAttribute(
      "aria-label",
      "23:59:59",
    );
    const margins = await dial.evaluate((el) => {
      const d = el.querySelector(".digits")!.getBoundingClientRect();
      const parent = (el.querySelector(".knob") ?? el).getBoundingClientRect();
      return [d.left - parent.left, parent.right - d.right];
    });
    expect(Math.min(...margins)).toBeGreaterThan(5);
    await page.screenshot({
      path: `../../output/yike-palette/long-${theme}-dark.png`,
      animations: "disabled",
    });
  });
}

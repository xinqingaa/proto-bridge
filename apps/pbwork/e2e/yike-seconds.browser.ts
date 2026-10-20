import { expect, test, type Page } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Shanghai",
});
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
async function setDuration(page: Page, totalSeconds: number) {
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.focus.custom-sheet"]');
  const minutes = sheet.getByRole("listbox", { name: "分钟", exact: true });
  const seconds = sheet.getByRole("listbox", { name: "秒", exact: true });
  await sheet.getByRole("listbox", { name: "小时", exact: true }).press("Home");
  await minutes.press("Home");
  for (let index = 0; index < Math.floor(totalSeconds / 60); index++)
    await minutes.press("ArrowDown");
  await seconds.press("Home");
  const first = totalSeconds < 60 ? 1 : 0;
  for (let index = first; index < totalSeconds % 60; index++)
    await seconds.press("ArrowDown");
  return sheet;
}

for (const [theme, mode, width, height] of [
  ["mechanical", "light", 390, 844],
  ["water", "dark", 360, 640],
  ["sundial", "light", 390, 844],
] as const) {
  test(`second countdown and precise day records in ${theme}/${mode}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(
      `/prototype/yike/focus?variant=countdown-setup&theme=${theme}&mode=${mode}`,
    );
    const sheet = await setDuration(page, 5);
    await expect(sheet.getByRole("listbox")).toHaveCount(3);
    await expect(
      sheet
        .getByRole("listbox", { name: "秒", exact: true })
        .getByRole("option", { selected: true }),
    ).toHaveText("05");
    await settle(page);
    await page.screenshot({
      path: `../../output/yike-seconds/picker-${theme}-${mode}.png`,
      animations: "disabled",
    });
    await sheet.getByRole("button", { name: "确认时长", exact: true }).click();
    await expect(page.locator('[data-pb-id="yike.focus.timer"]')).toContainText(
      "00:05",
    );
    await page.getByRole("button", { name: "开始 5 秒", exact: true }).click();
    await page.clock.fastForward(5000);
    await expect(
      page.getByRole("button", { name: "完成", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-pb-id="yike.focus.short-record-confirm"]'),
    ).not.toBeVisible();
    await page.getByRole("button", { name: "完成", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "开始 5 秒", exact: true }),
    ).toBeVisible();
    const mixed = await setDuration(page, 95);
    await mixed.getByRole("button", { name: "确认时长", exact: true }).click();
    await expect(page.locator('[data-pb-id="yike.focus.timer"]')).toContainText(
      "01:35",
    );
    await page
      .getByRole("button", { name: "开始 1 分 35 秒", exact: true })
      .click();
    await page.clock.fastForward(95_000);
    await page.getByRole("button", { name: "完成", exact: true }).click();
    await page.getByRole("tab", { name: "回顾", exact: true }).click();
    await page
      .locator('[data-pb-id="yike.review.chart.day"][aria-current="date"]')
      .click();
    const detail = page.locator('[data-pb-id="yike.review.day-detail"]');
    await expect(detail.locator(".day-focus-records strong")).toHaveText([
      "5 秒",
      "1 分 35 秒",
    ]);
    await expect(
      detail.locator('[data-pb-id="yike.review.day-total"]'),
    ).toHaveText("1 分 40 秒");
    await expect(
      detail.getByRole("heading", { name: "本周", exact: true }),
    ).toBeVisible();
    await expect(detail.locator(".mode-icon")).toHaveCount(0);
    await settle(page);
    expect(
      await detail.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../../output/yike-seconds/records-${theme}-${mode}.png`,
      animations: "disabled",
    });
  });
}

test("custom threshold preserves an arbitrary second value across close and reload", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=water&mode=dark",
  );
  const trigger = page.getByRole("button", {
    name: "短时记录确认阈值",
    exact: true,
  });
  await trigger.click();
  const sheet = page.locator('[data-pb-id="yike.settings.threshold-sheet"]');
  await sheet.getByRole("button", { name: "自定义时长", exact: true }).click();
  const seconds = sheet.getByRole("listbox", { name: "秒", exact: true });
  await seconds.press("Home");
  for (let index = 1; index < 15; index++) await seconds.press("ArrowDown");
  await sheet.getByRole("button", { name: "确认", exact: true }).click();
  await expect(
    page.getByText("短时记录确认阈值已设为 15 秒。", { exact: true }),
  ).toBeVisible();
  await trigger.click();
  await expect(seconds.getByRole("option", { selected: true })).toHaveText(
    "15",
  );
  await sheet.getByRole("button", { name: "关闭", exact: true }).click();
  await page.reload();
  await trigger.click();
  await expect(seconds.getByRole("option", { selected: true })).toHaveText(
    "15",
  );
  await expect(
    sheet
      .getByRole("listbox", { name: "分钟", exact: true })
      .getByRole("option", { selected: true }),
  ).toHaveText("00");
  await settle(page);
  await page.screenshot({
    path: "../../output/yike-seconds/threshold-water-dark.png",
    animations: "disabled",
  });
});

for (const [theme, mode, seconds] of [
  ["mechanical", "light", 300],
  ["water", "dark", 90],
] as const) {
  test(`repeat countdown retains the last duration and separate records (${theme}/${mode})`, async ({
    page,
  }) => {
    await page.goto(
      `/prototype/yike/focus?variant=countdown-setup&theme=${theme}&mode=${mode}`,
    );
    if (seconds === 90) {
      const sheet = await setDuration(page, seconds);
      await sheet
        .getByRole("button", { name: "确认时长", exact: true })
        .click();
    }
    const start = seconds === 90 ? "开始 1 分 30 秒" : "开始 5 分钟";
    const repeat = seconds === 90 ? "再计1分30秒" : "再计5分";
    await page.getByRole("button", { name: start, exact: true }).click();
    await page.clock.fastForward(seconds * 1000);
    const again = page.getByRole("button", { name: repeat, exact: true });
    await expect(again).toBeVisible();
    await expect(
      page.getByRole("button", { name: "完成", exact: true }),
    ).toBeVisible();
    await settle(page);
    await page.screenshot({
      path: `../../output/yike-repeat/due-${theme}-${mode}.png`,
      animations: "disabled",
    });
    await again.click();
    await expect(
      page.getByRole("button", { name: "暂停", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-pb-id="yike.focus.timer"]:visible'),
    ).toContainText(seconds === 90 ? "01:30" : "05:00");
    await page.clock.fastForward(seconds * 1000);
    await expect(again).toBeVisible();
    await page.getByRole("button", { name: "完成", exact: true }).click();
    await page.getByRole("tab", { name: "回顾", exact: true }).click();
    await page
      .locator('[data-pb-id="yike.review.chart.day"][aria-current="date"]')
      .click();
    const detail = page.locator('[data-pb-id="yike.review.day-detail"]');
    await expect(detail.locator(".day-focus-records strong")).toHaveText(
      seconds === 90 ? ["1 分 30 秒", "1 分 30 秒"] : ["5 分钟", "5 分钟"],
    );
  });
}

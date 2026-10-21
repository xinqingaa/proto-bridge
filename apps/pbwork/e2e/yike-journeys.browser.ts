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
async function open(
  page: Page,
  slug: string,
  variant = "default",
  theme = "mechanical",
  mode = "light",
) {
  await page.goto(
    `/prototype/yike/${slug}?variant=${variant}&theme=${theme}&mode=${mode}`,
  );
  await expect(page.locator(`[data-pb-id="yike.${slug}.root"]`)).toBeVisible();
}
async function openReview(page: Page, variant = "intensity-levels") {
  await open(page, "review", variant);
  await settle(page);
}
const detailSelector = '[data-pb-id="yike.review.day-detail"]';

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

test("habit creation, checkin, editing, archive, restore and deletion stay consistent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/checkin?variant=default&theme=water&mode=light",
  );
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  await expect(page).toHaveURL(/habit-editor/);
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("读一本书");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await page
    .getByRole("button", { name: "打卡：读一本书", exact: true })
    .click();
  await page.getByRole("button", { name: /读一本书 每天/ }).click();
  await expect(page).toHaveURL(/habit-detail/);
  await expect(
    page.getByRole("heading", { name: "读一本书", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-pb-id="yike.habit-detail.week"]'),
  ).toContainText("1");
  await settle(page);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("取消的修改");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/habit-detail/);
  await expect(
    page.getByRole("heading", { name: "读一本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "习惯名称", exact: true }),
  ).toHaveValue("读一本书");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("读两本书");
  await settle(page);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "归档习惯", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await expect(
    page.getByRole("button", { name: "取消打卡：读两本书", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "已归档习惯", exact: true }).click();
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "取消打卡：读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*1 次/,
  );
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  await page.getByRole("button", { name: /读两本书 每天/ }).click();
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*0 次/,
  );
  await page.reload();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*0 次/,
  );
});

test("settings preserve the current timer and apply configuration to the next session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await focus.getByRole("button", { name: "开始专注", exact: true }).click();
  await focus.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\?/);
  await page.getByRole("button", { name: "水位表盘", exact: true }).click();
  await page.getByRole("tab", { name: "深色", exact: true }).click();
  await expect(page).toHaveURL(/theme=water&mode=dark/);
  await page.getByRole("button", { name: /专注时长/ }).click();
  const minutes = page.getByRole("listbox", { name: "分钟", exact: true });
  await minutes.press("ArrowDown");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(
    page.locator(
      '[data-pb-id="yike.settings.configuration.row"][data-pb-key="pomodoro-pomodoroMinutes"]',
    ),
  ).toContainText("26 分钟");
  await page.clock.fastForward(65_000);
  await settle(page);
  await page.getByRole("button", { name: "专注", exact: true }).click();
  await expect(page).toHaveURL(/\/focus\?/);
  await expect(focus).toContainText(/23:[0-5]\d/);
  await focus.getByRole("button", { name: "暂停", exact: true }).click();
  await focus.getByRole("button", { name: "结束并记录", exact: true }).click();
  await focus.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(focus).toContainText("26:00");
  await focus.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "重置所有数据", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.locator(
      '[data-pb-id="yike.settings.configuration.row"][data-pb-key="pomodoro-pomodoroMinutes"]',
    ),
  ).toContainText("26 分钟");
  await page.getByRole("button", { name: "重置所有数据", exact: true }).click();
  await page.getByRole("button", { name: "确认重置", exact: true }).click();
  await expect(page).toHaveURL(/\/focus\?.*theme=mechanical/);
  await expect(
    focus.getByRole("button", { name: "开始专注", exact: true }),
  ).toBeVisible();
  await expect(focus).toContainText("25:00");
  await expect(focus).toContainText("第 1 轮");
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /专注次数\s*0 次/,
  );
});

test("常用倒计时可改、可清空，并出现在专注页", async ({ page }) => {
  await open(page, "settings", "default", "mechanical");
  await page.getByText("常用倒计时", { exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.settings.presets-sheet"]');
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "第 1 项：3分" }),
  ).toBeVisible();

  await sheet.getByRole("button", { name: /第 1 项/ }).click();
  const seconds = sheet.getByRole("listbox", { name: "秒", exact: true });
  await sheet.getByRole("listbox", { name: "小时", exact: true }).press("Home");
  await sheet.getByRole("listbox", { name: "分钟", exact: true }).press("Home");
  await seconds.press("Home");
  for (let index = 1; index < 45; index++) await seconds.press("ArrowDown");
  await sheet.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    sheet.getByRole("button", { name: "第 1 项：45秒" }),
  ).toBeVisible();

  await sheet.getByRole("button", { name: /第 4 项/ }).click();
  await sheet.getByRole("button", { name: "清空", exact: true }).click();
  await expect(
    sheet.getByRole("button", { name: "第 4 项：未设置" }),
  ).toBeVisible();

  await open(page, "focus", "default", "mechanical");
  await page.getByRole("tab", { name: "倒计时", exact: true }).click();
  await expect(page.locator(".yike-presets").getByRole("button")).toHaveText([
    "45秒",
    "5分",
    "10分",
    "自定义",
  ]);
});

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
});

test("day navigation stays within the opened month or week and never skips empty dates", async ({
  page,
}) => {
  await openReview(page);
  await page.locator('[data-date="2026-10-01"]').click();
  const detail = page.locator(detailSelector);
  await expect(
    detail.getByRole("button", { name: "前一天", exact: true }),
  ).toBeDisabled();
  await detail.getByRole("button", { name: "后一天", exact: true }).click();
  await expect(detail).toContainText("10月2日 周五");
  await expect(detail).toContainText("这一天还没有记录");
  await detail.getByRole("button", { name: "关闭", exact: true }).click();
  await openReview(page, "history");
  await page.getByRole("button", { name: "上一期", exact: true }).click();
  await page
    .getByRole("button", { name: "2026-10-12，0 分钟", exact: true })
    .click();
  await expect(detail).toContainText("10月12日 周一");
  await expect(
    detail.getByRole("button", { name: "前一天", exact: true }),
  ).toBeDisabled();
  for (let index = 0; index < 6; index++)
    await detail.getByRole("button", { name: "后一天", exact: true }).click();
  await expect(detail).toContainText("10月18日 周日");
  await expect(
    detail.getByRole("button", { name: "后一天", exact: true }),
  ).toBeDisabled();
});

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

for (const mode of ["light", "dark"]) {
  test(`water calendar tiers, selection and day details: ${mode}`, async ({
    page,
  }) => {
    await open(page, "review", "intensity-levels", "water", mode);
    for (const [date, band, ratio] of [
      ["17", "low", 1 / 3],
      ["18", "medium", 1 / 2],
      ["19", "high", 1],
      ["21", "none", 0],
    ] as const) {
      const day = page.locator(`[data-date="2026-10-${date}"]`);
      await expect(day.locator(".date-artwork")).toHaveAttribute(
        "data-intensity",
        band,
      );
      const fill = day.locator(
        '[data-pb-id="yike.review.chart.mark"] > rect[clip-path]',
      );
      const geometry = await fill.evaluate((rect) => {
        const svg = (rect as SVGRectElement).ownerSVGElement!;
        const vessel = svg.querySelector("circle.vessel")!;
        const clip = svg.querySelector("clipPath rect")!;
        return {
          height: Number(rect.getAttribute("height")),
          clipHeight: Number(clip.getAttribute("height")),
          side: Number(vessel.getAttribute("r")) * 2,
        };
      });
      expect(geometry.height / geometry.side).toBeCloseTo(ratio);
      expect(geometry.clipHeight).toBeCloseTo(geometry.height);
    }
    const day = page.locator('[data-date="2026-10-18"]');
    const before = await day
      .locator("svg > rect[clip-path]")
      .getAttribute("height");
    await day.click();
    const detail = page.locator(detailSelector);
    await expect(detail).toBeVisible();
    await expect(detail.locator(".day-focus-records strong")).toHaveText(
      "1 小时 0 分钟",
    );
    await expect(day.locator(".selection")).toHaveCount(1);
    expect(
      await day.locator("svg > rect[clip-path]").getAttribute("height"),
    ).toBe(before);
    await detail.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(detail).not.toBeVisible();
  });
}

test("all themes render focus and review without page errors or horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const theme of ["mechanical", "water", "sundial"])
    for (const mode of ["light", "dark"]) {
      await page.setViewportSize({
        width: mode === "dark" ? 360 : 390,
        height: mode === "dark" ? 640 : 844,
      });
      for (const [slug, variant] of [
        ["focus", "countdown-setup"],
        ["review", "intensity-levels"],
      ]) {
        await open(page, slug!, variant!, theme, mode);
        await settle(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
        if (slug === "focus") {
          await expect(
            page.locator(".yike-dial:visible .digits").first(),
          ).toHaveAttribute("aria-label", "05:00");
          await expect(
            page.getByRole("button", { name: "开始 5 分钟", exact: true }),
          ).toBeInViewport();
        }
      }
    }
  expect(errors).toEqual([]);
});

import { test, expect, type Page } from "@playwright/test";

async function open(
  page: Page,
  slug: string,
  variant = "default",
  theme = "mechanical",
  mode = "light",
  extra = "",
) {
  await page.goto(
    `/prototype/yike/${slug}?variant=${variant}&theme=${theme}&mode=${mode}${extra}`,
  );
  await page.locator(`[data-pb-id="yike.${slug}.root"]`).waitFor();
}
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '[class*="-enter-active"], [class*="-leave-active"]',
      ),
  );
}
async function shot(page: Page, name: string) {
  await settle(page);
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          (animation) =>
            animation.playState === "running" &&
            animation.effect?.getTiming().iterations !== Infinity,
        ),
  );
  await page.screenshot({ path: `../../output/yike-experience/${name}.png` });
}
test.beforeEach(async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (!testInfo.title.startsWith("opening a sheet"))
    await page.clock.install({ time: new Date("2026-10-19T10:24:00+08:00") });
});

test("empty history remains browsable and period controls never move", async ({
  page,
}) => {
  await open(page, "review");
  const summary = page.locator('[data-pb-id="yike.review.summary"]');
  const before = await summary.boundingBox();
  for (let count = 0; count < 8; count++)
    await page.getByRole("button", { name: "上一期", exact: true }).click();
  await expect(
    page.getByText("这一周还没有专注记录", { exact: true }),
  ).toBeVisible();
  expect((await summary.boundingBox())!.y).toBe(before!.y);
  await expect(
    page.getByRole("button", { name: "回到本周", exact: true }),
  ).toBeEnabled();
  await page.getByRole("radio", { name: "月", exact: true }).click();
  for (let count = 0; count < 4; count++)
    await page.getByRole("button", { name: "上一期", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "上一期", exact: true }),
  ).toBeEnabled();
  await shot(page, "empty-history-month");
  await page.getByRole("button", { name: "回到本月", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "下一期", exact: true }),
  ).toBeDisabled();
  await expect(page.locator('[data-pb-id="yike.review.period"]')).toHaveText(
    "2026 年 10 月",
  );
});

test("month cells stay compact, selection preserves data, and type tracks share a scale", async ({
  page,
}) => {
  await open(page, "review", "month");
  const cell = page.locator('[data-date="2026-10-19"]');
  expect((await cell.boundingBox())!.height).toBeLessThanOrEqual(48);
  await expect(cell.locator("svg circle.outline")).toHaveCount(1);
  const before = await cell
    .locator(".number")
    .getAttribute("data-pb-token-color");
  await cell.click();
  await expect(
    page.locator('[data-pb-id="yike.review.day-detail"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "按类型", exact: true }),
  ).toBeVisible();
  expect(
    await cell.locator(".number").getAttribute("data-pb-token-color"),
  ).toBe(before);
  const sizes = await page
    .locator(".type-track")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().width),
    );
  expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1);
  await shot(page, "month-selected");
  await page.locator('[data-pb-id="yike.review.day-detail.close"]').click();
  await expect(
    page.locator('[data-pb-id="yike.review.day-detail"]'),
  ).not.toBeVisible();
  await shot(page, "month");
});

test("new habit is an overlay on the same source instance, cancel/save keep geometry", async ({
  page,
}) => {
  await open(page, "checkin");
  const root = page.locator('[data-pb-id="yike.checkin.root"]');
  await root.evaluate((node) => {
    (window as any).__source = node;
  });
  const first = page.locator('[data-pb-id="yike.checkin.habit.habit-water"]');
  const before = await first.boundingBox();
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  await expect(page).toHaveURL(/habit-editor/);
  const panel = page.locator('[data-pb-id="yike.habit-editor.panel"]');
  await expect(panel).toBeVisible();
  expect(await root.evaluate((node) => node === (window as any).__source)).toBe(
    true,
  );
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("每天拉伸");
  await panel.getByRole("radio", { name: "每周", exact: true }).click();
  await expect(
    panel.getByRole("listbox", { name: "每周次数", exact: true }),
  ).toBeVisible();
  await panel.getByRole("checkbox", { name: "提醒", exact: true }).check();
  await expect(
    panel.getByRole("listbox", { name: "小时", exact: true }),
  ).toBeVisible();
  await shot(page, "editor-expanded");
  await panel.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page).toHaveURL(/checkin/);
  await expect(panel).not.toBeVisible();
  expect(await root.evaluate((node) => node === (window as any).__source)).toBe(
    true,
  );
  expect((await first.boundingBox())!.y).toBe(before!.y);
  await expect(
    page.getByRole("button", { name: "新建习惯", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "习惯名称", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("每天拉伸");
  await panel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(panel).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: /每天拉伸 每天/ }),
  ).toBeVisible();
  expect((await first.boundingBox())!.y).toBe(before!.y);
  await shot(page, "habit-saved");
  const notice = await page
    .locator('[data-pb-id="yike.checkin.saved"]')
    .boundingBox();
  const navigation = await page
    .getByRole("tablist", { name: "应用主导航", exact: true })
    .boundingBox();
  expect(notice!.y + notice!.height).toBeLessThanOrEqual(navigation!.y);
  await page
    .getByRole("button", { name: "打卡：每天拉伸", exact: true })
    .click();
  await expect(
    page.locator('[data-pb-id="yike.checkin.saved"]'),
  ).not.toBeVisible();
  await expect(page.locator('[data-pb-id="yike.checkin.undo"]')).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
});

test("editing retains the real detail and its scroll position", async ({
  page,
}) => {
  await open(
    page,
    "habit-detail",
    "habit-records",
    "water",
    "dark",
    "&habit=habit-water",
  );
  const root = page.locator('[data-pb-id="yike.habit-detail.root"]');
  await root.evaluate((node) => {
    (window as any).__detail = node;
    node.scrollTop = 80;
  });
  const scroll = await root.evaluate((node) => node.scrollTop);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  const panel = page.locator('[data-pb-id="yike.habit-editor.panel"]');
  await expect(panel).toBeVisible();
  expect(await root.evaluate((node) => node === (window as any).__detail)).toBe(
    true,
  );
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("喝水");
  await shot(page, "editor-water-dark");
  await panel.getByRole("button", { name: "保存", exact: true }).click();
  await expect(panel).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "喝水", exact: true }),
  ).toBeVisible();
  expect(await root.evaluate((node) => node === (window as any).__detail)).toBe(
    true,
  );
  expect(await root.evaluate((node) => node.scrollTop)).toBe(scroll);
});

test("narrow dark month and reduced motion remain readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "review", "month", "water", "dark");
  await shot(page, "month-water-dark-narrow");
  expect(
    await page
      .locator(".yike-review")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.getByRole("radio", { name: "周", exact: true }).click();
  await expect(page.locator(".week-chart")).toBeVisible();
  await expect(page.locator(".scale")).toContainText("125 分钟");
  await shot(page, "week-water-dark-narrow");
});

test("checkin-only weeks expose day records instead of a dead empty chart", async ({
  page,
}) => {
  await open(page, "review", "only-checkins");
  await page
    .getByRole("button", { name: "2026-10-19，0 分钟", exact: true })
    .click();
  const detail = page.locator('[data-pb-id="yike.review.day-detail"]');
  await expect(detail).toContainText("打卡：喝够 8 杯水");
  await expect(detail.locator('[data-pb-id="yike.review.habit"]')).toHaveCount(
    4,
  );
});

test("narrow editor keeps its save action with optional content expanded", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "habit-editor", "default", "water", "dark");
  const panel = page.locator('[data-pb-id="yike.habit-editor.panel"]');
  await panel.getByRole("radio", { name: "每周", exact: true }).click();
  await panel.getByRole("checkbox", { name: "提醒", exact: true }).check();
  await expect(
    panel.getByRole("button", { name: "保存", exact: true }),
  ).toBeInViewport();
  const minutes = panel.getByRole("listbox", { name: "分钟", exact: true });
  await minutes.scrollIntoViewIfNeeded();
  await expect(minutes).toBeInViewport();
  await shot(page, "editor-water-dark-narrow");
});

test("opening a sheet animates only the overlay while its source remains fixed", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page, "checkin");
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  const frames = await page.evaluate(async () => {
    const source = document.querySelector('[data-pb-id="yike.checkin.root"]')!;
    const samples: Array<{
      sourceY: number;
      panelY: number;
      routeMotion: boolean;
    }> = [];
    for (let frame = 0; frame < 24; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const panel = document.querySelector(
        '[data-pb-id="yike.habit-editor.panel"]',
      );
      if (!panel) continue;
      samples.push({
        sourceY: source.getBoundingClientRect().y,
        panelY: panel.getBoundingClientRect().y,
        routeMotion: Boolean(
          document.querySelector(
            ".pb-route-ios-push-enter-active, .pb-route-ios-back-enter-active",
          ),
        ),
      });
    }
    return samples;
  });
  expect(frames.length).toBeGreaterThan(12);
  expect(
    Math.max(...frames.map((frame) => frame.sourceY)) -
      Math.min(...frames.map((frame) => frame.sourceY)),
  ).toBeLessThan(1);
  expect(frames.some((frame) => frame.routeMotion)).toBe(false);
  expect(
    Math.max(...frames.map((frame) => frame.panelY)) -
      Math.min(...frames.map((frame) => frame.panelY)),
  ).toBeGreaterThan(1);
});

for (const theme of ["mechanical", "water", "sundial"])
  for (const mode of ["light", "dark"]) {
    test(`review compact control and three month tiers: ${theme}/${mode}`, async ({
      page,
    }) => {
      await open(page, "review", "intensity-levels", theme, mode);
      const control = page.locator('[data-pb-id="yike.review.range-tabs"]');
      const track = await control.locator(".compact-track").boundingBox();
      expect(track!.height).toBe(36);
      expect(
        (await control
          .getByRole("radio", { name: "月", exact: true })
          .boundingBox())!.height,
      ).toBeGreaterThanOrEqual(44);
      const plate = await control
        .getByRole("radio", { name: "月", exact: true })
        .evaluate((node) =>
          parseFloat(getComputedStyle(node, "::before").height),
        );
      expect(plate).toBe(30);
      for (const [date, band] of [
        ["16", "low"],
        ["17", "medium"],
        ["18", "high"],
      ]) {
        await expect(
          page.locator(`[data-date="2026-10-${date}"] .date-artwork`),
        ).toHaveAttribute("data-intensity", band!);
      }
      const day = page.locator('[data-date="2026-10-16"]');
      if (theme === "mechanical")
        await expect(day.locator("circle.outline")).toHaveCount(1);
      const today = page.locator('[data-date="2026-10-19"]');
      await expect(today.locator(".today-mark")).toHaveAttribute(
        "data-face",
        theme,
      );
      await expect(today).toHaveAttribute("aria-label", /今天/);
      await expect(today.locator(".today-mark path")).toHaveCount(1);
      const pointerBox = (await today.locator(".today-mark").boundingBox())!;
      const numberBox = (await today.locator(".number").boundingBox())!;
      expect(pointerBox.y + pointerBox.height).toBeLessThan(numberBox.y);
      expect(
        Math.abs(
          pointerBox.x +
            pointerBox.width / 2 -
            numberBox.x -
            numberBox.width / 2,
        ),
      ).toBeLessThan(1);

      await expect(
        page.locator(
          '[data-pb-id="yike.review.today"] [data-pb-glyph="calendar-current"]',
        ),
      ).toHaveCount(1);
      if (theme === "water") {
        await expect(day.locator("circle.vessel")).toHaveCount(1);
        await expect(day.locator(".submerged-number")).toHaveCount(1);
        expect(
          await day
            .locator(".number")
            .evaluate((node) => getComputedStyle(node).backgroundColor),
        ).toBe("rgba(0, 0, 0, 0)");
      }
      if (theme === "sundial") {
        await expect(day.locator("rect.vessel")).toHaveCount(1);
        await expect(day.locator(".sun-shadow")).toHaveCount(1);
        const values = await page
          .locator("feGaussianBlur")
          .evaluateAll((nodes) =>
            nodes.map((node) => Number(node.getAttribute("stdDeviation"))),
          );
        expect(values).toEqual(expect.arrayContaining([1.5, 3, 4.5]));
      }
      await shot(page, `tiers-${theme}-${mode}`);
      const before = await day
        .locator("svg")
        .getAttribute("data-pb-token-opacity");
      await day.click();
      expect(
        await day.locator("svg").getAttribute("data-pb-token-opacity"),
      ).toBe(before);
      await expect(day.locator(".selection")).toHaveCount(1);
      await page.locator('[data-pb-id="yike.review.day-detail.close"]').click();
      await control.getByRole("radio", { name: "周", exact: true }).click();
      await expect(page.locator(".week-chart")).toBeVisible();
      if (mode === "light") await shot(page, `compact-week-${theme}`);
      await open(page, "review", "month", theme, mode);
      const recordedToday = page.locator('[data-date="2026-10-19"]');
      await expect(recordedToday.locator(".date-artwork")).toHaveAttribute(
        "data-intensity",
        "low",
      );
      const pointer = await recordedToday
        .locator(".today-pointer")
        .getAttribute("d");
      await shot(page, `today-recorded-${theme}-${mode}`);
      await recordedToday.click();
      await expect(recordedToday.locator(".selection")).toHaveCount(1);
      expect(
        await recordedToday.locator(".today-pointer").getAttribute("d"),
      ).toBe(pointer);
      await expect(
        page.locator('[data-pb-id="yike.review.day-detail"]'),
      ).toBeVisible();
      await shot(page, `today-selected-${theme}-${mode}`);
    });
  }

for (const theme of ["mechanical", "water", "sundial"])
  for (const viewport of [
    { width: 390, height: 844, mode: "light" },
    { width: 360, height: 640, mode: "dark" },
  ]) {
    test(`stopwatch keeps its whole dial stable from idle through laps: ${theme}/${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await open(page, "focus", "default", theme, viewport.mode);
      await page.getByRole("tab", { name: "正计时", exact: true }).click();
      await settle(page);
      const dial = page.locator(
        ".yike-focus-main.is-stopwatch:visible .yike-dial",
      );
      const measure = () =>
        dial.evaluate((node) => {
          const svg = node as SVGSVGElement;
          const matrix = svg.getScreenCTM()!;
          const rect = svg.getBoundingClientRect();
          return {
            x: rect.x + (rect.width - svg.viewBox.baseVal.width * matrix.a) / 2,
            y:
              rect.y +
              (rect.height - svg.viewBox.baseVal.height * matrix.d) / 2,
            width: svg.viewBox.baseVal.width * matrix.a,
            height: svg.viewBox.baseVal.height * matrix.d,
          };
        });
      const before = await measure();
      expect(before.height).toBeGreaterThanOrEqual(
        viewport.width === 390 ? 300 : 170,
      );
      if (viewport.width === 390)
        expect(before.width).toBeGreaterThanOrEqual(
          theme === "water" ? 200 : 260,
        );
      await shot(page, `stopwatch-idle-${theme}-${viewport.width}`);
      await page.getByRole("button", { name: "开始计时", exact: true }).click();
      await settle(page);
      const running = await measure();
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(running[key] - before[key])).toBeLessThan(1);
      for (let index = 0; index < 12; index++) {
        await page.clock.runFor(1000);
        await page.getByRole("button", { name: "计圈", exact: true }).click();
      }
      const list = page.locator('[data-pb-id="yike.focus.lap-scroll"]');
      expect(
        await list.evaluate((node) => node.scrollHeight > node.clientHeight),
      ).toBe(true);
      await list.hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => list.evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0);
      const many = await measure();
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(many[key] - before[key])).toBeLessThan(1);
      await shot(page, `stopwatch-laps-${theme}-${viewport.width}`);
      await page.getByRole("button", { name: "暂停", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "继续", exact: true }),
      ).toBeInViewport();
      const paused = await measure();
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(paused[key] - before[key])).toBeLessThan(1);
      await expect(
        page.getByRole("button", { name: "结束并记录", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "取消计时", exact: true }),
      ).toBeInViewport();
      const actions = await page
        .locator(".yike-focus-main:visible .yike-actions")
        .boundingBox();
      const navigation = await page.locator(".pb-tabbar-shell").boundingBox();
      expect(actions!.y + actions!.height).toBeLessThanOrEqual(navigation!.y);
    });
  }

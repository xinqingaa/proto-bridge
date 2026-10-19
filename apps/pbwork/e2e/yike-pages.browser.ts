import { test, expect, type Page } from "@playwright/test";

const clock = new Date("2026-10-16T10:24:00+08:00");

test("D3: timer completion, breaks, laps and confirmations have readable page states", async ({
  page,
}) => {
  await page.clock.install({ time: clock });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [variant, face, mode, label] of [
    ["finished", "mechanical", "light", "开始休息"],
    ["long-break", "water", "dark", "暂停"],
    ["stopwatch-running", "sundial", "light", "计圈"],
    ["countdown-due", "mechanical", "dark", "再计 1 分钟"],
    ["abandon-confirm", "water", "light", "确认放弃"],
  ]) {
    await open(page, "focus", variant!, face!, mode!);
    await expect(
      page.getByRole("button", { name: label!, exact: true }),
    ).toBeVisible();
    await shot(page, `focus-${variant}`);
  }
});
async function open(
  page: Page,
  slug: string,
  variant = "default",
  face = "mechanical",
  mode = "light",
  extra = "",
) {
  await page.goto(
    `/prototype/yike/${slug}?variant=${variant}&theme=${face}&mode=${mode}${extra}`,
  );
  await page.locator(`[data-pb-id="yike.${slug}.root"]`).waitFor();
  await settle(page);
}
async function settle(page: Page) {
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll(".runtime-app [class]")).some(
        (el) =>
          Array.from(el.classList).some((name) =>
            /-(enter|leave)-active$/.test(name),
          ),
      ),
  );
}
async function shot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({
    path: `../../output/yike-d/${name}.png`,
    animations: "disabled",
  });
  expect(
    (await page.locator(".runtime-app").boundingBox())?.y,
    `${name}: outer viewport must not scroll with focus`,
  ).toBe(0);
}

test("D1–D7: six theme combinations use the real pages without horizontal overflow", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  for (const face of ["mechanical", "water", "sundial"])
    for (const mode of ["light", "dark"]) {
      for (const slug of [
        "launch",
        "focus",
        "checkin",
        "habit-detail",
        "habit-editor",
        "review",
        "settings",
      ]) {
        const page = await browser.newPage({
          baseURL: baseURL!,
          viewport: { width: 390, height: 844 },
          timezoneId: "Asia/Shanghai",
        });
        await page.clock.install({ time: clock });
        await open(page, slug, "default", face, mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const root = page.locator(`[data-pb-id="yike.${slug}.root"]`);
        expect(await root.count()).toBe(1);
        if (slug === "launch") {
          const dial = await page
            .locator('[data-pb-id="yike.launch.dial"]')
            .boundingBox();
          expect(Math.abs(dial!.x + dial!.width / 2 - 195)).toBeLessThan(1);
          await expect(
            page.getByRole("heading", { name: "一刻", exact: true }),
          ).toBeVisible();
          await expect(root.getByRole("button")).toHaveCount(0);
        }
        if (slug === "focus")
          await expect(
            page.getByRole("button", { name: "开始专注", exact: true }),
          ).toBeVisible();
        await shot(page, `${slug}-${face}-${mode}`);
        if (slug === "checkin" || slug === "settings") {
          await root.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await shot(page, `${slug}-${face}-${mode}-bottom`);
          await expect(
            page.getByRole("button", {
              name: slug === "checkin" ? "已归档习惯" : "重置所有数据",
              exact: true,
            }),
          ).toBeInViewport();
        }
        await page.close();
      }
    }
});

test("D3: custom countdown validates, cancels without mutation, and starts its chosen duration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: clock });
  await open(page, "focus", "countdown-setup", "water");
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.focus.custom-sheet"]');
  await sheet.getByRole("listbox", { name: "分钟", exact: true }).press("Home");
  await sheet.getByRole("button", { name: "确认时长", exact: true }).click();
  await expect(sheet.getByRole("alert")).toHaveText("请选择 1–180 分钟");
  await shot(page, "focus-custom-validation");
  await sheet.getByRole("button", { name: "取消", exact: true }).click();
  await settle(page);
  await expect(
    page.getByRole("button", { name: "自定义", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "开始 5 分钟", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "自定义", exact: true }).click();
  const minutes = sheet.getByRole("listbox", { name: "分钟", exact: true });
  await minutes.press("Home");
  for (let i = 0; i < 7; i++) await minutes.press("ArrowDown");
  await sheet.getByRole("button", { name: "确认时长", exact: true }).click();
  await settle(page);
  await page.getByRole("button", { name: "开始 7 分钟", exact: true }).click();
  await expect(page).toHaveURL(/variant=countdown-running/);
  await expect(page.locator('[data-pb-id="yike.focus.timer"]')).toContainText(
    "07:00",
  );
  await shot(page, "focus-custom-running");
});

test("D4–D6: completed/empty/archive, weekly detail and validation keep clear actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: clock });
  for (const variant of ["partial", "completed", "empty", "archived"]) {
    await open(page, "checkin", variant, "sundial", "dark");
    await shot(page, `checkin-${variant}`);
    if (variant === "completed")
      await expect(
        page.getByText("今天的习惯都完成了，明天见。", { exact: true }),
      ).toBeVisible();
    if (variant === "archived") {
      await page
        .getByRole("button", { name: "已归档习惯", exact: true })
        .click();
      await shot(page, "checkin-archived-sheet");
      await page.keyboard.press("Escape");
      await settle(page);
    }
  }
  await open(
    page,
    "habit-detail",
    "weekly",
    "water",
    "dark",
    "&habit=habit-running",
  );
  await expect(page.getByText(/还差 1 次达成周目标/)).toBeVisible();
  await shot(page, "detail-weekly");
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await shot(page, "detail-delete");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await settle(page);
  await expect(
    page.getByRole("button", { name: "删除习惯", exact: true }),
  ).toBeFocused();
  await open(page, "habit-editor", "invalid-name", "mechanical");
  await expect(page.getByText("写一个习惯名称", { exact: true })).toBeVisible();
  await shot(page, "editor-validation");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("每天留一点时间给自己");
  await expect(page.getByText("写一个习惯名称", { exact: true })).toHaveCount(
    0,
  );
});

test("D7: history navigation, month selection, empty days and future dates reflect their period", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: clock });
  await open(page, "review", "history");
  const review = page.locator('[data-pb-id="yike.review.root"]');
  await expect(review).toContainText("50 分钟");
  await page.getByRole("button", { name: "上一期", exact: true }).click();
  await expect(review).toContainText("10月5日 – 11日");
  await expect(review).toContainText("25 分钟");
  await shot(page, "review-previous");
  await page.getByRole("button", { name: "下一期", exact: true }).click();
  await page
    .getByRole("button", { name: "2026-10-14，25 分钟", exact: true })
    .click();
  await expect(
    page.locator('[data-pb-id="yike.review.day-detail"]'),
  ).toContainText("番茄钟");
  await shot(page, "review-selected");
  await page.getByRole("radio", { name: "月", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "下个月", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "下一期", exact: true }),
  ).toBeDisabled();
  await expect(review).toContainText("2026 年 10 月");
  await shot(page, "review-month");
  await expect(page.locator('[data-date="2026-10-17"]')).toBeDisabled();
  for (const variant of ["only-checkins", "only-focus"]) {
    await open(page, "review", variant, "water", "dark");
    await shot(page, `review-${variant}`);
    await expect(review).toContainText(
      variant === "only-checkins"
        ? /专注次数\s*0 次\s*打卡\s*4 次/
        : /专注次数\s*1 次\s*打卡\s*0 次/,
    );
  }
});

test("D1–D7: narrow and reduced-motion pages retain controls and respect keyboard scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: clock });
  for (const [slug, variant] of [
    ["launch", "default"],
    ["focus", "paused"],
    ["checkin", "default"],
    ["habit-detail", "habit-records"],
    ["habit-editor", "default"],
    ["review", "month"],
    ["settings", "default"],
  ]) {
    await open(
      page,
      slug!,
      variant!,
      "sundial",
      "dark",
      slug === "habit-detail" ? "&habit=habit-water" : "",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await shot(page, `${slug}-narrow-reduced`);
    if (slug === "focus") {
      await page
        .getByRole("button", { name: "继续", exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole("button", { name: "继续", exact: true }),
      ).toBeInViewport();
      await shot(page, "focus-narrow-controls");
    }
  }
  await open(page, "habit-editor", "default", "sundial", "dark");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("每周伸展");
  await page.getByRole("radio", { name: "每周", exact: true }).click();
  await page.getByRole("checkbox", { name: "提醒", exact: true }).check();
  await page
    .getByRole("button", { name: "保存", exact: true })
    .scrollIntoViewIfNeeded();
  await shot(page, "editor-narrow-long");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await expect(
    page.getByRole("button", { name: /每周伸展 每周/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "专注", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "开始专注", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-pb-id="yike.launch.root"]')).toHaveCount(0);
});

test("short records use a configurable confirmation threshold without losing the paused session", async ({
  page,
}) => {
  await page.clock.install({ time: clock });
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "settings", "record-threshold");
  for (const seconds of [5, 10, 60, 180, 300, 600])
    await expect(
      page.locator(`[data-pb-id="yike.settings.threshold-${seconds}"]`),
    ).toBeVisible();
  await page.locator('[data-pb-id="yike.settings.threshold-custom"]').click();
  await page.getByRole("spinbutton").fill("7");
  await shot(page, "record-threshold-custom");
  await page.locator('[data-pb-id="yike.settings.threshold-save"]').click();
  await expect(
    page.getByText("短时记录确认阈值已设为 7 秒。", { exact: true }),
  ).toBeVisible();
  await open(page, "settings", "record-threshold");
  await page.locator('[data-pb-id="yike.settings.threshold-cancel"]').click();
  await open(page, "focus", "short-record", "water", "dark");
  await expect(
    page.getByRole("button", { name: "仍然记录", exact: true }),
  ).toBeVisible();
  await shot(page, "short-record-confirm-dark");
  await page.getByRole("button", { name: "暂不结束", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "结束并记录", exact: true }).click();
  await page.getByRole("button", { name: "仍然记录", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "开始计时", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-pb-id="yike.focus.root"]')
      .getByText("5 秒", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.duration"]')).toHaveText(
    "5 秒",
  );
});

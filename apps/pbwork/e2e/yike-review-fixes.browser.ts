import { expect, test, type Page } from "@playwright/test";
const clock = new Date("2026-10-19T12:00:00+08:00");
async function open(page: Page, slug: string, variant = "default") {
  await page.goto(
    `/prototype/yike/${slug}?variant=${variant}&theme=mechanical&mode=light`,
  );
  await expect(page.locator(`[data-pb-id="yike.${slug}.root"]`)).toBeVisible();
}
test.use({ viewport: { width: 390, height: 844 } });

test("Workbench accepts in-prototype appearance changes without reverting the iframe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    "/workbench/prototypes/yike/screens/settings?variant=default&theme=mechanical&mode=light",
  );
  const frame = page.frameLocator("iframe");
  await frame.getByRole("radio", { name: "深色", exact: true }).click();
  await expect(page).toHaveURL(/mode=dark/);
  await expect(
    frame.getByRole("radio", { name: "深色", exact: true }),
  ).toBeChecked();
  await frame.getByRole("button", { name: "水位表盘", exact: true }).click();
  await expect(page).toHaveURL(/theme=water/);
  await expect(
    frame.getByRole("button", { name: "水位表盘", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await frame.getByRole("radio", { name: "浅色", exact: true }).click();
  await expect(page).toHaveURL(/mode=light/);
  await expect(
    frame.getByRole("radio", { name: "浅色", exact: true }),
  ).toBeChecked();
  await frame.getByRole("radio", { name: "跟随系统", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page).toHaveURL(/mode=dark/);
  await expect(
    frame.getByRole("radio", { name: "跟随系统", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(
    frame.getByRole("radio", { name: "跟随系统", exact: true }),
  ).toBeChecked();
  await expect(
    frame.getByRole("button", { name: "水位表盘", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("navigation", { name: "工作台导航" })
      .getByRole("link", { name: "新建或编辑习惯", exact: true }),
  ).toHaveCount(0);
});

test("PhoneShell reserves safe insets once and calendar placeholders keep the same columns", async ({
  page,
}) => {
  await open(page, "settings");
  const appBar = await page.locator(".pb-app-bar").boundingBox();
  expect(appBar!.y).toBe(44);
  expect(
    await page
      .locator(".pb-app-bar")
      .evaluate((el) => getComputedStyle(el).paddingTop),
  ).toBe("0px");
  expect((await page.locator(".runtime-app").boundingBox())!.height).toBe(780);
  await open(page, "review", "month");
  const rows = await page.locator(".calendar .row").evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.children).map((el) => {
        const box = el.getBoundingClientRect();
        return box.x + box.width / 2;
      }),
    ),
  );
  for (const row of rows.slice(1))
    for (let col = 0; col < 7; col++)
      expect(Math.abs(row[col]! - rows[0]![col]!)).toBeLessThan(1);
});

test("setting duration cannot select zero or exceed bounds; threshold uses presets and second-precision custom duration", async ({
  page,
}) => {
  await open(page, "settings", "configuration-open");
  const sheet = page.locator(
    '[data-pb-id="yike.settings.configuration-sheet"]',
  );
  const minutes = sheet.getByRole("listbox", { name: "分钟", exact: true });
  await expect(
    minutes.getByRole("option", { name: "00", exact: true }),
  ).toHaveCount(0);
  await minutes.press("Home");
  await sheet.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByText("1 分钟", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "专注时长", exact: true }).click();
  await sheet.getByRole("listbox", { name: "小时", exact: true }).press("End");
  await expect(minutes.getByRole("option")).toHaveCount(1);
  await expect(minutes.getByRole("option")).toHaveText("00");
  await sheet.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByText("1 分钟", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "短时记录确认阈值", exact: true })
    .click();
  const threshold = page.locator(
    '[data-pb-id="yike.settings.threshold-sheet"]',
  );
  await expect(threshold.getByRole("listbox")).toHaveCount(1);
  const wheel = threshold.getByRole("listbox");
  await expect(wheel.getByRole("option")).toHaveText([
    "5 秒",
    "10 秒",
    "1 分钟",
    "3 分钟",
    "5 分钟",
    "10 分钟",
  ]);
  await threshold
    .getByRole("button", { name: "自定义时长", exact: true })
    .click();
  const custom = threshold.getByRole("listbox", {
    name: "分钟",
    exact: true,
  });
  await custom.press("Home");
  await custom.press("ArrowDown");
  await custom.press("ArrowDown");
  await threshold
    .getByRole("listbox", { name: "秒", exact: true })
    .press("Home");
  await expect(custom.getByRole("option", { selected: true })).toHaveText("02");
  await threshold.getByRole("button", { name: "确认", exact: true }).click();
  await expect(
    page.getByText("短时记录确认阈值已设为 2 分钟。", { exact: true }),
  ).toBeVisible();
});

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test(`many laps scroll independently and retain controls at ${size.width}×${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await open(page, "focus", "stopwatch-running");
    const actions = page.locator(".yike-actions");
    const before = await actions.boundingBox();
    for (let i = 0; i < 24; i++)
      await page.getByRole("button", { name: "计圈", exact: true }).click();
    const after = await actions.boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
    const list = page.locator('[data-pb-id="yike.focus.lap-scroll"]');
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
      true,
    );
    await list.hover();
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    const navigation = await page.locator(".pb-tabbar-shell").boundingBox();
    expect(after!.y + after!.height).toBeLessThanOrEqual(navigation!.y);
    await expect(
      page.getByRole("button", { name: "取消计时", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: `../../output/yike-review-fixes/laps-${size.width}.png`,
    });
  });
}

test("all-completed feedback keeps the cards stable and the editor opens from the checkin entry", async ({
  page,
}) => {
  await page.clock.install({ time: clock });
  await open(page, "checkin", "partial");
  const first = page.locator('[data-pb-id="yike.checkin.habit-list"]');
  const before = await first.boundingBox();
  const unchecked = page.getByRole("button", { name: /^打卡：/ });
  while (await unchecked.count()) await unchecked.first().click();
  await expect(page.getByText("今天都完成了", { exact: true })).toBeVisible();
  const after = await first.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  await expect(
    page.getByRole("button", { name: "已归档习惯", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "新建习惯", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".pb-sheet-actions")
      .getByRole("button", { name: "保存", exact: true }),
  ).toBeInViewport();
});

test("three mode decisions use one stacked footer and historical periods can return to today", async ({
  page,
}) => {
  await page.clock.install({ time: clock });
  await open(page, "focus", "running");
  await page.getByRole("tab", { name: "正计时", exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.focus.switch-sheet"]');
  await expect(
    sheet.locator(".pb-sheet-actions").getByRole("button"),
  ).toHaveCount(3);
  await expect(sheet.locator(".pb-sheet-body").getByRole("button")).toHaveCount(
    0,
  );
  await expect(
    sheet.getByRole("button", { name: "取消", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "../../output/yike-review-fixes/switch-sheet.png",
  });
  await sheet.getByRole("button", { name: "取消", exact: true }).click();
  await open(page, "review", "history");
  const previous = page.getByRole("button", { name: "上一期", exact: true });
  if (await previous.isEnabled()) await previous.click();
  const today = page.getByRole("button", { name: "回到本周", exact: true });
  await expect(today).toBeVisible();
  await today.click();
  await expect(
    page.getByRole("button", { name: "下一期", exact: true }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "月", exact: true }).click();
  await previous.click();
  await page.getByRole("button", { name: "回到本月", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "下一期", exact: true }),
  ).toBeDisabled();
});

for (const mode of ["light", "dark"]) {
  test(`threshold FlowSheet preserves drafts, cancels without saving and keeps footer stable (${mode})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`/prototype/yike/settings?theme=mechanical&mode=${mode}`);
    const trigger = page.getByRole("button", {
      name: "短时记录确认阈值",
      exact: true,
    });
    await trigger.click();
    const sheet = page.locator('[data-pb-id="yike.settings.threshold-sheet"]');
    await expect(
      sheet.getByText("少于此时长时先询问是否记录；达到阈值直接记录。", {
        exact: true,
      }),
    ).toHaveCount(0);
    const preset = sheet.getByRole("listbox", {
      name: "记录确认阈值",
      exact: true,
    });
    await preset.press("Home");
    const footer = sheet.getByRole("button", { name: "确认", exact: true });
    const firstBounds = await footer.boundingBox();
    const dots = sheet.locator(".pb-flow-sheet-dots");
    const firstDots = await dots.boundingBox();
    expect(firstDots!.y + firstDots!.height).toBeLessThanOrEqual(
      firstBounds!.y,
    );
    expect(firstDots!.y).toBeGreaterThan(
      (await sheet.locator(".pb-flow-sheet-body").boundingBox())!.y,
    );

    await sheet
      .getByRole("button", { name: "自定义时长", exact: true })
      .click();
    const minutes = sheet.getByRole("listbox", { name: "分钟", exact: true });
    await expect(
      sheet.getByRole("listbox", { name: "小时", exact: true }),
    ).toBeFocused();
    await minutes.press("Home");
    for (let i = 0; i < 7; i++) await minutes.press("ArrowDown");
    await sheet.getByRole("button", { name: "返回", exact: true }).click();
    await expect(preset.getByRole("option", { selected: true })).toHaveText(
      "5 秒",
    );
    await sheet
      .getByRole("button", { name: "自定义时长", exact: true })
      .click();
    await expect(minutes.getByRole("option", { selected: true })).toHaveText(
      "07",
    );
    const secondBounds = await footer.boundingBox();
    expect(Math.abs((await dots.boundingBox())!.y - firstDots!.y)).toBeLessThan(
      1,
    );
    expect(Math.abs(secondBounds!.y - firstBounds!.y)).toBeLessThan(1);
    await expect(footer).toBeInViewport();
    await expect
      .poll(() =>
        sheet
          .locator('section[aria-hidden="false"]')
          .evaluate((el) =>
            Math.abs(
              el.getBoundingClientRect().x -
                el.closest('[role="dialog"]')!.getBoundingClientRect().x,
            ),
          ),
      )
      .toBeLessThan(1);
    await page.screenshot({
      path: `../../output/yike-review-fixes/threshold-flow-${mode}.png`,
    });
    await sheet.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(preset.getByRole("option", { selected: true })).toHaveText(
      "10 秒",
    );
    await preset.press("Home");
    await footer.click();
    await expect(
      page.getByText("短时记录确认阈值已设为 5 秒。", { exact: true }),
    ).toBeVisible();
    await trigger.click();
    await expect(preset.getByRole("option", { selected: true })).toHaveText(
      "5 秒",
    );
    await sheet.getByRole("button", { name: "关闭", exact: true }).click();
    // A sub-minute saved value must survive opening/closing the custom page.
    await trigger.click();
    await sheet
      .getByRole("button", { name: "自定义时长", exact: true })
      .click();
    await sheet.getByRole("button", { name: "关闭", exact: true }).click();
    await trigger.click();
    await expect(preset.getByRole("option", { selected: true })).toHaveText(
      "5 秒",
    );
  });
}

test("finite rounds use a single wheel, and reminder clock supports midnight in the current editor", async ({
  page,
}) => {
  await open(page, "settings");
  await page.getByRole("button", { name: "长休间隔", exact: true }).click();
  const sheet = page.locator(
    '[data-pb-id="yike.settings.configuration-sheet"]',
  );
  const rounds = sheet.getByRole("listbox", { name: "长休间隔", exact: true });
  await expect(sheet.getByRole("listbox")).toHaveCount(1);
  await expect(rounds.getByRole("option")).toHaveText(
    Array.from({ length: 7 }, (_, i) => `每 ${i + 2} 轮`),
  );
  await rounds.press("End");
  await sheet.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByText("每 8 轮", { exact: true })).toBeVisible();
  await page.goto(
    "/e2e/fixtures/yike-composition.html?theme=water&mode=dark&compact=1",
  );
  const host = page.locator("#host-A");
  await host.getByRole("button", { name: "提醒状态", exact: true }).click();
  const editor = host.locator('[data-pb-id="preview.A.editor"]');
  await editor.getByRole("radio", { name: "每周", exact: true }).click();
  const target = editor.getByRole("listbox", { name: "每周次数", exact: true });
  await expect(target.getByRole("option")).toHaveCount(7);
  await target.press("End");
  await editor
    .getByRole("listbox", { name: "小时", exact: true })
    .press("Home");
  await editor
    .getByRole("listbox", { name: "分钟", exact: true })
    .press("Home");
  const save = editor.getByRole("button", { name: "保存", exact: true });
  await save.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "../../output/yike-review-fixes/reminder-midnight-dark.png",
  });
  await save.click();
  await host.getByRole("button", { name: "编辑习惯", exact: true }).click();
  await expect(target.getByRole("option", { selected: true })).toHaveText(
    "每周 7 次",
  );
  for (const name of ["小时", "分钟"]) {
    await expect(
      editor
        .getByRole("listbox", { name, exact: true })
        .getByRole("option", { selected: true }),
    ).toHaveText("00");
  }
  await expect(host.locator(".v-overlay--active")).toHaveCount(1);
});

for (const pack of ["base", "sample"] as const)
  for (const mode of ["light", "dark"] as const) {
    test(`generic wheel preview: ${pack}/${mode}, one to three independent columns`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.addInitScript(
        ({ pack, mode }) =>
          localStorage.setItem(
            "pbwork:preview-preferences:v1",
            JSON.stringify({
              layout: "single",
              selections: {
                A: {
                  contextId:
                    pack === "base"
                      ? "foundation:pbwork-base"
                      : "sample:pbwork-sample",
                  theme: pack === "base" ? "default" : "garden",
                  mode,
                },
              },
            }),
          ),
        { pack, mode },
      );
      await page.goto("/workbench/components/duration-picker");
      const stage = page.locator("[data-primary-preview]");
      await expect(stage.getByRole("listbox")).toHaveCount(2);
      const primary = stage.getByRole("listbox").first();
      await primary.press("End");
      await expect(primary.getByRole("option", { selected: true })).toHaveText(
        "3",
      );
      await primary.hover();
      await page.mouse.wheel(0, -120);
      await expect(
        primary.getByRole("option", { selected: true }),
      ).not.toHaveText("3");
      for (const [state, count] of [
        ["single", 1],
        ["triple", 3],
      ] as const) {
        const exhibit = page.locator(`[data-exhibit="type.${state}"]`).first();
        await expect(exhibit.getByRole("listbox")).toHaveCount(count);
        const wheel = exhibit.getByRole("listbox").last();
        await wheel.press("End");
        await expect(wheel.getByRole("option", { selected: true })).toHaveText(
          count === 1 ? "选项三" : "5",
        );
        if (count === 3) {
          await expect(
            exhibit
              .getByRole("listbox")
              .first()
              .getByRole("option", { selected: true }),
          ).toHaveText("1");
        }
      }
      await page
        .locator('[data-exhibit="type.triple"]')
        .first()
        .screenshot({
          path: `../../output/yike-review-fixes/generic-triple-${pack}-${mode}.png`,
        });
    });
  }

test("touch scroll selects a threshold without navigating the FlowSheet", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.goto(
      `${baseURL}/prototype/yike/settings?variant=record-threshold&theme=mechanical&mode=light`,
    );
    const sheet = page.locator('[data-pb-id="yike.settings.threshold-sheet"]');
    const wheel = sheet.getByRole("listbox", {
      name: "记录确认阈值",
      exact: true,
    });
    await expect(wheel.getByRole("option", { selected: true })).toHaveText(
      "10 秒",
    );
    // Native gestures need stable hit-test coordinates after the Sheet enters.
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll(".runtime-app [class]")).some(
          (el) =>
            Array.from(el.classList).some((name) =>
              /-(enter|leave)-active$/.test(name),
            ),
        ),
    );
    await expect
      .poll(() =>
        wheel.evaluate((el) => {
          const selected = el.querySelector('[aria-selected="true"]')!;
          const row = selected.getBoundingClientRect(),
            box = el.getBoundingClientRect();
          return Math.abs(row.y + row.height / 2 - box.y - box.height / 2);
        }),
      )
      .toBeLessThan(1);
    const box = (await wheel.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...point, y: point.y - step * 12 }],
      });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          ),
      );
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(wheel.getByRole("option", { selected: true })).not.toHaveText(
      "10 秒",
    );
    await expect(
      sheet.getByRole("heading", { name: "记录确认阈值", exact: true }),
    ).toBeVisible();
    await expect(sheet.getByRole("listbox")).toHaveCount(1);
    await expect(
      sheet.getByRole("button", { name: "确认", exact: true }),
    ).toBeInViewport();
  } finally {
    await context.close();
  }
});

import { test, expect } from "@playwright/test";
test.use({ timezoneId: "Asia/Shanghai" });
test.beforeEach(async ({ page }, info) => {
  // Animation tracing uses the real RAF clock; business screenshots use a fixed date.
  if (!info.title.includes("interpolates"))
    await page.clock.install({ time: new Date("2026-10-16T10:24:00+08:00") });
});
test("rework: focus anchors, capsule, summary and real primary-tab pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const timer = page.locator('[data-pb-id="yike.focus.timer"]:visible');
  const action = page.locator(
    '[data-pb-id="yike.focus.primary-action"]:visible',
  );
  await expect(
    page.getByText("专注 25 分钟 · 短休 5 分钟", { exact: true }),
  ).toBeVisible();
  const before = {
    timer: await timer.boundingBox(),
    action: await action.boundingBox(),
  };
  const capsule = await action.evaluate((el) => ({
    radius: parseFloat(getComputedStyle(el).borderRadius),
    height: el.getBoundingClientRect().height,
  }));
  expect(capsule.radius).toBeGreaterThanOrEqual(capsule.height / 2);
  await page.evaluate(() => {
    const trace: number[][] = [];
    (window as any).__yikeAnchors = trace;
    let frames = 0;
    const sample = () => {
      trace.push(
        ["yike.focus.timer", "yike.focus.primary-action"].map(
          (id) =>
            document
              .querySelector(`[data-pb-id="${id}"]`)!
              .getBoundingClientRect().y,
        ),
      );
      if (frames++ < 60) requestAnimationFrame(sample);
    };
    sample();
  });
  await page.screenshot({ path: "../../output/yike-rework/focus-default.png" });
  await page.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "放弃本轮", exact: true }),
  ).toBeVisible();
  expect(
    Math.abs((await timer.boundingBox())!.y - before.timer!.y),
  ).toBeLessThan(1);
  expect(
    Math.abs((await action.boundingBox())!.y - before.action!.y),
  ).toBeLessThan(1);
  await page.screenshot({ path: "../../output/yike-rework/focus-running.png" });
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  expect(
    Math.abs((await timer.boundingBox())!.y - before.timer!.y),
  ).toBeLessThan(1);
  expect(
    Math.abs((await action.boundingBox())!.y - before.action!.y),
  ).toBeLessThan(1);
  await page.screenshot({ path: "../../output/yike-rework/focus-paused.png" });
  await page.waitForFunction(() => (window as any).__yikeAnchors.length >= 60);
  const anchors = await page.evaluate(
    () => (window as any).__yikeAnchors as number[][],
  );
  for (const axis of [0, 1]) {
    const positions = anchors.map((sample) => sample[axis]!);
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
  }
  await page.getByRole("tab", { name: "正计时", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "番茄钟", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto(
    "/prototype/yike/focus?variant=countdown-setup&theme=mechanical&mode=light",
  );
  await page.getByRole("tab", { name: "番茄钟", exact: true }).click();
  await page.getByRole("tab", { name: "倒计时", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "开始 5 分钟", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "倒计时", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.screenshot({
    path: "../../output/yike-rework/focus-countdown.png",
    animations: "disabled",
  });
});

test("rework: launch content, switch tracks and settings actions have visible geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const face of ["mechanical", "water", "sundial"]) {
    await page.goto(
      `/prototype/yike/launch?variant=default&theme=${face}&mode=light`,
    );
    const object = page.locator('[data-pb-id="yike.launch.object"]');
    await expect(object).toBeInViewport({ ratio: 1 });
    await expect(
      page.locator('[data-pb-id="yike.launch.privacy"]'),
    ).toBeInViewport({ ratio: 1 });
    const box = (await object.boundingBox())!;
    expect(box.y).toBeGreaterThan(150);
    expect(box.y + box.height).toBeLessThan(650);
    await page.screenshot({
      path: `../../output/yike-rework/launch-${face}.png`,
      animations: "disabled",
    });
  }
  await page.goto(
    "/prototype/yike/habit-editor?variant=default&theme=mechanical&mode=light",
  );
  const reminder = page.locator(
    '[data-pb-id="yike.habit-editor.form.reminder"]',
  );
  await expect(reminder).toBeVisible();
  const track = reminder.locator(".v-switch__track");
  expect(
    await track.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  const save = page.getByRole("button", { name: "保存", exact: true });
  await expect(save).toBeInViewport({ ratio: 1 });
  expect((await save.boundingBox())!.y).toBeGreaterThan(700);
  await page.screenshot({
    path: "../../output/yike-rework/editor-footer.png",
    animations: "disabled",
  });
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=sundial&mode=dark",
  );
  const reset = page.getByRole("button", { name: "重置所有数据", exact: true });
  await reset.click();
  await expect(
    page.getByRole("button", { name: "确认重置", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "../../output/yike-rework/settings-reset-dark.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  await page.screenshot({
    path: "../../output/yike-rework/settings-bottom-dark.png",
    animations: "disabled",
  });
});

test("rework: page compositions keep task titles, source context and compact settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [slug, variant] of [
    ["settings", "default"],
    ["checkin", "partial"],
    ["habit-detail", "weekly"],
    ["habit-editor", "default"],
    ["review", "with-records"],
    ["review", "default"],
    ["launch", "default"],
  ]) {
    await page.goto(
      `/prototype/yike/${slug}?variant=${variant}&theme=mechanical&mode=light${slug === "habit-detail" ? "&habit=habit-running" : ""}`,
    );
    await page.locator(`[data-pb-id="yike.${slug}.root"]`).waitFor();
    if (slug === "habit-detail") {
      await expect(
        page.getByRole("heading", { name: "跑步", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('[data-pb-id="yike.habit-detail.week-goal"]'),
      ).toBeVisible();
    }
    if (slug === "habit-editor") {
      await expect(
        page.getByRole("heading", { name: "新建习惯", exact: true }),
      ).toHaveCount(1);
      await expect(page.locator(".editor-context")).toHaveAttribute(
        "inert",
        "",
      );
    }
    await page.screenshot({
      path: `../../output/yike-rework/${slug}-${variant}.png`,
      animations: "disabled",
    });
  }
});

test("rework: mode selection interpolates, pages animate, swipe and reduced motion work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const modes = page.locator('[data-pb-id="yike.focus.mode-tabs"]');
  await modes.getByRole("tab", { name: "番茄钟", exact: true }).waitFor();
  await page.evaluate(() => {
    const root = document.querySelector('[data-pb-id="yike.focus.mode-tabs"]')!;
    const pill = root.querySelector(".pb-tabs-pill")!;
    const trace = {
      positions: [] as number[],
      movingPanel: false,
      done: false,
    };
    (window as any).__yikeMotion = trace;
    let frames = 0;
    const observer = new MutationObserver(() => {
      if (root.querySelector('[class*="transition-enter-active"]'))
        trace.movingPanel = true;
    });
    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    const sample = () => {
      trace.positions.push(pill.getBoundingClientRect().x);
      if (frames++ < 35) requestAnimationFrame(sample);
      else {
        trace.done = true;
        observer.disconnect();
      }
    };
    sample();
  });
  await modes.getByRole("tab", { name: "正计时", exact: true }).click();
  await page.waitForFunction(() => (window as any).__yikeMotion.done);
  const motion = await page.evaluate(() => (window as any).__yikeMotion);
  expect(motion.movingPanel).toBe(true);
  expect(
    new Set(motion.positions.map((n: number) => Math.round(n))).size,
  ).toBeGreaterThan(2);
  await expect(
    page.locator('[data-pb-id="yike.focus.timer"]:visible'),
  ).toHaveCount(1);
  const box = await page
    .locator('[data-pb-id="yike.focus.timer"]:visible')
    .boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.15, box!.y + box!.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(
    modes.getByRole("tab", { name: "倒计时", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await modes.getByRole("tab", { name: "番茄钟", exact: true }).click();
  await expect(
    modes.getByRole("tab", { name: "番茄钟", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    await modes
      .locator(".pb-tabs-pill")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});

test("rework: three round signatures and compact timer risk states remain legible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const shapes = new Set<string>();
  for (const face of ["mechanical", "water", "sundial"]) {
    await page.goto(
      `/prototype/yike/focus?variant=paused&theme=${face}&mode=dark`,
    );
    const round = page.locator('[data-pb-id="yike.focus.round"]:visible');
    await expect(round).toContainText("轮专注");
    shapes.add((await round.locator("path").first().getAttribute("d"))!);
    await expect(round.locator(".is-current")).toHaveCount(1);
    for (const label of ["继续", "结束并记录", "放弃本轮"]) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeInViewport({ ratio: 1 });
    }
    expect(
      await round
        .locator(".is-current path")
        .evaluate((el) => getComputedStyle(el).stroke),
    ).not.toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({
      path: `../../output/yike-rework/round-${face}-dark.png`,
      animations: "disabled",
    });
  }
  expect(shapes.size).toBe(3);
  for (const variant of [
    "stopwatch-running",
    "countdown-setup",
    "long-break",
    "finished",
  ]) {
    await page.goto(
      `/prototype/yike/focus?variant=${variant}&theme=water&mode=light`,
    );
    await page
      .locator('[data-pb-id="yike.focus.primary-action"]:visible')
      .waitFor();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('[data-pb-id="yike.focus.primary-action"]:visible')
      .scrollIntoViewIfNeeded();
    await expect(
      page.locator('[data-pb-id="yike.focus.primary-action"]:visible'),
    ).toBeInViewport();
    await page.screenshot({
      path: `../../output/yike-rework/risk-${variant}.png`,
      animations: "disabled",
    });
  }
});

test("rework: cold start yields to focus and never repeats on navigation", async ({
  browser,
}, info) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: "Asia/Shanghai",
      reducedMotion,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const trace = { brandFrames: 0, focusFrames: 0, repeatedBrand: false };
      (window as any).__yikeStartup = trace;
      const sample = () => {
        const brand = document.querySelector('[data-pb-id="yike.launch.root"]');
        const focus = document.querySelector(
          '[data-pb-id="yike.focus.primary-action"]',
        );
        if (brand?.getBoundingClientRect().height) {
          trace.brandFrames++;
          if (trace.focusFrames) trace.repeatedBrand = true;
        }
        if (focus?.getBoundingClientRect().height && !brand)
          trace.focusFrames++;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto("/prototype/yike/focus?theme=mechanical&mode=light");
    await page.waitForFunction(
      () => (window as any).__yikeStartup.focusFrames >= 3,
    );
    await expect(
      page.getByRole("button", { name: "开始专注", exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-pb-id="yike.launch.root"]')).toHaveCount(
      0,
    );
    for (const name of ["打卡", "回顾", "专注"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        page.getByRole("tab", { name, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
    }
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await expect(page).toHaveURL(/\/settings(?:\?|$)/);
    await page.goBack();
    await expect(
      page.getByRole("button", { name: "开始专注", exact: true }),
    ).toBeVisible();
    const trace = await page.evaluate(() => (window as any).__yikeStartup);
    expect(trace.repeatedBrand).toBe(false);
    if (reducedMotion === "reduce") expect(trace.brandFrames).toBe(0);
    await info.attach(`startup-${reducedMotion}`, {
      body: JSON.stringify(trace),
      contentType: "application/json",
    });
    console.log(`Yike cold start (${reducedMotion}): ${JSON.stringify(trace)}`);
    await context.close();
  }
});

test("rework: the 28 draft frames have reproducible formal comparison states", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const cases = [
    ["launch", "launch", "default"],
    ...[
      "default",
      "running",
      "paused",
      "short-break",
      "long-break",
      "finished",
      "abandon-confirm",
      "recovery",
      "stopwatch-running",
      "countdown-setup",
      "countdown-running",
      "countdown-due",
    ].map((variant) => [`focus-${variant}`, "focus", variant]),
    ...["partial", "undo", "completed", "empty"].map((variant) => [
      `checkin-${variant}`,
      "checkin",
      variant === "undo" ? "partial" : variant,
    ]),
    ["detail-daily", "habit-detail", "habit-records"],
    ["detail-weekly", "habit-detail", "weekly"],
    ["detail-delete", "habit-detail", "habit-records"],
    ["editor-new", "habit-editor", "default"],
    ["editor-error", "habit-editor", "invalid-name"],
    ["review-week", "review", "history"],
    ["review-day", "review", "history"],
    ["review-month", "review", "month"],
    ["review-empty", "review", "default"],
    ["settings", "settings", "default"],
    ["settings-reset", "settings", "reset-confirm"],
  ];
  expect(cases).toHaveLength(28);
  for (const [name, slug, variant] of cases) {
    await page.goto(
      `/prototype/yike/${slug}?variant=${variant}&theme=mechanical&mode=light${slug === "habit-detail" ? `&habit=${name === "detail-weekly" ? "habit-running" : "habit-water"}` : ""}`,
    );
    await expect(
      page.locator(`[data-pb-id="yike.${slug}.root"]`),
    ).toBeVisible();
    if (name === "checkin-undo") {
      await page
        .getByRole("button", { name: "打卡：读 20 页书", exact: true })
        .click();
      await expect(
        page.getByText("「读 20 页书」今天已打卡", { exact: true }),
      ).toBeVisible();
    }
    if (name === "detail-delete")
      await page.getByRole("button", { name: "删除习惯", exact: true }).click();
    if (name === "review-day")
      await page
        .getByRole("button", { name: "2026-10-14，25 分钟", exact: true })
        .click();
    await page.waitForFunction(
      () =>
        !document.querySelector(
          '[class*="-enter-active"], [class*="-leave-active"], .v-ripple__container',
        ),
    );
    await page.screenshot({
      path: `../../output/yike-rework/mapped/${name}.png`,
      animations: "disabled",
    });
  }
});

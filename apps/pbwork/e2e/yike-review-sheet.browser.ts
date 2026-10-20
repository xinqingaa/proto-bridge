import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
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
}
async function openReview(page: Page, variant = "intensity-levels") {
  await page.goto(
    `/prototype/yike/review?variant=${variant}&theme=mechanical&mode=light`,
  );
  await expect(page.locator('[data-pb-id="yike.review.chart"]')).toBeVisible();
  await settle(page);
}
const detailSelector = '[data-pb-id="yike.review.day-detail"]';

test("day browsing keeps background and sheet geometry fixed, includes empty days and restores focus", async ({
  page,
}) => {
  await openReview(page);
  const background = () =>
    page.locator(".summary,.chart-stage,.distribution").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { y: box.y, height: box.height };
      }),
    );
  const before = await background();
  const trigger = page.locator('[data-date="2026-10-19"]');
  await trigger.click();
  const detail = page.locator(detailSelector);
  await expect(detail).toContainText("10月19日 周一");
  await expect(detail).toContainText("2 小时 0 分钟");
  await settle(page);
  const box = await detail.boundingBox();
  const next = detail.getByRole("button", { name: "后一天", exact: true });
  await next.click();
  await expect(detail).toContainText("10月20日 周二");
  await expect(detail).toContainText("这一天还没有记录");
  await expect(next).toBeDisabled();
  expect(await detail.boundingBox()).toEqual(box);
  expect(await background()).toEqual(before);
  await detail.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(detail).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-date="2026-10-20"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-date="2026-10-20"]').click();
  await expect(detail).toContainText("10月20日 周二");
  await page.keyboard.press("Escape");
  await expect(detail).not.toBeVisible();
  expect(await background()).toEqual(before);
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

test("the explicit day-sheet fixture is repeatable through Runtime reset", async ({
  page,
}) => {
  await openReview(page, "day-detail");
  const detail = page.locator(detailSelector);
  const prepared = await page.evaluate(async () => {
    const bridge = (window as any).__PROTO_BRIDGE_CAPTURE_V2__;
    const described = await bridge.request({
      protocolVersion: 3,
      requestId: "day-describe",
      payload: { kind: "describe" },
    });
    return bridge.request({
      protocolVersion: 3,
      requestId: "day-prepare",
      payload: {
        kind: "prepare",
        expected: {
          prototypeId: "yike",
          screenId: "yike.review",
          variantId: "day-detail",
          theme: {
            packId: described.payload.manifest.theme.packId,
            packDigest: described.payload.manifest.theme.packDigest,
            theme: "mechanical",
            mode: "light",
          },
        },
      },
    });
  });
  expect(prepared.ok, JSON.stringify(prepared)).toBe(true);
  await expect(detail).toContainText("打卡：喝够 8 杯水");
  await expect(detail.locator(".day-focus-records li")).toHaveCount(4);
  for (let iteration = 0; iteration < 2; iteration++) {
    await detail.getByRole("button", { name: "前一天", exact: true }).click();
    await expect(detail).toContainText("10月19日 周一");
    const reset = await page.evaluate(async () =>
      (window as any).__PROTO_BRIDGE_CAPTURE_V2__.request({
        protocolVersion: 3,
        requestId: `day-sheet-${crypto.randomUUID()}`,
        payload: { kind: "reset" },
      }),
    );
    expect(reset.ok, JSON.stringify(reset)).toBe(true);
    await expect(detail).toContainText("10月20日 周二");
    await expect(detail).toContainText("打卡：喝够 8 杯水");
  }
});

for (const theme of ["mechanical", "water", "sundial"]) {
  for (const size of [
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    test(`all three modes preserve the same ${theme} dial at ${size.width}×${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto(
        `/prototype/yike/focus?variant=countdown-setup&theme=${theme}&mode=${size.width === 390 ? "light" : "dark"}`,
      );
      const dial = page.locator(".yike-focus-main:visible .yike-dial");
      await expect(dial).toBeVisible();
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
      await settle(page);
      const baseline = await measure();
      for (const mode of ["番茄钟", "正计时", "倒计时"]) {
        await page.getByRole("tab", { name: mode, exact: true }).click();
        await settle(page);
        const current = await measure();
        for (const key of ["x", "y", "width", "height"] as const)
          expect(Math.abs(current[key] - baseline[key])).toBeLessThan(1);
        await expect(
          page.locator(".yike-focus-main:visible .yike-actions"),
        ).toBeInViewport();
      }
      await page
        .getByRole("button", { name: "开始 5 分钟", exact: true })
        .click();
      await settle(page);
      const running = await measure();
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(running[key] - baseline[key])).toBeLessThan(1);
      await page.getByRole("button", { name: "暂停", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "继续", exact: true }),
      ).toBeInViewport();
      const paused = await measure();
      for (const key of ["x", "y", "width", "height"] as const)
        expect(Math.abs(paused[key] - baseline[key])).toBeLessThan(1);
      await page.screenshot({
        path: `../../output/yike-review-sheet/focus-${theme}-${size.width}.png`,
      });
    });
  }
}

for (const theme of ["mechanical", "water", "sundial"]) {
  test(`text-only modes and compact records render in the ${theme} day sheet`, async ({
    page,
  }) => {
    const dark = theme === "water";
    await page.setViewportSize({
      width: dark ? 360 : 390,
      height: dark ? 640 : 844,
    });
    await page.goto(
      `/prototype/yike/review?variant=day-detail&theme=${theme}&mode=${dark ? "dark" : "light"}`,
    );
    const sheet = page.locator(detailSelector);
    await expect(
      sheet.getByRole("heading", { name: "本月", exact: true }),
    ).toBeVisible();
    await expect(sheet.locator(".day-focus-records li")).toHaveCount(4);
    await expect(page.locator(".mode-icon")).toHaveCount(0);
    await expect(sheet.locator(".record-mode")).toHaveText([
      "番茄钟",
      "番茄钟",
      "倒计时",
      "正计时",
    ]);
    await page.clock.runFor(500);
    await expect(sheet).toBeInViewport({ ratio: 1 });
    await expect(sheet).toHaveClass(/pb-overlay-glass/);
    const layout = await sheet.evaluate((node) => {
      const first = node.querySelector(".day-focus-records");
      return (
        first!.getBoundingClientRect().top - node.getBoundingClientRect().top
      );
    });
    expect(layout).toBeLessThan(132);
    await expect(
      sheet.locator('[data-pb-id="yike.review.day-records"]'),
    ).not.toHaveClass(/pb-scrollable/);
    expect(
      await sheet.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `../../output/yike-review-text/sheet-${theme}.png`,
    });
    await sheet
      .locator(".day-focus-records li")
      .last()
      .scrollIntoViewIfNeeded();
    await expect(sheet.locator(".day-focus-records li").last()).toBeInViewport({
      ratio: 1,
    });
    await sheet.getByRole("button", { name: "前一天", exact: true }).click();
    await expect(sheet).toContainText("这一天还没有记录");
    await sheet.getByRole("button", { name: "后一天", exact: true }).click();
    await expect(sheet.locator(".day-focus-records li")).toHaveCount(4);
    await sheet.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("radio", { name: "周", exact: true }).click();
    await page
      .getByRole("button", { name: "2026-10-20，120 分钟", exact: true })
      .click();
    await expect(
      sheet.getByRole("heading", { name: "本周", exact: true }),
    ).toBeVisible();
  });
}

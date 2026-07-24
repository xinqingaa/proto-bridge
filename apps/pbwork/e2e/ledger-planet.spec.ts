import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1100 } });
const e2ePort = Number(process.env.PBWORK_E2E_PORT ?? 3977);

async function drag(
  page: Page,
  locator: Locator,
  deltaX: number,
  deltaY: number,
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

test("tab identity and theme survive stack and native history navigation", async ({
  page,
}) => {
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );

  await page.getByRole("tab", { name: "权益" }).click();
  await page.getByRole("button", { name: /我的券包/ }).click();
  await expect(page).toHaveURL(/\/coupon-wallet\?variant=default&theme=light/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/benefits-home\?variant=default&theme=light/);
  await expect(page.getByRole("tab", { name: "权益" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: "我的" }).click();
  await page.getByRole("button", { name: /钱包 3,200/ }).click();
  await expect(page).toHaveURL(/\/wallet\?variant=default&theme=light/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=light/);
  await expect(page.getByRole("tab", { name: "我的" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("checkbox", { name: "深色主题" }).click();
  await expect(page).toHaveURL(/theme=dark/);

  await page.goBack();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=dark/);
  await expect(page.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/settings\?variant=default&theme=dark/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=dark/);
});

test("workbench preview settings theme survives in-iframe navigation", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/me-home?variant=default&theme=light",
  );
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');

  await page.getByRole("button", { name: "预览设置" }).click();
  await page.getByLabel("原型主题").selectOption("dark");
  await expect(page).toHaveURL(/theme=dark/);
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );

  await frame.getByRole("tab", { name: "权益" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/benefits-home\?variant=default&theme=dark/,
  );
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
});

test("workbench settings theme survives stack back and further navigation", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/me-home?variant=default&theme=light",
  );
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');

  await frame.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/settings\?variant=default&theme=light/,
  );

  await frame.getByRole("checkbox", { name: "深色主题" }).click();
  await expect(page).toHaveURL(/theme=dark/);
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );

  await frame.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/me-home\?variant=default&theme=dark/,
  );
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );

  await frame.getByRole("tab", { name: "记账" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/ledger-home\?variant=default&theme=dark/,
  );
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
});

test("workbench mirrors ledger navigation without reloading or A/B loops", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/benefits-home?variant=default&theme=light",
  );
  const iframe = page.getByTestId("prototype-iframe");
  const initialSrc = await iframe.getAttribute("src");
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');

  await frame.getByRole("button", { name: /可用券/ }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/coupon-wallet\?variant=default&theme=light/,
  );
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");

  await frame.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/benefits-home\?variant=default&theme=light/,
  );
  await expect(frame.getByRole("heading", { name: "权益" })).toBeVisible();
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");

  await drag(page, frame.locator(".feature"), -180, 4);
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/me-home\?variant=default&theme=light/,
  );
  await expect(frame.getByRole("heading", { name: "我的" })).toBeVisible();
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");
});

test("mouse drag switches primary tabs even when starting on business buttons", async ({
  page,
}) => {
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );

  await drag(page, page.locator(".summary-hit"), -180, 3);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/benefits-home\?variant=default&theme=light/,
  );
  await expect(page.getByRole("tab", { name: "权益" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await drag(page, page.getByRole("button", { name: /我的券包/ }), -180, 3);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/me-home\?variant=default&theme=light/,
  );
  await expect(page.getByRole("tab", { name: "我的" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("ledger list supports wheel, mouse drag scrolling, and top pull refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );
  const scrollList = page.locator(".pb-scrollable-data-list");
  const homeSummary = page.locator(".summary-hit");

  await drag(page, homeSummary, 2, -180);
  await expect
    .poll(() => scrollList.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  await scrollList.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.locator(".summary-hit").hover();
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => scrollList.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  await expect(page.getByText("正在加载更多")).toBeHidden();
  await scrollList.evaluate((element) => {
    element.scrollTop = 0;
  });
  await drag(page, page.locator(".summary-hit"), 2, 110);
  await expect(page.getByText("正在刷新")).toBeVisible();
});

test("ledger home opens the full list and date range sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );

  await page.getByRole("button", { name: /查看全部/ }).click();
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/ledger-list\?variant=default&theme=light/,
  );
  await expect(page.getByRole("heading", { name: "全部流水" })).toBeVisible();

  await page.getByRole("button", { name: /点击切换日/ }).click();
  await expect(page.getByRole("dialog").first()).toBeVisible();
  await page.getByRole("button", { name: /周\s*7月17日/ }).click();
  await page.getByRole("button", { name: "应用时间范围" }).click();
  await expect(
    page.getByRole("button", { name: /7月17日–23日\s*点击切换日/ }),
  ).toBeVisible();
});

test("record editor supports amount keypad and category sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/record-edit?variant=default&theme=light",
  );

  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByText("42", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /全部分类/ }).click();
  await expect(page.getByRole("dialog").first()).toBeVisible();
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "交通", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /交通/ }).first()).toHaveClass(
    /active/,
  );
});

test("filled coupon tab panel accepts swipe and refresh gestures below short content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/coupon-wallet?variant=default&theme=light",
  );
  const window = page.locator(".pb-tab-window");
  const box = await window.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(500);

  const bottomHit = page.locator(".pb-tab-panel").first();
  const panelBox = await bottomHit.boundingBox();
  expect(panelBox).not.toBeNull();
  const x = panelBox!.x + panelBox!.width / 2;
  const y = panelBox!.y + panelBox!.height - 36;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 140, y + 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("tab", { name: "已使用" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.mouse.move(x, panelBox!.y + 120);
  await page.mouse.down();
  await page.mouse.move(x, panelBox!.y + 230, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("正在刷新")).toBeVisible();
});

test("workbench iframe and standalone runtime share the same pull-refresh gesture", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/ledger-home?variant=default&theme=light",
  );
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await drag(page, frame.locator(".summary-hit"), 2, 110);
  await expect(frame.getByText("正在刷新")).toBeVisible();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/ledger-home\?variant=default&theme=light/,
  );
});

test("Chrome device emulation can trigger touch pull-to-refresh", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${e2ePort}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );
  const summary = await page.locator(".summary-hit").boundingBox();
  expect(summary).not.toBeNull();
  const x = summary!.x + summary!.width / 2;
  const startY = summary!.y + summary!.height / 2;
  const session = await context.newCDPSession(page);

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY, id: 1 }],
  });
  for (const distance of [18, 36, 58, 82, 110]) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 2, y: startY + distance, id: 1 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });

  await expect(page.getByText("正在刷新")).toBeVisible();
  await context.close();
});

test("popular activities arbitrate mouse drags by actual overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/ledger-planet/benefits-home?variant=default&theme=light",
  );
  const activityScroll = page.locator(".activity-scroll");
  await activityScroll.scrollIntoViewIfNeeded();

  await drag(page, activityScroll.locator(".activity-card").first(), -120, 2);
  await expect
    .poll(() => activityScroll.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/benefits-home\?variant=default&theme=light/,
  );

  await activityScroll.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await drag(page, activityScroll.locator(".activity-card").first(), 120, 2);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/benefits-home\?variant=default&theme=light/,
  );

  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect
    .poll(() =>
      activityScroll.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await drag(page, activityScroll.locator(".activity-card").first(), 120, 2);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/ledger-home\?variant=default&theme=light/,
  );
});

test("device mode keeps overflowing activities inside and swipes elsewhere", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: `http://127.0.0.1:${e2ePort}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(
    "/prototype/ledger-planet/benefits-home?variant=default&theme=light",
  );
  const activityScroll = page.locator(".activity-scroll");
  await activityScroll.scrollIntoViewIfNeeded();
  const box = await activityScroll.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const session = await context.newCDPSession(page);

  async function touchDrag(startX: number, startY: number, deltaX: number) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY, id: 1 }],
    });
    for (const progress of [0.2, 0.4, 0.6, 0.8, 1]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + deltaX * progress, y: startY + 2, id: 1 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }

  await expect(
    page
      .locator(".pb-bottom-nav .v-tab--selected .v-btn__overlay")
      .evaluate((element) => getComputedStyle(element).opacity),
  ).resolves.toBe("0");

  await touchDrag(x, y, -120);
  await expect
    .poll(() => activityScroll.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/benefits-home\?variant=default&theme=light/,
  );

  await activityScroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
  });
  await touchDrag(x, y, -120);
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/benefits-home\?variant=default&theme=light/,
  );

  await page.locator(".feature").scrollIntoViewIfNeeded();
  const featured = await page.locator(".feature").boundingBox();
  expect(featured).not.toBeNull();
  await touchDrag(
    featured!.x + featured!.width / 2,
    featured!.y + featured!.height / 2,
    -120,
  );
  await expect(page).toHaveURL(
    /\/prototype\/ledger-planet\/me-home\?variant=default&theme=light/,
  );
  await context.close();
});

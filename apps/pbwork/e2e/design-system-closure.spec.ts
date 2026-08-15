import { expect, test } from "@playwright/test";

test("foundation previews expose width tokens and distinct semantic icons", async ({
  page,
}) => {
  await page.goto("/workbench/foundations/tokens/border");

  const widthSamples = page.locator(".border-sample.is-width-only");
  await expect(widthSamples).toHaveCount(2);
  await expect
    .poll(() =>
      widthSamples.evaluateAll((samples) =>
        samples.map((sample) => ({
          style: getComputedStyle(sample, "::before").borderTopStyle,
          width: getComputedStyle(sample, "::before").borderTopWidth,
        })),
      ),
    )
    .toEqual([
      { style: "solid", width: "1px" },
      { style: "solid", width: "4px" },
    ]);

  const iconMarkup = await Promise.all(
    ["布局", "层级", "效果"].map((label) =>
      page
        .getByRole("link", { name: label, exact: true })
        .locator("svg")
        .innerHTML(),
    ),
  );
  expect(new Set(iconMarkup).size).toBe(3);
});

test("tab playgrounds compare adaptive and equal layouts while FilterBar stays unchanged", async ({
  page,
}) => {
  for (const componentId of ["tabbar", "primary-tabs", "secondary-tabs"]) {
    await page.goto(`/workbench/components/${componentId}`);
    await expect(page.getByLabel("使用场景")).toHaveCount(0);
    await expect(page.locator('[data-tab-layout="adaptive"]')).toBeVisible();
    await expect(page.locator('[data-tab-layout="equal"]')).toBeVisible();

    if (componentId !== "tabbar") {
      const frames = page.locator(".tab-comparison-frame");
      const stableHeights = await frames.evaluateAll((elements) =>
        elements.map((element) =>
          Math.round(element.getBoundingClientRect().height),
        ),
      );
      const adaptive = page.locator('[data-tab-layout="adaptive"]');
      const equal = page.locator('[data-tab-layout="equal"]');
      await adaptive.getByRole("tab").nth(1).click();
      await expect(adaptive.getByRole("tab").nth(1)).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(equal.getByRole("tab").first()).toHaveAttribute(
        "aria-selected",
        "true",
      );
      for (let sample = 0; sample < 6; sample += 1) {
        expect(
          await frames.evaluateAll((elements) =>
            elements.map((element) =>
              Math.round(element.getBoundingClientRect().height),
            ),
          ),
        ).toEqual(stableHeights);
        await page.waitForTimeout(25);
      }

      const panelHeights = await page
        .locator(".tab-comparison .v-window-item--active .panel-slot-demo")
        .evaluateAll((panels) =>
          panels.map((panel) => panel.getBoundingClientRect().height),
        );
      expect(panelHeights).toHaveLength(2);
      expect(panelHeights.every((height) => height > 0)).toBe(true);
    }
  }

  await page.goto("/workbench/components/tabbar");
  await expect(page.locator(".pb-tabbar-item")).toHaveCount(6);
  const widths = await page.locator(".tab-comparison").evaluateAll((sections) =>
    sections.map((section) => ({
      mode: section.getAttribute("data-tab-layout"),
      widths: Array.from(section.querySelectorAll(".pb-tabbar-item")).map(
        (item) => Math.round(item.getBoundingClientRect().width),
      ),
    })),
  );
  expect(new Set(widths[0]?.widths).size).toBe(1);
  expect(widths[1]?.widths[0]).toBeGreaterThan(widths[0]?.widths[0] ?? 0);

  await page.goto("/workbench/components/filter-bar");
  await expect(page.getByLabel("使用场景")).toHaveCount(0);
  await expect(page.locator(".tab-comparison")).toHaveCount(0);
});

test("component playgrounds expose component types and Contract states without scenario selection", async ({
  page,
}) => {
  for (const componentId of ["icon", "icon-button"]) {
    await page.goto(`/workbench/components/${componentId}`);
    await expect(page.getByLabel("使用场景")).toHaveCount(0);
    await expect(page.locator(".gallery-matrix")).toBeVisible();
  }

  for (const componentId of ["tabbar", "primary-tabs", "secondary-tabs"]) {
    await page.goto(`/workbench/components/${componentId}`);
    await expect(page.getByLabel("使用场景")).toHaveCount(0);
    await expect(page.locator(".tab-comparison")).toHaveCount(2);
  }

  for (const componentId of [
    "app-bar",
    "avatar",
    "badge",
    "bottom-sheet",
    "button",
    "card",
    "checkbox",
    "chip",
    "confirm",
    "data-list",
    "divider",
    "empty-state",
    "flow-sheet",
    "loading",
    "menu",
    "progress",
    "radio-group",
    "scrollable-data-list",
    "search-bar",
    "spinner",
    "switch",
    "tab-viewport",
    "text-field",
    "textarea",
  ]) {
    await page.goto(`/workbench/components/${componentId}`);
    await expect(page.getByLabel("使用场景")).toHaveCount(0);
    await expect(page.locator(".scenario-comparison-item")).toHaveCount(0);
    await expect(page.locator(".state-compare")).toHaveCount(0);
  }

  await page.goto("/workbench/components/toast");
  await expect(page.getByLabel("使用场景")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "显示操作成功" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "显示操作失败" }),
  ).toBeVisible();

  await page.goto("/workbench/components/filter-bar");
  await expect(page.getByLabel("使用场景")).toHaveCount(0);

  await page.goto("/workbench/components/button");
  await expect(page.locator('[data-exhibit="type.secondary"]')).toBeVisible();
  await expect(page.locator('[data-exhibit="type.outlined"]')).toBeVisible();
  await expect(page.locator('[data-exhibit="state.loading"]')).toBeVisible();
  await expect(page.locator('[data-exhibit="state.disabled"]')).toBeVisible();
  const submitButton = page.locator(
    '[data-primary-preview] [data-pb-id="ds.button"]',
  );
  await expect(submitButton).toHaveCount(1);
  const initialHeight = await submitButton.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await submitButton.click();
  await expect(submitButton).toHaveAttribute("aria-busy", "true");
  expect(
    await submitButton.evaluate(
      (element) => element.getBoundingClientRect().height,
    ),
  ).toBe(initialHeight);
  await expect(page.getByText("已完成；按钮已恢复可继续操作。")).toBeVisible();
});

test("list playground demonstrates custom rows and desktop refresh/load controls", async ({
  page,
}) => {
  await page.goto("/workbench/components/data-list");
  await expect(page.getByText("仅标题行", { exact: true })).toHaveCount(3);
  await expect(page.getByText("双行业务记录", { exact: true })).toHaveCount(3);
  await expect(page.getByText("自定义指标", { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-exhibit="state.plain"]')).toBeVisible();
  await expect(page.locator('[data-exhibit="state.raised"]')).toBeVisible();

  await page.goto("/workbench/components/scrollable-data-list");
  const mainList = page
    .locator('[data-pb-id="ds.scrollable-data-list"]')
    .filter({ has: page.locator('[role="listitem"]') })
    .first();
  const dimensions = await mainList.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await expect(mainList.locator('[role="listitem"]')).toHaveCount(8);

  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await expect(
    page.getByText("刚刚完成第 1 次刷新", { exact: true }),
  ).toBeVisible();

  await page
    .locator(".scrollable-list-demo-actions")
    .getByRole("button", { name: "加载更多", exact: true })
    .click();
  await expect(mainList.locator('[role="listitem"]')).toHaveCount(10);
});

test("wide component exhibits retain their intended visual width and Card surface states", async ({
  page,
}) => {
  await page.goto("/workbench/components/card");
  await expect(page.locator('[data-exhibit="type.summary"]')).toHaveCount(0);
  await expect(page.locator('[data-exhibit="state.flat"]')).toBeVisible();
  await expect(page.locator('[data-exhibit="state.elevated"]')).toBeVisible();
  await expect(page.getByText("外部内容", { exact: true })).toHaveCount(3);
  expect(
    await page
      .locator('[data-exhibit="state.elevated"] .pb-card')
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(600);

  await page.goto("/workbench/components/divider");
  for (const stateId of ["plain", "inset"]) {
    expect(
      await page
        .locator(`[data-exhibit="state.${stateId}"] .pb-divider`)
        .evaluate((element) => element.getBoundingClientRect().width),
    ).toBeGreaterThan(600);
  }

  await page.goto("/workbench/components/app-bar");
  expect(
    await page
      .locator('[data-exhibit="state.no-back"] .pb-app-bar')
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(600);
});

test("sheet surfaces keep semantic radius and FlowSheet clips adjacent pages", async ({
  page,
}) => {
  await page.goto("/workbench/components/bottom-sheet");
  await page.getByRole("button", { name: "打开Bottom Sheet" }).click();
  const bottomSheet = page.locator(".pb-sheet");
  await expect(bottomSheet).toBeVisible();
  expect(
    await bottomSheet.evaluate((el) => getComputedStyle(el).borderRadius),
  ).toBe("16px 16px 0px 0px");

  await page.goto("/workbench/components/flow-sheet");
  await page.getByRole("button", { name: "打开Flow Sheet" }).click();
  const flowSheet = page.locator(".pb-flow-sheet");
  await expect(flowSheet).toBeVisible();
  const layout = await flowSheet.evaluate((element) => {
    const body = element.querySelector<HTMLElement>(".pb-flow-sheet-body")!;
    const pages = Array.from(
      element.querySelectorAll<HTMLElement>(".pb-flow-sheet-track > *"),
    );
    const bodyRect = body.getBoundingClientRect();
    return {
      radius: getComputedStyle(element).borderRadius,
      padding: getComputedStyle(body).padding,
      overflow: getComputedStyle(body).overflow,
      bodyRight: bodyRect.right,
      bodyWidth: bodyRect.width,
      firstWidth: pages[0]!.getBoundingClientRect().width,
      secondLeft: pages[1]!.getBoundingClientRect().left,
    };
  });
  expect(layout.radius).toBe("16px 16px 0px 0px");
  expect(layout.padding).toBe("0px");
  expect(layout.overflow).toBe("hidden");
  expect(layout.firstWidth).toBeCloseTo(layout.bodyWidth, 1);
  expect(layout.secondLeft).toBeCloseTo(layout.bodyRight, 1);

  const flowBody = flowSheet.locator(".pb-flow-sheet-body");
  await flowBody.evaluate((element) => {
    const startX = element.getBoundingClientRect().right;
    const endX = element.getBoundingClientRect().left;
    const pointer = {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientY: element.getBoundingClientRect().top,
    };
    element.dispatchEvent(
      new PointerEvent("pointerdown", { ...pointer, clientX: startX }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { ...pointer, clientX: endX }),
    );
    element.dispatchEvent(
      new PointerEvent("pointerup", { ...pointer, clientX: endX }),
    );
  });
  await expect(flowSheet.getByText("步骤 2")).toBeVisible();

  await page.goto("/workbench/components/confirm");
  await page.getByRole("button", { name: "打开Dialog / Confirm" }).click();
  const dialog = page.locator(".pb-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "确认" }).click();
  await expect(dialog).toBeHidden();
});

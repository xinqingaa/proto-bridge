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
  await expect(page.getByLabel("使用场景")).toBeVisible();
  await expect(page.locator(".tab-comparison")).toHaveCount(0);
});

test("list playground demonstrates custom rows and desktop refresh/load controls", async ({
  page,
}) => {
  await page.goto("/workbench/components/data-list");
  await expect(page.getByText("仅标题行", { exact: true })).toBeVisible();
  await expect(page.getByText("双行业务记录", { exact: true })).toBeVisible();
  await expect(page.getByText("自定义指标", { exact: true })).toBeVisible();

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
});

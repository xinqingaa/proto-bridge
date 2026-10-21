import { expect, test, type Locator, type Page } from "@playwright/test";

async function select(
  page: Page,
  device: Locator,
  label: string,
  option: string,
) {
  const id = await device.getAttribute("data-preview-device");
  await page
    .locator(`[data-preview-settings="${id}"]`)
    .getByRole("combobox", { name: label, exact: true })
    .press("ArrowDown");
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(
    page.getByRole("option", { name: option, exact: true }),
  ).toBeHidden();
}
const phone = (page: Page, id: string) =>
  page.locator(`[data-preview-device="${id}"]`);

test("color uses same-content device samples, real sources and independent theme providers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/foundations/tokens/color");
  await expect(page.locator("[data-preview-device]")).toHaveCount(1);
  await expect(
    page
      .locator('[data-preview-settings="A"]')
      .getByRole("combobox", { name: "主题", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".token-section")).toHaveCount(0);
  const count = await phone(page, "A").locator("[data-color-key]").count();
  expect(count).toBeGreaterThan(30);
  await expect(
    page.locator('[data-preview-settings="A"] .v-label'),
  ).toHaveCount(0);
  const centered = await page.locator(".comparison-track").evaluate((track) => {
    const a = track.getBoundingClientRect();
    const b = track.querySelector(".preview-fit")!.getBoundingClientRect();
    return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2);
  });
  expect(centered).toBeLessThan(2);
  expect(
    await page.locator(".setting-field > span").evaluateAll((labels) =>
      labels.every((label) => {
        const rect = label.getBoundingClientRect();
        const parent = label
          .closest(".comparison-settings")!
          .getBoundingClientRect();
        return (
          rect.top >= parent.top &&
          rect.bottom <= parent.bottom &&
          rect.left >= parent.left
        );
      }),
    ),
  ).toBe(true);
  await page
    .locator(".comparison-layout")
    .screenshot({ path: "/tmp/pbwork-layout-single-color.png" });

  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  await expect(page.locator("[data-preview-device]")).toHaveCount(2);
  await expect(
    page
      .getByRole("group", { name: "预览布局" })
      .getByRole("button", { name: "对比", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await select(page, phone(page, "B"), "主题包", "一刻");
  await select(page, phone(page, "B"), "主题", "柑色");
  await expect(phone(page, "B")).toHaveAttribute("data-preview-pack", "yike");
  await expect(phone(page, "B")).toHaveAttribute("data-preview-theme", "water");
  await expect(phone(page, "A").locator("[data-color-key]")).toHaveCount(count);
  await expect(phone(page, "B").locator("[data-color-key]")).toHaveCount(count);
  const colors = await page
    .locator("[data-preview-viewport]")
    .evaluateAll((nodes) =>
      nodes.map((n) =>
        getComputedStyle(n).getPropertyValue("--pb-color-primary"),
      ),
    );
  expect(colors[0]).not.toBe(colors[1]);
  await select(page, phone(page, "A"), "主题包", "PBWork 基础包");
  await expect(
    page.locator('[data-preview-settings="A"] .setting-note'),
  ).toHaveCount(0);
  const beforeShellChange = await phone(page, "A")
    .locator("[data-preview-viewport]")
    .evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--pb-color-background"),
    );
  await page.getByRole("button", { name: "切换到深色工作台主题" }).click();
  expect(
    await phone(page, "A")
      .locator("[data-preview-viewport]")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--pb-color-background"),
      ),
  ).toBe(beforeShellChange);
  await page.getByRole("button", { name: "切换到浅色工作台主题" }).click();
  await page.screenshot({ path: "/tmp/pbwork-6b-color.png" });
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "单机", exact: true })
    .click();
  expect(errors).toEqual([]);
  await expect(page.locator("[data-preview-device]")).toHaveCount(1);
});

test("button copies current state, stays independent and retains state while switching themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/workbench/components/button");
  await page
    .locator(".comparison-layout")
    .screenshot({ path: "/tmp/pbwork-layout-single-button.png" });
  const first = phone(page, "A");
  const main = first.locator("[data-primary-preview] .pb-button");
  await main.click();
  await expect(main).toHaveAttribute("aria-busy", "true");
  await expect(first.getByRole("status")).toContainText("已完成");
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  const second = phone(page, "B");
  expect(
    await page
      .locator(".comparison-settings .wb-select")
      .evaluateAll((fields) =>
        fields.every((field) => {
          const a = field.getBoundingClientRect();
          const b = field
            .closest(".comparison-settings")!
            .getBoundingClientRect();
          return a.top >= b.top && a.bottom <= b.bottom;
        }),
      ),
  ).toBe(true);

  await expect(second.getByRole("status")).toContainText("已完成");
  await select(page, second, "主题包", "一刻");
  await select(page, second, "主题", "柑色");
  await expect(second.getByRole("status")).toContainText("已完成");
  await main.click();
  await expect(main).toHaveAttribute("aria-busy", "true");
  await expect(
    second.locator("[data-primary-preview] .pb-button"),
  ).not.toHaveAttribute("aria-busy", "true");
  await expect(first.getByRole("status")).toContainText("已完成");
  for (const id of [
    "type.primary",
    "type.secondary",
    "type.outlined",
    "state.loading",
    "state.disabled",
  ]) {
    await expect(first.locator(`[data-exhibit="${id}"]`)).toHaveCount(1);
  }
  expect(
    await page
      .locator("[data-exhibit]")
      .evaluateAll((nodes) =>
        nodes.every((n) => n.closest("[data-preview-viewport]")),
      ),
  ).toBe(true);
  await page.getByRole("switch", { name: "共同滚动", exact: true }).uncheck();
  await first.locator("[data-preview-scroll]").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(
    await second
      .locator("[data-preview-scroll]")
      .evaluate((el) => el.scrollTop),
  ).toBe(0);
  await page.screenshot({ path: "/tmp/pbwork-6b-button.png" });
});

test("BottomSheet overlays attach to distinct devices with local viewport dimensions and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/components/bottom-sheet");
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  const first = phone(page, "A");
  const second = phone(page, "B");
  await first.getByRole("button", { name: "显示半屏", exact: true }).click();
  await expect(first.locator(".pb-sheet")).toBeVisible();
  await expect(second.locator(".pb-sheet")).toHaveCount(0);
  await expect
    .poll(() =>
      first
        .locator("[data-preview-viewport]")
        .evaluate((host) =>
          Math.abs(
            host.querySelector(".pb-sheet")!.getBoundingClientRect().bottom -
              host.getBoundingClientRect().bottom,
          ),
        ),
    )
    .toBeLessThan(2);
  const dimensions = await first
    .locator("[data-preview-viewport]")
    .evaluate((host) => {
      const sheet = host.querySelector(".pb-sheet")!;
      const a = host.getBoundingClientRect();
      const b = sheet.getBoundingClientRect();
      return {
        hostHeight: a.height,
        height: b.height,
        left: b.left - a.left,
        right: b.right - a.right,
        bottom: b.bottom - a.bottom,
      };
    });
  expect(dimensions.height).toBeCloseTo(dimensions.hostHeight / 2, 0);
  expect(Math.abs(dimensions.left)).toBeLessThan(2);
  expect(Math.abs(dimensions.right)).toBeLessThan(2);
  expect(Math.abs(dimensions.bottom)).toBeLessThan(2);
  await select(page, first, "主题包", "一刻");
  await select(page, first, "主题", "柑色");
  await expect(first.locator(".pb-sheet")).toBeVisible();
  await expect(first.locator(".pb-sheet")).toHaveAttribute(
    "data-detent",
    "medium",
  );

  await second
    .getByRole("button", { name: "打开Bottom Sheet", exact: true })
    .click();
  await expect(second.locator(".pb-sheet")).toBeVisible();
  await expect
    .poll(() =>
      second
        .locator(".pb-sheet")
        // The opening button is already inside this device. Wait for focus
        // to enter the dialog after its transition before sending Escape.
        .evaluate((sheet) =>
          Boolean(
            sheet
              .closest(".v-overlay__content")
              ?.contains(document.activeElement),
          ),
        ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(second.locator(".pb-sheet")).toBeHidden();
  await expect(first.locator(".pb-sheet")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(first.locator(".pb-sheet")).toBeHidden();
  await expect(
    first.getByRole("button", { name: "显示半屏", exact: true }),
  ).toBeFocused();
  await first.getByRole("button", { name: "显示半屏", exact: true }).click();
  await expect
    .poll(() =>
      first
        .locator("[data-preview-viewport]")
        .evaluate((host) =>
          Math.abs(
            host.querySelector(".pb-sheet")!.getBoundingClientRect().bottom -
              host.getBoundingClientRect().bottom,
          ),
        ),
    )
    .toBeLessThan(2);
  await page.screenshot({ path: "/tmp/pbwork-6b-sheet.png" });
});

test("font preview and source table share real themes while search affects only the table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/foundations/tokens/typography");
  await expect(page.locator(".resource-toolbar")).toHaveCount(0);
  const samples = phone(page, "A").locator("[data-typography-key]");
  await expect(samples).toHaveCount(16);
  await expect(page.locator("[data-value-key]")).toHaveCount(16);
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  const table = page.getByRole("region", { name: "值与来源", exact: true });
  await table
    .getByRole("textbox", { name: "搜索键值" })
    .fill("typography.numeric-display");
  await expect(page.locator("[data-value-key]")).toHaveCount(1);
  await expect(samples).toHaveCount(16);
  await table.getByRole("textbox", { name: "搜索键值" }).fill("no-such-key");
  await expect(page.getByText("没有匹配的键值。")).toBeVisible();
  await expect(samples).toHaveCount(16);
  await table.getByRole("textbox", { name: "搜索键值" }).fill("");
  await page.getByRole("tab", { name: "预览", exact: true }).click();
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  await expect(phone(page, "B").locator("[data-typography-key]")).toHaveCount(
    16,
  );
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "预览控制" }),
  ).toBeHidden();
  await expect(
    table.getByRole("columnheader", { name: "差异", exact: true }),
  ).toHaveCount(0);
  await expect(table.getByRole("checkbox", { name: "只看差异" })).toHaveCount(
    0,
  );
  await expect(table.getByRole("columnheader")).toHaveCount(4);
  await expect(page.locator("[data-value-key]")).toHaveCount(16);
  await expect(table.locator("[data-font-specimen]")).toHaveCount(48);
  const sourceFonts = await table
    .locator("[data-font-specimen]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const s = getComputedStyle(element);
        return [
          s.fontSize,
          s.fontWeight,
          s.fontFamily,
          s.lineHeight,
          s.fontVariantNumeric,
        ];
      }),
    );
  for (const [index, id] of ["A"].entries()) {
    const phoneFonts = await phone(page, id)
      .locator(".type-example")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const s = getComputedStyle(element);
          return [
            s.fontSize,
            s.fontWeight,
            s.fontFamily,
            s.lineHeight,
            s.fontVariantNumeric,
          ];
        }),
      );
    expect(sourceFonts.filter((_, position) => position % 3 === index)).toEqual(
      phoneFonts,
    );
  }
  await expect(
    page.getByRole("tabpanel", { name: "预览", exact: true }),
  ).toBeHidden();
  await page.screenshot({ path: "/tmp/pbwork-source-font-specimens.png" });
  await page.getByRole("tab", { name: "预览", exact: true }).click();
  const scroller = phone(page, "A").locator("[data-preview-scroll]");
  expect(
    await scroller.evaluate((el) => getComputedStyle(el).scrollbarWidth),
  ).toBe("none");
  await scroller.focus();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.screenshot({ path: "/tmp/pbwork-typography-table.png" });
});

test("device resize grows the card, reports accurate scale and persists across pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/foundations/tokens/color");
  const stage = page.locator(".comparison-track");
  const shell = phone(page, "A").locator(".phone-shell");
  const root = page.locator(".preview-comparison");
  const left = await root.evaluate(
    (el) =>
      el.getBoundingClientRect().left -
      el.parentElement!.getBoundingClientRect().left,
  );
  expect(Math.abs(left)).toBeLessThan(2);
  const scroller = phone(page, "A").locator("[data-preview-scroll]");
  await scroller.evaluate((el) => {
    el.dataset.retained = "yes";
    el.scrollTop = 60;
  });
  const scale = () =>
    phone(page, "A")
      .locator("[data-preview-scale]")
      .getAttribute("data-preview-scale")
      .then(Number);
  await expect.poll(scale).toBeLessThan(1);
  const size = page.getByRole("group", { name: "预览尺寸" });
  await size.getByRole("button", { name: "100%", exact: true }).click();
  await expect.poll(scale).toBe(1);
  expect(Math.round((await shell.boundingBox())!.width)).toBe(390);
  await size.getByRole("button", { name: "适应视区", exact: true }).click();
  await expect.poll(scale).toBeLessThan(1);
  await expect(scroller).toHaveAttribute("data-retained", "yes");
  const handle = page.getByRole("button", { name: "调整手机 A 显示尺寸" });
  await handle.scrollIntoViewIfNeeded();
  const before = await stage.evaluate((el) => el.clientHeight);
  const initialScale = await scale();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 100, {
    steps: 4,
  });
  await page.mouse.up();
  await expect.poll(scale).toBeGreaterThan(initialScale + 0.08);
  expect(await stage.evaluate((el) => el.clientHeight)).toBeGreaterThan(
    before + 60,
  );
  expect(
    await stage.evaluate((el) => ({
      overflow: getComputedStyle(el).overflowY,
      height: el.clientHeight,
      scroll: el.scrollHeight,
    })),
  ).toMatchObject({ overflow: "visible" });
  const dragged = await scale();
  await handle.focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(scale).toBeCloseTo(dragged + 0.05);
  const savedScale = await scale();
  await expect(page.locator(".size-control > span")).toContainText(
    `${Math.round(savedScale * 100)}%`,
  );
  await size.getByRole("button", { name: "适应视区", exact: true }).click();
  const bounds = await stage.evaluate((el) => {
    const a = el.getBoundingClientRect();
    const b = el.querySelector(".phone-shell")!.getBoundingClientRect();
    return {
      top: b.top >= a.top,
      bottom: b.bottom <= a.bottom,
      left: b.left >= a.left,
      right: b.right <= a.right,
    };
  });
  expect(bounds).toEqual({ top: true, bottom: true, left: true, right: true });
  await expect(page.locator("[data-color-swatch]")).toHaveCount(141);
  await expect(page.getByText("引用链", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索键值" }).fill("color.action");
  await expect(page.locator("[data-value-key]")).toHaveCount(2);
  expect(
    await phone(page, "A").locator("[data-color-key]").count(),
  ).toBeGreaterThan(30);
  await page.getByRole("tab", { name: "预览", exact: true }).click();
  await size.getByRole("button", { name: "100%", exact: true }).click();
  await page.goto("/workbench/foundations/tokens/typography");
  await expect.poll(scale).toBe(1);
  await expect(page.locator("[data-value-key]").first()).toContainText("字号");
  await page.reload();
  await expect.poll(scale).toBe(1);
  await page.getByRole("button", { name: "调整手机 A 显示尺寸" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(scale).toBeCloseTo(0.95);
  await page.goto("/workbench/foundations/tokens/color");
  await expect.poll(scale).toBeCloseTo(0.95);
  await page.reload();
  await expect.poll(scale).toBeCloseTo(0.95);
  expect((await shell.boundingBox())!.width).toBeCloseTo(390 * 0.95, 0);
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  await select(page, phone(page, "A"), "主题包", "一刻");
  await page.goto("/workbench/foundations/tokens/typography");
  await expect(phone(page, "B")).toBeVisible();
  await expect(phone(page, "A")).toHaveAttribute("data-preview-pack", "yike");
  await page.reload();
  await expect(phone(page, "B")).toBeVisible();
  await expect(phone(page, "A")).toHaveAttribute("data-preview-pack", "yike");
  await expect.poll(scale).toBeCloseTo(0.95);
  await page
    .getByRole("group", { name: "预览尺寸" })
    .getByRole("button", { name: "适应视区", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/pbwork-device-resize.png" });
});

test("preview/source pages preserve sessions and search, synchronized scroll is bidirectional and optional", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workbench/foundations/tokens/color");
  await page.getByRole("button", { name: "对比", exact: true }).click();
  const a = phone(page, "A").locator("[data-preview-scroll]");
  const b = phone(page, "B").locator("[data-preview-scroll]");
  const progress = (el: Locator) =>
    el.evaluate((n) => n.scrollTop / (n.scrollHeight - n.clientHeight));
  const toggle = page.getByRole("switch", { name: "共同滚动", exact: true });
  await expect(toggle).toBeChecked();
  await a.evaluate((el) => {
    el.dataset.session = "retained";
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.6;
  });
  await expect.poll(() => progress(b)).toBeCloseTo(0.6, 2);
  await b.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.25;
  });
  await expect.poll(() => progress(a)).toBeCloseTo(0.25, 2);
  await toggle.uncheck();
  await a.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.8;
  });
  await expect.poll(() => progress(a)).toBeCloseTo(0.8, 2);
  expect(await progress(b)).toBeCloseTo(0.25, 2);
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "预览", exact: true }),
  ).toBeHidden();
  await page.getByRole("textbox", { name: "搜索键值" }).fill("color.action");
  await expect(page.locator("[data-value-key]")).toHaveCount(2);
  await page.screenshot({ path: "/tmp/pbwork-source-tabs.png" });
  await page.getByRole("tab", { name: "预览", exact: true }).click();
  await expect(a).toHaveAttribute("data-session", "retained");
  await expect.poll(() => progress(a)).toBeCloseTo(0.8, 2);
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "搜索键值" })).toHaveValue(
    "color.action",
  );
  await page.getByRole("tab", { name: "来源", exact: true }).press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "预览", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tab", { name: "预览", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.getByRole("button", { name: "100%", exact: true }).click();
  const stage = page.locator(".comparison-track");
  expect(
    await stage.evaluate((el) => el.scrollHeight - el.clientHeight),
  ).toBeLessThan(2);
  await page.setViewportSize({ width: 1024, height: 760 });
  await expect
    .poll(() =>
      stage.evaluate((el) => {
        const nodes = el.querySelectorAll(".preview-device");
        return (
          nodes[1]!.getBoundingClientRect().top >
          nodes[0]!.getBoundingClientRect().bottom
        );
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: "/tmp/pbwork-preview-wrap.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 800, height: 760 });
  await expect
    .poll(() =>
      stage.evaluate((el) => {
        const stage = el.getBoundingClientRect();
        return Array.from(el.querySelectorAll(".phone-shell")).every(
          (phone) => {
            const rect = phone.getBoundingClientRect();
            return rect.left >= stage.left && rect.right <= stage.right;
          },
        );
      }),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.getByRole("button", { name: "适应视区", exact: true }).click();
  await page.screenshot({ path: "/tmp/pbwork-preview-card.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "预览", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("tabpanel", { name: "来源", exact: true }),
  ).toBeVisible();
  await page.goto("/workbench/components/button");
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  expect(await page.locator("[data-value-key]").count()).toBeGreaterThan(0);
  expect(await page.locator("[data-value-key]").count()).toBeLessThan(40);
  await expect(page.locator("[data-value-key='color.action']")).toHaveCount(1);
});

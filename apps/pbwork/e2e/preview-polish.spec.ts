import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("source lists every actual theme independently, pins the name column and persists its own mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/workbench/foundations/tokens/color");
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  const headers = page.locator(".preview-values thead th");
  await expect(headers).toHaveCount(4);
  await expect(headers.nth(1)).toContainText("默认主题");
  await expect(headers.nth(2)).toContainText("园色");
  await expect(headers.nth(3)).toContainText("柑色");
  const name = page.locator(".preview-values tbody th").first();
  // Wait for the source flip animation to settle before measuring stickiness.
  await name.click({ trial: true });
  const before = await name.evaluate((n) => n.getBoundingClientRect().left);
  await page
    .locator(".value-table-scroll")
    .evaluate((n) => (n.scrollLeft = 400));
  expect(
    await name.evaluate((n) => n.getBoundingClientRect().left),
  ).toBeCloseTo(before, 0);
  await page
    .getByRole("group", { name: "来源模式" })
    .getByRole("button", { name: "深色", exact: true })
    .click();
  const values = await page
    .locator('[data-value-key="color.background"] td code')
    .allTextContents();
  expect(values[0]).toBe("#141517");
  await page.getByRole("tab", { name: "预览", exact: true }).click();
  await page
    .getByRole("group", { name: "预览布局" })
    .getByRole("button", { name: "对比", exact: true })
    .click();
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(headers).toHaveCount(4);
  await page.reload();
  await page.getByRole("tab", { name: "来源", exact: true }).click();
  await expect(
    page
      .getByRole("group", { name: "来源模式" })
      .getByRole("button", { name: "深色", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "/tmp/pbwork-polish-source-matrix.png" });
});

test("icons export their rendered original vectors and selected transparent PNG dimensions", async ({
  page,
}) => {
  await page.goto("/workbench/components/icon");
  await page.getByRole("button", { name: "选择 home", exact: true }).click();
  const [svg] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "下载 SVG" }).click(),
  ]);
  const xml = readFileSync((await svg.path())!, "utf8");
  expect(xml).toContain('viewBox="0 0 24 24"');
  expect(xml).toContain("M3.5 10.5 12 3");
  expect(svg.suggestedFilename()).toBe("pbwork-home.svg");
  await page
    .getByRole("group", { name: "导出格式" })
    .getByRole("button", { name: "PNG", exact: true })
    .click();
  await page
    .getByRole("group", { name: "导出倍率" })
    .getByRole("button", { name: "3×", exact: true })
    .click();
  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "下载 PNG" }).click(),
  ]);
  const bytes = readFileSync((await png.path())!);
  const expected = Number(xml.match(/width="(\d+)"/)![1]) * 3;
  expect(bytes.readUInt32BE(16)).toBe(expected);
  expect(bytes.readUInt32BE(20)).toBe(expected);
  expect(bytes[25]).toBe(6);
});

test("glass filters the backdrop, follows host contours and respects reduced transparency", async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
    ],
  });
  await page.goto("/workbench/components/glass-surface");
  await expect(page.locator(".resource-page .description")).toContainText(
    "降低透明度",
  );
  const note = page.getByRole("note", { name: "macOS 玻璃效果设置" });
  await expect(note).toContainText("降低透明度");
  await expect(note.locator(".glass-preference-active")).toBeHidden();
  const glass = page.locator(".glass-material");
  await expect(glass).toHaveCount(2);
  expect(
    await glass.first().evaluate((n) => getComputedStyle(n).backdropFilter),
  ).toContain("blur");
  expect(
    await glass.first().evaluate((n) => getComputedStyle(n).borderRadius),
  ).not.toBe(
    await glass.last().evaluate((n) => getComputedStyle(n).borderRadius),
  );
  await page.getByRole("button", { name: "移动背景，观察材质" }).click();
  await expect(page.locator(".glass-scene").first()).toHaveClass(/is-moved/);
  await page.screenshot({ path: "/tmp/pbwork-polish-glass.png" });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await expect(note.locator(".glass-preference-active")).toBeVisible();
  for (const n of await glass.all())
    expect(await n.evaluate((e) => getComputedStyle(e).backdropFilter)).toBe(
      "none",
    );
});

test("launch occupies the device content and changes states in place", async ({
  page,
}) => {
  await page.goto("/workbench/components/launch-screen");
  const content = page.locator("[data-preview-scroll]").first(),
    sample = page.locator(".launch-preview").first();
  expect(await sample.evaluate((n) => n.clientHeight)).toBeCloseTo(
    await content.evaluate((n) => n.clientHeight),
    0,
  );
  await page.locator('[data-preview-state="launch-only"]').first().click();
  await expect(
    page
      .locator(".launch-preview")
      .getByRole("button", { name: "开始", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".launch-preview .launch")).toHaveCount(1);
  await page.screenshot({ path: "/tmp/pbwork-polish-launch.png" });
});

test("stepper, duration and calendar retain their controlled interaction after restyling", async ({
  page,
}) => {
  await page.goto("/workbench/components/stepper");
  const primary = page.locator("[data-primary-preview]");
  await primary.getByRole("button", { name: "增加每日目标" }).click();
  await expect(primary.getByRole("spinbutton")).toHaveValue("4");
  await page.goto("/workbench/components/duration-picker");
  const hours = page
    .locator("[data-primary-preview]")
    .getByRole("listbox", { name: "第一列" });
  await hours.focus();
  await hours.press("ArrowDown");
  await expect(hours).toHaveAttribute("aria-activedescendant", /-first-2$/);
  await page.goto("/workbench/components/month-calendar");
  const calendar = page.locator("[data-primary-preview]");
  await calendar.getByRole("button", { name: "下个月" }).click();
  await expect(calendar).toContainText("2026年 8月");
  await calendar
    .getByRole("button", { name: "2026-08-12", exact: true })
    .click();
  await expect(
    calendar.getByRole("button", { name: "2026-08-12", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("AppBar headings stay on one line and glass foreground controls remain reachable at both display sizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
    ],
  });
  await page.goto("/workbench/components/app-bar");
  for (const size of ["100%", "适应视区"]) {
    await page
      .getByRole("group", { name: "预览尺寸" })
      .getByRole("button", { name: size, exact: true })
      .click();
    await expect(page.locator('[data-exhibit="type.large-title"]')).toHaveCount(
      0,
    );
    await expect(page.locator(".large-heading")).toHaveCount(0);
    const headers = page.locator('[data-preview-device="A"] .pb-app-bar');
    expect(await headers.count()).toBeGreaterThan(1);
    for (const header of await headers.all()) {
      const heading = header.locator("h2");
      if (await heading.count()) {
        expect(
          await heading.evaluate((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return range.getClientRects().length;
          }),
        ).toBe(1);
      }
    }
    const glass = page
      .locator('[data-preview-device="A"] .pb-app-bar.is-material')
      .first();
    await glass.scrollIntoViewIfNeeded();
    await expect(glass.getByRole("heading")).toBeVisible();
    await expect(
      glass.getByRole("button", { name: "返回", exact: true }),
    ).toBeVisible();
    await glass.getByRole("button", { name: "返回", exact: true }).click();
    expect(
      await glass
        .locator(".glass-material")
        .evaluate((node) => getComputedStyle(node).backdropFilter),
    ).toContain("blur");
  }
  await page.screenshot({ path: "/tmp/pbwork-appbar-fixed.png" });
});

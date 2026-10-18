import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const contractRoot = fileURLToPath(
  new URL("../src/design-system/components/contracts/", import.meta.url),
);
const contracts = readdirSync(contractRoot)
  .filter((path) => path.endsWith(".json"))
  .map(
    (path) =>
      JSON.parse(readFileSync(contractRoot + path, "utf8")) as {
        id: string;
        states: { id: string }[];
        playground: { presentation: string };
      },
  );
test("all 12 foundations and theme modes use the shared phone and source table, including read-only constants", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const category of [
    "color",
    "typography",
    "spacing",
    "sizing",
    "radius",
    "border",
    "elevation",
    "opacity",
    "motion",
    "layout",
    "layer",
    "effect",
  ]) {
    await page.goto(`/workbench/foundations/tokens/${category}`);
    await expect(page.locator(".preview-comparison")).toHaveAttribute(
      "data-preview-resource",
      category,
    );
    const samples = page.locator(
      category === "color"
        ? "[data-color-key]"
        : category === "typography"
          ? "[data-typography-key]"
          : "[data-foundation-key]",
    );
    expect(await samples.count(), category).toBeGreaterThan(0);
    expect(
      await samples.evaluateAll((nodes) =>
        nodes.every((node) => node.closest("[data-preview-viewport]")),
      ),
    ).toBe(true);
    if (category === "motion") {
      const play = page
        .getByRole("button", { name: "播放", exact: true })
        .first();
      await play.click();
      await expect(page.locator(".motion-track i.is-playing")).toHaveCount(1);
      await page.getByRole("button", { name: "复位", exact: true }).click();
      await expect(page.locator(".motion-track i.is-playing")).toHaveCount(0);
    }
    if (["motion", "layout", "effect"].includes(category))
      await page.screenshot({ path: `/tmp/pbwork-6c-${category}.png` });
    await page.getByRole("tab", { name: "来源", exact: true }).click();
    await expect(
      page.getByRole("complementary", { name: "预览控制" }),
    ).toBeHidden();
    expect(await page.locator("[data-value-key]").count(), category).toBe(
      await samples.count(),
    );
    await expect(
      page.getByRole("tabpanel", { name: "预览", exact: true }),
    ).toBeHidden();
    const columns = await page
      .locator(".preview-values thead th")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().width),
      );
    expect(columns[1], category).toBeGreaterThan(columns[0]!);
    expect(await page.locator("[data-source-sample]").count(), category).toBe(
      (await samples.count()) * 3,
    );
    await expect(
      page.getByRole("columnheader", { name: "差异", exact: true }),
    ).toHaveCount(0);
    if (
      ["border", "spacing", "radius", "elevation", "motion", "effect"].includes(
        category,
      )
    )
      await page.screenshot({ path: `/tmp/pbwork-source-${category}.png` });
    if (category === "layer" || category === "layout")
      await expect(
        page.getByText("只读常量 · 不可覆盖、不可绑定").first(),
      ).toBeVisible();
  }
  for (const mode of ["light", "dark"]) {
    await page.goto(`/workbench/foundations/themes/${mode}`);
    await expect(page.locator('[data-preview-device="A"]')).toHaveAttribute(
      "data-preview-mode",
      mode,
    );
    await expect(page.locator("[data-theme-contrast]")).toHaveCount(5);
    await expect(page.locator(".compare-table")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
for (const appearance of ["base", "sample-dark"]) {
  test(`registry-wide phone rendering and authored state coverage: ${appearance}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/workbench/components/button");
    if (appearance === "sample-dark") {
      const controls = page.locator('[data-preview-settings="A"]');
      await controls
        .getByRole("combobox", { name: "主题包", exact: true })
        .press("ArrowDown");
      await page
        .getByRole("option", { name: "样例主题包 · 仅演示", exact: true })
        .click();
      await controls
        .getByRole("combobox", { name: "模式", exact: true })
        .press("ArrowDown");
      await page.getByRole("option", { name: "深色", exact: true }).click();
    }
    for (const contract of contracts) {
      await page.goto(`/workbench/components/${contract.id}`);
      const phone = page.locator('[data-preview-device="A"]');
      await expect(phone.locator("[data-preview-viewport]")).toBeVisible();
      if (contract.playground.presentation !== "trigger")
        await expect(
          phone.locator(`[data-pb-component="ds.${contract.id}"]`).first(),
        ).toHaveCount(1);
      for (const state of contract.states) {
        if (contract.id === "tabbar" && state.id === "tasks-selected")
          await phone.getByRole("tab", { name: "任务", exact: true }).click();
        await expect(
          phone
            .locator(
              `[data-preview-state="${state.id}"], [data-exhibit="state.${state.id}"]`,
            )
            .first(),
          `${contract.id}/${state.id}`,
        ).toHaveCount(1);
      }
      expect(
        await page
          .locator(
            "[data-exhibit], .gallery-cell, [data-trigger-scenario], [data-tab-layout], [data-transition-mode]",
          )
          .evaluateAll((nodes) =>
            nodes.every((node) => node.closest("[data-preview-viewport]")),
          ),
        contract.id,
      ).toBe(true);
      if (appearance === "sample-dark")
        await expect(phone).toHaveAttribute("data-preview-mode", "dark");
      expect(errors, contract.id).toEqual([]);
      if (
        appearance === "base" &&
        ["icon", "scrollable-data-list", "screen-transition"].includes(
          contract.id,
        )
      )
        await page.screenshot({ path: `/tmp/pbwork-6d-${contract.id}.png` });
    }
  });
}
test("complex list and input sessions are independent and copied when comparison is added", async ({
  page,
}) => {
  await page.goto("/workbench/components/text-field");
  const input = page.locator(
    '[data-preview-device="A"] [data-primary-preview] input',
  );
  await input.fill("独立会话");
  await page.getByRole("button", { name: "对比", exact: true }).click();
  const second = page.locator(
    '[data-preview-device="B"] [data-primary-preview] input',
  );
  await expect(second).toHaveValue("独立会话");
  await second.fill("只更改 B");
  await expect(input).toHaveValue("独立会话");
  await page.goto("/workbench/components/scrollable-data-list");
  const a = page.locator('[data-preview-device="A"]');
  const b = page.locator('[data-preview-device="B"]');
  await a
    .locator(".scrollable-list-demo-actions")
    .getByRole("button", { name: "加载更多", exact: true })
    .click();
  await expect(a.locator('[role="listitem"]')).toHaveCount(10);
  await expect(b.locator('[role="listitem"]')).toHaveCount(8);
  const listA = a.locator('[data-pb-component="ds.scrollable-data-list"]');
  const listB = b.locator('[data-pb-component="ds.scrollable-data-list"]');
  await listA.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.5;
  });
  await expect
    .poll(() =>
      listB.evaluate(
        (el) => el.scrollTop / (el.scrollHeight - el.clientHeight),
      ),
    )
    .toBeCloseTo(0.5, 2);
  await page.getByRole("button", { name: "单机", exact: true }).click();
  await page.getByRole("button", { name: "对比", exact: true }).click();
  await expect(b.locator('[role="listitem"]')).toHaveCount(10);
  await page.getByRole("switch", { name: "共同滚动", exact: true }).uncheck();
  await listA.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(
    a
      .locator(".scrollable-list-demo-actions")
      .getByRole("button", { name: "加载更多", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true");
  const beforeB = await a.locator('[role="listitem"]').count();
  await b
    .locator(".scrollable-list-demo-actions")
    .getByRole("button", { name: "加载更多", exact: true })
    .click();
  await expect(b.locator('[role="listitem"]')).toHaveCount(12);
  await expect(a.locator('[role="listitem"]')).toHaveCount(beforeB);
});

test("all trigger overlays attach to their own device and stay within its viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const id of [
    "toast",
    "confirm",
    "flow-sheet",
    "loading",
    "action-sheet",
  ]) {
    await page.goto(`/workbench/components/${id}`);
    const device = page.locator('[data-preview-device="A"]');
    await device.locator(".in-phone-actions button").first().click();
    const active = device
      .locator("[data-preview-viewport] .v-overlay--active .v-overlay__content")
      .first();
    await expect(active, id).toBeVisible();
    await expect
      .poll(
        () =>
          active.evaluate((el) => {
            const viewport = el
              .closest("[data-preview-viewport]")!
              .getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            return (
              rect.left >= viewport.left - 2 &&
              rect.right <= viewport.right + 2 &&
              rect.top >= viewport.top - 2 &&
              rect.bottom <= viewport.bottom + 2
            );
          }),
        { message: id },
      )
      .toBe(true);
    if (id === "flow-sheet")
      await page.screenshot({ path: "/tmp/pbwork-6d-flow-sheet.png" });
  }
  expect(errors).toEqual([]);
});

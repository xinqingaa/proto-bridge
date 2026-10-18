import { expect, test } from "@playwright/test";

const ids = [
  "segmented-control",
  "stepper",
  "duration-picker",
  "ring-progress",
  "metric",
  "tag",
  "mini-bars",
  "heatmap",
  "month-calendar",
  "grouped-list",
  "list-cell",
  "toast",
  "bottom-sheet",
  "action-sheet",
  "brand-mark",
  "launch-screen",
];

for (const pack of ["base", "sample"] as const) {
  for (const mode of ["light", "dark"] as const) {
    test(`platform components: ${pack}/${mode}`, async ({ page }, info) => {
      test.setTimeout(120_000);
      page.setDefaultTimeout(10_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.addInitScript(({pack,mode}) => localStorage.setItem('pbwork:preview-preferences:v1',JSON.stringify({layout:'single', selections:{A:{contextId:pack === 'base' ? 'foundation:pbwork-base' : 'sample:pbwork-sample',theme:pack === 'base' ? 'default' : 'garden',mode}}})), {pack,mode});
      for (const id of ids) {
        await page.goto(`/workbench/components/${id}`);
        const stage = page.locator('[data-preview-device="A"]');
        await expect(stage).toHaveAttribute('data-preview-mode',mode);
        await expect(stage).toHaveAttribute('data-preview-pack',pack === 'base' ? 'pbwork-base' : 'pbwork-sample');
        if (["toast", "bottom-sheet", "action-sheet"].includes(id)) {
          await stage
            .getByRole("button", {
              name:
                id === "action-sheet"
                  ? "显示默认示例"
                  : id === "bottom-sheet"
                    ? "打开Bottom Sheet"
                    : "显示可撤销",
              exact: true,
            })
            .click();
        }
        const root = stage.locator(`[data-pb-component="ds.${id}"]`).first();
        await expect(root).toBeVisible();
        await expect(root).toHaveAttribute("data-pb-role", /\S+/);
        await expect(root).toHaveAttribute("data-pb-component", `ds.${id}`);
        const facts = await root.evaluate((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          overflow: el.scrollWidth > el.clientWidth + 1,
          grid: Array.from(
            el.querySelectorAll("*"),
            (child) => getComputedStyle(child).display,
          ).some((d) => d === "grid" || d === "inline-grid"),
        }));
        // DS roots use Registry (mounted in unit tests); local facts own explicit bindings.
        expect(
          await page.locator(".preview-values tbody tr").count(),
          id,
        ).toBeGreaterThan(0);
        const localFacts = await root
          .locator("[data-pb-id]:not([data-pb-component])")
          .evaluateAll((nodes) =>
            nodes.map((el) => ({
              id: el.getAttribute("data-pb-id"),
              key: el.getAttribute("data-pb-key"),
              bindings: Array.from(el.attributes).filter((a) =>
                a.name.startsWith("data-pb-token-"),
              ).length,
            })),
          );
        expect(
          localFacts.every((fact) => fact.bindings > 0),
          id,
        ).toBe(true);
        expect(
          new Set(localFacts.map((fact) => `${fact.id}/${fact.key}`)).size,
          id,
        ).toBe(localFacts.length);
        expect(facts.width, id).toBeGreaterThan(0);
        expect(facts.height, id).toBeGreaterThan(0);
        expect(facts.grid, id).toBe(false);
        if (!["heatmap"].includes(id)) expect(facts.overflow, id).toBe(false);
        await stage.screenshot({
          path: info.outputPath(`${id}.png`),
          animations: "disabled",
        });
        if (id === "toast") {
          await root.getByRole("button", { name: "撤销" }).click();
          await expect(root).toBeHidden();
          await expect(stage.getByRole("status")).toContainText("已撤销");
        }
        if (id === "action-sheet") {
          await root.getByRole("button", { name: "删除记录" }).click();
          await expect(root).toBeHidden();
          await expect(stage.getByRole("status")).toContainText("delete");
        }
      }
      expect(errors).toEqual([]);
    });
  }
}

test("platform inputs and calendar remain controlled through keyboard and wheel", async ({
  page,
}) => {
  await page.goto("/workbench/components/segmented-control");
  let root = page.locator('[data-pb-component="ds.segmented-control"]').first();
  await root.getByRole("radio", { name: "周", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    root.getByRole("radio", { name: "月", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    root.getByRole("radio", { name: "月", exact: true }),
  ).toBeFocused();
  await page.goto("/workbench/components/stepper");
  root = page.locator('[data-pb-component="ds.stepper"]').first();
  await root.getByRole("button", { name: /增加/ }).click();
  await expect(root.getByRole("spinbutton")).toHaveValue("4");
  await page.goto("/workbench/components/duration-picker");
  root = page.locator('[data-pb-component="ds.duration-picker"]').first();
  const hour = root.getByRole("listbox", { name: "小时" });
  await hour.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    hour.getByRole("option", { name: "2", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await hour.hover();
  await page.mouse.wheel(0, 160);
  await expect
    .poll(() => hour.locator('[aria-selected="true"]').textContent())
    .not.toBe("2");
  await page.goto("/workbench/components/month-calendar");
  root = page.locator('[data-pb-component="ds.month-calendar"]').first();
  await expect(
    root.getByRole("button", { name: "2026-07-15", exact: true }),
  ).toBeDisabled();
  await root.getByRole("button", { name: "2026-07-28", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    root.getByRole("button", { name: "2026-07-29", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    root.getByRole("button", { name: "2026-07-29", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await root.getByRole("button", { name: "下个月" }).click();
  await expect(root.locator("header strong")).toHaveText("2026年 8月");
});

test("detented sheet reuses overlay focus and closes with Escape", async ({
  page,
}) => {
  await page.goto("/workbench/components/bottom-sheet");
  await page.getByRole("button", { name: "显示半屏", exact: true }).click();
  const sheet = page.locator('[data-pb-component="ds.bottom-sheet"]');
  await expect(sheet).toHaveAttribute("data-detent", "medium");
  const medium = await sheet.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  await sheet.getByRole("button", { name: "展开", exact: true }).click();
  await expect(sheet).toHaveAttribute("data-detent", "expanded");
  await expect
    .poll(() => sheet.evaluate((el) => el.getBoundingClientRect().height))
    .toBeGreaterThan(medium);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await page
    .getByRole("button", { name: "打开Bottom Sheet", exact: true })
    .click();
  await expect(sheet).toHaveAttribute("data-detent", "content");
  await expect(sheet.getByRole("group", { name: "面板高度" })).toBeVisible();
});

test("launch is explicit and ListCell switch has no nested interactive button", async ({
  page,
}) => {
  await page.goto("/workbench/components/launch-screen");
  await page
    .locator('[data-pb-component="ds.launch-screen"]')
    .getByRole("button", { name: "开始", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("已触发开始");
  await expect(page).toHaveURL(/components\/launch-screen$/);
  await page.goto("/workbench/components/list-cell");
  const cell = page.locator('[data-exhibit="type.switch"]');
  await expect(cell.locator("button button, button input")).toHaveCount(0);
  await expect(cell.getByRole("checkbox")).toBeChecked();
});

test("GroupedList demo writes controlled toggle state back to its groups", async ({
  page,
}) => {
  await page.goto("/workbench/components/grouped-list");
  const toggle = page
    .locator('[data-pb-component="ds.grouped-list"]').first()
    .getByRole("checkbox");
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
  await expect(
    page.getByRole("status").filter({ hasText: "已更新列表开关" }),
  ).toHaveText("已更新列表开关");
});

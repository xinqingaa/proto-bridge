import { expect, test } from "@playwright/test";

test("theme pack options deduplicate prototype bindings and migrate both saved devices without losing preferences", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("pbwork:preview-preferences:v1")) return;
    localStorage.setItem(
      "pbwork:preview-preferences:v1",
      JSON.stringify({
        layout: "compare",
        sizeMode: "custom",
        scale: 0.85,
        syncScroll: false,
        sourceMode: "dark",
        selections: {
          A: {
            contextId: "prototype:cold-chain-ops",
            theme: "default",
            mode: "dark",
          },
          B: {
            contextId: "sample:pbwork-sample",
            theme: "citrus",
            mode: "light",
          },
        },
      }),
    );
  });
  await page.goto("/workbench/foundations/tokens/color");
  const first = page.locator('[data-preview-device="A"]');
  const second = page.locator('[data-preview-device="B"]');
  await expect(first).toHaveAttribute("data-preview-pack", "pbwork-base");
  await expect(first).toHaveAttribute("data-preview-mode", "dark");
  await expect(second).toHaveAttribute("data-preview-pack", "pbwork-sample");
  await expect(second).toHaveAttribute("data-preview-theme", "citrus");
  const controls = page.locator('[data-preview-settings="A"]');
  await expect(
    controls.getByRole("combobox", { name: "主题", exact: true }),
  ).toHaveCount(0);
  await controls
    .getByRole("combobox", { name: "主题包", exact: true })
    .press("ArrowDown");
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(
    page.getByRole("option", { name: "PBWork 基础包", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "样例主题包 · 仅演示", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "冷链异常处置台", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pbwork:preview-preferences:v1")!),
  );
  expect(saved).toMatchObject({
    layout: "compare",
    sizeMode: "custom",
    scale: 0.85,
    syncScroll: false,
    sourceMode: "dark",
    selections: {
      A: { contextId: "pack:pbwork-base", theme: "default", mode: "dark" },
      B: { contextId: "pack:pbwork-sample", theme: "citrus", mode: "light" },
    },
  });
  await page.goto("/workbench/components/button");
  await expect(first).toHaveAttribute("data-preview-mode", "dark");
  await expect(second).toHaveAttribute("data-preview-theme", "citrus");
  await page.reload();
  await expect(first).toHaveAttribute("data-preview-pack", "pbwork-base");
  await expect(
    page
      .locator('[data-preview-settings="B"]')
      .getByRole("combobox", { name: "主题", exact: true }),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";

for (const component of ["bottom-sheet", "flow-sheet", "confirm"]) {
  test(`${component} glass preserves modal controls and falls back for reduced transparency`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-reduced-transparency", value: "no-preference" },
      ],
    });
    await page.goto(`/workbench/components/${component}`);
    const trigger = page.getByRole("button", {
      name: "显示玻璃面板",
      exact: true,
    });
    await trigger.click();
    const panel = page.locator(".pb-overlay-glass");
    await expect(panel).toBeVisible();
    const glass = panel.locator(":scope > .glass-material");
    await expect(glass).toHaveCount(1);
    expect(
      await panel.evaluate((n) => getComputedStyle(n).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    expect(
      await glass.evaluate((n) => getComputedStyle(n).backdropFilter),
    ).toContain("blur(");
    expect(
      await panel.evaluate((n) =>
        Array.from(n.children)
          .filter((e) => !e.classList.contains("glass-material"))
          .every((e) => getComputedStyle(e).position === "relative"),
      ),
    ).toBe(true);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await expect
      .poll(() => glass.evaluate((n) => getComputedStyle(n).backdropFilter))
      .toBe("none");
    const fallback = await panel.evaluate((n) => {
      const probe = document.createElement("span");
      probe.style.background = "var(--pb-color-surface)";
      n.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    expect(
      await glass.evaluate((n) => getComputedStyle(n).backgroundColor),
    ).toBe(fallback);
    if (component === "confirm") {
      await panel.getByRole("button", { name: "取消", exact: true }).click();
    } else {
      await panel.getByRole("button", { name: "关闭", exact: true }).click();
    }
    await expect(panel).toBeHidden();
    if (component === "bottom-sheet") await expect(trigger).toBeFocused();
  });
}

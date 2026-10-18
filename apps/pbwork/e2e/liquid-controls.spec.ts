import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-transparency", value: "no-preference" },
    ],
  });
});

for (const component of ["tabbar", "primary-tabs"]) {
  test(`${component} moves one selection surface, keeps it aligned after resize and supports keyboard selection`, async ({
    page,
  }) => {
    await page.goto(`/workbench/components/${component}`);
    const sample = page.locator(
      '[data-preview-device="A"] [data-tab-layout="equal"]',
    );
    const tabs = sample.getByRole("tab");
    const pill = sample.locator(
      component === "tabbar" ? ".pb-tabbar-selection" : ".pb-tabs-pill",
    );
    await expect(pill).toHaveClass(/is-ready/);
    if (component === "tabbar") {
      await expect(page.locator('[data-tab-layout="adaptive"]')).toHaveCount(0);
      await expect(tabs).toHaveCount(3);
      const deviceContent = page.locator(
        '[data-preview-device="A"] [data-preview-scroll]',
      );
      expect(await sample.evaluate((n) => n.clientHeight)).toBe(
        await deviceContent.evaluate((n) => n.clientHeight),
      );
      const navigation = sample.locator(".pb-tabbar-shell");
      const before = await navigation.boundingBox();
      await sample.locator('[data-destination="home"]').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
      });
      const after = await navigation.boundingBox();
      expect(after!.y).toBeCloseTo(before!.y, 0);
      const frame = await sample.boundingBox();
      expect(after!.y + after!.height).toBeCloseTo(frame!.y + frame!.height, 0);
    }
    const first = await pill.evaluate((n) => n.getBoundingClientRect().left);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    if (component === "tabbar") {
      await expect(
        sample.locator('.v-window-item--active [data-destination="tasks"]'),
      ).toBeVisible();
      await expect(sample.locator(".v-window-item--active")).toContainText(
        "3 项任务",
      );
    }
    await expect
      .poll(() => pill.evaluate((n) => n.getBoundingClientRect().left))
      .toBeGreaterThan(first + 1);
    const aligned = async () => {
      const selected = await sample
        .locator('[role="tab"][aria-selected="true"]')
        .boundingBox();
      const box = await pill.boundingBox();
      return (
        Math.abs(box!.x - selected!.x) + Math.abs(box!.width - selected!.width)
      );
    };
    await expect.poll(aligned).toBeLessThan(2);
    await tabs.nth(1).press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toBeFocused();
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect.poll(aligned).toBeLessThan(2);
    expect(
      await sample.locator(".glass-selection .glass-material").count(),
    ).toBe(0);
    expect(
      await sample
        .locator(".glass-material")
        .first()
        .evaluate((n) => getComputedStyle(n).backdropFilter),
    ).toContain("blur");
    await sample.screenshot({ path: `/tmp/pbwork-liquid-${component}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await pill.evaluate((n) => getComputedStyle(n).transitionDuration),
    ).toBe("0s");
  });
}

test("glass buttons keep labels, loading and disabled behavior, and use an opaque accessible fallback", async ({
  page,
}) => {
  for (const component of ["button", "icon-button"]) {
    await page.goto(`/workbench/components/${component}`);
    const root = page.locator('[data-preview-device="A"]');
    const glass = root.locator(`.pb-${component}.is-glass`);
    await expect(glass.first()).toBeVisible();
    expect(await glass.count()).toBeGreaterThanOrEqual(3);
    await expect(glass.first()).toBeVisible();
    const loading = root
      .locator('[data-preview-state="glass-loading"] button')
      .first();
    const disabled = root
      .locator('[data-preview-state="glass-disabled"] button')
      .first();
    await expect(loading).toBeDisabled();
    await expect(disabled).toBeDisabled();
    if (component === "button") {
      await expect(loading.locator(".pb-button-foreground")).toContainText(
        "提交工单",
      );
      await expect(loading).toHaveAttribute("aria-busy", "true");
    } else await expect(glass.first()).toHaveAccessibleName(/./);
    expect(
      await glass
        .first()
        .locator(".glass-material")
        .evaluate((n) => getComputedStyle(n).backdropFilter),
    ).toContain("blur");
    const buttonRadius = await glass
      .first()
      .evaluate((n) => getComputedStyle(n).borderRadius);
    expect(
      await glass
        .first()
        .locator(".glass-material")
        .evaluate((n) => getComputedStyle(n).borderRadius),
    ).toBe(buttonRadius);
    await glass.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/pbwork-liquid-${component}.png` });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    expect(
      await glass
        .first()
        .locator(".glass-material")
        .evaluate((n) => getComputedStyle(n).backdropFilter),
    ).toBe("none");
    const fill = await glass
      .first()
      .locator(".glass-material")
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    expect(fill).not.toBe("rgba(0, 0, 0, 0)");
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-reduced-transparency", value: "no-preference" },
      ],
    });
  }
});

for (const pack of ["base", "sample"] as const) {
  for (const mode of ["light", "dark"] as const) {
    test(`glass controls render in ${pack}/${mode}`, async ({ page }) => {
      await page.addInitScript(
        ({ pack, mode }) =>
          localStorage.setItem(
            "pbwork:preview-preferences:v1",
            JSON.stringify({
              selections: {
                A: {
                  contextId:
                    pack === "base"
                      ? "foundation:pbwork-base"
                      : "sample:pbwork-sample",
                  theme: pack === "base" ? "default" : "garden",
                  mode,
                },
              },
            }),
          ),
        { pack, mode },
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const component of [
        "tabbar",
        "primary-tabs",
        "button",
        "icon-button",
      ]) {
        await page.goto(`/workbench/components/${component}`);
        const device = page.locator('[data-preview-device="A"]');
        await expect(device).toHaveAttribute("data-preview-mode", mode);
        const glass = device.locator(".glass-material").first();
        await expect(glass).toBeAttached();
        expect(
          await glass.evaluate((n) => getComputedStyle(n).backdropFilter),
        ).toContain("blur");
        if (pack === "sample" && mode === "dark") {
          await device.screenshot({
            path: `/tmp/pbwork-liquid-${component}-sample-dark.png`,
          });
        }
      }
      expect(errors).toEqual([]);
    });
  }
}

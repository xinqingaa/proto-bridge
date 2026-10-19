import { expect, test } from "@playwright/test";
const entry =
  "/workbench/prototypes/yike/screens/focus?variant=default&theme=mechanical&mode=light";
for (const mode of ["light", "dark"])
  test(`neutral chrome and shared safe areas: ${mode}`, async ({ page }) => {
    await page.goto(entry.replace("mode=light", `mode=${mode}`));
    const frame = page.frameLocator("iframe");
    const settings = frame.getByRole("button", { name: "设置", exact: true });
    const embedded = await settings.evaluate((e) => ({
      y: e.getBoundingClientRect().y,
      h: e.getBoundingClientRect().height,
    }));
    expect(embedded.y).toBeGreaterThanOrEqual(44);
    await expect(page.locator(".status-time")).toHaveText("09:41");
    await expect(page.locator(".status-bar")).toHaveCSS(
      "background-image",
      "none",
    );
    await page.screenshot({
      path: `../../output/page-environment/yike-${mode}.png`,
      animations: "disabled",
    });
    const standalone = await page.context().newPage();
    await standalone.setViewportSize({ width: 390, height: 844 });
    await standalone.goto(
      `/prototype/yike/focus?theme=mechanical&mode=${mode}`,
    );
    await expect(
      standalone.getByRole("button", { name: "设置", exact: true }),
    ).toBeVisible();
    const y = await standalone
      .getByRole("button", { name: "设置", exact: true })
      .evaluate((e) => e.getBoundingClientRect().y);
    expect(y).toBe(embedded.y);
    await settings.click();
    await page.waitForURL(/screens\/settings/);
    const bar = frame.locator('[data-pb-id="yike.settings.app-bar"]');
    await expect(bar).toBeVisible();
    const padding = await bar.evaluate((e) => getComputedStyle(e).paddingTop);
    expect(padding).toBe("44px");
    await page.screenshot({
      path: `../../output/page-environment/settings-${mode}.png`,
      animations: "disabled",
    });
    await standalone.close();
  });

for (const device of [
  { id: "iphone-se", width: 375, height: 667 },
  { id: "android-common", width: 360, height: 800 },
])
  test(`compact viewport safe area, toast and editor: ${device.width}`, async ({
    page,
  }) => {
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          "pbwork.workbench.canvas.v1",
          JSON.stringify({ deviceId: id, zoom: 1 }),
        ),
      device.id,
    );
    await page.goto(entry);
    const frame = page.frameLocator("iframe");
    const y = await frame
      .getByRole("button", { name: "设置", exact: true })
      .evaluate((e) => e.getBoundingClientRect().y);
    expect(y).toBeGreaterThanOrEqual(44);
    await frame.getByRole("tab", { name: "打卡", exact: true }).click();
    await page.waitForURL(/screens\/checkin/);
    await frame
      .getByRole("button", { name: "打卡：喝够 8 杯水", exact: true })
      .click();
    const toast = frame.locator(".pb-toast-content");
    await expect(toast).toBeVisible();
    await expect(
      frame.locator(".v-snackbar-transition-enter-active"),
    ).toHaveCount(0);
    const bottom = await toast.evaluate(
      (e) => e.getBoundingClientRect().bottom,
    );
    expect(bottom).toBeLessThanOrEqual(device.height - 20);
    await frame.getByRole("button", { name: "新建习惯", exact: true }).click();
    await page.waitForURL(/screens\/habit-editor/);
    const save = frame.getByRole("button", { name: "保存", exact: true });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await page.screenshot({
      path: `../../output/page-environment/editor-${device.width}.png`,
      animations: "disabled",
    });
  });

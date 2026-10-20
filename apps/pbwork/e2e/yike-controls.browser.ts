import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-20T12:00:00+08:00") });
});

async function open(
  page: Page,
  slug: string,
  variant: string,
  theme = "mechanical",
  mode = "light",
  extra = "",
) {
  await page.goto(
    `/prototype/yike/${slug}?variant=${variant}&theme=${theme}&mode=${mode}${extra}`,
  );
}
async function shot(page: Page, name: string) {
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '[class*="-enter-active"], [class*="-leave-active"]',
      ),
  );
  await page.screenshot({
    path: `../../output/yike-controls/${name}.png`,
    animations: "disabled",
  });
}

for (const theme of ["mechanical", "water", "sundial"]) {
  for (const mode of ["light", "dark"]) {
    test(`countdown choices follow ${theme}/${mode}, keyboard selection and custom duration`, async ({
      page,
    }) => {
      if (mode === "dark")
        await page.setViewportSize({ width: 360, height: 640 });
      await open(page, "focus", "countdown-setup", theme, mode);
      const choices = page.getByRole("group", {
        name: "倒计时时长",
        exact: true,
      });
      const five = choices.getByRole("button", { name: "5分", exact: true });
      await expect(five).toHaveAttribute("aria-pressed", "true");
      const styles = await choices.evaluate((group) => {
        const selected = group.querySelector<HTMLElement>(
          '[aria-pressed="true"]',
        )!;
        const css = getComputedStyle(selected);
        const variables = getComputedStyle(group);
        const rgb = (hex: string) =>
          `rgb(${[1, 3, 5].map((start) => parseInt(hex.trim().slice(start, start + 2), 16)).join(", ")})`;
        return {
          color: css.color,
          background: css.backgroundColor,
          border: css.borderTopColor,
          primary: rgb(variables.getPropertyValue("--pb-color-primary")),
          soft: rgb(variables.getPropertyValue("--pb-color-primary-soft")),
          radius: parseFloat(css.borderTopLeftRadius),
          expectedRadius: parseFloat(
            variables.getPropertyValue("--pb-radius-control-compact"),
          ),
          boxes: Array.from(group.querySelectorAll("button")).map((button) => {
            const box = button.getBoundingClientRect();
            return {
              width: box.width,
              height: box.height,
              right: box.right,
              bottom: box.bottom,
            };
          }),
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      expect(styles.color).toBe(styles.primary);
      expect(styles.background).toBe(styles.soft);
      expect(styles.border).toBe(styles.primary);
      expect(styles.radius).toBe(styles.expectedRadius);
      for (const box of styles.boxes) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.right).toBeLessThanOrEqual(styles.viewport.width);
        expect(box.bottom).toBeLessThan(styles.viewport.height);
      }
      await five.press("Tab");
      const ten = choices.getByRole("button", { name: "10分", exact: true });
      await expect(ten).toBeFocused();
      expect(
        await ten.evaluate((button) => getComputedStyle(button).outlineStyle),
      ).toBe("solid");
      await ten.press("Enter");
      await expect(ten).toHaveAttribute("aria-pressed", "true");
      await expect(five).toHaveAttribute("aria-pressed", "false");
      await expect(
        page.getByRole("button", { name: "开始 10 分钟", exact: true }),
      ).toBeVisible();
      await shot(page, `countdown-${theme}-${mode}`);
      await choices
        .getByRole("button", { name: "自定义", exact: true })
        .click();
      const sheet = page.locator('[data-pb-id="yike.focus.custom-sheet"]');
      await expect(sheet).toBeVisible();
      await sheet
        .getByRole("listbox", { name: "分钟", exact: true })
        .press("ArrowDown");
      await sheet
        .getByRole("button", { name: "确认时长", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "开始 11 分钟", exact: true }),
      ).toBeVisible();
      await expect(choices.locator('[aria-pressed="true"]')).toHaveCount(0);
      await choices.getByRole("button", { name: "3分", exact: true }).click();
      await page
        .getByRole("button", { name: "开始 3 分钟", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "暂停", exact: true }),
      ).toBeVisible();
      await expect(choices).not.toBeVisible();
    });
  }
}

test("empty, archived and missing objects retain consistent action hierarchy and navigation", async ({
  page,
}) => {
  await open(page, "checkin", "empty", "sundial");
  const create = page.locator('[data-pb-id="yike.checkin.empty-create"]');
  await expect(create).toHaveClass(/kind-accent/);
  await create.click();
  await expect(
    page.getByRole("textbox", { name: "习惯名称", exact: true }),
  ).toBeVisible();
  await open(page, "checkin", "archived", "water", "dark");
  await page.getByRole("button", { name: "已归档习惯", exact: true }).click();
  const restore = page
    .getByRole("button", { name: "恢复", exact: true })
    .first();
  await expect(restore).toHaveClass(/kind-outlined/);
  await restore.click();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator(".habit-card")).toHaveCount(1);
  for (const slug of ["habit-detail", "habit-editor"]) {
    await open(
      page,
      slug,
      "default",
      "sundial",
      "dark",
      "&habit=missing-habit",
    );
    const back = page.locator(`[data-pb-id="yike.${slug}.return"]`);
    await expect(back).toHaveClass(/kind-quiet/);
    await back.click();
    await expect(page).toHaveURL(/\/checkin\?/);
  }
});

test("corrupt storage offers a themed glass confirmation, cancellation preserves data and focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("pbwork.prototype.yike.data", "broken-json"),
  );
  await open(page, "checkin", "default", "sundial", "dark");
  const reset = page.locator('[data-pb-id="yike.checkin.storage-reset"]');
  await expect(reset).toHaveClass(/kind-quiet/);
  await reset.click();
  const sheet = page.locator('[data-pb-id="yike.checkin.corrupt-reset"]');
  await expect(sheet).toHaveClass(/pb-overlay-glass/);
  await shot(page, "corrupt-confirm-sundial-dark");
  await sheet.getByRole("button", { name: "取消", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(reset).toBeFocused();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("pbwork.prototype.yike.data"),
    ),
  ).toBe("broken-json");
});

test("failed saves can be retried using the shared quiet action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    (window as any).__yikeFailSave = true;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "pbwork.prototype.yike.data" &&
        (window as any).__yikeFailSave
      ) {
        throw new DOMException("Test quota", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await open(page, "checkin", "default", "mechanical");
  const retry = page.locator('[data-pb-id="yike.checkin.storage-retry"]');
  await expect(retry).toHaveClass(/kind-quiet/);
  await page.evaluate(() => {
    (window as any).__yikeFailSave = false;
  });
  await retry.click();
  await expect(retry).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("pbwork.prototype.yike.data"),
    ),
  ).toBeTruthy();
});

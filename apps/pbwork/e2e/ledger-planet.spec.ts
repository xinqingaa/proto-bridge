import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1100 } });

test("tab identity and theme survive stack and native history navigation", async ({
  page,
}) => {
  await page.goto(
    "/prototype/ledger-planet/ledger-home?variant=default&theme=light",
  );

  await page.getByRole("tab", { name: "权益" }).click();
  await page.getByRole("button", { name: /我的券包/ }).click();
  await expect(page).toHaveURL(/\/coupon-wallet\?variant=default&theme=light/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/benefits-home\?variant=default&theme=light/);
  await expect(page.getByRole("tab", { name: "权益" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: "我的" }).click();
  await page.getByRole("button", { name: /钱包 3,200/ }).click();
  await expect(page).toHaveURL(/\/wallet\?variant=default&theme=light/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=light/);
  await expect(page.getByRole("tab", { name: "我的" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("checkbox", { name: "深色主题" }).click();
  await expect(page).toHaveURL(/theme=dark/);

  await page.goBack();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=dark/);
  await expect(page.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/settings\?variant=default&theme=dark/);
  await page.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/me-home\?variant=default&theme=dark/);
});

test("workbench mirrors ledger navigation without reloading or A/B loops", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/benefits-home?variant=default&theme=light",
  );
  const iframe = page.getByTestId("prototype-iframe");
  const initialSrc = await iframe.getAttribute("src");
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');

  await frame.getByRole("button", { name: /我的券包/ }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/coupon-wallet\?variant=default&theme=light/,
  );
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");

  await frame.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/benefits-home\?variant=default&theme=light/,
  );
  await expect(frame.getByRole("heading", { name: "权益" })).toBeVisible();
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");
});

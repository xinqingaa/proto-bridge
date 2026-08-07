import { expect, test } from "@playwright/test";

test("opens a pure Runtime route without workbench chrome", async ({
  page,
}) => {
  await page.goto("/prototype/cold-chain-ops/exception-queue?variant=default&theme=light");

  await expect(page.getByTestId("runtime-root")).toBeVisible();
  await expect(page.getByTestId("workbench-root")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "冷链异常" })).toBeVisible();
});

test("dark Runtime paints its own root background", async ({ page }) => {
  await page.goto("/prototype/cold-chain-ops/exception-queue?variant=default&theme=dark");

  const runtime = page.getByTestId("runtime-root");
  await expect(runtime).toBeVisible();
  await expect(runtime).toHaveClass(/v-theme--pbworkDark/);
  await expect(runtime).toHaveCSS("background-color", "rgb(20, 21, 23)");
  await expect(page.locator(".phone-stage")).toHaveCount(0);
  await expect(page.getByTestId("workbench-root")).toHaveCount(0);
});

test("shows a deterministic error page for an unknown Runtime screen", async ({
  page,
}) => {
  await page.goto("/prototype/cold-chain-ops/missing?theme=light");

  await expect(page.getByRole("alert")).toContainText("UNKNOWN_SCREEN");
});

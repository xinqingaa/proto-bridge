import { expect, test } from "@playwright/test";

test("opens a pure Runtime route without workbench chrome", async ({
  page,
}) => {
  await page.goto(
    "/prototype/cold-chain-ops/exception-queue?variant=default&theme=default&mode=light",
  );

  await expect(page.getByTestId("runtime-root")).toBeVisible();
  await expect(page.getByTestId("workbench-root")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "冷链异常" })).toBeVisible();
});

test("dark Runtime paints its own root background", async ({ page }) => {
  await page.goto(
    "/prototype/cold-chain-ops/exception-queue?variant=default&theme=default&mode=dark",
  );

  const runtime = page.getByTestId("runtime-root");
  await expect(runtime).toBeVisible();
  await expect(runtime).toHaveClass(/v-theme--pb-pbwork-base-default-dark-/);
  await expect(runtime).toHaveCSS("background-color", "rgb(20, 21, 23)");
  await expect(page.locator(".phone-stage")).toHaveCount(0);
  await expect(page.getByTestId("workbench-root")).toHaveCount(0);
});

test("shows a deterministic error page for an unknown Runtime screen", async ({
  page,
}) => {
  await page.goto("/prototype/cold-chain-ops/missing?theme=default&mode=light");

  await expect(page.getByRole("alert")).toContainText("UNKNOWN_SCREEN");
});

test("system preference follows OS changes while the URL stays concrete", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("pbwork.runtime.theme.v1", "dark");
    localStorage.setItem(
      "pbwork.runtime.theme.v2",
      JSON.stringify({
        "cold-chain-ops": { theme: "default", mode: "system" },
        "other-prototype": { theme: "alternate", mode: "dark" },
      }),
    );
  });
  await page.goto("/prototype/cold-chain-ops/exception-queue");
  const root = page.getByTestId("runtime-root");
  await expect(root).toHaveClass(/v-theme--pb-pbwork-base-default-light-/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveClass(/v-theme--pb-pbwork-base-default-dark-/);
  await expect(page).toHaveURL(/mode=dark/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pbwork.runtime.theme.v2")!),
    ),
  ).toEqual({
    "cold-chain-ops": { theme: "default", mode: "system" },
    "other-prototype": { theme: "alternate", mode: "dark" },
  });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveClass(/v-theme--pb-pbwork-base-default-light-/);
  await expect(page).toHaveURL(/mode=light/);
});

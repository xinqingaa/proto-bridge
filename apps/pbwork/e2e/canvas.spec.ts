import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/project/screens/task-list?variant=default&theme=light",
  );
  await expect(page.getByTestId("prototype-iframe")).toBeVisible();
});

test("renders the phone canvas iframe for a screen", async ({ page }) => {
  const iframe = page.getByTestId("prototype-iframe");
  await expect(iframe).toHaveAttribute(
    "src",
    /\/prototype\/project\/task-list\?variant=default&theme=light/,
  );
  await expect(iframe).toHaveAttribute("width", "390");
  await expect(iframe).toHaveAttribute("height", "844");
  await expect(page.getByRole("toolbar", { name: "画布工具栏" })).toBeVisible();
  await expect(page.getByLabel("自定义缩放比例")).toBeVisible();
});

test("switching variant and theme updates workbench URL and iframe src", async ({
  page,
}) => {
  await page.getByLabel("Variant").selectOption("empty");
  await expect(page).toHaveURL(/variant=empty/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /variant=empty&theme=light/,
  );

  await page.getByLabel("原型主题").selectOption("dark");
  await expect(page).toHaveURL(/theme=dark/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /\/prototype\/project\/task-list\?variant=empty&theme=dark/,
  );

  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await expect(frame.getByText("暂无任务")).toBeVisible();
});

test("device preset changes iframe viewport without leaving workbench", async ({
  page,
}) => {
  await page.getByLabel("设备尺寸").selectOption("iphone-se");
  const iframe = page.getByTestId("prototype-iframe");
  await expect(iframe).toHaveAttribute("width", "375");
  await expect(iframe).toHaveAttribute("height", "667");
  await expect(page).toHaveURL(/\/workbench\/prototypes\/project\/screens\/task-list/);
});

test("zoom slider updates the displayed scale percent", async ({ page }) => {
  const slider = page.getByLabel("自定义缩放比例");
  await slider.fill("75");
  await expect(page.getByLabel("缩放比例预设")).toHaveText("75%");
});

test("fullscreen opens the pure Runtime URL", async ({ page, context }) => {
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "全屏预览" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toMatch(
    /\/prototype\/project\/task-list\?variant=default&theme=light/,
  );
  await expect(popup.getByTestId("runtime-root")).toBeVisible();
  await expect(popup.getByTestId("workbench-root")).toHaveCount(0);
});

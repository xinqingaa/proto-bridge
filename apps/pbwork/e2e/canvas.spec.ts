import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto(
    "/workbench/prototypes/ledger-planet/screens/task-list?variant=default&theme=light",
  );
  await expect(page.getByTestId("prototype-iframe")).toBeVisible();
});

test("renders the phone canvas iframe for a screen", async ({ page }) => {
  const iframe = page.getByTestId("prototype-iframe");
  await expect(iframe).toHaveAttribute(
    "src",
    /\/prototype\/ledger-planet\/task-list\?variant=default&theme=light/,
  );
  await expect(iframe).toHaveAttribute("width", "390");
  await expect(iframe).toHaveAttribute("height", "844");
  await expect(page.getByRole("toolbar", { name: "画布工具栏" })).toBeVisible();
  await expect(page.getByLabel("缩放比例预设")).toHaveText("100%");
});

test("dark shell styles stay scoped to the workbench chrome", async ({
  page,
}) => {
  await page.getByRole("button", { name: "切换到深色工作台主题" }).click();

  const styles = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="workbench-root"]');
    const toolbar = document.querySelector(".canvas-toolbar");
    const stage = document.querySelector(".phone-stage");
    if (!root || !toolbar || !stage) throw new Error("missing canvas chrome");
    return {
      rootBackground: getComputedStyle(root).backgroundColor,
      rootBackgroundImage: getComputedStyle(root).backgroundImage,
      toolbarBackgroundImage: getComputedStyle(toolbar).backgroundImage,
      stageBackgroundImage: getComputedStyle(stage).backgroundImage,
    };
  });

  expect(styles.rootBackground).toBe("rgb(20, 21, 23)");
  expect(styles.rootBackgroundImage).toBe("none");
  expect(styles.toolbarBackgroundImage).toContain("linear-gradient");
  expect(styles.stageBackgroundImage).toBe("none");
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /theme=light/,
  );
});

test("switching variant and theme updates the live iframe without remounting it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "预览设置" }).click();
  await page.getByLabel("Variant").selectOption("empty");
  await expect(page).toHaveURL(/variant=empty/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /variant=default&theme=light/,
  );

  await page.getByRole("button", { name: "预览设置" }).click();
  await page.getByLabel("原型主题").selectOption("dark");
  await expect(page).toHaveURL(/theme=dark/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /\/prototype\/ledger-planet\/task-list\?variant=default&theme=light/,
  );

  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await expect(frame.getByText("没有任务")).toBeVisible();
  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
});

test("device preset changes iframe viewport without leaving workbench", async ({
  page,
}) => {
  await page.getByRole("button", { name: "预览设置" }).click();
  await page.getByLabel("设备尺寸").selectOption("iphone-se");
  const iframe = page.getByTestId("prototype-iframe");
  await expect(iframe).toHaveAttribute("width", "375");
  await expect(iframe).toHaveAttribute("height", "667");
  await expect(page).toHaveURL(
    /\/workbench\/prototypes\/ledger-planet\/screens\/task-list/,
  );
});

test("zoom preset updates the displayed scale percent", async ({ page }) => {
  await page.getByLabel("缩放比例预设").click();
  await page.getByText("75%", { exact: true }).click();
  await expect(page.getByLabel("缩放比例预设")).toHaveText("75%");
});

test("fullscreen expands the canvas in the current workbench", async ({
  page,
}) => {
  await page.getByRole("button", { name: "全屏画布" }).click();
  const fullscreenCanvas = page.locator(".phone-canvas");
  const inspector = page.getByTestId("inspector-panel");
  await expect(fullscreenCanvas).toHaveClass(/is-fullscreen/);
  await expect(inspector).toBeVisible();
  const canvasBox = await fullscreenCanvas.boundingBox();
  const inspectorBox = await inspector.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(inspectorBox).not.toBeNull();
  expect(inspectorBox!.y).toBe(0);
  expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(inspectorBox!.x);
  await expect(
    page.getByRole("button", { name: "退出全屏画布" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出全屏画布" }).click();
  await expect(page.locator(".phone-canvas")).not.toHaveClass(/is-fullscreen/);
});

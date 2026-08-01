import { expect, test, type Page } from "@playwright/test";

async function selectPreviewSetting(page: Page, label: string, option: string) {
  await page.getByLabel(label).press("ArrowDown");
  await page.getByRole("option", { name: option, exact: true }).click();
}

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
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await page.getByRole("button", { name: "预览设置" }).click();
  await selectPreviewSetting(page, "Variant", "空态");
  await expect(page).toHaveURL(/variant=empty/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /variant=default&theme=light/,
  );
  await expect(frame.getByText("没有任务")).toBeVisible();

  await selectPreviewSetting(page, "Variant", "默认");
  await expect(page).toHaveURL(/variant=default/);
  await expect(
    frame.locator('[data-pb-id="ledger-planet.task-list.list.row"]'),
  ).toHaveCount(3);
  await expect(frame.getByText("没有任务")).toHaveCount(0);

  await selectPreviewSetting(page, "原型主题", "深色主题");
  await expect(page).toHaveURL(/theme=dark/);
  await expect(page.getByTestId("prototype-iframe")).toHaveAttribute(
    "src",
    /\/prototype\/ledger-planet\/task-list\?variant=default&theme=light/,
  );

  await expect(frame.getByTestId("runtime-root")).toHaveClass(
    /v-theme--pbworkDark/,
  );
});

test("screen navigation swaps lazy views without blanking or remounting the iframe", async ({
  page,
}) => {
  const iframe = page.getByTestId("prototype-iframe");
  const initialSrc = await iframe.getAttribute("src");
  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame.locator(".runtime-main").evaluate((runtimeMain) => {
    const runtimeWindow = window as Window & {
      __pbRuntimeRenderIssues?: string[];
      __pbRuntimeRenderObserver?: MutationObserver;
    };
    const issues: string[] = [];
    const inspect = () => {
      if (!runtimeMain.firstElementChild) issues.push("empty-runtime-main");
      if (runtimeMain.querySelector(".runtime-loading")) {
        issues.push("runtime-loading");
      }
      if (runtimeMain.querySelector(".runtime-error")) {
        issues.push("runtime-error");
      }
    };
    const observer = new MutationObserver(inspect);
    observer.observe(runtimeMain, { childList: true, subtree: true });
    runtimeWindow.__pbRuntimeRenderIssues = issues;
    runtimeWindow.__pbRuntimeRenderObserver = observer;
  });

  await frame
    .getByRole("button", {
      name: "记一笔 今日完成 1 笔记账 每日 · 奖励 3 星币 去完成",
    })
    .click();
  await expect(page).toHaveURL(/\/screens\/task-detail\?variant=default/);
  await expect(frame.getByRole("heading", { name: "任务详情" })).toBeVisible();
  await frame.getByRole("button", { name: "返回" }).click();
  await expect(page).toHaveURL(/\/screens\/task-list\?variant=default/);
  await expect(
    frame.locator('[data-pb-id="ledger-planet.task-list.list.row"]'),
  ).toHaveCount(3);
  await expect(iframe).toHaveAttribute("src", initialSrc ?? "");

  const renderIssues = await frame.locator(".runtime-main").evaluate(() => {
    const runtimeWindow = window as Window & {
      __pbRuntimeRenderIssues?: string[];
      __pbRuntimeRenderObserver?: MutationObserver;
    };
    runtimeWindow.__pbRuntimeRenderObserver?.disconnect();
    return runtimeWindow.__pbRuntimeRenderIssues ?? [];
  });
  expect(renderIssues).toEqual([]);
});

test("device preset changes iframe viewport without leaving workbench", async ({
  page,
}) => {
  await page.getByRole("button", { name: "预览设置" }).click();
  await selectPreviewSetting(page, "设备尺寸", "iPhone SE");
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

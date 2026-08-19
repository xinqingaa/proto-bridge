import { expect, test, type Locator, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

async function acceptAll(locator: Locator) {
  for (const checkbox of await locator.getByRole("checkbox", { name: "我已了解" }).all()) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
}

async function finalizeColdChain(page: Page) {
  await page.goto("/workbench/prototypes/all");
  const row = page.locator("article").filter({ hasText: "冷链异常处置台" });

  await row.getByRole("button", { name: "送交待确定" }).click();
  await page.getByRole("button", { name: "确认送交待确定" }).click();
  await expect(row).toContainText("待确定");

  await row.getByRole("button", { name: "定稿并采集" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("预检完成，等待定稿确认")).toBeVisible({
    timeout: 30_000,
  });
  await dialog
    .getByRole("checkbox", {
      name: "我确认候选方案已经收敛，正式入口和 Registry 中只保留唯一方案",
    })
    .check();
  await acceptAll(dialog);
  await dialog.getByRole("button", { name: "确认并开始完整采集" }).click();

  await expect
    .poll(
      async () => {
        if (await row.getByText("已定稿", { exact: true }).isVisible()) return "final";
        if (
          await dialog
            .getByRole("button", { name: "确认风险并自动生成提示词" })
            .isVisible()
        ) {
          return "risks";
        }
        const failure = dialog.locator(".operation-status.failed");
        if (await failure.isVisible()) return `failed:${await failure.innerText()}`;
        return "capturing";
      },
      { timeout: 120_000, intervals: [1_000] },
    )
    .toMatch(/^(final|risks)$/);

  if (
    await dialog
      .getByRole("button", { name: "确认风险并自动生成提示词" })
      .isVisible()
  ) {
    await acceptAll(dialog);
    await dialog
      .getByRole("button", { name: "确认风险并自动生成提示词" })
      .click();
  }

  await expect(row.getByText("已定稿", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(row).toContainText("Evidence + 提示词");
  return row;
}

test("lifecycle finalization produces one fixed Evidence and Agent prompt", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const row = await finalizeColdChain(page);

  await row.getByRole("button", { name: "查看定稿产物" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  await expect(page.locator(".result-workspace")).toBeVisible();
  await expect(page.locator(".preview-stage img").first()).toBeVisible();
  await page.getByTestId("evidence-tab-delivery").click();
  await expect(page.getByTestId("saved-agent-prompt")).toContainText(
    "read_handoff_index",
  );
  await expect(page.getByRole("button", { name: "复制提示词" })).toBeVisible();
  await expect(page.getByRole("button", { name: /生成|重新生成/ })).toHaveCount(0);

  const pathname = new URL(page.url()).pathname;
  const match = pathname.match(
    /^\/workbench\/evidence\/([^/]+)\/([^/]+)\/?$/,
  );
  if (!match) throw new Error("Evidence Viewer URL did not expose fixed IDs.");
  await page.getByText("固定引用", { exact: true }).click();
  const handoffId = (await page.getByTestId("handoff-id").innerText()).trim();

  await writeFile(
    testInfo.outputPath("deliver-ids.txt"),
    `${match[1]}\n${match[2]}\n${handoffId}\n`,
    "utf8",
  );
  const resultPath = process.env.PBWORK_E2E_RESULT_PATH;
  if (resultPath) {
    await writeFile(
      resultPath,
      JSON.stringify({
        bundleId: match[1],
        snapshotId: match[2],
        handoffId,
      }),
      "utf8",
    );
  }
});

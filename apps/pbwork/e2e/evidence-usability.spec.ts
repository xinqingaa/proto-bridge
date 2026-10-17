import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

import { finalizePrototype } from "./support/finalize";

test("lifecycle finalization produces one fixed Evidence and Agent prompt", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const row = await finalizePrototype(page, "冷链异常处置台");

  await row.getByRole("button", { name: "查看定稿产物" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  await expect(page.locator(".result-workspace")).toBeVisible();
  await expect(page.locator(".preview-stage img").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "复制提示词" })).toBeVisible();
  await page.getByRole("button", { name: "查看提示词" }).click();
  await expect(page.getByTestId("saved-agent-prompt")).toContainText(
    "read_handoff_index",
  );
  await expect(page.getByRole("button", { name: /生成|重新生成/ })).toHaveCount(
    0,
  );

  const pathname = new URL(page.url()).pathname;
  const match = pathname.match(/^\/workbench\/evidence\/([^/]+)\/([^/]+)\/?$/);
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

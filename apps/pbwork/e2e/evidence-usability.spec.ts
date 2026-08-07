import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

async function startDeliver(page: import("@playwright/test").Page): Promise<void> {
  await expect(page.getByTestId("capture-composer")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("composer-start-capture")).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId("composer-start-capture").click();
}

test("exception-queue delivers in one flow sheet and produces an Agent prompt", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  const originalUrl = page.url();
  await expect(page.getByTestId("capture-current-screen")).toBeEnabled();
  await page.getByTestId("capture-current-screen").click();

  await expect(page).toHaveURL(originalUrl);
  await expect(page.getByTestId("deliver-flow-sheet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "交付到 Agent" })).toBeVisible();

  await startDeliver(page);
  await expect(page.getByText("结果与风险").first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("handoff-create").click();
  await expect(page.getByTestId("agent-prompt")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("handoff-id")).toBeVisible();
  const prompt = await page.getByTestId("agent-prompt").innerText();
  expect(prompt).toContain("ProtoBridge Agent");
  expect(prompt).toContain("read_handoff_index");
  expect(prompt).not.toContain("read_acceptance_contract");

  await page.getByRole("button", { name: "完成" }).click();
});

test("evidence viewer can reopen deliver flow for another handoff", async ({
  page,
}, testInfo) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  await page.getByTestId("capture-current-screen").click();
  await startDeliver(page);
  await expect(page.getByText("结果与风险").first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "查看详情" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/个视图采集成功/)).toBeVisible();

  await page.getByTestId("open-handoff-composer").click();
  await expect(page.getByTestId("deliver-flow-sheet")).toBeVisible();
  await page.getByTestId("handoff-create").click();
  await expect(page.getByTestId("agent-prompt")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("handoff-id")).toBeVisible();
  const handoffId = (await page.getByTestId("handoff-id").innerText()).trim();

  const url = page.url();
  const match = url.match(/\/workbench\/evidence\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Evidence Viewer URL did not expose fixed IDs.");
  }
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

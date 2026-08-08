import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test.use({ viewport: { width: 1440, height: 1050 } });

async function startDeliver(
  page: import("@playwright/test").Page,
): Promise<void> {
  if (!(await page.getByTestId("capture-composer").isVisible())) {
    await expect(page.getByTestId("evidence-viewer")).toBeVisible({
      timeout: 10_000,
    });
    const preflightPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/preflights"),
    );
    await page.getByRole("button", { name: "重新采集" }).click();
    const preflight = await preflightPromise;
    if (!preflight.ok()) {
      throw new Error(`Recapture preflight failed: ${await preflight.text()}`);
    }
  }
  await expect(page.getByTestId("capture-composer")).toBeVisible({
    timeout: 20_000,
  });
  for (const warning of await page
    .getByRole("checkbox", { name: "我已了解并继续" })
    .all()) {
    if (!(await warning.isChecked())) await warning.check();
  }
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
  await expect(page.getByTestId("capture-current-screen")).toBeEnabled();
  await page.getByTestId("capture-current-screen").click();

  await startDeliver(page);
  await expect(page.getByTestId("deliver-flow-sheet")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "交付到 Agent" }),
  ).toBeVisible();
  await expect(page.getByText("结果与风险").first()).toBeVisible({
    timeout: 60_000,
  });
  await page.getByTestId("handoff-create").click();
  await expect(page.getByTestId("agent-prompt")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("handoff-id")).toBeVisible();
  const prompt = await page.getByTestId("agent-prompt").innerText();
  expect(prompt).toContain("ProtoBridge Evidence");
  expect(prompt).toContain("read_handoff_index");
  expect(prompt).not.toContain("read_acceptance_contract");

  await page.getByRole("button", { name: "查看采集结果" }).click();
  await page.getByTestId("evidence-tab-delivery").click();
  await expect(page.getByTestId("saved-agent-prompt")).toContainText(
    "read_handoff_index",
  );
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  await page.getByTestId("capture-current-screen").click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();
  await page.getByTestId("evidence-tab-delivery").click();
  await expect(page.getByTestId("saved-agent-prompt")).toContainText(
    "read_handoff_index",
  );
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
  await page.getByRole("button", { name: "查看采集结果" }).click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".result-workspace")).toBeVisible();
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  await page.getByTestId("capture-current-screen").click();
  await expect(page.getByTestId("evidence-viewer")).toBeVisible();

  await page.getByTestId("evidence-tab-delivery").click();
  await page.getByRole("button", { name: "生成 Agent 提示词" }).click();
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

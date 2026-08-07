import { expect, test } from "@playwright/test";

test("selected components expose the Token to CSS value chain", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=light",
  );
  await expect(page.getByTestId("prototype-iframe")).toBeVisible();

  const inspectButton = page.getByRole("button", { name: "选择与评审" });
  await expect(inspectButton).toBeEnabled();
  await inspectButton.click();

  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  const list = frame.locator('[data-pb-id="cold-chain-ops.exception-queue.list"]');
  await expect(list).toBeVisible();
  await list.click();

  const inspector = page.getByTestId("inspector-body");
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole("tab", { name: "样式" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(inspector.locator(".token-id").first()).toBeVisible();
  await expect(inspector.locator(".style-value").first()).toBeVisible();
  await expect(
    inspector.getByText("值匹配推断", { exact: true }).first(),
  ).toBeVisible();
});

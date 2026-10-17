import { expect, test } from "@playwright/test";

test("current Screen diagnostics update after edits without selecting an element", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(
    "/workbench/prototypes/cold-chain-ops/screens/exception-queue?variant=default&theme=default&mode=light",
  );
  const frame = page.frameLocator("iframe");
  const root = frame.locator(
    '[data-pb-id="cold-chain-ops.exception-queue.root"]',
  );
  await expect(root).toBeVisible();
  const diagnostics = page.getByTestId("live-authoring-diagnostics");
  await expect(diagnostics).toBeVisible();
  await root.evaluate((el) => el.removeAttribute("data-pb-role"));
  await expect(diagnostics).toContainText("without data-pb-role");
  await root.evaluate((el) => el.setAttribute("data-pb-role", "page"));
  await expect(diagnostics).not.toContainText("without data-pb-role");
  await root.evaluate((el) => {
    el.setAttribute(
      "data-test-bindings",
      JSON.stringify(
        Array.from(el.attributes)
          .filter((a) => a.name.startsWith("data-pb-token-"))
          .map((a) => [a.name, a.value]),
      ),
    );
    for (const a of Array.from(el.attributes))
      if (a.name.startsWith("data-pb-token-")) el.removeAttribute(a.name);
  });
  await expect(diagnostics).toContainText("has no explicit Token Evidence");
  await root.evaluate((el) => {
    for (const [name, value] of JSON.parse(
      el.getAttribute("data-test-bindings")!,
    ))
      el.setAttribute(name, value);
  });
  await expect(diagnostics).not.toContainText("has no explicit Token Evidence");
  await root.evaluate((el) => {
    (el as HTMLElement).style.display = "none";
  });
  await expect(diagnostics).toContainText("zero-size box");
  await root.evaluate((el) => {
    (el as HTMLElement).style.removeProperty("display");
  });
  await expect(diagnostics).not.toContainText("zero-size box");
  await root.evaluate((el) => {
    const overlay = el.ownerDocument.createElement("div");
    overlay.id = "test-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:black";
    el.ownerDocument.body.append(overlay);
  });
  await expect(diagnostics).toContainText("occluded at its center point");
  await root.evaluate((el) =>
    el.ownerDocument.getElementById("test-overlay")!.remove(),
  );
  await expect(diagnostics).not.toContainText("occluded at its center point");
  await root.evaluate((el) => {
    el.setAttribute("data-test-id", el.getAttribute("data-pb-id")!);
    el.removeAttribute("data-pb-id");
  });
  await expect(diagnostics).toContainText(
    "cold-chain-ops.exception-queue.root/ is missing",
  );
});

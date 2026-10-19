import { expect, test } from "@playwright/test";

test("prototype browsing never requests or blocks on whole-page checks", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.exposeFunction("recordPageCheck", (type: string) =>
    requests.push(type),
  );
  await page.addInitScript(() => {
    window.addEventListener("message", (event) => {
      if (
        ["authoring-check", "authoring-diagnostics"].includes(event.data?.type)
      )
        (window as any).recordPageCheck(event.data.type);
    });
  });
  for (const path of [
    "cold-chain-ops/screens/exception-queue?variant=default&theme=default&mode=light",
    "yike/screens/settings?theme=mechanical&mode=light",
    "yike/screens/habit-detail?theme=mechanical&mode=light",
  ]) {
    await page.goto(`/workbench/prototypes/${path}`);
    await expect(
      page.frameLocator("iframe").locator(".prototype-shell"),
    ).toBeVisible();
    await expect(page.getByTestId("page-check-gate")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /页面检查/ })).toHaveCount(0);
    await expect(page.locator(".canvas-content")).not.toHaveAttribute("inert");
  }
  await page.reload();
  await expect(
    page.frameLocator("iframe").locator(".prototype-shell"),
  ).toBeVisible();
  expect(requests).toEqual([]);
});

test("settings scrollers hide chrome and still scroll in embedded and standalone Runtime", async ({
  page,
}) => {
  for (const embedded of [true, false]) {
    await page.setViewportSize(
      embedded ? { width: 1440, height: 1050 } : { width: 375, height: 667 },
    );
    await page.goto(
      `${embedded ? "/workbench/prototypes/yike/screens" : "/prototype/yike"}/settings?theme=mechanical&mode=light`,
    );
    const root = embedded
      ? page.frameLocator("iframe").locator("html")
      : page.locator("html");
    await expect(root).toHaveClass(/pbwork-runtime/);
    const shell = embedded
      ? page.frameLocator("iframe").locator(".prototype-shell")
      : page.locator(".prototype-shell");
    await expect(shell).toBeVisible();
    const result = await root.evaluate((html) => {
      const scrollers = Array.from(
        html.querySelectorAll<HTMLElement>("*"),
      ).filter(
        (el) =>
          /auto|scroll/.test(getComputedStyle(el).overflowY) &&
          el.scrollHeight > el.clientHeight,
      );
      return scrollers.map((el) => {
        const style = getComputedStyle(el);
        el.scrollTop = 80;
        return { scrollbar: style.scrollbarWidth, moved: el.scrollTop > 0 };
      });
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.scrollbar === "none" && r.moved)).toBe(true);
  }
});

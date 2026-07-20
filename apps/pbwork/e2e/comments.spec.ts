import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1100 } });

test("adds, persists, resolves and deletes a local element comment", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(
    "/workbench/prototypes/project/screens/task-list?variant=default&theme=light",
  );
  await page.evaluate(() => localStorage.removeItem("pbwork.comments.v1"));
  await page.reload();

  const inspector = page.getByTestId("inspector-body");
  await inspector.getByRole("tab", { name: /评论/ }).click();
  await inspector.getByRole("button", { name: "开始选择" }).click();

  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame.locator('[data-pb-id="ds.data-list.row.t1"]').click();

  await expect(inspector.getByRole("tab", { name: /评论/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await inspector.getByLabel("评审意见").fill("标题需要表达具体故障");
  await inspector.getByRole("button", { name: "提交评论" }).click();
  await expect(inspector.getByText("标题需要表达具体故障")).toBeVisible();
  await expect(
    inspector
      .locator(".comment-card")
      .getByText("ds.data-list.row.t1", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByTestId("inspector-body")
    .getByRole("tab", { name: /评论/ })
    .click();
  await expect(
    page.getByTestId("inspector-body").getByText("标题需要表达具体故障"),
  ).toBeVisible();
  const commentCard = page.locator(".comment-card").filter({
    hasText: "标题需要表达具体故障",
  });
  await commentCard.getByRole("button", { name: "定位" }).click();
  await expect(commentCard.getByText("已定位并选中元素")).toBeVisible();
  await commentCard.getByRole("button", { name: "定位" }).click();
  await expect(commentCard.getByText("已定位并选中元素")).toBeVisible();
  await page
    .getByTestId("inspector-body")
    .getByRole("button", { name: "完成", exact: true })
    .click();
  await page.getByRole("button", { name: "已完成", exact: true }).click();
  await expect(page.getByRole("button", { name: "重新打开" })).toBeVisible();
  await page.getByRole("button", { name: "评论更多操作" }).click();
  await page.getByText("删除", { exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("标题需要表达具体故障")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("reports a missing comment anchor without an unhandled page error", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(
    "/workbench/prototypes/project/screens/task-list?variant=default&theme=light",
  );
  await page.evaluate(() => {
    localStorage.setItem(
      "pbwork.comments.v1",
      JSON.stringify({
        schemaVersion: 2,
        comments: [{
          id: "missing-anchor",
          prototypeId: "project",
          screenId: "project.task-list",
          screenSlug: "task-list",
          elementId: "missing.element",
          elementLabel: "已删除的按钮",
          content: "这个元素已经不在页面中",
          status: "open",
          anchorStatus: "unknown",
          createdAt: "2026-07-20T00:00:00.000Z",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }],
      }),
    );
  });
  await page.reload();
  const inspector = page.getByTestId("inspector-body");
  await inspector.getByRole("tab", { name: /评论/ }).click();
  const card = inspector.locator(".comment-card").filter({ hasText: "这个元素已经不在页面中" });
  await card.getByRole("button", { name: "定位" }).click();
  await expect(card.getByText("目标元素已失效")).toBeVisible();
  expect(pageErrors).toEqual([]);
});

import { expect, test } from "@playwright/test";

test("adds, persists, resolves and deletes a local element comment", async ({
  page,
}) => {
  await page.goto(
    "/workbench/prototypes/project/screens/task-list?variant=default&theme=light",
  );
  await page.evaluate(() => localStorage.removeItem("pbwork.comments.v1"));
  await page.reload();

  const commentButton = page.getByRole("button", { name: "添加评论" });
  await expect(commentButton).toBeEnabled();
  await commentButton.click();

  const frame = page.frameLocator('[data-testid="prototype-iframe"]');
  await frame.locator('[data-pb-id="ds.data-list.row.t1"]').click();

  const inspector = page.getByTestId("inspector-body");
  await expect(inspector.getByRole("tab", { name: "评论" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await inspector.getByLabel("评论内容").fill("标题需要表达具体故障");
  await inspector.getByRole("button", { name: "添加评论" }).click();
  await expect(inspector.getByText("标题需要表达具体故障")).toBeVisible();
  await expect(inspector.getByText("ds.data-list.row.t1")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "选择元素" }).click();
  await frame.locator('[data-pb-id="ds.data-list.row.t1"]').click();
  await page
    .getByTestId("inspector-body")
    .getByRole("tab", { name: "评论" })
    .click();
  await expect(
    page.getByTestId("inspector-body").getByText("标题需要表达具体故障"),
  ).toBeVisible();
  await page
    .getByTestId("inspector-body")
    .getByRole("button", { name: "完成" })
    .click();
  await page.locator(".status-filter .v-field").click();
  await page.getByRole("option", { name: "已完成" }).click();
  await expect(page.getByRole("button", { name: "重新打开" })).toBeVisible();
  await page.getByRole("button", { name: "删除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "删除" }).click();
  await expect(page.getByText("标题需要表达具体故障")).toHaveCount(0);
});

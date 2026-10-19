import { expect, test, type Page } from "@playwright/test";

test("C1-C3: shared timer, checkin undo, review and tab state", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=water&mode=light",
  );
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await focus.getByRole("tab", { name: "正计时", exact: true }).click();
  await focus.getByRole("button", { name: "开始计时", exact: true }).click();
  await page.clock.fastForward(65_000);
  await focus.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page).toHaveURL(/variant=stopwatch-paused/);
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  const checkin = page.locator('[data-pb-id="yike.checkin.root"]');
  await checkin
    .getByRole("button", { name: "打卡：喝够 8 杯水", exact: true })
    .click();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  const review = page.locator('[data-pb-id="yike.review.root"]');
  await expect(review).toContainText(/打卡\s*1 次/);
  await page.getByRole("tab", { name: "专注", exact: true }).click();
  await expect(page).toHaveURL(/variant=stopwatch-paused/);
  await expect(
    focus.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await focus.getByRole("button", { name: "结束并记录", exact: true }).click();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(review).toContainText(/专注次数\s*1 次/);
  await expect(review).toContainText("1 分钟");
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  await checkin
    .getByRole("button", { name: "取消打卡：喝够 8 杯水", exact: true })
    .click();
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await expect(
    checkin.getByRole("button", { name: "取消打卡：喝够 8 杯水", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    checkin.getByRole("button", { name: "取消打卡：喝够 8 杯水", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(review).toContainText(/专注次数\s*1 次/);
  await expect(review).toContainText(/打卡\s*1 次/);
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/shared-review.png",
  });
});

test("C1-C3: direct paused fixture, mode confirmation and explicit due fixture", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=paused&theme=sundial&mode=dark",
  );
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await expect(
    focus.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await focus.getByRole("tab", { name: "倒计时", exact: true }).click();
  const sheet = page.locator('[data-pb-id="yike.focus.switch-sheet"]');
  await sheet.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    focus.getByRole("tab", { name: "番茄钟", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await focus.getByRole("tab", { name: "倒计时", exact: true }).click();
  await sheet.getByRole("button", { name: "结束并切换", exact: true }).click();
  await expect(
    focus.getByRole("button", { name: "开始 5 分钟", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /专注次数\s*1 次/,
  );
  await page.goto(
    "/prototype/yike/focus?variant=countdown-due&theme=mechanical&mode=light",
  );
  await expect(
    focus.getByRole("button", { name: "再计 1 分钟", exact: true }),
  ).toBeVisible();
  await focus.getByRole("button", { name: "再计 1 分钟", exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(
    focus.getByRole("button", { name: "完成", exact: true }),
  ).toBeVisible();
  await focus.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    "26 分钟",
  );
});

test("C1-C3: Runtime prepare/reset returns the actual default state", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  await page.waitForFunction(() =>
    Boolean((window as any).__PROTO_BRIDGE_CAPTURE_V2__),
  );
  const request = (payload: unknown) =>
    page.evaluate(
      async (payload) =>
        (window as any).__PROTO_BRIDGE_CAPTURE_V2__.request({
          protocolVersion: 3,
          requestId: `yike-${crypto.randomUUID()}`,
          payload,
        }),
      payload,
    );
  const described = await request({ kind: "describe" });
  expect(described.ok, JSON.stringify(described)).toBe(true);
  const manifest = described.payload.manifest;
  const prepared = await request({
    kind: "prepare",
    expected: {
      prototypeId: "yike",
      screenId: "yike.focus",
      variantId: "default",
      theme: {
        packId: manifest.theme.packId,
        packDigest: manifest.theme.packDigest,
        theme: "mechanical",
        mode: "light",
      },
    },
  });
  expect(prepared.ok, JSON.stringify(prepared)).toBe(true);
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await focus.getByRole("button", { name: "开始专注", exact: true }).click();
  await focus.getByRole("button", { name: "暂停", exact: true }).click();
  const reset = await request({ kind: "reset" });
  expect(reset.ok, JSON.stringify(reset)).toBe(true);
  await expect(
    focus.getByRole("button", { name: "开始专注", exact: true }),
  ).toBeVisible();
  await expect(focus).toContainText("25:00");
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*0 次/,
  );
});

async function runtimeRequest(page: Page, payload: unknown): Promise<any> {
  await page.waitForFunction(() =>
    Boolean((window as any).__PROTO_BRIDGE_CAPTURE_V2__),
  );
  return page.evaluate(
    async (payload) =>
      (window as any).__PROTO_BRIDGE_CAPTURE_V2__.request({
        protocolVersion: 3,
        requestId: `yike-review-${crypto.randomUUID()}`,
        payload,
      }),
    payload,
  );
}
async function prepareCurrent(
  page: Page,
  screenId: string,
  variantId = "default",
) {
  const described = await runtimeRequest(page, { kind: "describe" });
  const manifest = described.payload.manifest;
  const theme = {
    packId: manifest.theme.packId,
    packDigest: manifest.theme.packDigest,
    theme: "mechanical",
    mode: "light",
  };
  const result = await runtimeRequest(page, {
    kind: "prepare",
    expected: { prototypeId: "yike", screenId, variantId, theme },
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return { manifest, theme };
}

test("C3: same-route prepare/reset clears business facts, month selection and transient panels", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-19T12:00:00+08:00"));
  await page.goto(
    "/prototype/yike/checkin?variant=default&theme=mechanical&mode=light",
  );
  await prepareCurrent(page, "yike.checkin");
  await page
    .getByRole("button", { name: "打卡：喝够 8 杯水", exact: true })
    .click();
  const savedBefore = await page.evaluate(() =>
    localStorage.getItem("pbwork.prototype.yike.data"),
  );
  for (let i = 0; i < 2; i++) {
    const reset = await runtimeRequest(page, { kind: "reset" });
    expect(reset.ok, JSON.stringify(reset)).toBe(true);
    await expect(
      page.getByRole("button", { name: "打卡：喝够 8 杯水", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("pbwork.prototype.yike.data"),
      ),
    ).toBe(savedBefore);
  }
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await prepareCurrent(page, "yike.review");
  await page.getByRole("radio", { name: "月", exact: true }).click();
  const reset = await runtimeRequest(page, { kind: "reset" });
  expect(reset.ok, JSON.stringify(reset)).toBe(true);
  await expect(
    page.getByRole("radio", { name: "周", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.goto(
    "/prototype/yike/habit-editor?variant=default&theme=mechanical&mode=light",
  );
  await prepareCurrent(page, "yike.habit-editor");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("复位应清除的草稿");
  expect((await runtimeRequest(page, { kind: "reset" })).ok).toBe(true);
  await expect(
    page.getByRole("textbox", { name: "习惯名称", exact: true }),
  ).toHaveValue("");
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=mechanical&mode=light",
  );
  await prepareCurrent(page, "yike.settings");
  await page.getByRole("button", { name: "重置所有数据", exact: true }).click();
  expect((await runtimeRequest(page, { kind: "reset" })).ok).toBe(true);
  await expect(
    page.getByRole("button", { name: "确认重置", exact: true }),
  ).not.toBeVisible();
});

test("C1/C3: habit create/cancel/edit/archive/restore/delete is one real cross-page journey", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/checkin?variant=default&theme=water&mode=light",
  );
  await page.getByRole("button", { name: "新建习惯", exact: true }).click();
  await expect(page).toHaveURL(/habit-editor/);
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("读一本书");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await page
    .getByRole("button", { name: "打卡：读一本书", exact: true })
    .click();
  await page.getByRole("button", { name: /读一本书 每天/ }).click();
  await expect(page).toHaveURL(/habit-detail/);
  await expect(
    page.getByRole("heading", { name: "读一本书", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-pb-id="yike.habit-detail.week"]'),
  ).toContainText("1");
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/habit-detail.png",
  });
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("取消的修改");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/habit-detail/);
  await expect(
    page.getByRole("heading", { name: "读一本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "习惯名称", exact: true }),
  ).toHaveValue("读一本书");
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("读两本书");
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/habit-editor.png",
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "归档习惯", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await expect(
    page.getByRole("button", { name: "取消打卡：读两本书", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "已归档习惯", exact: true }).click();
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "取消打卡：读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*1 次/,
  );
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  await page.getByRole("button", { name: /读两本书 每天/ }).click();
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "读两本书", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*0 次/,
  );
  await page.reload();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /打卡\s*0 次/,
  );
});

test("C2/C3: settings theme/configuration, timer continuity, cancel and reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await focus.getByRole("button", { name: "开始专注", exact: true }).click();
  await focus.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\?/);
  await page.getByRole("button", { name: "水位表盘", exact: true }).click();
  await page.getByRole("radio", { name: "深色", exact: true }).click();
  await expect(page).toHaveURL(/theme=water&mode=dark/);
  await page.getByRole("button", { name: /专注时长/ }).click();
  const minutes = page.getByRole("listbox", { name: "分钟", exact: true });
  await minutes.press("ArrowDown");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(
    page.locator(
      '[data-pb-id="yike.settings.configuration.row"][data-pb-key="pomodoro-pomodoroMinutes"]',
    ),
  ).toContainText("26 分钟");
  await page.clock.fastForward(65_000);
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/settings-dark.png",
  });
  await page.getByRole("button", { name: "专注", exact: true }).click();
  await expect(page).toHaveURL(/\/focus\?/);
  await expect(focus).toContainText(/23:[0-5]\d/);
  await focus.getByRole("button", { name: "暂停", exact: true }).click();
  await focus.getByRole("button", { name: "结束并记录", exact: true }).click();
  await focus.getByRole("button", { name: "开始专注", exact: true }).click();
  await expect(focus).toContainText("26:00");
  await focus.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "重置所有数据", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.locator(
      '[data-pb-id="yike.settings.configuration.row"][data-pb-key="pomodoro-pomodoroMinutes"]',
    ),
  ).toContainText("26 分钟");
  await page.getByRole("button", { name: "重置所有数据", exact: true }).click();
  await page.getByRole("button", { name: "确认重置", exact: true }).click();
  await expect(page).toHaveURL(/\/focus\?.*theme=mechanical/);
  await expect(
    focus.getByRole("button", { name: "开始专注", exact: true }),
  ).toBeVisible();
  await expect(focus).toContainText("25:00");
  await expect(focus).toContainText("第 1 轮");
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(page.locator('[data-pb-id="yike.review.root"]')).toContainText(
    /专注次数\s*0 次/,
  );
});

test("C3: countdown due retains its identity on tab return and reload; missing object deep links return", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=countdown-due&theme=mechanical&mode=light",
  );
  await page
    .getByRole("button", { name: "再计 1 分钟", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  await page.getByRole("tab", { name: "专注", exact: true }).click();
  await expect(page).toHaveURL(/variant=countdown-due/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "再计 1 分钟", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "倒计时", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.goto(
    "/prototype/yike/habit-detail?variant=missing&habit=missing-habit&theme=mechanical&mode=light",
  );
  await expect(
    page.getByText("这个习惯不存在或已删除。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回打卡", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
});

test("C3: every authored C fixture passes prepare/readiness/snapshot and repeat reset", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-10-19T12:00:00+08:00"));
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest, theme } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const variant of screen.variants) {
      const query = new URLSearchParams({
        variant: variant.variantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, variant.variantId);
      const expected = {
        prototypeId: "yike",
        screenId: screen.screenId,
        variantId: variant.variantId,
        theme,
        viewport: { width: 390, height: 844 },
      };
      const ready = await runtimeRequest(page, {
        kind: "readiness",
        expected,
        requiredFragments: variant.requiredFragments,
      });
      expect(
        ready.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(ready)}`,
      ).toBe(true);
      const snapshot = await runtimeRequest(page, {
        kind: "semantic-snapshot",
        fragments: variant.requiredFragments,
      });
      expect(
        snapshot.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(snapshot)}`,
      ).toBe(true);
      const reset = await runtimeRequest(page, { kind: "reset" });
      expect(
        reset.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(reset)}`,
      ).toBe(true);
    }
  }
});

test("C1-C3: authored interaction scenarios execute and verify their checkpoints", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const scenario of screen.scenarios) {
      const variant = screen.variants.find(
        (v: any) => v.variantId === scenario.initialVariantId,
      );
      const query = new URLSearchParams({
        variant: scenario.initialVariantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, scenario.initialVariantId);
      for (const actionId of scenario.actionIds) {
        const action = await runtimeRequest(page, {
          kind: "execute-action",
          scenarioId: scenario.scenarioId,
          actionId,
        });
        expect(
          action.ok,
          `${scenario.scenarioId}/${actionId}: ${JSON.stringify(action)}`,
        ).toBe(true);
      }
      for (const checkpoint of scenario.checkpoints) {
        const verified = await runtimeRequest(page, {
          kind: "verify-checkpoint",
          scenarioId: scenario.scenarioId,
          checkpointId: checkpoint.checkpointId,
        });
        expect(
          verified.ok,
          `${scenario.scenarioId}: ${JSON.stringify(verified)}`,
        ).toBe(true);
      }
    }
  }
});

async function settleVisual(page: Page) {
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll(".runtime-app [class]")).some(
        (element) =>
          Array.from(element.classList).some((name) =>
            /-(enter|leave)-active$/.test(name),
          ),
      ),
  );
}

test("C3: local selections survive stack return; recovery can be dismissed and reopened", async ({
  page,
}) => {
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const focus = page.locator('[data-pb-id="yike.focus.root"]');
  await focus.getByRole("tab", { name: "倒计时", exact: true }).click();
  await focus.getByRole("button", { name: "10分", exact: true }).click();
  await focus.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "专注", exact: true }).click();
  await expect(
    focus.getByRole("button", { name: "开始 10 分钟", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await page.getByRole("radio", { name: "月", exact: true }).click();
  await page.getByRole("tab", { name: "打卡", exact: true }).click();
  await page.getByRole("button", { name: /喝够 8 杯水 每天/ }).click();
  await page.getByRole("button", { name: "打卡", exact: true }).click();
  await page.getByRole("tab", { name: "回顾", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "月", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.goto(
    "/prototype/yike/focus?variant=recovery&theme=mechanical&mode=light",
  );
  const sheet = page.locator('[data-pb-id="yike.focus.recovery-sheet"]');
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await focus
    .getByRole("button", { name: "查看恢复选项", exact: true })
    .click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "继续计时", exact: true }).click();
  await expect(
    focus.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
});

test("C3: management default, dark, long form and confirmation visual risks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/habit-detail?variant=default&theme=mechanical&mode=light&habit=habit-water",
  );
  await expect(
    page.getByRole("heading", { name: "喝够 8 杯水", exact: true }),
  ).toBeVisible();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/detail-default.png",
  });
  await page.goto(
    "/prototype/yike/habit-detail?variant=default&theme=water&mode=dark&habit=habit-water",
  );
  await page.getByRole("button", { name: "删除习惯", exact: true }).click();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/detail-dark-delete.png",
  });
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "删除习惯", exact: true }),
  ).toBeFocused();
  await page.goto(
    "/prototype/yike/habit-editor?variant=default&theme=mechanical&mode=light",
  );
  await page.getByRole("textbox", { name: "习惯名称", exact: true }).waitFor();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/editor-default.png",
  });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(
    "/prototype/yike/habit-editor?variant=default&theme=sundial&mode=dark",
  );
  await page
    .getByRole("textbox", { name: "习惯名称", exact: true })
    .fill("睡前伸展");
  await page.getByRole("radio", { name: "每周", exact: true }).click();
  await page.getByRole("checkbox", { name: "提醒", exact: true }).check();
  await page
    .getByRole("button", { name: "保存", exact: true })
    .scrollIntoViewIfNeeded();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/editor-dark-long.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/checkin\?/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=mechanical&mode=light",
  );
  await page.getByRole("button", { name: "机械表盘", exact: true }).waitFor();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/settings-default.png",
  });
  await page.goto(
    "/prototype/yike/settings?variant=default&theme=sundial&mode=dark",
  );
  await page.getByRole("button", { name: /长休间隔/ }).click();
  await settleVisual(page);
  await page.screenshot({
    animations: "disabled",
    path: "../../output/yike-c/settings-dark-config.png",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("button", { name: /长休间隔/ })).toBeFocused();
});

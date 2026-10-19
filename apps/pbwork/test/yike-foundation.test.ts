import { describe, it, expect } from "vitest";
import { createYikeStore, isYikeState } from "@/prototypes/yike/model";
import { emptyHabitDraft } from "@/prototypes/yike/components/habit-form";
import { createYikeSession } from "@/prototypes/yike/session";
import { createYikeDemo } from "@/prototypes/yike/demo";
import { reviewSummary } from "@/prototypes/yike/statistics";

describe("一刻最小演示业务基础", () => {
  it("短记录确认、取消、阈值等号与本机重开保留实际秒数", () => {
    let at = new Date("2026-10-19T12:00:00+08:00").getTime();
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    const store = createYikeStore({ storage, now: () => new Date(at) });
    const session = createYikeSession(store, () => at);
    session.requestMode("stopwatch");
    session.toggle();
    at += 5_000;
    session.toggle();
    session.finish();
    expect(session.pendingRecord.value?.kind).toBe("finish");
    expect(store.data.focusRecords).toHaveLength(0);
    session.resolveRecord(false);
    expect(store.data.session?.status).toBe("paused");
    session.finish();
    session.resolveRecord(true);
    session.resolveRecord(true);
    expect(store.data.focusRecords).toHaveLength(1);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(5);
    const reopened = createYikeStore({ storage, now: () => new Date(at) });
    expect(reopened.storageIssue.value).toBeNull();
    expect(reopened.data.focusRecords[0]?.durationSeconds).toBe(5);
    expect(
      reviewSummary(reopened.data, store.today(), store.today()).seconds,
    ).toBe(5);
    session.toggle();
    at += 10_000;
    session.toggle();
    session.finish();
    expect(session.pendingRecord.value).toBeNull();
    expect(store.data.focusRecords.at(-1)?.durationSeconds).toBe(10);
  });
  it("高阈值的切模式与自然到点需确认，完整轮次不会重复累计", () => {
    let at = new Date("2026-10-19T12:00:00+08:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    store.updatePreferences({
      shortRecordThresholdSeconds: 180,
      pomodoroMinutes: 1,
    });
    const session = createYikeSession(store, () => at);
    session.requestMode("stopwatch");
    session.toggle();
    at += 65_000;
    session.requestMode("countdown");
    session.resolveMode("record");
    expect(session.pendingRecord.value?.kind).toBe("switch");
    at += 20_000;
    session.resolveRecord(true);
    expect(session.mode.value).toBe("countdown");
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(65);
    session.requestMode("pomodoro");
    session.toggle();
    at += 60_000;
    session.tick();
    expect(session.pendingRecord.value?.kind).toBe("complete");
    expect(store.data.completedRounds).toBe(1);
    session.resolveRecord(false);
    session.tick();
    expect(session.pendingRecord.value).toBeNull();
    session.finish();
    session.resolveRecord(true);
    expect(store.data.completedRounds).toBe(1);
    expect(store.data.focusRecords.at(-1)?.durationSeconds).toBe(60);
    expect(store.data.session?.phase).toBe("short-break");
  });
  it("习惯增改、打卡撤销、归档恢复、删除共享同一事实", () => {
    const store = createYikeStore({
      storage: null,
      now: () => new Date("2026-10-19T12:00:00"),
    });
    const draft = { ...emptyHabitDraft(), name: "  每天读书  " };
    const id = store.createHabit(draft)!;
    draft.name = "未提交修改";
    expect(store.data.habits.at(-1)?.name).toBe("每天读书");
    expect(store.createHabit({ ...draft, name: "   " })).toBeNull();
    store.toggleCheckin(id);
    expect(
      reviewSummary(store.data, "2026-10-19", "2026-10-19").checkinCount,
    ).toBe(1);
    store.updateHabit(id, {
      ...emptyHabitDraft(),
      name: "每周阅读",
      frequency: "weekly",
      target: 3,
    });
    expect(store.data.checkins).toHaveLength(1);
    store.archiveHabit(id);
    expect(store.toggleCheckin(id)).toBe(false);
    store.archiveHabit(id, false);
    expect(store.data.checkins).toHaveLength(1);
    store.toggleCheckin(id);
    expect(store.data.checkins).toHaveLength(0);
    expect(store.undoLastCheckin()).toBe(true);
    expect(store.data.checkins).toHaveLength(1);
    expect(store.undoLastCheckin()).toBe(false);
    store.deleteHabit(id);
    expect(store.data.checkins).toHaveLength(0);
    expect(store.undoLastCheckin()).toBe(false);
    expect(isYikeState(store.data)).toBe(true);
  });
  it("注入时钟复现计时暂停、模式切换取消/记录，回顾只计一条", () => {
    let at = new Date("2026-10-19T12:00:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("stopwatch");
    timer.toggle();
    at += 65_000;
    timer.lap();
    timer.toggle();
    expect(store.data.session?.accumulatedMs).toBe(65_000);
    at += 30_000;
    expect(timer.requestMode("countdown")).toBe(false);
    timer.resolveMode("cancel");
    expect(timer.mode.value).toBe("stopwatch");
    expect(store.data.session?.status).toBe("paused");
    timer.toggle();
    at += 5_000;
    timer.tick();
    timer.requestMode("countdown");
    timer.resolveMode("record");
    expect(timer.mode.value).toBe("countdown");
    expect(store.data.session).toBeNull();
    const summary = reviewSummary(store.data, "2026-10-19", "2026-10-19");
    expect(summary.seconds).toBe(70);
    expect(summary.focusCount).toBe(1);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(70);
  });
  it("到点追加合并、配置仅影响新阶段、休息不写专注记录", () => {
    let at = new Date("2026-10-19T12:00:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownMinutes.value = 1;
    timer.toggle();
    at += 60_000;
    timer.tick();
    expect(store.data.session?.status).toBe("due");
    timer.append();
    at += 60_000;
    timer.tick();
    timer.finish();
    expect(store.data.focusRecords).toHaveLength(1);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(120);
    timer.requestMode("pomodoro");
    store.updatePreferences({ pomodoroMinutes: 1 });
    timer.toggle();
    store.updatePreferences({ pomodoroMinutes: 2 });
    expect(store.data.session?.targetMs).toBe(60_000);
    at += 60_000;
    timer.tick();
    timer.tick();
    expect(store.data.completedRounds).toBe(1);
    timer.finish();
    expect(store.data.session?.phase).toBe("short-break");
    at += 5 * 60_000;
    timer.tick();
    timer.finish();
    expect(store.data.focusRecords).toHaveLength(2);
    expect(store.data.session).toBeNull();
    timer.toggle();
    expect(store.data.session?.targetMs).toBe(120_000);
  });
  it("确定性场景可重复复位且不覆盖本地已保存历史", () => {
    let saved: string | null = null;
    const store = createYikeStore({
      storage: {
        getItem: () => saved,
        setItem: (_key, v) => {
          saved = v;
        },
      },
    });
    store.toggleCheckin("habit-water");
    const persisted = saved;
    const now = new Date("2026-10-19T12:00:00");
    for (const variant of [
      "default",
      "running",
      "paused",
      "finished",
      "countdown-due",
      "short-break",
      "stopwatch-running",
    ]) {
      const fixture = createYikeDemo(variant, now);
      expect(isYikeState(fixture)).toBe(true);
      store.prepareDemo(fixture);
      store.toggleCheckin("habit-reading");
      store.prepareDemo(createYikeDemo(variant, now));
      expect(store.data.checkins).toEqual([]);
      expect(saved).toBe(persisted);
    }
  });
});

it("主题偏好与根Tab/栈页目的地复用公共导航", async () => {
  const { createMemoryHistory, createRouter } = await import("vue-router");
  const { yikeNavigation } = await import("@/prototypes/yike/navigation");
  const { readThemePackPreference } =
    await import("@/runtime/theme-pack-preference");
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/prototype/yike/:slug", component: { template: "<div />" } },
    ],
  });
  await router.push(
    "/prototype/yike/focus?theme=mechanical&mode=light&variant=default",
  );
  const store = createYikeStore({ storage: null });
  const nav = () => yikeNavigation(router, router.currentRoute.value, store);
  expect(nav().theme("water", "dark")).toBe(true);
  expect(readThemePackPreference("yike")).toEqual({
    theme: "water",
    mode: "dark",
  });
  await nav().tab("review");
  expect(router.currentRoute.value.query).toMatchObject({
    theme: "water",
    mode: "dark",
  });
  await nav().habit("habit-water");
  expect(router.currentRoute.value.path).toBe("/prototype/yike/habit-detail");
  expect(router.currentRoute.value.query.habit).toBe("habit-water");
  await nav().editor("habit-water");
  expect(router.currentRoute.value.path).toBe("/prototype/yike/habit-editor");
  await nav().settings();
  expect(router.currentRoute.value.path).toBe("/prototype/yike/settings");
  store.prepareDemo(createYikeDemo("paused", new Date()));
  await nav().tab("focus");
  expect(router.currentRoute.value.query.variant).toBe("paused");
  localStorage.clear();
});

it("跨日代表会话按日期入账且反复结束不重复；演示复位清除局部状态", () => {
  const now = new Date("2026-10-19T12:00:00");
  const store = createYikeStore({ storage: null, now: () => now });
  store.prepareDemo(createYikeDemo("cross-day", now));
  const timer = createYikeSession(store, () => now.getTime());
  timer.finish();
  timer.finish();
  expect(store.data.focusRecords).toHaveLength(1);
  expect(reviewSummary(store.data, "2026-10-18", "2026-10-18").seconds).toBe(
    180,
  );
  expect(reviewSummary(store.data, "2026-10-19", "2026-10-19").seconds).toBe(
    120,
  );
  expect(reviewSummary(store.data, "2026-10-18", "2026-10-19").focusCount).toBe(
    1,
  );
  store.presentation.review.range = "month";
  store.presentation.review.selected = "2026-10-19";
  store.presentation.scroll.checkin = 200;
  store.prepareDemo(createYikeDemo("default", now));
  expect(store.presentation.review.range).toBe("week");
  expect(store.presentation.review.selected).toBe("");
  expect(store.presentation.scroll).toEqual({});
});

it("所有计时代表态保持模式/阶段身份，重置恢复偏好、会话、轮次与首次习惯", async () => {
  const { focusVariant } = await import("@/prototypes/yike/session");
  const store = createYikeStore({ storage: null });
  for (const variant of [
    "running",
    "paused",
    "finished",
    "countdown-running",
    "countdown-paused",
    "countdown-due",
    "stopwatch-running",
    "stopwatch-paused",
    "short-break",
    "short-break-paused",
    "short-break-finished",
    "long-break",
    "long-break-paused",
    "long-break-finished",
  ]) {
    const fixture = createYikeDemo(variant, new Date("2026-10-19T12:00:00"));
    expect(isYikeState(fixture), variant).toBe(true);
    store.prepareDemo(fixture);
    expect(focusVariant(store), variant).toBe(variant);
  }
  store.updatePreferences({
    face: "sundial",
    mode: "dark",
    pomodoroMinutes: 40,
  });
  store.reset();
  expect(store.data.session).toBeNull();
  expect(store.data.completedRounds).toBe(0);
  expect(store.data.checkins).toEqual([]);
  expect(store.data.focusRecords).toEqual([]);
  expect(store.data.habits).toHaveLength(4);
  expect(store.data.preferences).toMatchObject({
    face: "mechanical",
    mode: "system",
    pomodoroMinutes: 25,
  });
});

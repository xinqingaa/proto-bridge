import { describe, expect, it } from "vitest";
import {
  createInitialYikeState,
  createYikeStore,
  isYikeState,
  YIKE_SCHEMA_VERSION,
  YIKE_STORAGE_KEY,
} from "@/prototypes/yike/model";
import {
  advanceTimer,
  repeatCountdown,
  createTimerSession,
  pauseTimer,
  startTimer,
  abandonTimer,
} from "@/prototypes/yike/timer-engine";
import { createYikeSession } from "@/prototypes/yike/session";
import { reviewSummary } from "@/prototypes/yike/statistics";

describe("本机状态", () => {
  function memoryStorage(initial?: string, failWrites = false) {
    let value = initial ?? null;
    return {
      storage: {
        getItem: () => value,
        setItem: (_key: string, next: string) => {
          if (failWrites) throw new Error("quota");
          value = next;
        },
      },
      read: () => value,
    };
  }
  describe("Yike 本机业务状态", () => {
    it("不兼容旧存档：缺少常用倒计时槽位即视为损坏", () => {
      const initial = createInitialYikeState("2026-10-18");
      const legacy = JSON.parse(JSON.stringify(initial));
      delete legacy.preferences.countdownPresets;
      const memory = memoryStorage(
        JSON.stringify({ schemaVersion: YIKE_SCHEMA_VERSION, value: legacy }),
      );
      const store = createYikeStore({ storage: memory.storage });
      expect(store.storageIssue.value).toBe("corrupt");
    });

    it("常用倒计时默认四项，可修改、可清空并保存", () => {
      const memory = memoryStorage();
      const store = createYikeStore({ storage: memory.storage });
      expect(store.data.preferences.countdownPresets).toEqual([
        180, 300, 600, 1200,
      ]);
      expect(
        store.updatePreferences({ countdownPresets: [45, 300, null, 1200] }),
      ).toBe(true);
      expect(
        createYikeStore({ storage: memory.storage }).data.preferences
          .countdownPresets,
      ).toEqual([45, 300, null, 1200]);
      // 重复、越界、数量不对都不接受
      expect(
        store.updatePreferences({ countdownPresets: [45, 45, null, null] }),
      ).toBe(false);
      expect(
        store.updatePreferences({ countdownPresets: [0, 300, null, null] }),
      ).toBe(false);
      expect(
        store.updatePreferences({ countdownPresets: [45, 300, null] }),
      ).toBe(false);
      // 重置回默认
      store.updatePreferences({ countdownPresets: [null, null, null, null] });
      store.reset();
      expect(store.data.preferences.countdownPresets).toEqual([
        180, 300, 600, 1200,
      ]);
    });

    it("首次初始化创建四个习惯与零历史", () => {
      const initial = createInitialYikeState("2026-10-18");
      expect(
        initial.habits.map(({ name, frequency, target }) => [
          name,
          frequency,
          target,
        ]),
      ).toEqual([
        ["喝够 8 杯水", "daily", 1],
        ["读 20 页书", "daily", 1],
        ["跑步", "weekly", 3],
        ["23 点前睡", "daily", 1],
      ]);
      expect(initial.checkins).toEqual([]);
      expect(initial.focusRecords).toEqual([]);
      expect(initial.preferences).toMatchObject({
        face: "mechanical",
        mode: "system",
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakEvery: 4,
        sound: true,
      });
      expect(isYikeState(initial)).toBe(true);
    });

    it("打卡以习惯和本地日期唯一，重复点击撤销且不再自动补种", () => {
      const memory = memoryStorage();
      const store = createYikeStore({
        storage: memory.storage,
        now: () => new Date("2026-10-18T12:00:00"),
      });
      expect(store.data.habits).toHaveLength(4);
      expect(store.toggleCheckin("habit-water")).toBe(true);
      expect(store.data.checkins).toHaveLength(1);
      expect(JSON.parse(memory.read()!).schemaVersion).toBe(
        YIKE_SCHEMA_VERSION,
      );
      expect(store.toggleCheckin("habit-water")).toBe(true);
      expect(store.data.checkins).toEqual([]);
      store.data.habits.splice(0);
      store.retrySave();
      const reopened = createYikeStore({
        storage: memory.storage,
        now: () => new Date("2026-10-18T12:00:00"),
      });
      expect(reopened.data.habits).toEqual([]);
      expect(reopened.toggleCheckin("missing")).toBe(false);
    });

    it("损坏数据不覆盖存储，明确重置后才恢复首次状态", () => {
      const memory = memoryStorage("{bad json");
      const store = createYikeStore({
        storage: memory.storage,
        now: () => new Date("2026-10-18T12:00:00"),
      });
      expect(store.storageIssue.value).toBe("corrupt");
      store.toggleCheckin("habit-water");
      expect(memory.read()).toBe("{bad json");
      store.reset();
      expect(store.data.habits).toHaveLength(4);
      expect(store.storageIssue.value).toBeNull();
      expect(JSON.parse(memory.read()!).schemaVersion).toBe(
        YIKE_SCHEMA_VERSION,
      );
    });

    it("保存失败仍保留当前操作并提供重试状态", () => {
      const memory = memoryStorage(undefined, true);
      const store = createYikeStore({
        storage: memory.storage,
        now: () => new Date("2026-10-18T12:00:00"),
      });
      store.toggleCheckin("habit-water");
      expect(store.data.checkins).toHaveLength(1);
      expect(store.storageIssue.value).toBe("save-failed");
      expect(store.retrySave()).toBe(false);
      expect(store.storageIssue.value).toBe("save-failed");
      expect(YIKE_STORAGE_KEY).toContain("yike");
    });

    it("再计倒计时取消不影响上一条记录，并按保存点暂停恢复", () => {
      const memory = memoryStorage();
      const store = createYikeStore({
        storage: memory.storage,
        now: () => new Date("2026-10-18T12:00:00"),
      });
      const now = new Date("2026-10-18T12:00:00").getTime();
      const due = advanceTimer(
        startTimer(
          createTimerSession({
            id: "countdown-1",
            mode: "countdown",
            targetMs: 60_000,
            now,
          }),
          now,
        ),
        now + 60_000,
      );
      store.setSession(due);
      store.setSession(due);
      expect(store.data.focusRecords).toHaveLength(1);
      const repeated = repeatCountdown(due, now + 70_000, "countdown-2");
      const paused = pauseTimer(repeated, now + 100_000);
      store.setSession(abandonTimer(paused, now + 110_000));
      expect(store.data.focusRecords).toHaveLength(1);
      expect(store.data.focusRecords[0]?.durationSeconds).toBe(60);
      store.setSession(repeated);
      const reopened = createYikeStore({ storage: memory.storage });
      expect(reopened.data.session?.status).toBe("paused");
      expect(reopened.data.session?.accumulatedMs).toBe(0);
      expect(reopened.recoveryNeeded.value).toBe(true);
      const reopenedAgain = createYikeStore({ storage: memory.storage });
      expect(reopenedAgain.recoveryNeeded.value).toBe(false);
      expect(reopenedAgain.data.session?.accumulatedMs).toBe(0);
    });

    it("完整番茄只累计一次，休息不写记录，长休结束回第一轮", () => {
      const memory = memoryStorage();
      const now = new Date("2026-10-18T12:00:00").getTime();
      const store = createYikeStore({
        storage: memory.storage,
        now: () => new Date(now),
      });
      store.data.completedRounds = 3;
      const finished = advanceTimer(
        startTimer(
          createTimerSession({
            id: "round4",
            mode: "pomodoro",
            now,
            targetMs: 60_000,
            breakAfter: "long-break",
          }),
          now,
        ),
        now + 60_000,
      );
      store.setSession(finished);
      store.setSession(finished);
      expect(store.data.completedRounds).toBe(4);
      store.data.preferences.longBreakEvery = 8;
      expect(store.startBreak()).toBe(true);
      expect(store.data.session?.phase).toBe("long-break");
      expect(store.data.session?.targetMs).toBe(15 * 60_000);
      const rest = advanceTimer(store.data.session!, now + 15 * 60_000);
      store.setSession(rest);
      expect(store.data.focusRecords).toHaveLength(1);
      expect(store.data.session?.status).toBe("finished");
      expect(store.leaveBreak()).toBe(true);
      expect(store.data.completedRounds).toBe(0);
      expect(store.data.session).toBeNull();
    });
  });
});

describe("会话与秒级记录", () => {
  it.each([1, 90, 300, 5400, 86399])(
    "repeats %i seconds independently even if the selected preset changes",
    (seconds) => {
      let at = new Date("2026-10-20T12:00:00+08:00").getTime();
      const store = createYikeStore({ storage: null, now: () => new Date(at) });
      const timer = createYikeSession(store, () => at);
      timer.requestMode("countdown");
      timer.countdownSeconds.value = seconds;
      timer.toggle();
      at += seconds * 1000;
      timer.tick();
      const original = structuredClone(
        JSON.parse(JSON.stringify(store.data.focusRecords[0])),
      );
      const originalId = store.data.session!.id;
      timer.countdownSeconds.value = 5;
      at += 12_000; // Waiting at the result never counts toward the new round.
      timer.repeat();
      const repeatedId = store.data.session!.id;
      expect(repeatedId).not.toBe(originalId);
      expect(store.data.session).toMatchObject({
        status: "running",
        targetMs: seconds * 1000,
        accumulatedMs: 0,
        intervals: [],
        recordedSeconds: 0,
        sessionStartedAt: at,
      });
      expect(timer.countdownSeconds.value).toBe(seconds);
      timer.repeat();
      expect(store.data.session!.id).toBe(repeatedId);
      expect(store.data.focusRecords).toEqual([original]);
      at += seconds * 1000;
      timer.tick();
      timer.tick();
      expect(
        store.data.focusRecords.map((record) => record.durationSeconds),
      ).toEqual([seconds, seconds]);
      expect(store.data.focusRecords[0]).toEqual(original);
      timer.repeat();
      timer.abandon();
      expect(
        store.data.focusRecords.map((record) => record.durationSeconds),
      ).toEqual([seconds, seconds]);
      expect(timer.pendingRecord.value).toBeNull();
    },
  );
  it("still asks before an early short finish; cancelling preserves the paused session", () => {
    let at = new Date("2026-10-20T12:00:00+08:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownSeconds.value = 30;
    timer.toggle();
    at += 2000;
    timer.finish();
    expect(timer.pendingRecord.value?.kind).toBe("finish");
    expect(store.data.focusRecords).toHaveLength(0);
    timer.resolveRecord(false);
    expect(store.data.session?.status).toBe("paused");
    expect(store.data.session?.accumulatedMs).toBe(2000);
    timer.finish();
    timer.resolveRecord(true);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(2);
  });
  it("records one second correctly across midnight without rounding either day's share", () => {
    let at = new Date(2026, 9, 20, 23, 59, 59, 500).getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownSeconds.value = 1;
    timer.toggle();
    at += 1000;
    timer.tick();
    expect(timer.pendingRecord.value).toBeNull();
    expect(store.data.focusRecords[0]?.intervals).toEqual([
      { date: "2026-10-20", durationSeconds: 0.5 },
      { date: "2026-10-21", durationSeconds: 0.5 },
    ]);
    expect(reviewSummary(store.data, "2026-10-20", "2026-10-21").seconds).toBe(
      1,
    );
  });
});

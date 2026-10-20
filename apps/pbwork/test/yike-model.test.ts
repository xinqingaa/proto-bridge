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
    expect(store.updatePreferences({ countdownPresets: [45, 300, null] })).toBe(
      false,
    );
    // 重置回默认
    store.updatePreferences({ countdownPresets: [null, null, null, null] });
    store.reset();
    expect(store.data.preferences.countdownPresets).toEqual([
      180, 300, 600, 1200,
    ]);
  });

  it("只在首次初始化创建批准的四个习惯与零历史默认值", () => {
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
    expect(JSON.parse(memory.read()!).schemaVersion).toBe(YIKE_SCHEMA_VERSION);
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
    expect(JSON.parse(memory.read()!).schemaVersion).toBe(YIKE_SCHEMA_VERSION);
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

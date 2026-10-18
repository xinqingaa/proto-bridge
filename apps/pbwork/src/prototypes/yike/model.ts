import { reactive, ref } from "vue";
import type { YikeTimerSession } from "./timer-engine";
import { createTimerSession, restoreTimerAfterReload, shouldPersistFocusRecord, startTimer } from "./timer-engine";
import { parseDay } from "@/design-system/components/_shared/calendar";

export type YikeFace = "mechanical" | "water" | "sundial";
export type YikeHabit = {
  id: string;
  name: string;
  icon: "leaf" | "book" | "water" | "run" | "moon" | "stretch";
  frequency: "daily" | "weekly";
  target: number;
  reminder: boolean;
  reminderTime: string;
  createdOn: string;
  archivedOn?: string;
};
export type YikeCheckin = { id: string; habitId: string; date: string; createdAt: string };
export type YikeFocusRecord = {
  id: string;
  mode: "pomodoro" | "stopwatch" | "countdown";
  startedAt: string;
  durationSeconds: number;
  intervals: Array<{ date: string; durationSeconds: number }>;
};
export type YikeState = {
  initializedOn: string;
  habits: YikeHabit[];
  checkins: YikeCheckin[];
  focusRecords: YikeFocusRecord[];
  completedRounds: number;
  session: YikeTimerSession | null;
  preferences: {
    face: YikeFace;
    mode: "system" | "light" | "dark";
    pomodoroMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakEvery: number;
    sound: boolean;
  };
};

export const YIKE_STORAGE_KEY = "pbwork.prototype.yike.data";
export const YIKE_SCHEMA_VERSION = 2;
const defaultHabits = (today: string): YikeHabit[] => [
  { id: "habit-water", name: "喝够 8 杯水", icon: "water", frequency: "daily", target: 1, reminder: false, reminderTime: "21:00", createdOn: today },
  { id: "habit-reading", name: "读 20 页书", icon: "book", frequency: "daily", target: 1, reminder: false, reminderTime: "21:00", createdOn: today },
  { id: "habit-running", name: "跑步", icon: "run", frequency: "weekly", target: 3, reminder: false, reminderTime: "21:00", createdOn: today },
  { id: "habit-sleep", name: "23 点前睡", icon: "moon", frequency: "daily", target: 1, reminder: false, reminderTime: "21:00", createdOn: today },
];

export function createInitialYikeState(today: string): YikeState {
  return {
    initializedOn: today,
    habits: defaultHabits(today),
    checkins: [],
    focusRecords: [],
    completedRounds: 0,
    session: null,
    preferences: {
      face: "mechanical",
      mode: "system",
      pomodoroMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      sound: true,
    },
  };
}

export function isYikeState(value: unknown): value is YikeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<YikeState>;
  const p = state.preferences;
  const day = (input: unknown) => typeof input === "string" && Boolean(parseDay(input));
  const numberIn = (input: unknown, min: number, max: number) => typeof input === "number" && Number.isInteger(input) && input >= min && input <= max;
  return day(state.initializedOn) && Array.isArray(state.habits) && state.habits.every((habit) =>
    Boolean(habit && typeof habit.id === "string" && typeof habit.name === "string" &&
      ["leaf", "book", "water", "run", "moon", "stretch"].includes(habit.icon) &&
      ["daily", "weekly"].includes(habit.frequency) && numberIn(habit.target, 1, 7) &&
      typeof habit.reminder === "boolean" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(habit.reminderTime) &&
      day(habit.createdOn) && (habit.archivedOn === undefined || day(habit.archivedOn)))) &&
    new Set(state.habits.map(habit => habit.id)).size === state.habits.length &&
    Array.isArray(state.checkins) && state.checkins.every((item) =>
      Boolean(item && typeof item.id === "string" && state.habits!.some(habit => habit.id === item.habitId) && day(item.date) && Number.isFinite(Date.parse(item.createdAt)))) &&
    new Set(state.checkins.map(item => `${item.habitId}:${item.date}`)).size === state.checkins.length &&
    Array.isArray(state.focusRecords) && state.focusRecords.every(record => record && typeof record.id === "string" &&
      ["pomodoro", "stopwatch", "countdown"].includes(record.mode) && Number.isFinite(Date.parse(record.startedAt)) &&
      Number.isFinite(record.durationSeconds) && record.durationSeconds >= 60 && Array.isArray(record.intervals) &&
      record.intervals.every(interval => day(interval.date) && Number.isFinite(interval.durationSeconds) && interval.durationSeconds > 0)) &&
    new Set(state.focusRecords.map(record => record.id)).size === state.focusRecords.length && Number.isInteger(state.completedRounds) && state.completedRounds! >= 0 &&
    (state.session === null || Boolean(state.session && typeof state.session.id === "string" &&
      ["pomodoro", "stopwatch", "countdown"].includes(state.session.mode) &&
      ["idle", "running", "paused", "finished", "due", "abandoned"].includes(state.session.status) &&
      Number.isFinite(state.session.sessionStartedAt) && Number.isFinite(state.session.accumulatedMs) &&
      Number.isFinite(state.session.targetMs) && Array.isArray(state.session.intervals) &&
      (state.session.phase === undefined || ["focus", "short-break", "long-break"].includes(state.session.phase)) &&
      (state.session.breakAfter === undefined || ["short-break", "long-break"].includes(state.session.breakAfter)) &&
      (state.session.laps === undefined || (Array.isArray(state.session.laps) && state.session.laps.every((lap, index, laps) => Number.isFinite(lap) && lap > (laps[index - 1] ?? 0) && lap <= state.session!.accumulatedMs))) &&
      state.session.intervals.every(interval => day(interval.date) && Number.isFinite(interval.durationMs) && interval.durationMs > 0))) && Boolean(p &&
      ["mechanical", "water", "sundial"].includes(p.face) &&
      ["system", "light", "dark"].includes(p.mode) && numberIn(p.pomodoroMinutes, 1, 180) &&
      numberIn(p.shortBreakMinutes, 1, 60) && numberIn(p.longBreakMinutes, 1, 60) &&
      numberIn(p.longBreakEvery, 2, 8) && typeof p.sound === "boolean");
}

export type YikeStorage = Pick<Storage, "getItem" | "setItem">;
export type YikeStore = ReturnType<typeof createYikeStore>;

function browserStorage(): YikeStorage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createYikeStore(options: {
  storage?: YikeStorage | null;
  now?: () => Date;
} = {}) {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const now = options.now ?? (() => new Date());
  const today = () => localDay(now());
  let state = createInitialYikeState(today());
  const storageIssue = ref<"corrupt" | "unavailable" | "save-failed" | null>(storage ? null : "unavailable");
  let fresh = false;
  if (storage) {
    try {
      const saved = storage.getItem(YIKE_STORAGE_KEY);
      fresh = saved === null;
      if (saved !== null) {
        const envelope = JSON.parse(saved) as { schemaVersion?: number; value?: unknown };
        if (envelope.schemaVersion === 1 && envelope.value && typeof envelope.value === "object") {
          const legacy = envelope.value as Partial<YikeState>;
          legacy.initializedOn ??= Array.isArray(legacy.habits) ? legacy.habits.map(habit => habit.createdOn).filter(date => Boolean(parseDay(date))).sort()[0] ?? today() : today();
          envelope.schemaVersion = YIKE_SCHEMA_VERSION;
        }
        if (envelope.schemaVersion !== YIKE_SCHEMA_VERSION || !isYikeState(envelope.value)) storageIssue.value = "corrupt";
        else state = envelope.value;
      }
    } catch { storageIssue.value = "corrupt"; }
  }
  const recoveryNeeded = ref(state.session?.status === "running");
  if (state.session?.status === "running") state.session = restoreTimerAfterReload(state.session);
  const data = reactive(state) as YikeState;
  function save() {
    if (!storage || storageIssue.value === "corrupt") return false;
    try {
      storage.setItem(YIKE_STORAGE_KEY, JSON.stringify({ schemaVersion: YIKE_SCHEMA_VERSION, value: data }));
      storageIssue.value = null;
      return true;
    } catch {
      storageIssue.value = "save-failed";
      return false;
    }
  }
  if ((fresh || recoveryNeeded.value) && !storageIssue.value) save();
  return {
    data,
    today,
    storageIssue,
    recoveryNeeded,
    retrySave: save,
    startBreak() {
      const current = data.session;
      if (!current || current.mode !== "pomodoro" || current.phase !== "focus" || current.status !== "finished" || current.accumulatedMs < current.targetMs) return false;
      const phase = current.breakAfter ?? "short-break";
      const minutes = phase === "long-break" ? data.preferences.longBreakMinutes : data.preferences.shortBreakMinutes;
      const timestamp = now().getTime();
      data.session = startTimer(createTimerSession({ id: crypto.randomUUID(), mode: "pomodoro", now: timestamp, targetMs: minutes * 60_000, phase }), timestamp);
      save();
      return true;
    },
    leaveBreak() {
      const current = data.session;
      if (!current || current.mode !== "pomodoro") return false;
      if ((current.phase ?? "focus") === "focus" && (current.status !== "finished" || current.accumulatedMs < current.targetMs)) return false;
      const longBreak = current.phase === "long-break" || (current.phase === "focus" && current.status === "finished" && current.breakAfter === "long-break");
      if (longBreak) data.completedRounds = 0;
      data.session = null;
      recoveryNeeded.value = false;
      save();
      return true;
    },
    toggleCheckin(habitId: string) {
      if (!data.habits.some((habit) => habit.id === habitId && !habit.archivedOn)) return false;
      const date = today();
      const index = data.checkins.findIndex((item) => item.habitId === habitId && item.date === date);
      if (index >= 0) data.checkins.splice(index, 1);
      else data.checkins.push({ id: `${habitId}:${date}`, habitId, date, createdAt: now().toISOString() });
      save();
      return true;
    },
    setSession(session: YikeTimerSession | null) {
      data.session = session;
      if (!session || session.status !== "paused") recoveryNeeded.value = false;
      const priorRecord = session ? data.focusRecords.find((item) => item.id === session.id) : undefined;
      if (session && !priorRecord && session.mode === "pomodoro" && (session.phase ?? "focus") === "focus" && session.status === "finished" && session.accumulatedMs >= session.targetMs) data.completedRounds += 1;
      if (session && (shouldPersistFocusRecord(session) || (priorRecord && session.status === "abandoned"))) {
        const record = data.focusRecords.find((item) => item.id === session.id);
        const startedAt = new Date(session.sessionStartedAt).toISOString();
        const intervals = session.intervals.map((interval) => ({ date: interval.date, durationSeconds: interval.durationMs / 1000 }));
        if (record) {
          record.durationSeconds = Math.floor(session.accumulatedMs / 1000);
          record.intervals = intervals;
        } else {
          const durationSeconds = Math.floor(session.accumulatedMs / 1000);
          data.focusRecords.push({
            id: session.id,
            mode: session.mode,
            startedAt,
            durationSeconds,
            intervals,
          });
        }
      }
      save();
    },
    reset() {
      Object.assign(data, createInitialYikeState(today()));
      storageIssue.value = null;
      recoveryNeeded.value = false;
      save();
    },
  };
}

let sharedStore: YikeStore | undefined;
export function useYikeStore() {
  sharedStore ??= createYikeStore();
  return sharedStore;
}

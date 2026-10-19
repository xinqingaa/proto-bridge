import {
  reactive,
  ref,
  inject,
  hasInjectionContext,
  type InjectionKey,
} from "vue";
import {
  habitNameError,
  reminderTimeError,
  type YikeHabitDraft,
} from "./components/habit-form";
import type { YikeTimerSession } from "./timer-engine";
import {
  createTimerSession,
  restoreTimerAfterReload,
  shouldPersistFocusRecord,
  startTimer,
} from "./timer-engine";
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
export type YikeCheckin = {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
};
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
    shortRecordThresholdSeconds: number;
  };
};

export const YIKE_STORAGE_KEY = "pbwork.prototype.yike.data";
export const YIKE_SCHEMA_VERSION = 2;
const defaultHabits = (today: string): YikeHabit[] => [
  {
    id: "habit-water",
    name: "喝够 8 杯水",
    icon: "water",
    frequency: "daily",
    target: 1,
    reminder: false,
    reminderTime: "21:00",
    createdOn: today,
  },
  {
    id: "habit-reading",
    name: "读 20 页书",
    icon: "book",
    frequency: "daily",
    target: 1,
    reminder: false,
    reminderTime: "21:00",
    createdOn: today,
  },
  {
    id: "habit-running",
    name: "跑步",
    icon: "run",
    frequency: "weekly",
    target: 3,
    reminder: false,
    reminderTime: "21:00",
    createdOn: today,
  },
  {
    id: "habit-sleep",
    name: "23 点前睡",
    icon: "moon",
    frequency: "daily",
    target: 1,
    reminder: false,
    reminderTime: "21:00",
    createdOn: today,
  },
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
      shortRecordThresholdSeconds: 10,
    },
  };
}

export function isYikeState(value: unknown): value is YikeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<YikeState>;
  const p = state.preferences;
  const day = (input: unknown) =>
    typeof input === "string" && Boolean(parseDay(input));
  const numberIn = (input: unknown, min: number, max: number) =>
    typeof input === "number" &&
    Number.isInteger(input) &&
    input >= min &&
    input <= max;
  return (
    day(state.initializedOn) &&
    Array.isArray(state.habits) &&
    state.habits.every((habit) =>
      Boolean(
        habit &&
        typeof habit.id === "string" &&
        typeof habit.name === "string" &&
        ["leaf", "book", "water", "run", "moon", "stretch"].includes(
          habit.icon,
        ) &&
        ["daily", "weekly"].includes(habit.frequency) &&
        numberIn(habit.target, 1, 7) &&
        typeof habit.reminder === "boolean" &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(habit.reminderTime) &&
        day(habit.createdOn) &&
        (habit.archivedOn === undefined || day(habit.archivedOn)),
      ),
    ) &&
    new Set(state.habits.map((habit) => habit.id)).size ===
      state.habits.length &&
    Array.isArray(state.checkins) &&
    state.checkins.every((item) =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        state.habits!.some((habit) => habit.id === item.habitId) &&
        day(item.date) &&
        Number.isFinite(Date.parse(item.createdAt)),
      ),
    ) &&
    new Set(state.checkins.map((item) => `${item.habitId}:${item.date}`))
      .size === state.checkins.length &&
    Array.isArray(state.focusRecords) &&
    state.focusRecords.every(
      (record) =>
        record &&
        typeof record.id === "string" &&
        ["pomodoro", "stopwatch", "countdown"].includes(record.mode) &&
        Number.isFinite(Date.parse(record.startedAt)) &&
        Number.isFinite(record.durationSeconds) &&
        record.durationSeconds > 0 &&
        Array.isArray(record.intervals) &&
        record.intervals.every(
          (interval) =>
            day(interval.date) &&
            Number.isFinite(interval.durationSeconds) &&
            interval.durationSeconds > 0,
        ),
    ) &&
    new Set(state.focusRecords.map((record) => record.id)).size ===
      state.focusRecords.length &&
    Number.isInteger(state.completedRounds) &&
    state.completedRounds! >= 0 &&
    (state.session === null ||
      Boolean(
        state.session &&
        typeof state.session.id === "string" &&
        ["pomodoro", "stopwatch", "countdown"].includes(state.session.mode) &&
        ["idle", "running", "paused", "finished", "due", "abandoned"].includes(
          state.session.status,
        ) &&
        Number.isFinite(state.session.sessionStartedAt) &&
        Number.isFinite(state.session.accumulatedMs) &&
        (state.session.recordDecision === undefined ||
          typeof state.session.recordDecision === "boolean") &&
        Number.isFinite(state.session.targetMs) &&
        Array.isArray(state.session.intervals) &&
        (state.session.phase === undefined ||
          ["focus", "short-break", "long-break"].includes(
            state.session.phase,
          )) &&
        (state.session.breakAfter === undefined ||
          ["short-break", "long-break"].includes(state.session.breakAfter)) &&
        (state.session.laps === undefined ||
          (Array.isArray(state.session.laps) &&
            state.session.laps.every(
              (lap, index, laps) =>
                Number.isFinite(lap) &&
                lap > (laps[index - 1] ?? 0) &&
                lap <= state.session!.accumulatedMs,
            ))) &&
        state.session.intervals.every(
          (interval) =>
            day(interval.date) &&
            Number.isFinite(interval.durationMs) &&
            interval.durationMs > 0,
        ),
      )) &&
    Boolean(
      p &&
      ["mechanical", "water", "sundial"].includes(p.face) &&
      ["system", "light", "dark"].includes(p.mode) &&
      numberIn(p.pomodoroMinutes, 1, 180) &&
      numberIn(p.shortBreakMinutes, 1, 60) &&
      numberIn(p.longBreakMinutes, 1, 60) &&
      numberIn(p.longBreakEvery, 2, 8) &&
      typeof p.sound === "boolean" &&
      numberIn(p.shortRecordThresholdSeconds, 1, 86399),
    )
  );
}

export type YikeStorage = Pick<Storage, "getItem" | "setItem">;
export type YikeStore = ReturnType<typeof createYikeStore>;

function browserStorage(): YikeStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createYikeStore(
  options: {
    storage?: YikeStorage | null;
    now?: () => Date;
  } = {},
) {
  const storage =
    options.storage === undefined ? browserStorage() : options.storage;
  const now = options.now ?? (() => new Date());
  const today = () => localDay(now());
  let state = createInitialYikeState(today());
  const storageIssue = ref<"corrupt" | "unavailable" | "save-failed" | null>(
    storage ? null : "unavailable",
  );
  let fresh = false;
  if (storage) {
    try {
      const saved = storage.getItem(YIKE_STORAGE_KEY);
      fresh = saved === null;
      if (saved !== null) {
        const envelope = JSON.parse(saved) as {
          schemaVersion?: number;
          value?: unknown;
        };
        if (
          envelope.schemaVersion === 1 &&
          envelope.value &&
          typeof envelope.value === "object"
        ) {
          const legacy = envelope.value as Partial<YikeState>;
          legacy.initializedOn ??= Array.isArray(legacy.habits)
            ? (legacy.habits
                .map((habit) => habit.createdOn)
                .filter((date) => Boolean(parseDay(date)))
                .sort()[0] ?? today())
            : today();
          envelope.schemaVersion = YIKE_SCHEMA_VERSION;
        }
        const savedPreferences = (envelope.value as Partial<YikeState> | null)
          ?.preferences;
        if (
          savedPreferences &&
          savedPreferences.shortRecordThresholdSeconds === undefined
        )
          savedPreferences.shortRecordThresholdSeconds = 10;
        if (
          envelope.schemaVersion !== YIKE_SCHEMA_VERSION ||
          !isYikeState(envelope.value)
        )
          storageIssue.value = "corrupt";
        else state = envelope.value;
      }
    } catch {
      storageIssue.value = "corrupt";
    }
  }
  const recoveryNeeded = ref(state.session?.status === "running");
  const recoveryAvailable = ref(recoveryNeeded.value);
  if (state.session?.status === "running")
    state.session = restoreTimerAfterReload(state.session);
  const data = reactive(state) as YikeState;
  // Presentation is shared across stack navigation, never persisted as business data.
  const presentation = reactive({
    revision: 0,
    preparing: false,
    review: {
      range: "week" as "week" | "month",
      anchor: today(),
      selected: "",
    },
    scroll: {} as Record<string, number>,
    message: "",
  });
  function resetPresentation() {
    presentation.revision++;
    Object.assign(presentation.review, {
      range: "week",
      anchor: today(),
      selected: "",
    });
    presentation.scroll = {};
    presentation.message = "";
  }
  const undoCheckin = ref<{
    habitId: string;
    date: string;
    previous?: YikeCheckin;
  } | null>(null);
  function validDraft(draft: YikeHabitDraft) {
    return (
      !habitNameError(draft.name) &&
      !reminderTimeError({ ...draft, reminder: true }) &&
      ["leaf", "book", "water", "run", "moon", "stretch"].includes(
        draft.icon,
      ) &&
      ["daily", "weekly"].includes(draft.frequency) &&
      Number.isInteger(draft.target) &&
      draft.target >= 1 &&
      draft.target <= 7
    );
  }
  let demo = false;
  function save() {
    if (demo) return true;
    if (!storage || storageIssue.value === "corrupt") return false;
    try {
      storage.setItem(
        YIKE_STORAGE_KEY,
        JSON.stringify({ schemaVersion: YIKE_SCHEMA_VERSION, value: data }),
      );
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
    presentation,
    today,
    storageIssue,
    recoveryNeeded,
    recoveryAvailable,
    undoCheckin,
    createHabit(draft: YikeHabitDraft) {
      if (!validDraft(draft)) return null;
      const habit: YikeHabit = {
        ...draft,
        name: draft.name.trim(),
        target: draft.frequency === "daily" ? 1 : draft.target,
        id: crypto.randomUUID(),
        createdOn: today(),
      };
      data.habits.push(habit);
      save();
      return habit.id;
    },
    updateHabit(id: string, draft: YikeHabitDraft) {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit || !validDraft(draft)) return false;
      Object.assign(habit, {
        ...draft,
        name: draft.name.trim(),
        target: draft.frequency === "daily" ? 1 : draft.target,
      });
      save();
      return true;
    },
    archiveHabit(id: string, archived = true) {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) return false;
      if (archived) habit.archivedOn = today();
      else delete habit.archivedOn;
      if (undoCheckin.value?.habitId === id) undoCheckin.value = null;
      save();
      return true;
    },
    deleteHabit(id: string) {
      const index = data.habits.findIndex((item) => item.id === id);
      if (index < 0) return false;
      data.habits.splice(index, 1);
      data.checkins = data.checkins.filter((item) => item.habitId !== id);
      if (undoCheckin.value?.habitId === id) undoCheckin.value = null;
      save();
      return true;
    },
    undoLastCheckin() {
      const change = undoCheckin.value;
      undoCheckin.value = null;
      if (
        !change ||
        change.date !== today() ||
        !data.habits.some(
          (habit) => habit.id === change.habitId && !habit.archivedOn,
        )
      )
        return false;
      data.checkins = data.checkins.filter(
        (item) => item.habitId !== change.habitId || item.date !== change.date,
      );
      if (change.previous) data.checkins.push({ ...change.previous });
      save();
      return true;
    },
    updatePreferences(patch: Partial<YikeState["preferences"]>) {
      const preferences = { ...data.preferences, ...patch };
      if (!isYikeState({ ...data, preferences })) return false;
      Object.assign(data.preferences, preferences);
      save();
      return true;
    },
    /** Deterministic, memory-only scenario setup; never overwrites saved user data. */
    prepareDemo(value: YikeState) {
      if (!isYikeState(value)) throw new Error("INVALID_YIKE_DEMO");
      demo = true;
      Object.assign(data, structuredClone(value));
      undoCheckin.value = null;
      recoveryNeeded.value = false;
      recoveryAvailable.value = false;
      storageIssue.value = null;
      resetPresentation();
    },
    retrySave: save,
    startBreak() {
      const current = data.session;
      if (
        !current ||
        current.mode !== "pomodoro" ||
        current.phase !== "focus" ||
        current.status !== "finished" ||
        current.accumulatedMs < current.targetMs
      )
        return false;
      const phase = current.breakAfter ?? "short-break";
      const minutes =
        phase === "long-break"
          ? data.preferences.longBreakMinutes
          : data.preferences.shortBreakMinutes;
      const timestamp = now().getTime();
      data.session = startTimer(
        createTimerSession({
          id: crypto.randomUUID(),
          mode: "pomodoro",
          now: timestamp,
          targetMs: minutes * 60_000,
          phase,
        }),
        timestamp,
      );
      save();
      return true;
    },
    leaveBreak() {
      const current = data.session;
      if (!current || current.mode !== "pomodoro") return false;
      if (
        (current.phase ?? "focus") === "focus" &&
        (current.status !== "finished" ||
          current.accumulatedMs < current.targetMs)
      )
        return false;
      const longBreak =
        current.phase === "long-break" ||
        (current.phase === "focus" &&
          current.status === "finished" &&
          current.breakAfter === "long-break");
      if (longBreak) data.completedRounds = 0;
      data.session = null;
      recoveryNeeded.value = false;
      save();
      return true;
    },
    toggleCheckin(habitId: string) {
      if (
        !data.habits.some((habit) => habit.id === habitId && !habit.archivedOn)
      )
        return false;
      const date = today();
      const index = data.checkins.findIndex(
        (item) => item.habitId === habitId && item.date === date,
      );
      undoCheckin.value = {
        habitId,
        date,
        ...(index >= 0 ? { previous: { ...data.checkins[index]! } } : {}),
      };
      if (index >= 0) data.checkins.splice(index, 1);
      else
        data.checkins.push({
          id: `${habitId}:${date}`,
          habitId,
          date,
          createdAt: now().toISOString(),
        });
      save();
      return true;
    },
    setSession(session: YikeTimerSession | null) {
      const previous = data.session;
      data.session = session;
      if (!session || session.status !== "paused") recoveryNeeded.value = false;
      if (!session || session.status !== "paused")
        recoveryAvailable.value = false;
      const priorRecord = session
        ? data.focusRecords.find((item) => item.id === session.id)
        : undefined;
      if (
        session &&
        !priorRecord &&
        !(
          previous?.id === session.id &&
          previous.status === "finished" &&
          previous.accumulatedMs >= previous.targetMs
        ) &&
        session.mode === "pomodoro" &&
        (session.phase ?? "focus") === "focus" &&
        session.status === "finished" &&
        session.accumulatedMs >= session.targetMs
      )
        data.completedRounds += 1;
      if (
        session &&
        (shouldPersistFocusRecord(
          session,
          data.preferences.shortRecordThresholdSeconds,
        ) ||
          (priorRecord && session.status === "abandoned"))
      ) {
        const record = data.focusRecords.find((item) => item.id === session.id);
        const startedAt = new Date(session.sessionStartedAt).toISOString();
        const intervals = session.intervals.map((interval) => ({
          date: interval.date,
          durationSeconds: interval.durationMs / 1000,
        }));
        if (record) {
          record.durationSeconds = session.accumulatedMs / 1000;
          record.intervals = intervals;
        } else {
          const durationSeconds = session.accumulatedMs / 1000;
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
      resetPresentation();
      undoCheckin.value = null;
      storageIssue.value = null;
      recoveryNeeded.value = false;
      recoveryAvailable.value = false;
      save();
    },
  };
}

export const YikeStoreKey: InjectionKey<YikeStore> = Symbol("yike-store");
let sharedStore: YikeStore | undefined;
export function useYikeStore() {
  const provided = hasInjectionContext() ? inject(YikeStoreKey, null) : null;
  if (provided) return provided;
  sharedStore ??= createYikeStore();
  return sharedStore;
}

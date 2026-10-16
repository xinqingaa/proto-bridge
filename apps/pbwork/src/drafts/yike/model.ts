import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

export type RootTab = "focus" | "checkin" | "review";
export type TimerMode = "pomodoro" | "stopwatch" | "countdown";
export type PomodoroPhase = "focus" | "short-break" | "long-break";
export type RunStatus = "idle" | "running" | "paused" | "finished";
export type HabitIcon = "book" | "water" | "run" | "moon" | "stretch" | "leaf";
export type HabitFrequency =
  { kind: "daily" } | { kind: "weekly"; times: number };

export type Habit = {
  id: string;
  name: string;
  icon: HabitIcon;
  frequency: HabitFrequency;
  /** Monday-first; index TODAY_INDEX is today. */
  week: boolean[];
};

export type FocusRecord = {
  id: string;
  day: number;
  start: string;
  minutes: number;
  kind: "番茄" | "正计时" | "倒计时";
};

export const ROOT_TABS: Array<{ value: RootTab; label: string }> = [
  { value: "focus", label: "专注" },
  { value: "checkin", label: "打卡" },
  { value: "review", label: "回顾" },
];

export const TIMER_MODES: Array<{ value: TimerMode; label: string }> = [
  { value: "pomodoro", label: "番茄" },
  { value: "stopwatch", label: "正计时" },
  { value: "countdown", label: "倒计时" },
];

export const HABIT_ICONS: Array<{ value: HabitIcon; label: string }> = [
  { value: "leaf", label: "叶子" },
  { value: "book", label: "书" },
  { value: "water", label: "水杯" },
  { value: "run", label: "脚步" },
  { value: "moon", label: "月亮" },
  { value: "stretch", label: "拉伸" },
];

export const POMODORO = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  roundsPerLongBreak: 4,
};

export const COUNTDOWN_PRESETS = [3, 5, 10, 20];

export const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
/** Fixed draft "now": 2026-10-16, Friday 10:24. */
export const TODAY_INDEX = 4;
export const TODAY_DATE = 16;
export const TODAY_LABEL = "10月16日 周五";
export const NOW_LABEL = "10:24";
/** 2026-10-01 is a Thursday; Monday-first offset. */
export const MONTH_FIRST_WEEKDAY = 3;
export const MONTH_DAYS = 31;

const SEED_RECORDS: FocusRecord[] = [
  { id: "r1", day: 12, start: "09:00", minutes: 25, kind: "番茄" },
  { id: "r2", day: 12, start: "09:30", minutes: 25, kind: "番茄" },
  { id: "r3", day: 12, start: "14:10", minutes: 50, kind: "正计时" },
  { id: "r4", day: 13, start: "10:05", minutes: 25, kind: "番茄" },
  { id: "r5", day: 13, start: "20:40", minutes: 25, kind: "番茄" },
  { id: "r6", day: 14, start: "08:50", minutes: 25, kind: "番茄" },
  { id: "r7", day: 14, start: "09:20", minutes: 25, kind: "番茄" },
  { id: "r8", day: 14, start: "09:50", minutes: 25, kind: "番茄" },
  { id: "r9", day: 14, start: "15:00", minutes: 45, kind: "正计时" },
  { id: "r10", day: 15, start: "21:00", minutes: 25, kind: "番茄" },
  { id: "r11", day: 15, start: "21:30", minutes: 10, kind: "倒计时" },
  { id: "r12", day: 16, start: "09:02", minutes: 25, kind: "番茄" },
  { id: "r13", day: 16, start: "09:32", minutes: 25, kind: "番茄" },
];

/** Earlier October days, deterministic. */
const EARLIER_MONTH_MINUTES = [50, 75, 0, 25, 100, 50, 25, 0, 75, 125, 25];

function seedHabits(): Habit[] {
  return [
    {
      id: "read",
      name: "读 20 页书",
      icon: "book",
      frequency: { kind: "daily" },
      week: [true, true, false, true, false, false, false],
    },
    {
      id: "water",
      name: "喝够 8 杯水",
      icon: "water",
      frequency: { kind: "daily" },
      week: [true, true, true, true, false, false, false],
    },
    {
      id: "run",
      name: "跑步",
      icon: "run",
      frequency: { kind: "weekly", times: 3 },
      week: [false, true, false, false, false, false, false],
    },
    {
      id: "sleep",
      name: "23 点前睡",
      icon: "moon",
      frequency: { kind: "daily" },
      week: [false, true, true, false, false, false, false],
    },
  ];
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

export function frequencyLabel(frequency: HabitFrequency): string {
  return frequency.kind === "daily" ? "每天" : `每周 ${frequency.times} 次`;
}

export function habitProgress(habit: Habit): { done: number; goal: number } {
  const done = habit.week.filter(Boolean).length;
  const goal =
    habit.frequency.kind === "daily" ? TODAY_INDEX + 1 : habit.frequency.times;
  return { done, goal };
}

/** Year heatmap seed for a habit: 0 none, 1 done. Deterministic by id. */
export function habitYear(habit: Habit, weeks = 18): number[][] {
  let seed = [...habit.id].reduce((sum, char) => sum + char.charCodeAt(0), 7);
  const rows: number[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const row: number[] = [];
    for (let day = 0; day < 7; day += 1) {
      seed = (seed * 9301 + 49297) % 233280;
      row.push(seed / 233280 > 0.42 ? 1 : 0);
    }
    rows.push(row);
  }
  rows[weeks - 1] = habit.week.map((value, index) =>
    index > TODAY_INDEX ? -1 : value ? 1 : 0,
  );
  return rows;
}

export function useYikeModel() {
  const now = ref(Date.now());
  const handle = window.setInterval(() => {
    now.value = Date.now();
  }, 200);
  onBeforeUnmount(() => window.clearInterval(handle));

  const timer = reactive({
    mode: "pomodoro" as TimerMode,
    status: "idle" as RunStatus,
    phase: "focus" as PomodoroPhase,
    round: 3,
    accumulatedMs: 0,
    startedAt: null as number | null,
    countdownMinutes: 5,
    laps: [] as number[],
  });

  const records = ref<FocusRecord[]>(SEED_RECORDS.map((item) => ({ ...item })));
  const habits = ref<Habit[]>(seedHabits());
  const snackbar = ref<{
    message: string;
    undo?: (() => void) | undefined;
  } | null>(null);
  let snackbarHandle = 0;

  const elapsedMs = computed(
    () =>
      timer.accumulatedMs +
      (timer.startedAt === null ? 0 : now.value - timer.startedAt),
  );

  const phaseMinutes = computed(() => {
    if (timer.phase === "short-break") return POMODORO.shortBreak;
    if (timer.phase === "long-break") return POMODORO.longBreak;
    return POMODORO.focus;
  });

  const totalMs = computed(() => {
    if (timer.mode === "pomodoro") return phaseMinutes.value * 60_000;
    if (timer.mode === "countdown") return timer.countdownMinutes * 60_000;
    return 0;
  });

  const remainingMs = computed(() =>
    Math.max(0, totalMs.value - elapsedMs.value),
  );

  /** 0..1 of the current target; stopwatch uses the running minute. */
  const progress = computed(() => {
    if (timer.mode === "stopwatch") return (elapsedMs.value % 60_000) / 60_000;
    if (!totalMs.value) return 0;
    return Math.min(1, elapsedMs.value / totalMs.value);
  });

  const display = computed(() => {
    if (timer.mode === "stopwatch") return formatElapsed(elapsedMs.value);
    if (timer.status === "idle") return formatClock(totalMs.value);
    return formatClock(remainingMs.value);
  });

  const isBreak = computed(
    () => timer.mode === "pomodoro" && timer.phase !== "focus",
  );

  const statusLine = computed(() => {
    if (timer.mode === "pomodoro") {
      if (timer.status === "finished") {
        return timer.phase === "focus"
          ? `第 ${timer.round} 轮完成，记入回顾`
          : "休息结束";
      }
      const phase =
        timer.phase === "focus"
          ? `第 ${timer.round} 轮专注`
          : timer.phase === "short-break"
            ? "短休息"
            : "长休息";
      if (timer.status === "paused") return `${phase} · 已暂停`;
      return phase;
    }
    if (timer.mode === "countdown") {
      if (timer.status === "finished")
        return `${timer.countdownMinutes} 分钟到了`;
      if (timer.status === "paused") return "倒计时 · 已暂停";
      return timer.status === "idle" ? "选一个时长" : "倒计时";
    }
    if (timer.status === "paused") return "正计时 · 已暂停";
    return timer.laps.length ? `第 ${timer.laps.length + 1} 圈` : "正计时";
  });

  const todayRecords = computed(() =>
    records.value.filter((item) => item.day === TODAY_DATE),
  );
  const todayMinutes = computed(() =>
    todayRecords.value.reduce((sum, item) => sum + item.minutes, 0),
  );

  /** Monday 12 .. Sunday 18. */
  const weekMinutes = computed(() =>
    WEEKDAYS.map((_, index) =>
      records.value
        .filter((item) => item.day === 12 + index)
        .reduce((sum, item) => sum + item.minutes, 0),
    ),
  );
  const weekTotal = computed(() =>
    weekMinutes.value.reduce((sum, value) => sum + value, 0),
  );

  const monthMinutes = computed(() =>
    Array.from({ length: MONTH_DAYS }, (_, index) => {
      const day = index + 1;
      if (day > TODAY_DATE) return -1;
      if (day <= EARLIER_MONTH_MINUTES.length) {
        return EARLIER_MONTH_MINUTES[index]!;
      }
      return records.value
        .filter((item) => item.day === day)
        .reduce((sum, item) => sum + item.minutes, 0);
    }),
  );

  const habitsDoneToday = computed(
    () => habits.value.filter((habit) => habit.week[TODAY_INDEX]).length,
  );

  watch(remainingMs, (value) => {
    if (timer.status !== "running" || timer.mode === "stopwatch") return;
    if (value > 0) return;
    finishRun();
  });

  function showSnackbar(message: string, undo?: () => void) {
    window.clearTimeout(snackbarHandle);
    snackbar.value = { message, undo };
    snackbarHandle = window.setTimeout(() => {
      snackbar.value = null;
    }, 4000);
  }

  function dismissSnackbar() {
    window.clearTimeout(snackbarHandle);
    snackbar.value = null;
  }

  function freeze() {
    timer.accumulatedMs = elapsedMs.value;
    timer.startedAt = null;
  }

  function resetRun() {
    timer.status = "idle";
    timer.accumulatedMs = 0;
    timer.startedAt = null;
    timer.laps = [];
  }

  function addRecord(minutes: number, kind: FocusRecord["kind"]) {
    if (minutes <= 0) return;
    const clock = new Date();
    records.value.push({
      id: `r${Date.now()}`,
      day: TODAY_DATE,
      start: `${String(clock.getHours()).padStart(2, "0")}:${String(clock.getMinutes()).padStart(2, "0")}`,
      minutes,
      kind,
    });
  }

  function finishRun() {
    freeze();
    timer.status = "finished";
    if (timer.mode === "pomodoro" && timer.phase === "focus") {
      addRecord(POMODORO.focus, "番茄");
    }
    if (timer.mode === "countdown") {
      addRecord(timer.countdownMinutes, "倒计时");
    }
  }

  function start() {
    if (timer.status === "finished") resetRun();
    timer.status = "running";
    timer.startedAt = Date.now();
    now.value = timer.startedAt;
  }

  function pause() {
    if (timer.status !== "running") return;
    freeze();
    timer.status = "paused";
  }

  function resume() {
    if (timer.status !== "paused") return;
    timer.status = "running";
    timer.startedAt = Date.now();
    now.value = timer.startedAt;
  }

  function abandon() {
    resetRun();
    if (timer.mode === "pomodoro") timer.phase = "focus";
    showSnackbar("已放弃，这一轮不计入回顾");
  }

  /** Stopwatch: save elapsed as a record. */
  function finishStopwatch() {
    freeze();
    const minutes = Math.max(1, Math.round(timer.accumulatedMs / 60_000));
    addRecord(minutes, "正计时");
    resetRun();
    showSnackbar(`已记录 ${minutes} 分钟`);
  }

  function lap() {
    if (timer.mode !== "stopwatch" || timer.status !== "running") return;
    timer.laps.unshift(elapsedMs.value);
  }

  function startBreak() {
    const nextLong = timer.round % POMODORO.roundsPerLongBreak === 0;
    timer.phase = nextLong ? "long-break" : "short-break";
    resetRun();
    start();
  }

  function nextRound() {
    timer.round =
      timer.round % POMODORO.roundsPerLongBreak === 0 ? 1 : timer.round + 1;
    timer.phase = "focus";
    resetRun();
  }

  function setMode(mode: TimerMode) {
    if (timer.mode === mode) return;
    timer.mode = mode;
    resetRun();
    if (mode === "pomodoro") timer.phase = "focus";
  }

  function setCountdown(minutes: number) {
    timer.countdownMinutes = minutes;
    resetRun();
  }

  /** Lab helper: jump to the last few seconds of the current target. */
  function fastForward() {
    if (timer.mode === "stopwatch") {
      timer.accumulatedMs = elapsedMs.value + 5 * 60_000;
      if (timer.startedAt !== null) timer.startedAt = Date.now();
      return;
    }
    if (timer.status === "idle" || timer.status === "finished") start();
    timer.accumulatedMs = Math.max(0, totalMs.value - 3_000);
    timer.startedAt = timer.status === "running" ? Date.now() : null;
    now.value = Date.now();
  }

  function toggleHabit(id: string) {
    const habit = habits.value.find((item) => item.id === id);
    if (!habit) return;
    const before = habit.week[TODAY_INDEX]!;
    habit.week[TODAY_INDEX] = !before;
    if (before) {
      showSnackbar(`已取消「${habit.name}」`);
      return;
    }
    showSnackbar(`已打卡「${habit.name}」`, () => {
      habit.week[TODAY_INDEX] = false;
      dismissSnackbar();
    });
  }

  function addHabit(input: {
    name: string;
    icon: HabitIcon;
    frequency: HabitFrequency;
  }) {
    habits.value.push({
      id: `h${Date.now()}`,
      name: input.name,
      icon: input.icon,
      frequency: input.frequency,
      week: [false, false, false, false, false, false, false],
    });
    showSnackbar(`已添加「${input.name}」`);
  }

  function reset() {
    resetRun();
    timer.mode = "pomodoro";
    timer.phase = "focus";
    timer.round = 3;
    timer.countdownMinutes = 5;
    records.value = SEED_RECORDS.map((item) => ({ ...item }));
    habits.value = seedHabits();
    dismissSnackbar();
  }

  return {
    timer,
    records,
    habits,
    snackbar,
    elapsedMs,
    remainingMs,
    totalMs,
    progress,
    display,
    isBreak,
    statusLine,
    phaseMinutes,
    todayRecords,
    todayMinutes,
    weekMinutes,
    weekTotal,
    monthMinutes,
    habitsDoneToday,
    start,
    pause,
    resume,
    abandon,
    finishStopwatch,
    lap,
    startBreak,
    nextRound,
    setMode,
    setCountdown,
    fastForward,
    toggleHabit,
    addHabit,
    dismissSnackbar,
    reset,
  };
}

export type YikeModel = ReturnType<typeof useYikeModel>;

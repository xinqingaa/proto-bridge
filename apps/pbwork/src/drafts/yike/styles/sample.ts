import {
  MONTH_DAYS,
  MONTH_FIRST_WEEKDAY,
  TODAY_DATE,
  TODAY_INDEX,
  TODAY_LABEL,
  WEEKDAYS,
  frequencyLabel,
  type HabitFrequency,
  type HabitIcon,
} from "../model";

export type StyleDirectionId = "mechanical" | "water" | "sundial";

export type SampleHabit = {
  id: string;
  name: string;
  /** One character used by the sundial stamp. */
  mark: string;
  icon: HabitIcon;
  frequency: HabitFrequency;
  /** Monday-first; index TODAY_INDEX is today. */
  week: boolean[];
};

export const SAMPLE_TODAY = {
  label: TODAY_LABEL,
  sundialLabel: "十月十六 · 周五",
  minutes: 50,
};

export const SAMPLE_MODES = ["番茄", "正计时", "倒计时"];
export const SAMPLE_TABS = ["专注", "打卡", "回顾"];
export const SAMPLE_WEEKDAYS = WEEKDAYS;
export const SAMPLE_TODAY_INDEX = TODAY_INDEX;
export const SAMPLE_COUNTDOWN_PRESETS = [3, 5, 10, 20];

export const SAMPLE_HABITS: SampleHabit[] = [
  {
    id: "water",
    name: "喝够 8 杯水",
    mark: "水",
    icon: "water",
    frequency: { kind: "daily" },
    week: [true, true, true, true, true, false, false],
  },
  {
    id: "read",
    name: "读 20 页书",
    mark: "读",
    icon: "book",
    frequency: { kind: "daily" },
    week: [true, true, false, true, true, false, false],
  },
  {
    id: "run",
    name: "跑步",
    mark: "跑",
    icon: "run",
    frequency: { kind: "weekly", times: 3 },
    week: [false, true, false, false, false, false, false],
  },
  {
    id: "sleep",
    name: "23 点前睡",
    mark: "眠",
    icon: "moon",
    frequency: { kind: "daily" },
    week: [false, true, true, false, false, false, false],
  },
];

export function doneToday(habit: SampleHabit): boolean {
  return habit.week[TODAY_INDEX] === true;
}

export function withToday(habit: SampleHabit, done: boolean): SampleHabit {
  const week = [...habit.week];
  week[TODAY_INDEX] = done;
  return { ...habit, week };
}

export function habitDone(habit: SampleHabit): number {
  return habit.week.filter(Boolean).length;
}

export function habitMeta(habit: SampleHabit): string {
  const done = habitDone(habit);
  if (habit.frequency.kind === "weekly") {
    return `${frequencyLabel(habit.frequency)} · 本周 ${done}/${habit.frequency.times}`;
  }
  return `${frequencyLabel(habit.frequency)} · 本周 ${done} 天`;
}

export const SAMPLE_LAPS = {
  elapsed: "18:42",
  elapsedMinutes: 18.7,
  current: { index: 3, lap: "06:10" },
  done: [
    { index: 2, lap: "05:47", total: "12:32" },
    { index: 1, lap: "06:45", total: "06:45" },
  ],
};

/** Monday-first focus minutes for the current week; -1 is a future day. */
export const SAMPLE_WEEK_MINUTES = [100, 50, 120, 35, 50, -1, -1];

export const SAMPLE_WEEK_SUMMARY = {
  range: "10月12日 – 18日",
  minutes: 355,
  sessions: 13,
  checkIns: 11,
  kinds: [
    { label: "番茄", count: 10, minutes: 250 },
    { label: "正计时", count: 2, minutes: 95 },
    { label: "倒计时", count: 1, minutes: 10 },
  ],
};

export const SAMPLE_MONTH_SUMMARY = {
  range: "2026 年 10 月",
  minutes: 905,
  focusDays: 14,
  checkIns: 46,
};

/** October minutes by date (index 0 is the 1st); -1 is a future day. */
export const SAMPLE_MONTH_MINUTES: number[] = Array.from(
  { length: MONTH_DAYS },
  (_, index) => {
    const date = index + 1;
    if (date > TODAY_DATE) return -1;
    const earlier = [50, 75, 0, 25, 100, 50, 25, 0, 75, 125, 25];
    if (date <= earlier.length) return earlier[index]!;
    return SAMPLE_WEEK_MINUTES[date - 12]!;
  },
);

export const SAMPLE_MONTH_FIRST_WEEKDAY = MONTH_FIRST_WEEKDAY;
export const SAMPLE_TODAY_DATE = TODAY_DATE;

/** Wednesday 14 October, the day selected in the review sample. */
export const SAMPLE_SELECTED_DAY = {
  index: 2,
  label: "10月14日 周三",
  minutes: 120,
  records: [
    { start: "08:50", kind: "番茄", minutes: 25 },
    { start: "09:20", kind: "番茄", minutes: 25 },
    { start: "09:50", kind: "番茄", minutes: 25 },
    { start: "15:00", kind: "正计时", minutes: 45 },
  ],
  habits: ["喝够 8 杯水", "23 点前睡"],
};

export function formatTotal(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

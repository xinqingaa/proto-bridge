export const HENGDONG_TODAY = "2026-08-13";
export const HENGDONG_WEEK_DATES = [
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
] as const;

export type Exercise = {
  id: string;
  name: string;
  prescription: string;
  mode: "timer" | "reps";
  target: number;
};

export type PlanGoal = "唤醒" | "力量" | "舒缓";

export type FitnessPlan = {
  id: string;
  name: string;
  description: string;
  goal: PlanGoal;
  level: "入门" | "进阶";
  minutes: number;
  weeklyTarget: number;
  origin: "builtin" | "custom";
  exercises: Exercise[];
};

export type ActivityType = "训练" | "步行" | "拉伸" | "自由活动";
export type Feeling = "轻松" | "刚好" | "吃力";
export type ProgressPeriod = "week" | "month" | "year" | "custom";
export type ActivityHistoryTab =
  | "all"
  | "training"
  | "walking"
  | "stretching"
  | "free";

export type DateRange = {
  start: string;
  end: string;
};

export type WorkoutRecord = {
  id: string;
  date: string;
  kind: "session" | "quick";
  activityType: ActivityType;
  planId?: string;
  title: string;
  minutes: number;
  feeling: Feeling;
  note: string;
  completedExerciseIds: string[];
};

export type FitnessGoals = {
  weeklySessions: number;
  reminderTime: string;
  reminderEnabled: boolean;
};

export type FitnessProfile = {
  id: string;
  name: string;
  username: string;
  password: string;
};

export function normalizeHengdongUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidHengdongUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(normalizeHengdongUsername(value));
}

export type WorkoutSession = {
  planId: string;
  currentExerciseIndex: number;
  completedExerciseIds: string[];
  elapsedSeconds: number;
  currentExerciseSeconds: number;
  status: "running" | "paused" | "summary";
  summaryKind?: "complete" | "partial";
  summaryFeeling?: Feeling | "";
  summaryNote?: string;
};

export const defaultPlans: FitnessPlan[] = [
  {
    id: "wake-up-15",
    name: "15 分钟唤醒",
    description: "用低门槛的全身活动，把身体从久坐和疲惫里叫醒。",
    goal: "唤醒",
    level: "入门",
    minutes: 15,
    weeklyTarget: 3,
    origin: "builtin",
    exercises: [
      {
        id: "neck-roll",
        name: "颈肩环绕",
        prescription: "缓慢活动 30 秒",
        mode: "timer",
        target: 30,
      },
      {
        id: "body-squat",
        name: "自重深蹲",
        prescription: "稳定完成 12 次",
        mode: "reps",
        target: 12,
      },
      {
        id: "incline-push",
        name: "上斜俯卧撑",
        prescription: "完成 10 次",
        mode: "reps",
        target: 10,
      },
      {
        id: "dead-bug",
        name: "死虫式",
        prescription: "左右交替 12 次",
        mode: "reps",
        target: 12,
      },
    ],
  },
  {
    id: "full-body-basic",
    name: "全身基础训练",
    description: "用推、蹲和核心动作，建立一套稳定的力量基础。",
    goal: "力量",
    level: "进阶",
    minutes: 30,
    weeklyTarget: 3,
    origin: "builtin",
    exercises: [
      {
        id: "squat",
        name: "深蹲",
        prescription: "完成 15 次",
        mode: "reps",
        target: 15,
      },
      {
        id: "push-up",
        name: "俯卧撑",
        prescription: "完成 10 次",
        mode: "reps",
        target: 10,
      },
      {
        id: "lunge",
        name: "交替弓步",
        prescription: "左右各 10 次",
        mode: "reps",
        target: 20,
      },
      {
        id: "plank",
        name: "平板支撑",
        prescription: "保持 40 秒",
        mode: "timer",
        target: 40,
      },
    ],
  },
  {
    id: "sleep-stretch",
    name: "睡前舒展",
    description: "放松髋部、腿后侧和背部，让身体安静下来。",
    goal: "舒缓",
    level: "入门",
    minutes: 12,
    weeklyTarget: 4,
    origin: "builtin",
    exercises: [
      {
        id: "cat-cow",
        name: "猫牛式",
        prescription: "跟随呼吸 45 秒",
        mode: "timer",
        target: 45,
      },
      {
        id: "hip-flexor",
        name: "髋屈肌拉伸",
        prescription: "左右各 40 秒",
        mode: "timer",
        target: 80,
      },
      {
        id: "hamstring",
        name: "腿后侧拉伸",
        prescription: "左右各 40 秒",
        mode: "timer",
        target: 80,
      },
    ],
  },
];

export const defaultRecords: WorkoutRecord[] = [
  {
    id: "record-20260812",
    date: "2026-08-12",
    kind: "session",
    activityType: "训练",
    planId: "wake-up-15",
    title: "15 分钟唤醒",
    minutes: 16,
    feeling: "刚好",
    note: "肩颈比昨天轻松。",
    completedExerciseIds: [
      "neck-roll",
      "body-squat",
      "incline-push",
      "dead-bug",
    ],
  },
  {
    id: "record-20260810",
    date: "2026-08-10",
    kind: "session",
    activityType: "训练",
    planId: "full-body-basic",
    title: "全身基础训练",
    minutes: 31,
    feeling: "吃力",
    note: "最后一组缩短了一点，但还是完成了。",
    completedExerciseIds: ["squat", "push-up", "lunge", "plank"],
  },
  {
    id: "record-20260809",
    date: "2026-08-09",
    kind: "quick",
    activityType: "拉伸",
    title: "睡前拉伸",
    minutes: 12,
    feeling: "轻松",
    note: "",
    completedExerciseIds: [],
  },
  {
    id: "record-20260806",
    date: "2026-08-06",
    kind: "quick",
    activityType: "步行",
    title: "午后散步",
    minutes: 24,
    feeling: "轻松",
    note: "绕着街区走了一圈，回来后精神清醒一些。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260802",
    date: "2026-08-02",
    kind: "quick",
    activityType: "自由活动",
    title: "周末轻活动",
    minutes: 18,
    feeling: "刚好",
    note: "简单活动了肩背和髋部。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260728",
    date: "2026-07-28",
    kind: "session",
    activityType: "训练",
    planId: "wake-up-15",
    title: "15 分钟唤醒",
    minutes: 15,
    feeling: "刚好",
    note: "动作不多，但完整做完了。",
    completedExerciseIds: [
      "neck-roll",
      "body-squat",
      "incline-push",
      "dead-bug",
    ],
  },
  {
    id: "record-20260719",
    date: "2026-07-19",
    kind: "quick",
    activityType: "拉伸",
    title: "睡前舒展",
    minutes: 10,
    feeling: "轻松",
    note: "腿后侧比开始时放松。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260621",
    date: "2026-06-21",
    kind: "quick",
    activityType: "步行",
    title: "河边慢走",
    minutes: 32,
    feeling: "轻松",
    note: "没有追求速度，只保持连续走动。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260517",
    date: "2026-05-17",
    kind: "session",
    activityType: "训练",
    planId: "full-body-basic",
    title: "全身基础训练",
    minutes: 29,
    feeling: "吃力",
    note: "最后一个动作缩短了一些，仍保存了实际完成部分。",
    completedExerciseIds: ["squat", "push-up", "lunge"],
  },
  {
    id: "record-20260411",
    date: "2026-04-11",
    kind: "quick",
    activityType: "自由活动",
    title: "居家活动",
    minutes: 14,
    feeling: "刚好",
    note: "边听音乐边活动，没有安排固定动作。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260308",
    date: "2026-03-08",
    kind: "quick",
    activityType: "拉伸",
    title: "晨间拉伸",
    minutes: 12,
    feeling: "轻松",
    note: "肩颈活动后舒服一些。",
    completedExerciseIds: [],
  },
  {
    id: "record-20260124",
    date: "2026-01-24",
    kind: "session",
    activityType: "训练",
    planId: "wake-up-15",
    title: "15 分钟唤醒",
    minutes: 17,
    feeling: "刚好",
    note: "重新开始的第一回，节奏保守。",
    completedExerciseIds: ["neck-roll", "body-squat", "dead-bug"],
  },
];

export const defaultProfile: FitnessProfile = {
  id: "user-demo",
  name: "林然",
  username: "demo",
  password: "123456",
};

export const defaultGoals: FitnessGoals = {
  weeklySessions: 3,
  reminderTime: "20:30",
  reminderEnabled: true,
};

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addIsoDays(value: string, amount: number) {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date);
}

export function startOfIsoWeek(value: string) {
  const date = parseIsoDate(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return isoDate(date);
}

export function progressRange(
  period: ProgressPeriod,
  anchor = HENGDONG_TODAY,
  custom?: DateRange,
): DateRange {
  if (period === "custom" && custom) return custom;
  const date = parseIsoDate(anchor);
  if (period === "week") {
    const start = startOfIsoWeek(anchor);
    return { start, end: addIsoDays(start, 6) };
  }
  if (period === "month") {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { start: isoDate(start), end: isoDate(end) };
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  return { start: isoDate(start), end: isoDate(end) };
}

export function shiftProgressAnchor(
  period: Exclude<ProgressPeriod, "custom">,
  anchor: string,
  amount: number,
) {
  if (period === "week") return addIsoDays(anchor, amount * 7);
  const date = parseIsoDate(anchor);
  if (period === "month") date.setUTCMonth(date.getUTCMonth() + amount, 1);
  else date.setUTCFullYear(date.getUTCFullYear() + amount, 0, 1);
  return isoDate(date);
}

export function datesInRange(range: DateRange) {
  const dates: string[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

export function recordsInRange(records: WorkoutRecord[], range: DateRange) {
  return records.filter(
    (record) => record.date >= range.start && record.date <= range.end,
  );
}

export function recordsInWeek(records: WorkoutRecord[]) {
  return recordsInRange(records, progressRange("week"));
}

export function recordsInMonth(records: WorkoutRecord[]) {
  return recordsInRange(records, progressRange("month"));
}

export function activeDayCount(records: WorkoutRecord[]) {
  return new Set(records.map((record) => record.date)).size;
}

export function latestRecords(records: WorkoutRecord[], count: number) {
  return [...records]
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
    )
    .slice(0, Math.max(0, count));
}

export function totalMinutes(records: WorkoutRecord[]) {
  return records.reduce((total, record) => total + record.minutes, 0);
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
}

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

export function recordsInWeek(records: WorkoutRecord[]) {
  return records.filter((record) =>
    HENGDONG_WEEK_DATES.includes(
      record.date as (typeof HENGDONG_WEEK_DATES)[number],
    ),
  );
}

export function recordsInMonth(records: WorkoutRecord[]) {
  return records.filter((record) => record.date.startsWith("2026-08"));
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

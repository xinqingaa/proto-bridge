export type Exercise = {
  id: string;
  name: string;
  prescription: string;
  completed?: boolean;
};

export type FitnessPlan = {
  id: string;
  name: string;
  description: string;
  level: "入门" | "进阶";
  minutes: number;
  weeklyTarget: number;
  exercises: Exercise[];
};

export type WorkoutRecord = {
  id: string;
  date: string;
  planId: string;
  planName: string;
  minutes: number;
  feeling: "轻松" | "刚好" | "吃力";
  note: string;
  completedExerciseIds: string[];
};

export type FitnessGoals = {
  weeklySessions: string;
  sessionMinutes: string;
  reminderTime: string;
  reminderEnabled: boolean;
};

export type FitnessProfile = {
  id: string;
  name: string;
  email: string;
};

export const plans: FitnessPlan[] = [
  {
    id: "wake-up-15",
    name: "15 分钟唤醒",
    description: "用低门槛全身活动开启今天，适合早晨或久坐间隙。",
    level: "入门",
    minutes: 15,
    weeklyTarget: 5,
    exercises: [
      { id: "neck-roll", name: "颈肩环绕", prescription: "2 组 · 30 秒" },
      { id: "body-squat", name: "自重深蹲", prescription: "3 组 · 12 次" },
      { id: "incline-push", name: "上斜俯卧撑", prescription: "3 组 · 10 次" },
      { id: "dead-bug", name: "死虫式", prescription: "2 组 · 12 次" },
    ],
  },
  {
    id: "full-body-basic",
    name: "全身基础训练",
    description: "覆盖推、蹲、核心与心肺的均衡训练。",
    level: "进阶",
    minutes: 35,
    weeklyTarget: 3,
    exercises: [
      { id: "squat", name: "深蹲", prescription: "4 组 · 12 次" },
      { id: "push-up", name: "俯卧撑", prescription: "4 组 · 10 次" },
      { id: "lunge", name: "交替弓步", prescription: "3 组 · 12 次" },
      { id: "plank", name: "平板支撑", prescription: "3 组 · 40 秒" },
    ],
  },
  {
    id: "sleep-stretch",
    name: "睡前拉伸",
    description: "舒缓髋、腿后侧与背部紧张，帮助身体安静下来。",
    level: "入门",
    minutes: 12,
    weeklyTarget: 5,
    exercises: [
      { id: "cat-cow", name: "猫牛式", prescription: "2 组 · 45 秒" },
      { id: "hip-flexor", name: "髋屈肌拉伸", prescription: "左右各 45 秒" },
      { id: "hamstring", name: "腿后侧拉伸", prescription: "左右各 45 秒" },
      { id: "child-pose", name: "婴儿式呼吸", prescription: "2 分钟" },
    ],
  },
];

export const records: WorkoutRecord[] = [
  {
    id: "record-20260812",
    date: "2026-08-12",
    planId: "wake-up-15",
    planName: "15 分钟唤醒",
    minutes: 16,
    feeling: "刚好",
    note: "早起完成，肩颈比昨天轻松。",
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
    planId: "full-body-basic",
    planName: "全身基础训练",
    minutes: 38,
    feeling: "吃力",
    note: "最后一组平板支撑缩短了十秒。",
    completedExerciseIds: ["squat", "push-up", "lunge", "plank"],
  },
  {
    id: "record-20260809",
    date: "2026-08-09",
    planId: "sleep-stretch",
    planName: "睡前拉伸",
    minutes: 12,
    feeling: "轻松",
    note: "",
    completedExerciseIds: ["cat-cow", "hip-flexor", "hamstring", "child-pose"],
  },
];

export const weekActivity = [
  { id: "mon", label: "一", minutes: 16 },
  { id: "tue", label: "二", minutes: 0 },
  { id: "wed", label: "三", minutes: 38 },
  { id: "thu", label: "四", minutes: 12 },
  { id: "fri", label: "五", minutes: 0 },
  { id: "sat", label: "六", minutes: 24 },
  { id: "sun", label: "日", minutes: 15 },
];

export const calendarWeeks = [
  [
    { id: "20260803", label: "3", state: "done" },
    { id: "20260804", label: "4", state: "done" },
    { id: "20260805", label: "5", state: "idle" },
    { id: "20260806", label: "6", state: "done" },
    { id: "20260807", label: "7", state: "idle" },
    { id: "20260808", label: "8", state: "done" },
    { id: "20260809", label: "9", state: "done" },
  ],
  [
    { id: "20260810", label: "10", state: "done" },
    { id: "20260811", label: "11", state: "idle" },
    { id: "20260812", label: "12", state: "done" },
    { id: "20260813", label: "13", state: "today" },
    { id: "20260814", label: "14", state: "future" },
    { id: "20260815", label: "15", state: "future" },
    { id: "20260816", label: "16", state: "future" },
  ],
];

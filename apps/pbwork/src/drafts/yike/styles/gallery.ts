export type FocusState =
  | "pomodoro-idle"
  | "pomodoro-running"
  | "pomodoro-paused"
  | "short-break"
  | "long-break"
  | "round-done"
  | "stopwatch"
  | "countdown-setup"
  | "countdown-running"
  | "countdown-done"
  | "recovery"
  | "abandon";

export type CheckInState = "partial" | "all" | "empty" | "undo";
export type HabitState = "detail-daily" | "detail-weekly" | "delete" | "new" | "error";
export type ReviewState = "week" | "month" | "day" | "empty";
export type SettingsState = "default" | "reset";

export type ScreenSpec =
  | { page: "launch"; state: "default"; label: string }
  | { page: "focus"; state: FocusState; label: string }
  | { page: "checkin"; state: CheckInState; label: string }
  | { page: "habit"; state: HabitState; label: string }
  | { page: "review"; state: ReviewState; label: string }
  | { page: "settings"; state: SettingsState; label: string };

export type GallerySection = { id: string; title: string; screens: ScreenSpec[] };

export const GALLERY: GallerySection[] = [
  {
    id: "launch",
    title: "启动页",
    screens: [{ page: "launch", state: "default", label: "冷启动品牌静帧" }],
  },
  {
    id: "focus",
    title: "专注",
    screens: [
      { page: "focus", state: "pomodoro-idle", label: "番茄 · 待开始" },
      { page: "focus", state: "pomodoro-running", label: "番茄 · 进行中" },
      { page: "focus", state: "pomodoro-paused", label: "番茄 · 暂停" },
      { page: "focus", state: "short-break", label: "番茄 · 短休" },
      { page: "focus", state: "long-break", label: "番茄 · 长休" },
      { page: "focus", state: "round-done", label: "番茄 · 本轮完成" },
      { page: "focus", state: "abandon", label: "放弃确认" },
      { page: "focus", state: "recovery", label: "中断后恢复" },
      { page: "focus", state: "stopwatch", label: "正计时 · 计圈" },
      { page: "focus", state: "countdown-setup", label: "倒计时 · 设置时长" },
      { page: "focus", state: "countdown-running", label: "倒计时 · 进行中" },
      { page: "focus", state: "countdown-done", label: "倒计时 · 到点" },
    ],
  },
  {
    id: "checkin",
    title: "打卡",
    screens: [
      { page: "checkin", state: "partial", label: "部分完成" },
      { page: "checkin", state: "undo", label: "打卡后撤销提示" },
      { page: "checkin", state: "all", label: "全部完成" },
      { page: "checkin", state: "empty", label: "没有习惯" },
    ],
  },
  {
    id: "habit",
    title: "习惯详情与编辑",
    screens: [
      { page: "habit", state: "detail-daily", label: "详情 · 每天" },
      { page: "habit", state: "detail-weekly", label: "详情 · 每周 N 次" },
      { page: "habit", state: "delete", label: "删除确认" },
      { page: "habit", state: "new", label: "新建习惯" },
      { page: "habit", state: "error", label: "新建 · 校验错误" },
    ],
  },
  {
    id: "review",
    title: "回顾",
    screens: [
      { page: "review", state: "week", label: "周视图" },
      { page: "review", state: "day", label: "选中某天" },
      { page: "review", state: "month", label: "月视图" },
      { page: "review", state: "empty", label: "没有记录" },
    ],
  },
  {
    id: "settings",
    title: "设置",
    screens: [
      { page: "settings", state: "default", label: "默认（选择表盘）" },
      { page: "settings", state: "reset", label: "重置数据确认" },
    ],
  },
];

export const GALLERY_SCREEN_COUNT = GALLERY.reduce(
  (sum, section) => sum + section.screens.length,
  0,
);

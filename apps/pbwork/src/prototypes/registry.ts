import type { PrototypeRecord, ScreenRecord } from "@/design-system/types";

export const prototypes = [
  {
    id: "project",
    label: "项目协作",
    lifecycle: "active",
    owners: ["产品"],
    roles: ["UI", "DE", "QA"],
    defaultThemeId: "light",
  },
] satisfies PrototypeRecord[];

export const prototypeScreens = [
  {
    prototypeId: "project",
    screenId: "project.task-list",
    screenSlug: "task-list",
    label: "任务列表",
    title: "任务列表",
    path: "/prototype/project/task-list",
    view: "project/screens/TaskList.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认态" },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
    ],
  },
  {
    prototypeId: "project",
    screenId: "project.task-detail",
    screenSlug: "task-detail",
    label: "任务详情",
    title: "任务详情",
    path: "/prototype/project/task-detail",
    view: "project/screens/TaskDetail.vue",
    defaultVariantId: "overview",
    variants: [
      { id: "overview", label: "概览" },
      { id: "activity", label: "活动" },
      { id: "error", label: "错误" },
      { id: "sheet-open", label: "Sheet 打开" },
    ],
  },
] satisfies ScreenRecord[];

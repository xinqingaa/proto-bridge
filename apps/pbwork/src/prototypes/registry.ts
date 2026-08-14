import type { PrototypeRecord, ScreenRecord } from "@/design-system/types";

export const prototypes = [
  {
    id: "cold-chain-ops",
    label: "冷链异常处置台",
    lifecycle: "active",
    owners: ["冷链运营"],
    roles: ["值守专员", "调度主管"],
    defaultThemeId: "light",
    screenGroups: [
      {
        id: "exception-response",
        label: "异常处置",
        screenSlugs: ["exception-queue", "shipment-detail", "resolution-form"],
      },
    ],
  },
  {
    id: "hengdong",
    label: "恒动 · 健身自律记录",
    lifecycle: "review",
    owners: ["个人健康产品"],
    roles: ["健身入门用户", "自律记录用户"],
    defaultThemeId: "light",
    screenGroups: [
      {
        id: "account",
        label: "轻量账号",
        screenSlugs: ["login", "register"],
      },
      {
        id: "root-tabs",
        label: "一级目的地",
        screenSlugs: ["today", "plans", "progress"],
      },
      {
        id: "plan-flow",
        label: "计划与训练",
        screenSlugs: ["plan-detail", "workout-session", "workout-complete"],
      },
      {
        id: "settings",
        label: "设置",
        screenSlugs: ["settings-goals"],
      },
    ],
  },
] satisfies PrototypeRecord[];

const redesignedHengdongScreens = [
  {
    prototypeId: "hengdong",
    screenId: "hengdong.login",
    screenSlug: "login",
    label: "登录",
    title: "登录恒动",
    path: "/prototype/hengdong/login",
    view: "hengdong/screens/LoginScreen.vue",
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "轻量登录",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.root" },
          { screenId: "hengdong.login", pbId: "hengdong.login.form" },
          { screenId: "hengdong.login", pbId: "hengdong.login.submit" },
        ],
      },
      {
        id: "validation-error",
        label: "登录校验错误",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.validation" },
        ],
      },
    ],
    actions: [
      {
        id: "login",
        kind: "click",
        target: { screenId: "hengdong.login", pbId: "hengdong.login.submit" },
      },
      {
        id: "open-register",
        kind: "click",
        target: {
          screenId: "hengdong.login",
          pbId: "hengdong.login.open-register",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.register",
    screenSlug: "register",
    label: "注册",
    title: "创建本地账号",
    path: "/prototype/hengdong/register",
    view: "hengdong/screens/RegisterScreen.vue",
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "本地注册",
        requiredFragments: [
          { screenId: "hengdong.register", pbId: "hengdong.register.root" },
          { screenId: "hengdong.register", pbId: "hengdong.register.form" },
          { screenId: "hengdong.register", pbId: "hengdong.register.submit" },
        ],
      },
      {
        id: "validation-error",
        label: "注册校验错误",
        requiredFragments: [
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.validation",
          },
        ],
      },
    ],
    actions: [
      {
        id: "register",
        kind: "click",
        target: {
          screenId: "hengdong.register",
          pbId: "hengdong.register.submit",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.today",
    screenSlug: "today",
    label: "今天",
    title: "今天",
    path: "/prototype/hengdong/today",
    view: "hengdong/screens/TodayScreen.vue",
    defaultVariantId: "default",
    queryKeys: ["state"],
    shellFragments: [
      { screenId: "hengdong.today", pbId: "hengdong.today.tab-viewport" },
      { screenId: "hengdong.today", pbId: "hengdong.today.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "今日下一步",
        requiredFragments: [
          { screenId: "hengdong.today", pbId: "hengdong.today.root" },
          { screenId: "hengdong.today", pbId: "hengdong.today.utility" },
          { screenId: "hengdong.today", pbId: "hengdong.today.next-action" },
          { screenId: "hengdong.today", pbId: "hengdong.today.goal-ring" },
          { screenId: "hengdong.today", pbId: "hengdong.today.primary-action" },
          { screenId: "hengdong.today", pbId: "hengdong.today.week-rhythm" },
          { screenId: "hengdong.today", pbId: "hengdong.today.recent" },
        ],
      },
      {
        id: "in-progress",
        label: "继续进行中的训练",
      },
      {
        id: "completed",
        label: "今天已经完成",
      },
      {
        id: "no-plan",
        label: "没有当前计划",
      },
      {
        id: "recent-empty",
        label: "最近记录为空",
      },
      {
        id: "quick-record-open",
        label: "快速记录流程",
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.quick-record-sheet",
          },
        ],
      },
      {
        id: "record-detail-open",
        label: "今天页记录详情",
        query: { record: "record-20260812" },
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-content",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-outcome",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-facts",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-exercises",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-note",
          },
        ],
      },
      {
        id: "record-detail-quick",
        label: "今天页快捷记录详情",
        query: { record: "record-detail-quick-no-note" },
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-content",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-outcome",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-facts",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-note",
          },
        ],
      },
      {
        id: "record-detail-long-note",
        label: "今天页长备注记录详情",
        query: { record: "record-detail-long-note" },
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-content",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-outcome",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-facts",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-exercises",
          },
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.record-detail-note",
          },
        ],
      },
      {
        id: "day-empty-feedback",
        label: "无记录日期反馈",
        query: { date: "2026-08-11" },
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.day-empty-feedback",
          },
        ],
      },
    ],
    actions: [
      {
        id: "activate-primary",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.start-workout",
        },
      },
      {
        id: "activate-ring",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.goal-ring",
        },
      },
      {
        id: "open-quick-record",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.quick-record",
        },
      },
      {
        id: "open-rhythm-day",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.week-rhythm.day",
          pbKey: "2026-08-12",
        },
      },
      {
        id: "show-empty-rhythm-day",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.week-rhythm.day",
          pbKey: "2026-08-11",
        },
      },
      {
        id: "open-recent-record",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.record-row",
          pbKey: "record-20260812",
        },
      },
    ],
    scenarios: [
      {
        id: "begin-today-workout",
        label: "开始今天的训练",
        initialVariantId: "default",
        actionIds: ["activate-primary"],
        checkpoints: [
          {
            id: "session-focused",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.current-exercise",
              },
            ],
          },
        ],
      },
      {
        id: "begin-today-workout-from-ring",
        label: "从周目标环开始训练",
        initialVariantId: "default",
        actionIds: ["activate-ring"],
        checkpoints: [
          {
            id: "ring-session-focused",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.current-exercise",
              },
            ],
          },
        ],
      },
      {
        id: "inspect-recorded-rhythm-day",
        label: "查看有记录的节奏日",
        initialVariantId: "default",
        actionIds: ["open-rhythm-day"],
        checkpoints: [
          {
            id: "recorded-day-detail-open",
            screenId: "hengdong.today",
            variantId: "record-detail-open",
            requiredFragments: [
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.record-detail",
              },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.record-detail-content",
              },
            ],
          },
        ],
      },
      {
        id: "inspect-empty-rhythm-day",
        label: "查看无记录的节奏日",
        initialVariantId: "default",
        actionIds: ["show-empty-rhythm-day"],
        checkpoints: [
          {
            id: "empty-day-feedback-visible",
            screenId: "hengdong.today",
            variantId: "day-empty-feedback",
            requiredFragments: [
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.day-empty-feedback",
              },
            ],
          },
        ],
      },
      {
        id: "inspect-recent-record",
        label: "查看最近记录",
        initialVariantId: "default",
        actionIds: ["open-recent-record"],
        checkpoints: [
          {
            id: "recent-record-detail-open",
            screenId: "hengdong.today",
            variantId: "record-detail-open",
            requiredFragments: [
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.record-detail",
              },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.record-detail-content",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "begin-today-workout",
      "begin-today-workout-from-ring",
      "inspect-recorded-rhythm-day",
      "inspect-empty-rhythm-day",
      "inspect-recent-record",
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.plans",
    screenSlug: "plans",
    label: "计划",
    title: "计划",
    path: "/prototype/hengdong/plans",
    view: "hengdong/screens/PlansScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.plans", pbId: "hengdong.plans.app-bar" },
      { screenId: "hengdong.plans", pbId: "hengdong.plans.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "当前与推荐计划",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.root" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.current" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.filters" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.list" },
          {
            screenId: "hengdong.plans",
            pbId: "hengdong.plans.plan-row",
            pbKey: "full-body-basic",
          },
        ],
      },
      {
        id: "filtered",
        label: "力量筛选",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.filters" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.list" },
        ],
      },
      {
        id: "empty",
        label: "筛选无结果",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.empty" },
        ],
      },
      {
        id: "plan-editor-open",
        label: "计划编辑流程",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.plan-editor" },
        ],
      },
    ],
    actions: [
      {
        id: "open-current-plan",
        kind: "click",
        target: {
          screenId: "hengdong.plans",
          pbId: "hengdong.plans.open-current",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.progress",
    screenSlug: "progress",
    label: "进度",
    title: "进度",
    path: "/prototype/hengdong/progress",
    view: "hengdong/screens/ProgressScreen.vue",
    queryKeys: ["record"],
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.progress", pbId: "hengdong.progress.app-bar" },
      { screenId: "hengdong.progress", pbId: "hengdong.progress.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "周期进度",
        requiredFragments: [
          { screenId: "hengdong.progress", pbId: "hengdong.progress.root" },
          { screenId: "hengdong.progress", pbId: "hengdong.progress.summary" },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.activity-chart",
          },
          { screenId: "hengdong.progress", pbId: "hengdong.progress.calendar" },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-list",
          },
        ],
      },
      {
        id: "empty",
        label: "无活动记录",
        requiredFragments: [
          { screenId: "hengdong.progress", pbId: "hengdong.progress.empty" },
        ],
      },
      {
        id: "filter-open",
        label: "活动筛选",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.filter-sheet",
          },
        ],
      },
      {
        id: "record-detail-open",
        label: "记录详情",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-detail",
          },
        ],
      },
      {
        id: "delete-confirm-open",
        label: "删除记录确认",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.delete-confirm",
          },
        ],
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.plan-detail",
    screenSlug: "plan-detail",
    label: "计划详情",
    title: "计划详情",
    path: "/prototype/hengdong/plan-detail",
    view: "hengdong/screens/PlanDetailScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.plan-detail",
        pbId: "hengdong.plan-detail.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "计划判断与动作",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.root",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.summary",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.exercise-list",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.primary",
          },
        ],
      },
      {
        id: "plan-editor-open",
        label: "编辑计划流程",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.plan-editor",
          },
        ],
      },
    ],
    actions: [
      {
        id: "plan-primary",
        kind: "click",
        target: {
          screenId: "hengdong.plan-detail",
          pbId: "hengdong.plan-detail.primary",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.workout-session",
    screenSlug: "workout-session",
    label: "训练执行",
    title: "训练执行",
    path: "/prototype/hengdong/workout-session",
    view: "hengdong/screens/WorkoutSessionScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "当前动作",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.root",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.focus-header",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.sequence",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.current-exercise",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.body-stage",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.actions",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.complete-exercise",
          },
        ],
      },
      {
        id: "paused",
        label: "训练暂停",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.current-exercise",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.actions",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.resume",
          },
        ],
      },
      {
        id: "resumed",
        label: "中断后恢复",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.resume-notice",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.resume",
          },
        ],
      },
      {
        id: "exit-confirm-open",
        label: "已有进度的退出选择",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.exit-sheet",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.exit-results",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.leave-later",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.save-partial",
          },
        ],
      },
      {
        id: "exit-confirm-empty",
        label: "尚无完成动作的退出选择",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.exit-sheet",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.exit-results",
          },
        ],
      },
      {
        id: "last-exercise",
        label: "最后一个动作",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.current-exercise",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.complete-exercise",
          },
        ],
      },
      {
        id: "invalid-session",
        label: "会话无法恢复",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.recovery",
          },
        ],
      },
    ],
    actions: [
      {
        id: "pause-workout",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.pause",
        },
      },
      {
        id: "resume-workout",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.resume",
        },
      },
      {
        id: "complete-exercise",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.complete-exercise",
        },
      },
      {
        id: "leave-for-later",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.leave-later",
        },
      },
      {
        id: "save-partial-workout",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.save-partial",
        },
      },
    ],
    scenarios: [
      {
        id: "pause-current-workout",
        label: "暂停当前训练",
        initialVariantId: "default",
        actionIds: ["pause-workout"],
        checkpoints: [
          {
            id: "session-paused",
            screenId: "hengdong.workout-session",
            variantId: "paused",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.current-exercise",
              },
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.resume",
              },
            ],
          },
        ],
      },
      {
        id: "leave-workout-for-later",
        label: "保留进度稍后继续",
        initialVariantId: "exit-confirm-open",
        actionIds: ["leave-for-later"],
        checkpoints: [
          {
            id: "today-shows-resume",
            screenId: "hengdong.today",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.next-action",
              },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.goal-ring",
              },
            ],
          },
        ],
      },
      {
        id: "finish-final-exercise",
        label: "完成最后一个动作",
        initialVariantId: "last-exercise",
        actionIds: ["complete-exercise"],
        checkpoints: [
          {
            id: "complete-summary-open",
            screenId: "hengdong.workout-complete",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-complete",
                pbId: "hengdong.workout-complete.summary",
              },
              {
                screenId: "hengdong.workout-complete",
                pbId: "hengdong.workout-complete.reflection",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "pause-current-workout",
      "leave-workout-for-later",
      "finish-final-exercise",
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.workout-complete",
    screenSlug: "workout-complete",
    label: "训练总结",
    title: "训练总结",
    path: "/prototype/hengdong/workout-complete",
    view: "hengdong/screens/WorkoutCompleteScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "完成反馈",
        requiredFragments: [
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.root",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.summary",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.result-ring",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.facts",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.exercise-list",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.week-impact",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.reflection",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.actions",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.save",
          },
        ],
      },
      {
        id: "partial",
        label: "部分完成反馈",
        requiredFragments: [
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.summary",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.exercise-list",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.reflection",
          },
        ],
      },
      {
        id: "ready-to-save",
        label: "已选择体感",
        requiredFragments: [
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.reflection",
          },
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.save",
          },
        ],
      },
      {
        id: "leave-confirm-open",
        label: "未保存离开确认",
        requiredFragments: [
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.leave-confirm",
          },
        ],
      },
      {
        id: "invalid-summary",
        label: "总结无法恢复",
        requiredFragments: [
          {
            screenId: "hengdong.workout-complete",
            pbId: "hengdong.workout-complete.recovery",
          },
        ],
      },
    ],
    actions: [
      {
        id: "save-workout",
        kind: "click",
        target: {
          screenId: "hengdong.workout-complete",
          pbId: "hengdong.workout-complete.save",
        },
      },
    ],
    scenarios: [
      {
        id: "save-completed-workout",
        label: "保存完成的训练",
        initialVariantId: "ready-to-save",
        actionIds: ["save-workout"],
        checkpoints: [
          {
            id: "today-updated",
            screenId: "hengdong.today",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.next-action",
              },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.goal-ring",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["save-completed-workout"],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.settings-goals",
    screenSlug: "settings-goals",
    label: "设置与目标",
    title: "设置与目标",
    path: "/prototype/hengdong/settings-goals",
    view: "hengdong/screens/SettingsGoalsScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.settings-goals",
        pbId: "hengdong.settings-goals.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "目标与本地偏好",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.root",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.form",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.target",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.save",
          },
        ],
      },
    ],
    actions: [
      {
        id: "save-settings",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.save",
        },
      },
    ],
  },
] satisfies ScreenRecord[];

const registeredScreens = [
  {
    prototypeId: "cold-chain-ops",
    screenId: "cold-chain-ops.exception-queue",
    screenSlug: "exception-queue",
    label: "异常队列",
    title: "冷链异常",
    path: "/prototype/cold-chain-ops/exception-queue",
    view: "cold-chain-ops/screens/ExceptionQueue.vue",
    queryKeys: ["shipment"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "cold-chain-ops.exception-queue",
        pbId: "cold-chain-ops.exception-queue.root",
      },
      {
        screenId: "cold-chain-ops.exception-queue",
        pbId: "cold-chain-ops.exception-queue.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "待处理异常",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.root",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.summary",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.search",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.filters",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.list",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.list.row",
            pbKey: "ex-017",
          },
        ],
      },
      {
        id: "critical-only",
        label: "仅严重异常",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.root",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.filters",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.list",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.list.row",
            pbKey: "ex-017",
          },
        ],
      },
      {
        id: "loading",
        label: "加载中",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.root",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.loading",
          },
        ],
      },
      {
        id: "empty",
        label: "无待处理异常",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.root",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.empty",
          },
        ],
      },
      {
        id: "error",
        label: "数据不可用",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.root",
          },
          {
            screenId: "cold-chain-ops.exception-queue",
            pbId: "cold-chain-ops.exception-queue.error",
          },
        ],
      },
    ],
    actions: [
      {
        id: "show-critical",
        kind: "click",
        target: {
          screenId: "cold-chain-ops.exception-queue",
          pbId: "cold-chain-ops.exception-queue.show-critical",
        },
      },
      {
        id: "open-primary-exception",
        kind: "click",
        target: {
          screenId: "cold-chain-ops.exception-queue",
          pbId: "cold-chain-ops.exception-queue.list.row",
          pbKey: "ex-017",
        },
      },
    ],
    scenarios: [
      {
        id: "focus-critical",
        label: "筛选严重异常",
        initialVariantId: "default",
        actionIds: ["show-critical"],
        checkpoints: [
          {
            id: "critical-filtered",
            screenId: "cold-chain-ops.exception-queue",
            variantId: "critical-only",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.exception-queue",
                pbId: "cold-chain-ops.exception-queue.list",
              },
              {
                screenId: "cold-chain-ops.exception-queue",
                pbId: "cold-chain-ops.exception-queue.list.row",
                pbKey: "ex-017",
              },
            ],
            expectedFragmentKeys: [
              {
                fragment: {
                  screenId: "cold-chain-ops.exception-queue",
                  pbId: "cold-chain-ops.exception-queue.list.row",
                },
                keys: ["ex-017", "ex-031"],
              },
            ],
            forbiddenFragments: [
              {
                screenId: "cold-chain-ops.exception-queue",
                pbId: "cold-chain-ops.exception-queue.list.row",
                pbKey: "ex-024",
              },
            ],
          },
        ],
      },
      {
        id: "inspect-primary-exception",
        label: "查看首要异常运输详情",
        initialVariantId: "default",
        actionIds: ["open-primary-exception"],
        checkpoints: [
          {
            id: "shipment-opened",
            screenId: "cold-chain-ops.shipment-detail",
            variantId: "active-excursion",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.shipment-detail",
                pbId: "cold-chain-ops.shipment-detail.root",
              },
              {
                screenId: "cold-chain-ops.shipment-detail",
                pbId: "cold-chain-ops.shipment-detail.temperature-chart",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["focus-critical", "inspect-primary-exception"],
  },
  {
    prototypeId: "cold-chain-ops",
    screenId: "cold-chain-ops.shipment-detail",
    screenSlug: "shipment-detail",
    label: "运输详情",
    title: "运输详情",
    path: "/prototype/cold-chain-ops/shipment-detail",
    view: "cold-chain-ops/screens/ShipmentDetail.vue",
    queryKeys: ["shipment"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "cold-chain-ops.shipment-detail",
        pbId: "cold-chain-ops.shipment-detail.root",
      },
      {
        screenId: "cold-chain-ops.shipment-detail",
        pbId: "cold-chain-ops.shipment-detail.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "运输正常",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.root",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.summary",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.temperature-chart",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.timeline",
          },
        ],
      },
      {
        id: "active-excursion",
        label: "持续超温",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.root",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.alert",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.temperature-chart",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.open-actions",
          },
        ],
      },
      {
        id: "sensor-offline",
        label: "传感器离线",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.root",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.sensor-error",
          },
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.timeline",
          },
        ],
      },
      {
        id: "action-sheet-open",
        label: "处置操作打开",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.action-sheet",
          },
        ],
      },
      {
        id: "acknowledge-dialog-open",
        label: "确认接手",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.shipment-detail",
            pbId: "cold-chain-ops.shipment-detail.ack-dialog",
          },
        ],
      },
    ],
    actions: [
      {
        id: "open-actions",
        kind: "click",
        target: {
          screenId: "cold-chain-ops.shipment-detail",
          pbId: "cold-chain-ops.shipment-detail.open-actions",
        },
      },
      {
        id: "open-resolution",
        kind: "click",
        target: {
          screenId: "cold-chain-ops.shipment-detail",
          pbId: "cold-chain-ops.shipment-detail.open-resolution",
        },
      },
    ],
    scenarios: [
      {
        id: "reveal-response-options",
        label: "打开处置选项",
        initialVariantId: "active-excursion",
        actionIds: ["open-actions"],
        checkpoints: [
          {
            id: "response-sheet-visible",
            screenId: "cold-chain-ops.shipment-detail",
            variantId: "action-sheet-open",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.shipment-detail",
                pbId: "cold-chain-ops.shipment-detail.action-sheet",
              },
            ],
          },
        ],
      },
      {
        id: "start-resolution",
        label: "开始填写处置记录",
        initialVariantId: "action-sheet-open",
        actionIds: ["open-resolution"],
        checkpoints: [
          {
            id: "resolution-ready",
            screenId: "cold-chain-ops.resolution-form",
            variantId: "ready-to-submit",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.root",
              },
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.response-form",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["reveal-response-options", "start-resolution"],
  },
  {
    prototypeId: "cold-chain-ops",
    screenId: "cold-chain-ops.resolution-form",
    screenSlug: "resolution-form",
    label: "处置记录",
    title: "提交处置",
    path: "/prototype/cold-chain-ops/resolution-form",
    view: "cold-chain-ops/screens/ResolutionForm.vue",
    queryKeys: ["shipment"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "cold-chain-ops.resolution-form",
        pbId: "cold-chain-ops.resolution-form.root",
      },
      {
        screenId: "cold-chain-ops.resolution-form",
        pbId: "cold-chain-ops.resolution-form.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "待填写",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.root",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.response-form",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.submit",
          },
        ],
      },
      {
        id: "validation-error",
        label: "校验失败",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.root",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.validation-error",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.response-form",
          },
        ],
      },
      {
        id: "ready-to-submit",
        label: "信息完整",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.root",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.response-form",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.submit",
          },
        ],
      },
      {
        id: "approval-required",
        label: "等待主管审批",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.root",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.supervisor-approval",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.submit",
          },
        ],
      },
      {
        id: "approval-validation-error",
        label: "主管审批缺失",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.validation-error",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.supervisor-approval",
          },
        ],
      },
      {
        id: "confirm-dialog-open",
        label: "确认提交",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.confirm-dialog",
          },
        ],
      },
      {
        id: "submitted",
        label: "提交成功",
        requiredFragments: [
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.root",
          },
          {
            screenId: "cold-chain-ops.resolution-form",
            pbId: "cold-chain-ops.resolution-form.success-toast",
          },
        ],
      },
    ],
    actions: [
      {
        id: "submit-resolution",
        kind: "click",
        target: {
          screenId: "cold-chain-ops.resolution-form",
          pbId: "cold-chain-ops.resolution-form.submit",
        },
      },
    ],
    scenarios: [
      {
        id: "reject-incomplete-resolution",
        label: "拒绝不完整处置记录",
        initialVariantId: "default",
        actionIds: ["submit-resolution"],
        checkpoints: [
          {
            id: "required-fields-visible",
            screenId: "cold-chain-ops.resolution-form",
            variantId: "validation-error",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.validation-error",
              },
            ],
            forbiddenFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.success-toast",
              },
            ],
          },
        ],
      },
      {
        id: "confirm-complete-resolution",
        label: "确认完整处置记录",
        initialVariantId: "ready-to-submit",
        actionIds: ["submit-resolution"],
        checkpoints: [
          {
            id: "confirmation-visible",
            screenId: "cold-chain-ops.resolution-form",
            variantId: "confirm-dialog-open",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.confirm-dialog",
              },
            ],
          },
        ],
      },
      {
        id: "reject-missing-supervisor-approval",
        label: "拒绝缺少主管审批的记录",
        initialVariantId: "approval-required",
        actionIds: ["submit-resolution"],
        checkpoints: [
          {
            id: "supervisor-required-visible",
            screenId: "cold-chain-ops.resolution-form",
            variantId: "approval-validation-error",
            requiredFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.validation-error",
              },
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.supervisor-approval",
              },
            ],
            forbiddenFragments: [
              {
                screenId: "cold-chain-ops.resolution-form",
                pbId: "cold-chain-ops.resolution-form.confirm-dialog",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "reject-incomplete-resolution",
      "confirm-complete-resolution",
      "reject-missing-supervisor-approval",
    ],
  },
] satisfies ScreenRecord[];

export const prototypeScreens = [
  ...registeredScreens,
  ...redesignedHengdongScreens,
] satisfies ScreenRecord[];

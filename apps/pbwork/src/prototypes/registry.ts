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
        id: "activity-flow",
        label: "活动记录",
        screenSlugs: ["activity-history"],
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
        label: "本地身份登录",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.root" },
          { screenId: "hengdong.login", pbId: "hengdong.login.brand-mark" },
          { screenId: "hengdong.login", pbId: "hengdong.login.form" },
          { screenId: "hengdong.login", pbId: "hengdong.login.username" },
          { screenId: "hengdong.login", pbId: "hengdong.login.password" },
          { screenId: "hengdong.login", pbId: "hengdong.login.submit" },
          { screenId: "hengdong.login", pbId: "hengdong.login.local-note" },
        ],
      },
      { id: "ready", label: "已填写有效凭据" },
      {
        id: "validation-error",
        label: "登录必填错误",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.username" },
          { screenId: "hengdong.login", pbId: "hengdong.login.password" },
        ],
      },
      {
        id: "invalid-credentials",
        label: "账号或密码错误",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.password" },
        ],
      },
      {
        id: "no-identity",
        label: "当前设备无本地身份",
        requiredFragments: [
          { screenId: "hengdong.login", pbId: "hengdong.login.no-identity" },
          { screenId: "hengdong.login", pbId: "hengdong.login.open-register" },
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
    scenarios: [
      {
        id: "enter-with-local-identity",
        label: "使用本地身份进入恒动",
        initialVariantId: "ready",
        actionIds: ["login"],
        checkpoints: [
          {
            id: "today-open",
            screenId: "hengdong.today",
            variantId: "default",
            requiredFragments: [
              { screenId: "hengdong.today", pbId: "hengdong.today.root" },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.next-action",
              },
            ],
          },
        ],
      },
      {
        id: "reject-invalid-credentials",
        label: "拒绝错误账号或密码",
        initialVariantId: "invalid-credentials",
        actionIds: ["login"],
        checkpoints: [
          {
            id: "credential-error-visible",
            screenId: "hengdong.login",
            variantId: "invalid-credentials",
            requiredFragments: [
              { screenId: "hengdong.login", pbId: "hengdong.login.password" },
            ],
          },
        ],
      },
      {
        id: "open-local-registration",
        label: "从登录进入重建本地身份",
        initialVariantId: "default",
        actionIds: ["open-register"],
        checkpoints: [
          {
            id: "replacement-registration-open",
            screenId: "hengdong.register",
            variantId: "replace-identity",
            requiredFragments: [
              { screenId: "hengdong.register", pbId: "hengdong.register.root" },
              {
                screenId: "hengdong.register",
                pbId: "hengdong.register.replace-note",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "enter-with-local-identity",
      "reject-invalid-credentials",
      "open-local-registration",
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
        label: "建立本地身份",
        requiredFragments: [
          { screenId: "hengdong.register", pbId: "hengdong.register.root" },
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.brand-mark",
          },
          { screenId: "hengdong.register", pbId: "hengdong.register.form" },
          { screenId: "hengdong.register", pbId: "hengdong.register.name" },
          { screenId: "hengdong.register", pbId: "hengdong.register.username" },
          { screenId: "hengdong.register", pbId: "hengdong.register.password" },
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.weekly-target",
          },
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.local-note",
          },
          { screenId: "hengdong.register", pbId: "hengdong.register.submit" },
        ],
      },
      { id: "ready", label: "已填写有效身份" },
      {
        id: "validation-error",
        label: "注册字段错误",
        requiredFragments: [
          { screenId: "hengdong.register", pbId: "hengdong.register.name" },
          { screenId: "hengdong.register", pbId: "hengdong.register.username" },
          { screenId: "hengdong.register", pbId: "hengdong.register.password" },
        ],
      },
      {
        id: "replace-identity",
        label: "替换本地身份",
        requiredFragments: [
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.replace-note",
          },
          { screenId: "hengdong.register", pbId: "hengdong.register.submit" },
        ],
      },
      {
        id: "replace-confirm-open",
        label: "替换身份确认",
        requiredFragments: [
          {
            screenId: "hengdong.register",
            pbId: "hengdong.register.replace-confirm",
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
      {
        id: "back-login",
        kind: "click",
        target: {
          screenId: "hengdong.register",
          pbId: "hengdong.register.back-login",
        },
      },
      {
        id: "confirm-replace",
        kind: "click",
        target: {
          screenId: "hengdong.register",
          pbId: "hengdong.register.replace-confirm.confirm",
        },
      },
    ],
    scenarios: [
      {
        id: "create-local-identity",
        label: "创建本地身份并进入今天",
        initialVariantId: "ready",
        actionIds: ["register"],
        checkpoints: [
          {
            id: "today-open-for-new-identity",
            screenId: "hengdong.today",
            variantId: "default",
            requiredFragments: [
              { screenId: "hengdong.today", pbId: "hengdong.today.root" },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.utility",
              },
            ],
          },
        ],
      },
      {
        id: "request-identity-replacement",
        label: "提交替换本地身份",
        initialVariantId: "replace-identity",
        actionIds: ["register"],
        checkpoints: [
          {
            id: "replacement-confirm-visible",
            screenId: "hengdong.register",
            variantId: "replace-confirm-open",
            requiredFragments: [
              {
                screenId: "hengdong.register",
                pbId: "hengdong.register.replace-confirm",
              },
            ],
          },
        ],
      },
      {
        id: "confirm-identity-replacement",
        label: "确认替换并进入今天",
        initialVariantId: "replace-confirm-open",
        actionIds: ["confirm-replace"],
        checkpoints: [
          {
            id: "today-open-after-replacement",
            screenId: "hengdong.today",
            variantId: "default",
            requiredFragments: [
              { screenId: "hengdong.today", pbId: "hengdong.today.root" },
              {
                screenId: "hengdong.today",
                pbId: "hengdong.today.utility",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "create-local-identity",
      "request-identity-replacement",
      "confirm-identity-replacement",
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.today",
    screenSlug: "today",
    label: "今天",
    title: "今天",
    path: "/prototype/hengdong/today",
    view: "hengdong/screens/HengdongMain.vue",
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
          pbKey: "day-2026-08-12",
        },
      },
      {
        id: "show-empty-rhythm-day",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.week-rhythm.day",
          pbKey: "day-2026-08-11",
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
      {
        id: "open-activity-history",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.open-activity-history",
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
      {
        id: "review-all-activity",
        label: "查看全部活动记录",
        initialVariantId: "default",
        actionIds: ["open-activity-history"],
        checkpoints: [
          {
            id: "activity-history-open",
            screenId: "hengdong.activity-history",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.activity-history",
                pbId: "hengdong.activity-history.root",
              },
              {
                screenId: "hengdong.activity-history",
                pbId: "hengdong.activity-history.timeline",
                pbKey: "all",
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
      "review-all-activity",
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.activity-history",
    screenSlug: "activity-history",
    label: "活动记录",
    title: "活动记录",
    path: "/prototype/hengdong/activity-history",
    view: "hengdong/screens/ActivityHistoryScreen.vue",
    queryKeys: ["record"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.activity-history",
        pbId: "hengdong.activity-history.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "完整活动时间线",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.root",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.tabs",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.timeline",
            pbKey: "all",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-row",
            pbKey: "all-record-20260812",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.open-month",
          },
        ],
      },
      {
        id: "training",
        label: "训练分类",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.timeline",
            pbKey: "training",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-row",
            pbKey: "training-record-20260812",
          },
        ],
      },
      {
        id: "refreshing",
        label: "刷新中",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.list.all",
          },
        ],
      },
      {
        id: "loading-more",
        label: "加载更早记录",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.list.all",
          },
        ],
      },
      {
        id: "filtered-empty",
        label: "分类无记录",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.list.free.empty",
          },
        ],
      },
      {
        id: "empty",
        label: "全部记录为空",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.list.all.empty",
          },
        ],
      },
      {
        id: "month-picker-open",
        label: "定位月份",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.open-month",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.month-sheet",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.month-options",
          },
        ],
      },
      {
        id: "record-detail-open",
        label: "活动详情",
        query: { record: "record-20260812" },
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-detail",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-detail-content",
          },
        ],
      },
      {
        id: "record-detail-long-note",
        label: "长备注活动详情",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-detail",
          },
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.record-detail-content",
          },
        ],
      },
      {
        id: "delete-confirm-open",
        label: "删除记录确认",
        query: { record: "record-20260812" },
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.delete-confirm",
          },
        ],
      },
      {
        id: "undo-visible",
        label: "删除后可撤销",
        requiredFragments: [
          {
            screenId: "hengdong.activity-history",
            pbId: "hengdong.activity-history.undo-feedback",
          },
        ],
      },
    ],
    actions: [
      {
        id: "switch-training",
        kind: "click",
        target: {
          screenId: "hengdong.activity-history",
          pbId: "hengdong.activity-history.tabs.tab",
          pbKey: "training",
        },
      },
      {
        id: "open-record",
        kind: "click",
        target: {
          screenId: "hengdong.activity-history",
          pbId: "hengdong.activity-history.record-row",
          pbKey: "all-record-20260812",
        },
      },
      {
        id: "delete-record",
        kind: "click",
        target: {
          screenId: "hengdong.activity-history",
          pbId: "hengdong.activity-history.delete-record",
        },
      },
      {
        id: "confirm-delete",
        kind: "click",
        target: {
          screenId: "hengdong.activity-history",
          pbId: "hengdong.activity-history.delete-confirm.confirm",
        },
      },
      {
        id: "undo-delete",
        kind: "click",
        target: {
          screenId: "hengdong.activity-history",
          pbId: "hengdong.activity-history.undo-delete",
        },
      },
    ],
    scenarios: [
      {
        id: "filter-training-history",
        label: "切换到训练记录",
        initialVariantId: "default",
        actionIds: ["switch-training"],
        checkpoints: [
          {
            id: "training-history-visible",
            screenId: "hengdong.activity-history",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.activity-history",
                pbId: "hengdong.activity-history.timeline",
                pbKey: "training",
              },
            ],
          },
        ],
      },
      {
        id: "delete-and-undo-history",
        label: "删除并撤销活动记录",
        initialVariantId: "default",
        actionIds: [
          "open-record",
          "delete-record",
          "confirm-delete",
          "undo-delete",
        ],
        checkpoints: [
          {
            id: "history-record-restored",
            screenId: "hengdong.activity-history",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.activity-history",
                pbId: "hengdong.activity-history.record-row",
                pbKey: "all-record-20260812",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["filter-training-history", "delete-and-undo-history"],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.plans",
    screenSlug: "plans",
    label: "计划",
    title: "计划",
    path: "/prototype/hengdong/plans",
    view: "hengdong/screens/HengdongMain.vue",
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
            pbKey: "all-wake-up-15",
          },
          {
            screenId: "hengdong.plans",
            pbId: "hengdong.plans.plan-row.current",
            pbKey: "all-wake-up-15",
          },
          {
            screenId: "hengdong.plans",
            pbId: "hengdong.plans.plan-row",
            pbKey: "all-full-body-basic",
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
      {
        id: "plan-editor-validation",
        label: "计划编辑校验错误",
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
      {
        id: "start-current-plan",
        kind: "click",
        target: {
          screenId: "hengdong.plans",
          pbId: "hengdong.plans.start-current",
        },
      },
      {
        id: "filter-recommended-plans",
        kind: "click",
        target: {
          screenId: "hengdong.plans",
          pbId: "hengdong.plans.filters",
        },
      },
      {
        id: "open-candidate-plan",
        kind: "click",
        target: {
          screenId: "hengdong.plans",
          pbId: "hengdong.plans.plan-row",
          pbKey: "all-full-body-basic",
        },
      },
    ],
    scenarios: [
      {
        id: "open-current-plan-detail",
        label: "查看当前计划详情",
        initialVariantId: "default",
        actionIds: ["open-current-plan"],
        checkpoints: [
          {
            id: "current-plan-detail-visible",
            screenId: "hengdong.plan-detail",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.summary",
              },
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.primary",
              },
            ],
          },
        ],
      },
      {
        id: "start-current-plan-from-plans",
        label: "从计划页开始当前训练",
        initialVariantId: "default",
        actionIds: ["start-current-plan"],
        checkpoints: [
          {
            id: "current-workout-visible",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
            ],
          },
        ],
      },
      {
        id: "open-candidate-plan",
        label: "打开候选计划详情",
        initialVariantId: "default",
        actionIds: ["open-candidate-plan"],
        checkpoints: [
          {
            id: "candidate-plan-detail-visible",
            screenId: "hengdong.plan-detail",
            variantId: "candidate",
            requiredFragments: [
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.start-once",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "open-current-plan-detail",
      "start-current-plan-from-plans",
      "open-candidate-plan",
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.progress",
    screenSlug: "progress",
    label: "进度",
    title: "进度",
    path: "/prototype/hengdong/progress",
    view: "hengdong/screens/HengdongMain.vue",
    queryKeys: ["record"],
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.progress", pbId: "hengdong.progress.app-bar" },
      { screenId: "hengdong.progress", pbId: "hengdong.progress.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "本周活动节奏",
        requiredFragments: [
          { screenId: "hengdong.progress", pbId: "hengdong.progress.root" },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.period-tabs",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.summary",
            pbKey: "week",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.rhythm.week",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.date-view.week",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-list.week",
          },
        ],
      },
      {
        id: "month",
        label: "本月活动节奏",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.summary",
            pbKey: "month",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.rhythm.month",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.date-view.month",
          },
        ],
      },
      {
        id: "year",
        label: "本年活动节奏",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.summary",
            pbKey: "year",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.rhythm.year",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.date-view.year",
          },
        ],
      },
      {
        id: "custom-range-open",
        label: "自定义日期范围",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.custom-range-sheet",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.custom-range-form",
          },
        ],
      },
      {
        id: "custom",
        label: "自定义范围结果",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.summary",
            pbKey: "custom",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.rhythm.custom",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.date-view.custom",
          },
        ],
      },
      {
        id: "selected-date",
        label: "日期已聚焦",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.date-view.week.day",
            pbKey: "date-2026-08-12",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-list.week",
          },
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
        id: "period-picker-open",
        label: "周期选择",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.period-picker",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.period-options",
          },
        ],
      },
      {
        id: "empty",
        label: "无活动记录",
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.empty.week",
          },
        ],
      },
      {
        id: "record-detail-open",
        label: "只读记录详情",
        query: { record: "record-20260812" },
        requiredFragments: [
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-detail",
          },
          {
            screenId: "hengdong.progress",
            pbId: "hengdong.progress.record-detail-content",
          },
        ],
      },
    ],
    actions: [
      {
        id: "switch-month",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.period-tabs.tab",
          pbKey: "month",
        },
      },
      {
        id: "select-recorded-date",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.date-view.week.day",
          pbKey: "date-2026-08-12",
        },
      },
      {
        id: "open-custom-range",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.open-custom-range",
        },
      },
      {
        id: "open-period-picker",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.range-value",
          pbKey: "week",
        },
      },
      {
        id: "apply-custom-range",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.apply-custom-range",
        },
      },
      {
        id: "open-progress-record",
        kind: "click",
        target: {
          screenId: "hengdong.progress",
          pbId: "hengdong.progress.record-row",
          pbKey: "week-record-20260812",
        },
      },
    ],
    scenarios: [
      {
        id: "review-month-progress",
        label: "切换到本月节奏",
        initialVariantId: "default",
        actionIds: ["switch-month"],
        checkpoints: [
          {
            id: "month-progress-visible",
            screenId: "hengdong.progress",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.progress",
                pbId: "hengdong.progress.summary",
                pbKey: "month",
              },
            ],
          },
        ],
      },
      {
        id: "focus-progress-date",
        label: "聚焦有活动的日期",
        initialVariantId: "default",
        actionIds: ["select-recorded-date"],
        checkpoints: [
          {
            id: "recorded-date-focused",
            screenId: "hengdong.progress",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.progress",
                pbId: "hengdong.progress.record-row",
                pbKey: "week-record-20260812",
              },
            ],
          },
        ],
      },
      {
        id: "apply-progress-custom-range",
        label: "应用自定义日期范围",
        initialVariantId: "default",
        actionIds: ["open-custom-range", "apply-custom-range"],
        checkpoints: [
          {
            id: "custom-progress-visible",
            screenId: "hengdong.progress",
            variantId: "custom",
            requiredFragments: [
              {
                screenId: "hengdong.progress",
                pbId: "hengdong.progress.summary",
                pbKey: "custom",
              },
            ],
          },
        ],
      },
      {
        id: "open-progress-period-picker",
        label: "打开周选择",
        initialVariantId: "default",
        actionIds: ["open-period-picker"],
        checkpoints: [
          {
            id: "period-picker-visible",
            screenId: "hengdong.progress",
            variantId: "period-picker-open",
            requiredFragments: [
              {
                screenId: "hengdong.progress",
                pbId: "hengdong.progress.period-picker",
              },
            ],
          },
        ],
      },
      {
        id: "inspect-progress-record",
        label: "查看进度中的记录事实",
        initialVariantId: "default",
        actionIds: ["open-progress-record"],
        checkpoints: [
          {
            id: "progress-record-detail-open",
            screenId: "hengdong.progress",
            variantId: "record-detail-open",
            requiredFragments: [
              {
                screenId: "hengdong.progress",
                pbId: "hengdong.progress.record-detail-content",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "review-month-progress",
      "focus-progress-date",
      "apply-progress-custom-range",
      "open-progress-period-picker",
      "inspect-progress-record",
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
            pbId: "hengdong.plan-detail.identity",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.facts",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.exercise-list",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.week",
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
      {
        id: "candidate",
        label: "候选计划分流",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.summary",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.identity",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.primary",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.start-once",
          },
        ],
      },
      {
        id: "adopted-feedback",
        label: "采用后的撤销反馈",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.adopt-feedback",
          },
        ],
      },
      {
        id: "invalid-plan",
        label: "无效计划",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.invalid",
          },
        ],
      },
      {
        id: "plan-editor-validation",
        label: "计划编辑校验错误",
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
      {
        id: "start-plan-once",
        kind: "click",
        target: {
          screenId: "hengdong.plan-detail",
          pbId: "hengdong.plan-detail.start-once",
        },
      },
      {
        id: "undo-adopt",
        kind: "click",
        target: {
          screenId: "hengdong.plan-detail",
          pbId: "hengdong.plan-detail.undo-adopt",
        },
      },
    ],
    scenarios: [
      {
        id: "start-current-plan-from-detail",
        label: "从计划详情开始当前训练",
        initialVariantId: "default",
        actionIds: ["plan-primary"],
        checkpoints: [
          {
            id: "detail-workout-visible",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
            ],
          },
        ],
      },
      {
        id: "adopt-candidate-plan",
        label: "采用候选计划并显示撤销",
        initialVariantId: "candidate",
        actionIds: ["plan-primary"],
        checkpoints: [
          {
            id: "candidate-adopted-feedback-visible",
            screenId: "hengdong.plan-detail",
            variantId: "candidate",
            requiredFragments: [
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.adopt-feedback",
              },
            ],
          },
        ],
      },
      {
        id: "start-candidate-once",
        label: "只开始候选计划一次",
        initialVariantId: "candidate",
        actionIds: ["start-plan-once"],
        checkpoints: [
          {
            id: "candidate-workout-visible",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: [
      "start-current-plan-from-detail",
      "adopt-candidate-plan",
      "start-candidate-once",
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
    label: "设置",
    title: "设置",
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
        label: "偏好分组",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.root",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.weekly",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reminder-enabled",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reminder-time",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.dark-mode",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.logout",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reset",
          },
        ],
      },
      {
        id: "reminder-off",
        label: "提醒关闭",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reminder-enabled",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.dark-mode",
          },
        ],
      },
      {
        id: "weekly-open",
        label: "选择每周活动",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.weekly-sheet",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.weekly-option",
            pbKey: "times-3",
          },
        ],
      },
      {
        id: "reminder-time-open",
        label: "编辑提醒时间",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reminder-time-sheet",
          },
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reminder-time-field",
          },
        ],
      },
      {
        id: "logout-confirm-open",
        label: "退出登录确认",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.logout-confirm",
          },
        ],
      },
      {
        id: "reset-confirm-open",
        label: "重置演示数据确认",
        requiredFragments: [
          {
            screenId: "hengdong.settings-goals",
            pbId: "hengdong.settings-goals.reset-confirm",
          },
        ],
      },
    ],
    actions: [
      {
        id: "open-weekly-target",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.weekly",
        },
      },
      {
        id: "choose-weekly-target",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.weekly-option",
          pbKey: "times-4",
        },
      },
      {
        id: "open-reminder-time",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.reminder-time",
        },
      },
      {
        id: "logout",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.logout",
        },
      },
      {
        id: "reset",
        kind: "click",
        target: {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.reset",
        },
      },
    ],
    scenarios: [
      {
        id: "change-weekly-target",
        label: "把每周活动改为 4 次",
        initialVariantId: "weekly-open",
        actionIds: ["choose-weekly-target"],
        checkpoints: [
          {
            id: "weekly-row-updated",
            screenId: "hengdong.settings-goals",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.settings-goals",
                pbId: "hengdong.settings-goals.weekly",
              },
              {
                screenId: "hengdong.settings-goals",
                pbId: "hengdong.settings-goals.weekly-value",
              },
            ],
          },
        ],
      },
      {
        id: "confirm-logout",
        label: "打开退出登录确认",
        initialVariantId: "default",
        actionIds: ["logout"],
        checkpoints: [
          {
            id: "logout-confirm-visible",
            screenId: "hengdong.settings-goals",
            variantId: "logout-confirm-open",
            requiredFragments: [
              {
                screenId: "hengdong.settings-goals",
                pbId: "hengdong.settings-goals.logout-confirm",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["change-weekly-target"],
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

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
        screenSlugs: ["today", "plans", "records", "profile"],
      },
      {
        id: "plan-flow",
        label: "计划与训练",
        screenSlugs: ["plan-detail", "workout-session", "plan-editor"],
      },
      {
        id: "review-and-goals",
        label: "复盘与目标",
        screenSlugs: ["record-detail", "stats", "goals"],
      },
    ],
  },
] satisfies PrototypeRecord[];

export const prototypeScreens = [
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
        label: "校验错误",
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
    title: "创建恒动账号",
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
        label: "校验错误",
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
    shellFragments: [
      { screenId: "hengdong.today", pbId: "hengdong.today.tab-viewport" },
      { screenId: "hengdong.today", pbId: "hengdong.today.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "今日建议",
        requiredFragments: [
          { screenId: "hengdong.today", pbId: "hengdong.today.root" },
          { screenId: "hengdong.today", pbId: "hengdong.today.hero" },
          { screenId: "hengdong.today", pbId: "hengdong.today.recommendation" },
          { screenId: "hengdong.today", pbId: "hengdong.today.summary" },
        ],
      },
      {
        id: "quick-checkin-open",
        label: "快速打卡",
        requiredFragments: [
          {
            screenId: "hengdong.today",
            pbId: "hengdong.today.quick-checkin-sheet",
          },
        ],
      },
    ],
    actions: [
      {
        id: "open-quick-checkin",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.quick-checkin",
        },
      },
      {
        id: "start-workout",
        kind: "click",
        target: {
          screenId: "hengdong.today",
          pbId: "hengdong.today.start-workout",
        },
      },
    ],
    scenarios: [
      {
        id: "begin-recommended-workout",
        label: "开始今日推荐训练",
        initialVariantId: "default",
        actionIds: ["start-workout"],
        checkpoints: [
          {
            id: "session-ready",
            screenId: "hengdong.workout-session",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.root",
              },
              {
                screenId: "hengdong.workout-session",
                pbId: "hengdong.workout-session.summary",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["begin-recommended-workout"],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.plans",
    screenSlug: "plans",
    label: "计划",
    title: "训练计划",
    path: "/prototype/hengdong/plans",
    view: "hengdong/screens/PlansScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.plans", pbId: "hengdong.plans.tab-viewport" },
      { screenId: "hengdong.plans", pbId: "hengdong.plans.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "计划列表",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.root" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.search" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.filters" },
          { screenId: "hengdong.plans", pbId: "hengdong.plans.list" },
          {
            screenId: "hengdong.plans",
            pbId: "hengdong.plans.list.row",
            pbKey: "wake-up-15",
          },
        ],
      },
      {
        id: "empty",
        label: "暂无计划",
        requiredFragments: [
          { screenId: "hengdong.plans", pbId: "hengdong.plans.empty" },
        ],
      },
    ],
    actions: [
      {
        id: "create-plan",
        kind: "click",
        target: { screenId: "hengdong.plans", pbId: "hengdong.plans.create" },
      },
      {
        id: "open-primary-plan",
        kind: "click",
        target: {
          screenId: "hengdong.plans",
          pbId: "hengdong.plans.list.row",
          pbKey: "wake-up-15",
        },
      },
    ],
    scenarios: [
      {
        id: "inspect-primary-plan",
        label: "查看首个训练计划",
        initialVariantId: "default",
        actionIds: ["open-primary-plan"],
        checkpoints: [
          {
            id: "plan-opened",
            screenId: "hengdong.plan-detail",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.root",
              },
              {
                screenId: "hengdong.plan-detail",
                pbId: "hengdong.plan-detail.hero",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["inspect-primary-plan"],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.records",
    screenSlug: "records",
    label: "记录",
    title: "训练记录",
    path: "/prototype/hengdong/records",
    view: "hengdong/screens/RecordsScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.records", pbId: "hengdong.records.tab-viewport" },
      { screenId: "hengdong.records", pbId: "hengdong.records.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "记录与日历",
        requiredFragments: [
          { screenId: "hengdong.records", pbId: "hengdong.records.root" },
          { screenId: "hengdong.records", pbId: "hengdong.records.calendar" },
          { screenId: "hengdong.records", pbId: "hengdong.records.week-chart" },
          { screenId: "hengdong.records", pbId: "hengdong.records.list" },
          {
            screenId: "hengdong.records",
            pbId: "hengdong.records.list.row",
            pbKey: "record-20260812",
          },
        ],
      },
      {
        id: "empty",
        label: "暂无记录",
        requiredFragments: [
          { screenId: "hengdong.records", pbId: "hengdong.records.empty" },
        ],
      },
    ],
    actions: [
      {
        id: "open-stats",
        kind: "click",
        target: {
          screenId: "hengdong.records",
          pbId: "hengdong.records.open-stats",
        },
      },
      {
        id: "open-primary-record",
        kind: "click",
        target: {
          screenId: "hengdong.records",
          pbId: "hengdong.records.list.row",
          pbKey: "record-20260812",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.profile",
    screenSlug: "profile",
    label: "我的",
    title: "我的",
    path: "/prototype/hengdong/profile",
    view: "hengdong/screens/ProfileScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.profile", pbId: "hengdong.profile.tab-viewport" },
      { screenId: "hengdong.profile", pbId: "hengdong.profile.tabbar" },
    ],
    variants: [
      {
        id: "default",
        label: "个人概览",
        requiredFragments: [
          { screenId: "hengdong.profile", pbId: "hengdong.profile.root" },
          { screenId: "hengdong.profile", pbId: "hengdong.profile.identity" },
          { screenId: "hengdong.profile", pbId: "hengdong.profile.lifetime" },
          {
            screenId: "hengdong.profile",
            pbId: "hengdong.profile.settings-list",
          },
        ],
      },
      {
        id: "signed-out",
        label: "已退出",
        requiredFragments: [
          { screenId: "hengdong.profile", pbId: "hengdong.profile.signed-out" },
        ],
      },
    ],
    actions: [
      {
        id: "open-goals",
        kind: "click",
        target: {
          screenId: "hengdong.profile",
          pbId: "hengdong.profile.open-goals",
        },
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
        label: "计划概览",
        requiredFragments: [
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.root",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.hero",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.exercise-list",
          },
          {
            screenId: "hengdong.plan-detail",
            pbId: "hengdong.plan-detail.start",
          },
        ],
      },
    ],
    actions: [
      {
        id: "start-session",
        kind: "click",
        target: {
          screenId: "hengdong.plan-detail",
          pbId: "hengdong.plan-detail.start",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.workout-session",
    screenSlug: "workout-session",
    label: "训练执行",
    title: "训练进行中",
    path: "/prototype/hengdong/workout-session",
    view: "hengdong/screens/WorkoutSessionScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.workout-session",
        pbId: "hengdong.workout-session.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "训练进行中",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.root",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.summary",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.progress",
          },
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.finish",
          },
        ],
      },
      {
        id: "exit-confirm-open",
        label: "退出确认",
        requiredFragments: [
          {
            screenId: "hengdong.workout-session",
            pbId: "hengdong.workout-session.exit-confirm",
          },
        ],
      },
    ],
    actions: [
      {
        id: "finish-session",
        kind: "click",
        target: {
          screenId: "hengdong.workout-session",
          pbId: "hengdong.workout-session.finish",
        },
      },
    ],
    scenarios: [
      {
        id: "complete-session",
        label: "完成并生成记录",
        initialVariantId: "default",
        actionIds: ["finish-session"],
        checkpoints: [
          {
            id: "record-created",
            screenId: "hengdong.record-detail",
            variantId: "completed",
            requiredFragments: [
              {
                screenId: "hengdong.record-detail",
                pbId: "hengdong.record-detail.root",
              },
              {
                screenId: "hengdong.record-detail",
                pbId: "hengdong.record-detail.summary",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["complete-session"],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.plan-editor",
    screenSlug: "plan-editor",
    label: "计划编辑",
    title: "新建或编辑计划",
    path: "/prototype/hengdong/plan-editor",
    view: "hengdong/screens/PlanEditorScreen.vue",
    queryKeys: ["plan"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.plan-editor",
        pbId: "hengdong.plan-editor.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "计划表单",
        requiredFragments: [
          {
            screenId: "hengdong.plan-editor",
            pbId: "hengdong.plan-editor.root",
          },
          {
            screenId: "hengdong.plan-editor",
            pbId: "hengdong.plan-editor.form",
          },
          {
            screenId: "hengdong.plan-editor",
            pbId: "hengdong.plan-editor.exercise-list",
          },
          {
            screenId: "hengdong.plan-editor",
            pbId: "hengdong.plan-editor.save",
          },
        ],
      },
      {
        id: "exercise-sheet-open",
        label: "选择动作",
        requiredFragments: [
          {
            screenId: "hengdong.plan-editor",
            pbId: "hengdong.plan-editor.exercise-sheet",
          },
        ],
      },
    ],
    actions: [
      {
        id: "open-exercise-sheet",
        kind: "click",
        target: {
          screenId: "hengdong.plan-editor",
          pbId: "hengdong.plan-editor.add",
        },
      },
      {
        id: "save-plan",
        kind: "click",
        target: {
          screenId: "hengdong.plan-editor",
          pbId: "hengdong.plan-editor.save",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.record-detail",
    screenSlug: "record-detail",
    label: "记录详情",
    title: "训练记录",
    path: "/prototype/hengdong/record-detail",
    view: "hengdong/screens/RecordDetailScreen.vue",
    queryKeys: ["record"],
    defaultVariantId: "default",
    shellFragments: [
      {
        screenId: "hengdong.record-detail",
        pbId: "hengdong.record-detail.app-bar",
      },
    ],
    variants: [
      {
        id: "default",
        label: "训练复盘",
        requiredFragments: [
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.root",
          },
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.summary",
          },
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.exercise-list",
          },
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.note",
          },
        ],
      },
      {
        id: "completed",
        label: "刚刚完成",
        requiredFragments: [
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.summary",
          },
        ],
      },
      {
        id: "delete-confirm-open",
        label: "删除确认",
        requiredFragments: [
          {
            screenId: "hengdong.record-detail",
            pbId: "hengdong.record-detail.delete-confirm",
          },
        ],
      },
    ],
    actions: [
      {
        id: "open-delete-confirm",
        kind: "click",
        target: {
          screenId: "hengdong.record-detail",
          pbId: "hengdong.record-detail.delete",
        },
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.stats",
    screenSlug: "stats",
    label: "数据趋势",
    title: "数据趋势",
    path: "/prototype/hengdong/stats",
    view: "hengdong/screens/StatsScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.stats", pbId: "hengdong.stats.app-bar" },
    ],
    variants: [
      {
        id: "default",
        label: "周趋势",
        requiredFragments: [
          { screenId: "hengdong.stats", pbId: "hengdong.stats.root" },
          { screenId: "hengdong.stats", pbId: "hengdong.stats.period" },
          { screenId: "hengdong.stats", pbId: "hengdong.stats.summary" },
          { screenId: "hengdong.stats", pbId: "hengdong.stats.activity-chart" },
          { screenId: "hengdong.stats", pbId: "hengdong.stats.metrics" },
        ],
      },
    ],
  },
  {
    prototypeId: "hengdong",
    screenId: "hengdong.goals",
    screenSlug: "goals",
    label: "目标与提醒",
    title: "目标与提醒",
    path: "/prototype/hengdong/goals",
    view: "hengdong/screens/GoalsScreen.vue",
    defaultVariantId: "default",
    shellFragments: [
      { screenId: "hengdong.goals", pbId: "hengdong.goals.app-bar" },
    ],
    variants: [
      {
        id: "default",
        label: "目标设置",
        requiredFragments: [
          { screenId: "hengdong.goals", pbId: "hengdong.goals.root" },
          { screenId: "hengdong.goals", pbId: "hengdong.goals.form" },
          {
            screenId: "hengdong.goals",
            pbId: "hengdong.goals.current-progress",
          },
          { screenId: "hengdong.goals", pbId: "hengdong.goals.save" },
        ],
      },
      {
        id: "validation-error",
        label: "校验错误",
        requiredFragments: [
          { screenId: "hengdong.goals", pbId: "hengdong.goals.validation" },
        ],
      },
    ],
    actions: [
      {
        id: "save-goals",
        kind: "click",
        target: { screenId: "hengdong.goals", pbId: "hengdong.goals.save" },
      },
    ],
  },
] satisfies ScreenRecord[];

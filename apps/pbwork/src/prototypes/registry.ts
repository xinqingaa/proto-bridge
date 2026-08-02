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
    id: "field-service",
    label: "现场服务工单",
    lifecycle: "active",
    owners: ["产品设计"],
    roles: ["现场工程师", "调度", "客户"],
    defaultThemeId: "light",
    screenGroups: [
      {
        id: "work-orders",
        label: "工单",
        screenSlugs: [
          "dashboard",
          "work-orders",
          "work-order-detail",
          "create-work-order",
        ],
      },
      {
        id: "customer-messages",
        label: "客户与消息",
        screenSlugs: ["customer-detail", "messages"],
      },
      {
        id: "settings",
        label: "设置",
        screenSlugs: ["settings"],
      },
    ],
  },
  {
    id: "ledger-planet",
    label: "账本星球",
    lifecycle: "active",
    owners: ["产品设计"],
    roles: ["个人用户"],
    defaultThemeId: "light",
    screenGroups: [
      {
        id: "ledger",
        label: "记账",
        screenSlugs: [
          "ledger-home",
          "record-edit",
          "ledger-list",
          "record-detail",
          "analytics",
        ],
      },
      {
        id: "benefits",
        label: "权益",
        screenSlugs: [
          "benefits-home",
          "activity-detail",
          "task-list",
          "task-detail",
          "coupon-wallet",
          "coupon-detail",
        ],
      },
      {
        id: "me",
        label: "我的",
        screenSlugs: [
          "me-home",
          "wallet",
          "profile",
          "settings",
          "help-center",
          "help-article",
          "about",
        ],
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
        critical: true,
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
        critical: true,
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
        initialVariantId: "default",
        critical: true,
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
        initialVariantId: "default",
        critical: true,
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
        critical: true,
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
        critical: true,
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
        critical: true,
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
        initialVariantId: "active-excursion",
        critical: true,
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
        initialVariantId: "action-sheet-open",
        critical: true,
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
        critical: true,
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
        critical: true,
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
        critical: true,
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
        critical: true,
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
        critical: true,
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
        initialVariantId: "default",
        critical: true,
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
        initialVariantId: "ready-to-submit",
        critical: true,
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
        initialVariantId: "approval-required",
        critical: true,
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
    prototypeId: "field-service",
    screenId: "field-service.dashboard",
    screenSlug: "dashboard",
    label: "工单工作台",
    title: "现场服务工作台",
    path: "/prototype/field-service/dashboard",
    view: "field-service/screens/Dashboard.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.work-orders",
    screenSlug: "work-orders",
    label: "工单列表",
    title: "工单列表",
    path: "/prototype/field-service/work-orders",
    view: "field-service/screens/WorkOrderList.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
      { id: "error", label: "错误" },
      { id: "filtered", label: "筛选结果" },
      { id: "high-priority", label: "高优先级" },
      { id: "overdue", label: "已超时" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.work-order-detail",
    screenSlug: "work-order-detail",
    label: "工单详情",
    title: "工单详情",
    path: "/prototype/field-service/work-order-detail",
    view: "field-service/screens/WorkOrderDetail.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "error", label: "错误" },
      { id: "high-priority", label: "高优先级" },
      { id: "overdue", label: "已超时" },
      { id: "sheet-open", label: "Bottom Sheet 打开" },
      { id: "dialog-open", label: "Dialog 打开" },
      { id: "toast-open", label: "Toast 显示" },
      { id: "created", label: "新建成功" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.create-work-order",
    screenSlug: "create-work-order",
    label: "新建工单",
    title: "新建工单",
    path: "/prototype/field-service/create-work-order",
    view: "field-service/screens/CreateWorkOrder.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "validation-error", label: "校验失败" },
      { id: "toast-open", label: "提交成功 Toast" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.customer-detail",
    screenSlug: "customer-detail",
    label: "客户详情",
    title: "客户详情",
    path: "/prototype/field-service/customer-detail",
    view: "field-service/screens/CustomerDetail.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "empty", label: "无服务记录" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.messages",
    screenSlug: "messages",
    label: "消息中心",
    title: "消息中心",
    path: "/prototype/field-service/messages",
    view: "field-service/screens/MessageCenter.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "unread", label: "未读消息" },
      { id: "empty", label: "空态" },
    ],
  },
  {
    prototypeId: "field-service",
    screenId: "field-service.settings",
    screenSlug: "settings",
    label: "个人设置",
    title: "个人设置",
    path: "/prototype/field-service/settings",
    view: "field-service/screens/Settings.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "浅色" },
      { id: "dark", label: "深色状态" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.ledger-home",
    screenSlug: "ledger-home",
    label: "记账首页",
    title: "记账",
    path: "/prototype/ledger-planet/ledger-home",
    view: "ledger-planet/screens/TabRootScreen.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
      { id: "error", label: "错误" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.record-edit",
    screenSlug: "record-edit",
    label: "记一笔",
    title: "记一笔",
    path: "/prototype/ledger-planet/record-edit",
    view: "ledger-planet/screens/RecordEdit.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "edit", label: "编辑" },
      { id: "validation-error", label: "校验失败" },
      { id: "toast-open", label: "保存成功" },
      { id: "category-sheet", label: "分类 Sheet" },
      { id: "account-sheet", label: "账户 Sheet" },
      { id: "date-sheet", label: "日期 Sheet" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.ledger-list",
    screenSlug: "ledger-list",
    label: "全部流水",
    title: "全部流水",
    path: "/prototype/ledger-planet/ledger-list",
    view: "ledger-planet/screens/LedgerList.vue",
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "默认",
        requiredFragments: [
          {
            screenId: "ledger-planet.ledger-list",
            pbId: "ledger-planet.ledger-list.root",
          },
          {
            screenId: "ledger-planet.ledger-list",
            pbId: "ledger-planet.ledger-list.summary",
          },
          {
            screenId: "ledger-planet.ledger-list",
            pbId: "ledger-planet.ledger-list.search",
          },
          {
            screenId: "ledger-planet.ledger-list",
            pbId: "ledger-planet.ledger-list.filters",
          },
          {
            screenId: "ledger-planet.ledger-list",
            pbId: "ledger-planet.ledger-list.records",
          },
        ],
      },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
      { id: "error", label: "错误" },
      { id: "date-sheet", label: "日期范围 Sheet" },
      { id: "filter-sheet", label: "筛选 Sheet" },
      { id: "day", label: "今日流水" },
      { id: "week", label: "本周流水" },
      { id: "filtered", label: "分类筛选结果" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.record-detail",
    screenSlug: "record-detail",
    label: "流水详情",
    title: "流水详情",
    path: "/prototype/ledger-planet/record-detail",
    view: "ledger-planet/screens/RecordDetail.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "dialog-delete", label: "删除确认" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.analytics",
    screenSlug: "analytics",
    label: "图表分析",
    title: "图表分析",
    path: "/prototype/ledger-planet/analytics",
    view: "ledger-planet/screens/Analytics.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "empty", label: "空态" },
      { id: "date-sheet", label: "时间 Sheet" },
      { id: "filter-sheet", label: "筛选 Sheet" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.benefits-home",
    screenSlug: "benefits-home",
    label: "权益首页",
    title: "权益",
    path: "/prototype/ledger-planet/benefits-home",
    view: "ledger-planet/screens/TabRootScreen.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "loading", label: "加载中" },
      { id: "empty", label: "空态" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.activity-detail",
    screenSlug: "activity-detail",
    label: "活动详情",
    title: "活动详情",
    path: "/prototype/ledger-planet/activity-detail",
    view: "ledger-planet/screens/ActivityDetail.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "ended", label: "已结束" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.task-list",
    screenSlug: "task-list",
    label: "任务列表",
    title: "任务",
    path: "/prototype/ledger-planet/task-list",
    view: "ledger-planet/screens/TaskList.vue",
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "默认",
        critical: true,
        requiredFragments: [
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.root",
          },
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.filters",
          },
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.list",
          },
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.list.row",
            pbKey: "t1",
          },
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.list.row",
            pbKey: "t2",
          },
          {
            screenId: "ledger-planet.task-list",
            pbId: "ledger-planet.task-list.list.row",
            pbKey: "t3",
          },
        ],
      },
      { id: "empty", label: "空态" },
    ],
    actions: [
      {
        id: "select-todo",
        kind: "click",
        target: {
          screenId: "ledger-planet.task-list",
          pbId: "ledger-planet.task-list.filters.tab",
          pbKey: "todo",
        },
      },
      {
        id: "select-done",
        kind: "click",
        target: {
          screenId: "ledger-planet.task-list",
          pbId: "ledger-planet.task-list.filters.tab",
          pbKey: "done",
        },
      },
      {
        id: "open-claimable-task",
        kind: "click",
        target: {
          screenId: "ledger-planet.task-list",
          pbId: "ledger-planet.task-list.list.row",
          pbKey: "t2",
        },
      },
    ],
    scenarios: [
      {
        id: "filter-todo",
        initialVariantId: "default",
        critical: true,
        actionIds: ["select-todo"],
        checkpoints: [
          {
            id: "todo-selected",
            screenId: "ledger-planet.task-list",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "ledger-planet.task-list",
                pbId: "ledger-planet.task-list.list",
              },
            ],
            expectedStates: [
              {
                fragment: {
                  screenId: "ledger-planet.task-list",
                  pbId: "ledger-planet.task-list.filters",
                },
                key: "selected",
                value: "todo",
              },
            ],
            expectedFragmentKeys: [
              {
                fragment: {
                  screenId: "ledger-planet.task-list",
                  pbId: "ledger-planet.task-list.list.row",
                },
                keys: ["t1", "t3"],
              },
            ],
            forbiddenFragments: [
              {
                screenId: "ledger-planet.task-list",
                pbId: "ledger-planet.task-list.list.row",
                pbKey: "t2",
              },
            ],
          },
        ],
      },
      {
        id: "filter-done",
        initialVariantId: "default",
        critical: true,
        actionIds: ["select-done"],
        checkpoints: [
          {
            id: "done-selected",
            screenId: "ledger-planet.task-list",
            variantId: "default",
            requiredFragments: [
              {
                screenId: "ledger-planet.task-list",
                pbId: "ledger-planet.task-list.list",
              },
            ],
            expectedStates: [
              {
                fragment: {
                  screenId: "ledger-planet.task-list",
                  pbId: "ledger-planet.task-list.filters",
                },
                key: "selected",
                value: "done",
              },
            ],
            expectedFragmentKeys: [
              {
                fragment: {
                  screenId: "ledger-planet.task-list",
                  pbId: "ledger-planet.task-list.list.row",
                },
                keys: ["t2"],
              },
            ],
            forbiddenFragments: [
              {
                screenId: "ledger-planet.task-list",
                pbId: "ledger-planet.task-list.list.row",
                pbKey: "t1",
              },
              {
                screenId: "ledger-planet.task-list",
                pbId: "ledger-planet.task-list.list.row",
                pbKey: "t3",
              },
            ],
          },
        ],
      },
      {
        id: "open-claimable-task",
        initialVariantId: "default",
        critical: true,
        actionIds: ["open-claimable-task"],
        checkpoints: [
          {
            id: "claimable-task-detail",
            screenId: "ledger-planet.task-detail",
            variantId: "claimable",
            requiredFragments: [
              {
                screenId: "ledger-planet.task-detail",
                pbId: "ledger-planet.task-detail.root",
              },
            ],
          },
        ],
      },
    ],
    requiredScenarioIds: ["filter-todo", "filter-done", "open-claimable-task"],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.task-detail",
    screenSlug: "task-detail",
    label: "任务详情",
    title: "任务详情",
    path: "/prototype/ledger-planet/task-detail",
    view: "ledger-planet/screens/TaskDetail.vue",
    queryKeys: ["task"],
    defaultVariantId: "default",
    variants: [
      {
        id: "default",
        label: "默认",
        requiredFragments: [
          {
            screenId: "ledger-planet.task-detail",
            pbId: "ledger-planet.task-detail.root",
          },
          {
            screenId: "ledger-planet.task-detail",
            pbId: "ledger-planet.task-detail.hero",
          },
          {
            screenId: "ledger-planet.task-detail",
            pbId: "ledger-planet.task-detail.progress",
          },
          {
            screenId: "ledger-planet.task-detail",
            pbId: "ledger-planet.task-detail.steps",
          },
        ],
      },
      { id: "completed", label: "已完成" },
      {
        id: "claimable",
        label: "可领奖",
        requiredFragments: [
          {
            screenId: "ledger-planet.task-detail",
            pbId: "ledger-planet.task-detail.root",
          },
        ],
      },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.coupon-wallet",
    screenSlug: "coupon-wallet",
    label: "券包",
    title: "券包",
    path: "/prototype/ledger-planet/coupon-wallet",
    view: "ledger-planet/screens/CouponWallet.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "empty", label: "空态" },
      { id: "expired-tab", label: "已过期 Tab" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.coupon-detail",
    screenSlug: "coupon-detail",
    label: "券详情",
    title: "券详情",
    path: "/prototype/ledger-planet/coupon-detail",
    view: "ledger-planet/screens/CouponDetail.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "used", label: "已使用" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.me-home",
    screenSlug: "me-home",
    label: "我的",
    title: "我的",
    path: "/prototype/ledger-planet/me-home",
    view: "ledger-planet/screens/TabRootScreen.vue",
    defaultVariantId: "default",
    variants: [{ id: "default", label: "默认" }],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.wallet",
    screenSlug: "wallet",
    label: "钱包",
    title: "钱包",
    path: "/prototype/ledger-planet/wallet",
    view: "ledger-planet/screens/Wallet.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "empty", label: "空态" },
      { id: "hidden-balance", label: "隐藏余额" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.profile",
    screenSlug: "profile",
    label: "个人资料",
    title: "个人资料",
    path: "/prototype/ledger-planet/profile",
    view: "ledger-planet/screens/Profile.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "toast-saved", label: "保存成功" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.settings",
    screenSlug: "settings",
    label: "设置",
    title: "设置",
    path: "/prototype/ledger-planet/settings",
    view: "ledger-planet/screens/Settings.vue",
    defaultVariantId: "default",
    variants: [{ id: "default", label: "默认" }],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.help-center",
    screenSlug: "help-center",
    label: "帮助中心",
    title: "帮助中心",
    path: "/prototype/ledger-planet/help-center",
    view: "ledger-planet/screens/HelpCenter.vue",
    defaultVariantId: "default",
    variants: [{ id: "default", label: "默认" }],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.help-article",
    screenSlug: "help-article",
    label: "帮助文章",
    title: "帮助文章",
    path: "/prototype/ledger-planet/help-article",
    view: "ledger-planet/screens/HelpArticle.vue",
    defaultVariantId: "default",
    variants: [
      { id: "default", label: "默认" },
      { id: "loading", label: "加载中" },
      { id: "error", label: "错误" },
    ],
  },
  {
    prototypeId: "ledger-planet",
    screenId: "ledger-planet.about",
    screenSlug: "about",
    label: "关于",
    title: "关于",
    path: "/prototype/ledger-planet/about",
    view: "ledger-planet/screens/About.vue",
    defaultVariantId: "default",
    variants: [{ id: "default", label: "默认" }],
  },
] satisfies ScreenRecord[];

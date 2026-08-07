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
  }
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
  }
] satisfies ScreenRecord[];

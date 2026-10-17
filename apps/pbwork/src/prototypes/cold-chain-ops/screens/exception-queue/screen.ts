import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("cold-chain-ops", "exception-queue");
export default defineScreen({
  slug: "exception-queue",
  fragments: [
    fragment("root", { required: true }),
    fragment("summary", { required: true }),
    fragment("search", { required: true }),
    fragment("severity-tabs", { required: true }),
    fragment("severity-tabs.tab", { required: true, key: "all" }),
    fragment("list", { required: true }),
    fragment("list.row", { required: true, key: "all-ex-017" }),
  ],
  prototypeId: "cold-chain-ops",
  label: "异常队列",
  title: "冷链异常",
  view: "cold-chain-ops/screens/exception-queue/ExceptionQueue.vue",
  queryKeys: ["shipment"],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root"), scope.ref("app-bar")],
  variants: [
    {
      id: "default",
      label: "待处理异常",
    },
    {
      id: "critical-only",
      label: "仅严重异常",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("severity-tabs"),
        scope.ref("severity-tabs.tab", "critical"),
        scope.ref("list"),
        scope.ref("list.row", "critical-ex-017"),
      ],
    },
    {
      id: "warning-only",
      label: "仅警告异常",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("severity-tabs.tab", "warning"),
        scope.ref("list"),
        scope.ref("list.row", "warning-ex-024"),
      ],
    },
    {
      id: "attention-only",
      label: "仅关注异常",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("severity-tabs.tab", "attention"),
        scope.ref("list"),
        scope.ref("list.row", "attention-ex-029"),
      ],
    },
    {
      id: "loading",
      label: "加载中",
      requiredFragments: [scope.ref("root"), scope.ref("loading")],
    },
    {
      id: "empty",
      label: "无待处理异常",
      requiredFragments: [scope.ref("root"), scope.ref("empty")],
    },
    {
      id: "error",
      label: "数据不可用",
      requiredFragments: [scope.ref("root"), scope.ref("error")],
    },
  ],
  actions: [
    {
      id: "show-critical",
      kind: "click",
      target: scope.ref("show-critical"),
    },
    {
      id: "open-primary-exception",
      kind: "click",
      target: scope.ref("list.row", "all-ex-017"),
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
            scope.ref("severity-tabs.tab", "critical"),
            scope.ref("list"),
            scope.ref("list.row", "critical-ex-017"),
          ],
          expectedFragmentKeys: [
            {
              fragment: scope.ref("list.row"),
              keys: ["critical-ex-017", "critical-ex-031"],
            },
          ],
          forbiddenFragments: [scope.ref("list.row", "warning-ex-024")],
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
});

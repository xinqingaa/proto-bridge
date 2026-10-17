import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("cold-chain-ops", "shipment-detail");
export default defineScreen({
  slug: "shipment-detail",
  fragments: [
    fragment("root", { required: true }),
    fragment("summary", { required: true }),
    fragment("temperature-chart", { required: true }),
    fragment("timeline", { required: true }),
  ],
  prototypeId: "cold-chain-ops",
  label: "运输详情",
  title: "运输详情",
  view: "cold-chain-ops/screens/shipment-detail/ShipmentDetail.vue",
  queryKeys: ["shipment"],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root"), scope.ref("app-bar")],
  variants: [
    {
      id: "default",
      label: "运输正常",
    },
    {
      id: "active-excursion",
      label: "持续超温",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("alert"),
        scope.ref("temperature-chart"),
        scope.ref("open-actions"),
      ],
    },
    {
      id: "sensor-offline",
      label: "传感器离线",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("sensor-error"),
        scope.ref("timeline"),
      ],
    },
    {
      id: "action-sheet-open",
      label: "处置操作打开",
      requiredFragments: [scope.ref("action-sheet")],
    },
    {
      id: "acknowledge-dialog-open",
      label: "确认接手",
      requiredFragments: [scope.ref("ack-dialog")],
    },
  ],
  actions: [
    {
      id: "open-actions",
      kind: "click",
      target: scope.ref("open-actions"),
    },
    {
      id: "open-resolution",
      kind: "click",
      target: scope.ref("open-resolution"),
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
          requiredFragments: [scope.ref("action-sheet")],
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
});

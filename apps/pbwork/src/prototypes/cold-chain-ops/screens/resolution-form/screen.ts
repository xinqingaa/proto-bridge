import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("cold-chain-ops", "resolution-form");
export default defineScreen({
  slug: "resolution-form",
  fragments: [
    fragment("root", { required: true }),
    fragment("response-form", { required: true }),
    fragment("submit", { required: true }),
  ],
  prototypeId: "cold-chain-ops",
  label: "处置记录",
  title: "提交处置",
  view: "cold-chain-ops/screens/resolution-form/ResolutionForm.vue",
  queryKeys: ["shipment"],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root"), scope.ref("app-bar")],
  variants: [
    {
      id: "default",
      label: "待填写",
    },
    {
      id: "validation-error",
      label: "校验失败",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("validation-error"),
        scope.ref("response-form"),
      ],
    },
    {
      id: "ready-to-submit",
      label: "信息完整",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("response-form"),
        scope.ref("submit"),
      ],
    },
    {
      id: "approval-required",
      label: "等待主管审批",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("supervisor-approval"),
        scope.ref("submit"),
      ],
    },
    {
      id: "approval-validation-error",
      label: "主管审批缺失",
      requiredFragments: [
        scope.ref("validation-error"),
        scope.ref("supervisor-approval"),
      ],
    },
    {
      id: "confirm-dialog-open",
      label: "确认提交",
      requiredFragments: [scope.ref("confirm-dialog")],
    },
    {
      id: "submitted",
      label: "提交成功",
      requiredFragments: [scope.ref("root"), scope.ref("success-toast")],
    },
  ],
  actions: [
    {
      id: "submit-resolution",
      kind: "click",
      target: scope.ref("submit"),
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
          requiredFragments: [scope.ref("validation-error")],
          forbiddenFragments: [scope.ref("success-toast")],
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
          requiredFragments: [scope.ref("confirm-dialog")],
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
            scope.ref("validation-error"),
            scope.ref("supervisor-approval"),
          ],
          forbiddenFragments: [scope.ref("confirm-dialog")],
        },
      ],
    },
  ],
  requiredScenarioIds: [
    "reject-incomplete-resolution",
    "confirm-complete-resolution",
    "reject-missing-supervisor-approval",
  ],
});

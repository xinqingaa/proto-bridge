import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("yike", "settings");
export default defineScreen({
  prototypeId: "yike",
  slug: "settings",
  label: "设置",
  title: "设置",
  view: "yike/screens/settings/Settings.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  fragments: [
    fragment("root", { required: true }),
    fragment("mode", { required: true }),
    fragment("configuration", { required: true }),
    fragment("reset", { required: true }),
  ],
  variants: [
    { id: "default", label: "设置" },
    {
      id: "record-threshold",
      label: "短时记录确认阈值",
      shellPolicy: "replace",
      requiredFragments: [
        scope.ref("threshold-sheet"),
        scope.ref("threshold-save"),
      ],
    },
    {
      id: "threshold-custom",
      label: "自定义阈值时长",
      shellPolicy: "replace",
      requiredFragments: [
        scope.ref("threshold-sheet"),
        scope.ref("threshold-duration"),
        scope.ref("threshold-save"),
      ],
    },
    ...[
      {
        id: "configuration-open",
        label: "时长配置",
        panel: "configuration-sheet",
        action: "configuration-save",
      },
      {
        id: "reset-confirm",
        label: "重置确认",
        panel: "reset-sheet",
        action: "reset-confirm",
      },
    ].map(({ panel, action, ...variant }) => ({
      ...variant,
      shellPolicy: "replace" as const,
      requiredFragments: [scope.ref(panel), scope.ref(action)],
    })),
  ],
  actions: [
    { id: "reset", kind: "click", target: scope.ref("reset") },
    { id: "confirm-reset", kind: "click", target: scope.ref("reset-confirm") },
  ],
  scenarios: [
    {
      id: "reset-data",
      label: "确认重置回专注",
      initialVariantId: "default",
      actionIds: ["reset", "confirm-reset"],
      checkpoints: [
        {
          id: "focus",
          screenId: "yike.focus",
          variantId: "default",
          requiredFragments: [
            { screenId: "yike.focus", pbId: "yike.focus.primary-action" },
          ],
        },
      ],
    },
  ],
  requiredScenarioIds: ["reset-data"],
});

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
  variants: [{ id: "default", label: "设置" }],
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

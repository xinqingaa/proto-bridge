import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "focus");

export default defineScreen({
  slug: "focus",
  fragments: [
    fragment("root", { required: true }),
    fragment("timer", { required: true }),
    fragment("mode-tabs", { required: true }),
    fragment("primary-action", { required: true }),
    fragment("navigation", { required: true }),
  ],
  prototypeId: "yike",
  label: "专注",
  title: "专注",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  variants: [
    { id: "default", label: "番茄待开始" },
    {
      id: "running",
      label: "番茄进行中",
      requiredFragments: [scope.ref("root"), scope.ref("timer"), scope.ref("primary-action")],
    },
    {
      id: "paused",
      label: "番茄已暂停",
      requiredFragments: [scope.ref("root"), scope.ref("timer"), scope.ref("primary-action")],
    },
  ],
  actions: [
    { id: "start", kind: "click", target: scope.ref("primary-action") },
  ],
  scenarios: [
    {
      id: "start-focus",
      label: "开始一轮专注",
      initialVariantId: "default",
      actionIds: ["start"],
      checkpoints: [
        {
          id: "focus-running",
          screenId: "yike.focus",
          variantId: "running",
          requiredFragments: [scope.ref("timer"), scope.ref("primary-action")],
        },
      ],
    },
  ],
  requiredScenarioIds: ["start-focus"],
});

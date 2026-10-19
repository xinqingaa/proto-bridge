import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "review");
export default defineScreen({
  slug: "review",
  fragments: [
    fragment("root", { required: true }),
    fragment("title", { required: true }),
    fragment("period", { required: true }),
    fragment("duration", { required: true }),
    fragment("counts", { required: true }),
    fragment("range-tabs", { required: true }),
    fragment("chart", { required: true }),
    fragment("navigation", { required: true }),
  ],
  prototypeId: "yike",
  label: "回顾",
  title: "回顾",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  variants: [
    { id: "default", label: "本周回顾" },
    ...[
      { id: "only-checkins", label: "仅打卡" },
      { id: "only-focus", label: "仅专注" },
      { id: "with-records", label: "专注与打卡" },
      { id: "month", label: "本月回顾" },
      { id: "history", label: "可翻阅历史周期" },
    ].map((variant) => ({
      ...variant,
      requiredFragments: [
        scope.ref("root"),
        scope.ref("range-tabs"),
        scope.ref("chart"),
      ],
    })),
  ],
  actions: [
    { id: "previous", kind: "click", target: scope.ref("previous") },
    { id: "next", kind: "click", target: scope.ref("next") },
  ],
  scenarios: [
    {
      id: "browse-history",
      label: "翻阅上一周再返回",
      initialVariantId: "history",
      actionIds: ["previous", "next"],
      checkpoints: [
        {
          id: "returned",
          screenId: scope.screenId,
          variantId: "history",
          requiredFragments: [
            scope.ref("period"),
            scope.ref("duration"),
            scope.ref("chart"),
          ],
        },
      ],
    },
  ],
  requiredScenarioIds: ["browse-history"],
});

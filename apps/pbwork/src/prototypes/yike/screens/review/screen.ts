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
    {
      id: "day-detail",
      label: "当日记录面板",
      requiredFragments: [scope.ref("day-detail"), scope.ref("day-title")],
    },
    ...[
      { id: "only-checkins", label: "仅打卡" },
      { id: "only-focus", label: "仅专注" },
      { id: "with-records", label: "专注与打卡" },
      { id: "month", label: "本月回顾" },
      { id: "intensity-levels", label: "三档专注量" },
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
    { id: "previous-day", kind: "click", target: scope.ref("day-previous") },
    { id: "next-day", kind: "click", target: scope.ref("day-next") },
    { id: "close-day", kind: "click", target: scope.ref("day-detail.close") },
  ],
  scenarios: [
    {
      id: "browse-day-records",
      label: "查看前一天并返回当天后关闭",
      initialVariantId: "day-detail",
      actionIds: ["previous-day", "next-day", "close-day"],
      checkpoints: [
        {
          id: "closed",
          screenId: scope.screenId,
          variantId: "day-detail",
          requiredFragments: [scope.ref("chart"), scope.ref("period")],
        },
      ],
    },
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

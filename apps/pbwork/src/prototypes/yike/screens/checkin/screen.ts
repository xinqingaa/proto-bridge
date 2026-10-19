import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "checkin");

export default defineScreen({
  slug: "checkin",
  fragments: [
    fragment("root", { required: true }),
    fragment("title", { required: true }),
    fragment("tally", { required: true }),
    fragment("done-count", { required: true }),
    fragment("remaining", { required: true }),
    fragment("week-head", { required: true }),
    fragment("create", { required: true }),
    fragment("habit-list", { required: true }),
    fragment("navigation", { required: true }),
  ],
  prototypeId: "yike",
  label: "打卡",
  title: "打卡",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  variants: [
    { id: "default", label: "今日习惯" },
    ...[
      { id: "partial", label: "部分完成" },
      { id: "completed", label: "全部完成" },
      { id: "empty", label: "没有习惯" },
      { id: "archived", label: "只有归档习惯" },
    ].map((variant) => ({
      ...variant,
      requiredFragments: [
        scope.ref("root"),
        scope.ref("create"),
        scope.ref("archived"),
        ...(["partial", "completed"].includes(variant.id)
          ? [
              scope.ref("habit-list"),
              scope.ref("week-head"),
              scope.ref("tally"),
            ]
          : []),
      ],
    })),
  ],
  actions: [
    {
      id: "toggle-first",
      kind: "click",
      target: scope.ref("habit.habit-water.today", "habit-water"),
    },
    {
      id: "open-first",
      kind: "click",
      target: scope.ref("habit.habit-water.open", "habit-water"),
    },
    { id: "create", kind: "click", target: scope.ref("create") },
  ],
  scenarios: [
    {
      id: "checkin-today",
      label: "完成今日打卡",
      initialVariantId: "default",
      actionIds: ["toggle-first"],
      checkpoints: [
        {
          id: "checked",
          screenId: scope.screenId,
          variantId: "default",
          requiredFragments: [
            scope.ref("habit.habit-water.today", "habit-water"),
          ],
          expectedStates: [
            {
              fragment: scope.ref("habit.habit-water.today", "habit-water"),
              key: "checked",
              value: true,
            },
          ],
        },
      ],
    },
    {
      id: "open-detail",
      label: "查看习惯详情",
      initialVariantId: "default",
      actionIds: ["open-first"],
      checkpoints: [
        {
          id: "detail",
          screenId: "yike.habit-detail",
          variantId: "default",
          requiredFragments: [
            { screenId: "yike.habit-detail", pbId: "yike.habit-detail.name" },
          ],
        },
      ],
    },
    {
      id: "open-editor",
      label: "新建习惯入口",
      initialVariantId: "default",
      actionIds: ["create"],
      checkpoints: [
        {
          id: "editor",
          screenId: "yike.habit-editor",
          variantId: "default",
          requiredFragments: [
            {
              screenId: "yike.habit-editor",
              pbId: "yike.habit-editor.form.name",
            },
          ],
        },
      ],
    },
  ],
  requiredScenarioIds: ["checkin-today", "open-detail", "open-editor"],
});

import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("yike", "habit-detail");
export default defineScreen({
  prototypeId: "yike",
  slug: "habit-detail",
  label: "习惯详情",
  title: "习惯详情",
  view: "yike/screens/habit-detail/HabitDetail.vue",
  queryKeys: ["habit"],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  fragments: [
    fragment("root", { required: true }),
    fragment("name", { required: true }),
    fragment("edit", { required: true }),
    fragment("year", { required: true }),
    fragment("archive", { required: true }),
    fragment("delete", { required: true }),
  ],
  variants: [
    { id: "default", label: "进行中习惯" },
    {
      id: "missing",
      label: "习惯不存在",
      query: { habit: "missing-habit" },
      requiredFragments: [
        scope.ref("root"),
        scope.ref("missing"),
        scope.ref("return"),
      ],
    },
  ],
  actions: [
    { id: "edit", kind: "click", target: scope.ref("edit") },
    { id: "archive", kind: "click", target: scope.ref("archive") },
  ],
  scenarios: [
    {
      id: "edit-habit",
      label: "打开编辑",
      initialVariantId: "default",
      actionIds: ["edit"],
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
    {
      id: "archive-habit",
      label: "归档返回列表",
      initialVariantId: "default",
      actionIds: ["archive"],
      checkpoints: [
        {
          id: "checkin",
          screenId: "yike.checkin",
          variantId: "default",
          requiredFragments: [
            { screenId: "yike.checkin", pbId: "yike.checkin.habit-list" },
          ],
        },
      ],
    },
  ],
  requiredScenarioIds: ["edit-habit", "archive-habit"],
});

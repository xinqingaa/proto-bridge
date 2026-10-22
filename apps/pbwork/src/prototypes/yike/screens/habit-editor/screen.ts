import { yikeAppearanceEvidence } from "../../appearance-evidence";
import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("yike", "habit-editor");
export default defineScreen({
  appearanceEvidence: yikeAppearanceEvidence["habit-editor"],
  prototypeId: "yike",
  slug: "habit-editor",
  navigation: "flow",
  label: "新建或编辑习惯",
  title: "新建或编辑习惯",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: ["habit"],
  defaultVariantId: "default",
  shellFragments: [scope.ref("panel")],
  fragments: [
    fragment("root", { required: true }),
    fragment("panel", { required: true }),
    fragment("form", { required: true }),
    fragment("form.name", { required: true }),
    fragment("form.save", { required: true }),
  ],
  variants: [
    { id: "default", label: "新建习惯" },
    {
      id: "invalid-name",
      label: "空名称校验",
      requiredFragments: [
        scope.ref("root"),
        scope.ref("form.name"),
        scope.ref("form.save"),
      ],
    },
    {
      id: "edit",
      label: "编辑习惯",
      query: { habit: "habit-water" },
      requiredFragments: [scope.ref("root"), scope.ref("form")],
    },
  ],
  actions: [
    { id: "cancel", kind: "click", target: scope.ref("panel.close") },
    { id: "save", kind: "click", target: scope.ref("form.save") },
  ],
  scenarios: [
    {
      id: "cancel-create",
      label: "取消新建",
      appearancePolicy: "shared" as const,
      initialVariantId: "default",
      actionIds: ["cancel"],
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
    {
      id: "save-edit",
      label: "保存已有习惯",
      // The saved Toast must remain present in every appearance observation.
      appearancePolicy: "independent" as const,
      initialVariantId: "edit",
      actionIds: ["save"],
      checkpoints: [
        {
          id: "detail",
          screenId: "yike.habit-detail",
          variantId: "default",
          requiredFragments: [
            { screenId: "yike.habit-detail", pbId: "yike.habit-detail.name" },
            { screenId: "yike.habit-detail", pbId: "yike.habit-detail.saved" },
          ],
        },
      ],
    },
  ],
  requiredScenarioIds: ["cancel-create", "save-edit"],
});

import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";
export const scope = screenScope("yike", "launch");
export default defineScreen({
  prototypeId: "yike",
  slug: "launch",
  label: "启动",
  title: "一刻",
  view: "yike/screens/launch/Launch.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  fragments: [
    fragment("root", { required: true }),
    fragment("object", { required: true }),
    fragment("name", { required: true }),
    fragment("promise", { required: true }),
  ],
  variants: [{ id: "default", label: "品牌静帧" }],
  actions: [],
  scenarios: [],
  requiredScenarioIds: [],
});

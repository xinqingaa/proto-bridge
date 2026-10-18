import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "checkin");

export default defineScreen({
  slug: "checkin",
  fragments: [fragment("root", { required: true }), fragment("habit-list", { required: true }), fragment("navigation", { required: true })],
  prototypeId: "yike",
  label: "打卡",
  title: "打卡",
  view: "yike/screens/YikeRoot.vue",
  queryKeys: [],
  defaultVariantId: "default",
  shellFragments: [scope.ref("root")],
  variants: [{ id: "default", label: "今日习惯" }],
  actions: [{ id: "toggle-first", kind: "click", target: scope.ref("habit-list") }],
  scenarios: [],
  requiredScenarioIds: [],
});

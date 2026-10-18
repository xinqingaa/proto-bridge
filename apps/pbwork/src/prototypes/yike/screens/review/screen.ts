import { defineScreen, fragment, screenScope } from "@/authoring/define-screen";

export const scope = screenScope("yike", "review");
export default defineScreen({
  slug: "review",
  fragments: [fragment("root", { required: true }), fragment("range-tabs", { required: true }), fragment("chart", { required: true }), fragment("navigation", { required: true })],
  prototypeId: "yike", label: "回顾", title: "回顾", view: "yike/screens/review/Review.vue", queryKeys: [], defaultVariantId: "default", shellFragments: [scope.ref("root")], variants: [{ id: "default", label: "本周回顾" }], actions: [], scenarios: [], requiredScenarioIds: [],
});

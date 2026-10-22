<script setup lang="ts">
import { useYikeRenderFace } from "../render-theme";
import { useCaptureState } from "@/runtime/capture-state";
import { computed, provide, watch, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { resolvePbIcon } from "@/design-system/components/_shared/icons";
const Timer = resolvePbIcon("yike-mode-stopwatch");
const CircleCheck = resolvePbIcon("circle-check");
const ChartNoAxesColumn = resolvePbIcon("chart-column");
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import ScreenTransition from "@/design-system/components/navigation/ScreenTransition.vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import { themeConstantNumber } from "@/design-system/theme/constants";
import { isForcedRuntimeNavigation } from "@/runtime/forced-navigation";
import { YikeSessionKey, focusVariant } from "../session";
import { useYikeRuntime } from "../runtime";
import { yikeNavigation } from "../navigation";
import Focus from "./focus/Focus.vue";
import CheckIn from "./checkin/CheckIn.vue";
import Review from "./review/Review.vue";
import HabitDetail from "./habit-detail/HabitDetail.vue";
import HabitEditor from "./habit-editor/HabitEditor.vue";
import Brand from "./launch/Brand.vue";
import { claimYikeColdStart } from "../runtime";

const route = useRoute();
const router = useRouter();
const { store, session } = useYikeRuntime();
const launching = ref(
  claimYikeColdStart(store) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);
// Local state is read synchronously by the store. Do not add a brand timer.
onMounted(() => {
  launching.value = false;
});
provide(YikeSessionKey, session);
watch(
  () => focusVariant(store),
  () => {
    if (
      route.params.screenSlug === "focus" &&
      !isForcedRuntimeNavigation() &&
      !store.presentation.preparing
    )
      void yikeNavigation(router, route, store).variant();
  },
  { flush: "sync" },
);
// Restored sessions open their actual recovery boundary before an entry check.
// Do not canonicalize authored fixture aliases (for example cross-day).
if (store.recoveryNeeded.value && route.params.screenSlug === "focus")
  void yikeNavigation(router, route, store).variant();
const editorOpen = computed(() => route.params.screenSlug === "habit-editor");
const detailVisible = computed(
  () =>
    route.params.screenSlug === "habit-detail" ||
    (editorOpen.value && typeof route.query.habit === "string"),
);
const active = computed(() =>
  ["focus", "checkin", "review"].includes(String(route.params.screenSlug))
    ? String(route.params.screenSlug)
    : "checkin",
);
const items = [
  { value: "focus", label: "专注", icon: Timer },
  { value: "checkin", label: "打卡", icon: CircleCheck },
  { value: "review", label: "回顾", icon: ChartNoAxesColumn },
];
const duration = themeConstantNumber("motion.duration-instant");
function tab(slug: string) {
  void yikeNavigation(router, route, store).tab(
    slug as "focus" | "checkin" | "review",
  );
}
useCaptureState("yike", "local.root", () => ({ launching: launching.value }));
const renderFace = useYikeRenderFace();
</script>

<template>
  <div class="yike-app">
    <ScreenTransition
      :screen-key="detailVisible ? 'habit-detail' : 'root'"
      :navigation="detailVisible ? 'push' : 'back'"
    >
      <PrototypeShell
        v-if="!detailVisible"
        title="一刻"
        :screen-id="`yike.${active}`"
        :launch="launching"
      >
        <template #launch><Brand :face="renderFace" /></template>
        <template #app-bar><span /></template>
        <TabViewport
          :key="store.presentation.revision"
          :model-value="active"
          :items="items"
          :swipe="false"
          :mouse-swipe="false"
          :keep-mounted="true"
          :transition-duration="duration"
          inspect-id="yike.root.viewport"
        >
          <template #item="{ value }">
            <Focus v-if="value === 'focus'" />
            <CheckIn v-else-if="value === 'checkin'" />
            <Review v-else-if="value === 'review'" />
          </template>
        </TabViewport>
        <template #navigation>
          <Tabbar
            :model-value="active"
            :items="items"
            :inspect-id="`yike.${active}.navigation`"
            @update:model-value="tab"
          />
        </template>
      </PrototypeShell>
      <HabitDetail v-else />
    </ScreenTransition>
    <div
      id="yike-notices"
      class="yike-notices"
      :class="{ 'above-navigation': !detailVisible }"
    />
    <HabitEditor />
  </div>
</template>
<style scoped>
.yike-app {
  position: relative;
  block-size: var(--pb-layout-fill);
  min-block-size: var(--pb-layout-zero);
}
.yike-notices {
  position: absolute;
  inset-inline: var(--pb-layout-zero);
  inset-block-end: var(--pb-layout-zero);
  z-index: var(--pb-layer-content);
}
.yike-notices.above-navigation {
  inset-block-end: calc(
    var(--pb-size-navigation-bar) + var(--pb-spacing-xs) +
      var(--pb-spacing-xs) + var(--pb-spacing-sm) + var(--pb-spacing-sm)
  );
}
</style>

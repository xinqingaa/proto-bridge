<script setup lang="ts">
import { computed } from "vue";
import { Activity, CalendarCheck, House } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";
import { replaceHengdongScreen, type RootTab } from "../nav";
import PlansScreen from "./PlansScreen.vue";
import ProgressScreen from "./ProgressScreen.vue";
import TodayScreen from "./TodayScreen.vue";
import "../hengdong.css";

const INSTANT_DURATION = tokenDefaultNumber("motion.duration-instant");
const route = useRoute();
const router = useRouter();
const items = [
  { value: "today", label: "今天", icon: House },
  { value: "plans", label: "计划", icon: CalendarCheck },
  { value: "progress", label: "进度", icon: Activity },
];

const active = computed<RootTab>(() => {
  const slug = String(route.params.screenSlug);
  return items.some((item) => item.value === slug) ? (slug as RootTab) : "today";
});
const screenId = computed(() => `hengdong.${active.value}`);

function changeTab(value: string) {
  if (!items.some((item) => item.value === value)) return;
  if (value === active.value) return;
  void replaceHengdongScreen(router, route, value as RootTab);
}
</script>

<template>
  <div class="hengdong-root">
    <TabViewport
      :model-value="active"
      :items="items"
      :swipe="false"
      :mouse-swipe="false"
      :keep-mounted="true"
      :transition-duration="INSTANT_DURATION"
      :inspect-id="`${screenId}.tab-viewport`"
      @update:model-value="changeTab"
    >
      <template #item="{ value }">
        <TodayScreen v-if="value === 'today'" />
        <PlansScreen v-else-if="value === 'plans'" />
        <ProgressScreen v-else-if="value === 'progress'" />
      </template>
    </TabViewport>
    <Tabbar
      :model-value="active"
      :items="items"
      :inspect-id="`${screenId}.tabbar`"
      @update:model-value="changeTab"
    />
  </div>
</template>

<style scoped>
.hengdong-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: var(--pb-layout-viewport-height);
  max-height: var(--pb-layout-viewport-height);
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}

.hengdong-root :deep(.pb-tab-viewport) {
  flex: var(--pb-layout-flex-fill);
  min-height: var(--pb-spacing-none);
}

:global(html.pbwork-runtime-embedded) .hengdong-root {
  min-height: var(--pb-layout-fill);
  max-height: var(--pb-layout-fill);
}
</style>

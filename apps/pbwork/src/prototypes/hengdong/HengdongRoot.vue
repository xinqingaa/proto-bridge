<script setup lang="ts">
import { ClipboardCheck, Home, List, User } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import { replaceHengdongScreen, type RootTab } from "./nav";
import "./hengdong.css";

const props = defineProps<{ active: RootTab; screenId: string }>();
const route = useRoute();
const router = useRouter();
const items = [
  { value: "today", label: "今天", icon: Home },
  { value: "plans", label: "计划", icon: ClipboardCheck },
  { value: "records", label: "记录", icon: List },
  { value: "profile", label: "我的", icon: User },
];

function changeTab(value: string) {
  if (!items.some((item) => item.value === value)) return;
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
      :inspect-id="`${screenId}.tab-viewport`"
      @update:model-value="changeTab"
    >
      <template #item="{ value }">
        <slot v-if="value === active" />
        <div v-else class="inactive-tab-placeholder" aria-hidden="true" />
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
.inactive-tab-placeholder {
  height: var(--pb-layout-fill);
}
:global(html.pbwork-runtime-embedded) .hengdong-root {
  min-height: var(--pb-layout-fill);
  max-height: var(--pb-layout-fill);
}
</style>

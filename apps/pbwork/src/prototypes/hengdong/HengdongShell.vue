<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import { goBackHengdong, type RootTab } from "./nav";
import "./hengdong.css";

const props = defineProps<{
  title: string;
  screenId: string;
  backTo?: RootTab;
  backLabel?: string;
  dense?: boolean;
  showAction?: boolean;
  actionIcon?: "more" | "plus" | "search" | "settings";
  actionLabel?: string;
}>();

defineEmits<{ action: [] }>();
const route = useRoute();
const router = useRouter();
const isStack = computed(() => Boolean(props.backTo));

function goBack() {
  void goBackHengdong(router, route, props.backTo ?? "today");
}
</script>

<template>
  <div class="hengdong-shell">
    <AppBar
      :title="title"
      :show-back="isStack"
      v-bind="{
        ...(dense !== undefined ? { dense } : {}),
        ...(backLabel !== undefined ? { backLabel } : {}),
        ...(showAction !== undefined ? { showAction } : {}),
        ...(actionIcon !== undefined ? { actionIcon } : {}),
        ...(actionLabel !== undefined ? { actionLabel } : {}),
      }"
      :inspect-id="`${screenId}.app-bar`"
      @back="goBack"
      @action="$emit('action')"
    >
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>
    </AppBar>
    <main class="hengdong-shell-main"><slot /></main>
  </div>
</template>

<style scoped>
.hengdong-shell {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: var(--pb-layout-viewport-height);
  max-height: var(--pb-layout-viewport-height);
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}
.hengdong-shell-main {
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  min-height: var(--pb-spacing-none);
  overflow: hidden;
}
:global(html.pbwork-runtime-embedded) .hengdong-shell {
  min-height: var(--pb-layout-fill);
  max-height: var(--pb-layout-fill);
}
</style>

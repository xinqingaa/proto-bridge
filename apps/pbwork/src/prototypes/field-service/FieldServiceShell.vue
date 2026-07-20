<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import BottomNavigation from "@/design-system/components/complex/BottomNavigation.vue";

const props = defineProps<{
  title: string;
  active?: "工作台" | "工单" | "消息" | "我的";
  backTo?: string;
}>();

const route = useRoute();
const router = useRouter();
const isStack = computed(() => Boolean(props.backTo));
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const destinations: Record<string, string> = {
  工作台: "dashboard",
  工单: "work-orders",
  消息: "messages",
  我的: "settings",
};

function runtimePath(slug: string) {
  return `/prototype/field-service/${slug}?variant=default&theme=${theme.value}`;
}

function navigate(item: string) {
  const slug = destinations[item];
  if (slug) void router.push(runtimePath(slug));
}

function goBack() {
  const position = Number(window.history.state?.position ?? 0);
  if (position > 0) {
    router.back();
    return;
  }
  void router.replace(runtimePath(props.backTo ?? "dashboard"));
}
</script>

<template>
  <div
    class="field-service-shell"
    :class="{ 'is-stack': isStack }"
    data-pb-id="field-service.shell"
  >
    <AppBar
      :title="title"
      :show-back="isStack"
      @back="goBack"
    />
    <main><slot /></main>
    <BottomNavigation
      v-if="!isStack"
      :model-value="active ?? '工作台'"
      @update:model-value="navigate"
    />
  </div>
</template>

<style scoped>
.field-service-shell {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}
.field-service-shell.is-stack {
  grid-template-rows: auto 1fr;
}
main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

:global(html.pbwork-runtime-embedded) .field-service-shell {
  min-height: 100%;
  max-height: 100%;
}
</style>

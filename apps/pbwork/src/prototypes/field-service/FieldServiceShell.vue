<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import BottomNavigation from "@/design-system/components/complex/BottomNavigation.vue";

const props = defineProps<{ title: string; active?: "工作台" | "工单" | "消息" | "我的" }>();
const route = useRoute();
const router = useRouter();
const theme = computed(() => (typeof route.query.theme === "string" ? route.query.theme : "light"));
const destinations: Record<string, string> = {
  工作台: "dashboard",
  工单: "work-orders",
  消息: "messages",
  我的: "settings",
};
function navigate(item: string) {
  const slug = destinations[item];
  if (!slug) return;
  void router.push(`/prototype/field-service/${slug}?variant=default&theme=${theme.value}`);
}
</script>
<template>
  <div class="field-service-shell" data-pb-id="field-service.shell">
    <AppBar :title="title" />
    <main><slot /></main>
    <BottomNavigation :model-value="active ?? '工作台'" @update:model-value="navigate" />
  </div>
</template>
<style scoped>
.field-service-shell{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto;background:var(--pb-color-background);color:var(--pb-color-on-background)}
main{min-width:0;overflow:auto;padding-bottom:var(--pb-safe-bottom,0px)}
</style>

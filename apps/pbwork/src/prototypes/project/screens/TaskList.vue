<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import DataList from "@/design-system/components/complex/DataList.vue";

const route = useRoute();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

const items = computed(() => {
  if (variant.value === "empty" || variant.value === "loading") return [];
  return [
    { id: "t1", title: "整理需求", subtitle: "今日 · 进行中" },
    { id: "t2", title: "联调接口", subtitle: "明日 · 待开始" },
    { id: "t3", title: "验收用例", subtitle: "本周 · 待确认" },
  ];
});
</script>

<template>
  <div class="screen" data-pb-id="task-list.root">
    <AppBar title="任务列表" />
    <p class="variant-hint">Variant：{{ variant }}</p>
    <DataList
      class="list"
      :items="items"
      :loading="variant === 'loading'"
      empty-text="暂无任务"
    />
  </div>
</template>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.variant-hint {
  margin: 0;
  padding: 8px 16px;
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.list {
  flex: 1;
  margin: 8px 12px 16px;
  min-height: 0;
}
</style>

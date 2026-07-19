<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
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
    <header class="app-bar" data-pb-role="app-bar" data-pb-id="task-list.app-bar">
      <h1>任务列表</h1>
      <p>Variant：{{ variant }}</p>
    </header>
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
  min-height: 100vh;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.app-bar {
  padding: 20px 16px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: var(--pb-color-surface, #fff);
}
.app-bar h1 {
  margin: 0 0 4px;
  font: var(--pb-typography-title, 650 20px/1.3 Inter, system-ui, sans-serif);
}
.app-bar p {
  margin: 0;
  opacity: 0.65;
  font-size: 0.75rem;
}
.list {
  padding: 8px;
}
</style>

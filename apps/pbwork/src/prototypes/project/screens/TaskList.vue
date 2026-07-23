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
    <DataList class="list" inspect-id="project.task-list.list">
      <p v-if="variant === 'loading'" class="state">正在加载任务…</p>
      <p v-else-if="items.length === 0" class="state">暂无任务</p>
      <template v-else>
        <div
          v-for="item in items"
          :key="item.id"
          role="listitem"
          class="task-row"
          :data-pb-id="`project.task-list.list.row.${item.id}`"
        >
          <strong>{{ item.title }}</strong
          ><span>{{ item.subtitle }}</span>
        </div>
      </template>
    </DataList>
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
.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 0 14px;
}
.task-row strong {
  font: var(--pb-typography-subtitle);
}
.task-row span,
.state {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.state {
  display: grid;
  min-height: 220px;
  margin: 0;
  place-items: center;
}
</style>

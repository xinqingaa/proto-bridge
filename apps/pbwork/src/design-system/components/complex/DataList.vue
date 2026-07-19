<script setup lang="ts">
import Chip from "@/design-system/components/basic/Chip.vue";

defineProps<{
  items: Array<{ id: string; title: string; subtitle?: string }>;
  loading?: boolean;
  emptyText?: string;
  radius?: "sm" | "md" | "lg";
  elevated?: boolean;
}>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <div
    data-pb-id="ds.data-list"
    data-pb-role="list"
    class="pb-data-list list"
    :class="[`radius-${radius ?? 'lg'}`, { 'is-elevated': elevated }]"
  >
    <div v-if="loading" class="pb-data-list-loading">加载中…</div>
    <ul v-else-if="items.length > 0" class="pb-data-list-items">
      <li
        v-for="item in items"
        :key="item.id"
        class="pb-data-list-row"
        :data-pb-id="`ds.data-list.row.${item.id}`"
        @click="$emit('select', item.id)"
      >
        <div>
          <strong>{{ item.title }}</strong>
          <p v-if="item.subtitle">{{ item.subtitle }}</p>
        </div>
        <Chip label="进行中" tone="primary" />
      </li>
    </ul>
    <p v-else class="pb-data-list-empty">{{ emptyText ?? "暂无数据" }}</p>
  </div>
</template>

<style scoped>
.pb-data-list {
  background: var(--pb-color-surface, #fff);
  border: 1px solid var(--pb-color-border, #d7dee8);
  overflow: hidden;
}
.pb-data-list.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-data-list.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-data-list.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-data-list.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-data-list-loading,
.pb-data-list-empty {
  margin: 0;
  padding: var(--pb-spacing-lg, 24px);
  text-align: center;
  color: color-mix(in srgb, var(--pb-color-on-surface, #1f2937) 58%, transparent);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.pb-data-list-items {
  list-style: none;
  margin: 0;
  padding: 0;
}
.pb-data-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-md, 16px);
  padding: var(--pb-spacing-md, 16px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  cursor: pointer;
}
.pb-data-list-row:last-child {
  border-bottom: 0;
}
.pb-data-list-row strong {
  display: block;
  font: var(--pb-typography-subtitle, 600 16px/1.4 Inter, system-ui, sans-serif);
}
.pb-data-list-row p {
  margin: 4px 0 0;
  color: color-mix(in srgb, var(--pb-color-on-surface, #1f2937) 62%, transparent);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
</style>

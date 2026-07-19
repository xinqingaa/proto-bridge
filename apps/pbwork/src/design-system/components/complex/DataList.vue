<script setup lang="ts">
defineProps<{
  items: Array<{ id: string; title: string; subtitle?: string }>;
  loading?: boolean;
  emptyText?: string;
}>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <div data-pb-id="ds.data-list" data-pb-role="list" class="list">
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
    <v-list v-else-if="items.length > 0" lines="two">
      <v-list-item
        v-for="item in items"
        :key="item.id"
        :title="item.title"
        :subtitle="item.subtitle ?? ''"
        :data-pb-id="`ds.data-list.row.${item.id}`"
        @click="$emit('select', item.id)"
      />
    </v-list>
    <p v-else class="empty">{{ emptyText ?? "暂无数据" }}</p>
  </div>
</template>

<style scoped>
.empty {
  margin: 0;
  padding: 24px 8px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  text-align: center;
}
</style>

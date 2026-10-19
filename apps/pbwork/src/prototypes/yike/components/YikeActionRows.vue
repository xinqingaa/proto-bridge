<script setup lang="ts">
import DataList from "@/design-system/components/data/DataList.vue";
defineProps<{
  inspectId: string;
  items: Array<{
    id: string;
    inspectId: string;
    label: string;
    description?: string;
    danger?: boolean;
  }>;
}>();
defineEmits<{ select: [string] }>();
</script>
<template>
  <DataList :inspect-id="inspectId">
    <div v-for="item in items" :key="item.id" role="listitem">
      <button
        type="button"
        class="action-row"
        :class="{ 'is-danger': item.danger }"
        :aria-labelledby="`${item.inspectId}-label`"
        :aria-describedby="
          item.description ? `${item.inspectId}-description` : undefined
        "
        :data-pb-id="item.inspectId"
        data-pb-role="button"
        data-pb-token-size="size.touch"
        data-pb-token-padding="spacing.sm-plus"
        data-pb-token-background="color.surface"
        data-pb-token-typography="typography.content"
        :data-pb-token-color="item.danger ? 'color.error' : 'color.on-surface'"
        @click="$emit('select', item.id)"
      >
        <span :id="`${item.inspectId}-label`">{{ item.label }}</span
        ><small
          v-if="item.description"
          :id="`${item.inspectId}-description`"
          :data-pb-id="`${item.inspectId}.description`"
          data-pb-role="text"
          data-pb-token-typography="typography.caption"
          data-pb-token-color="color.on-surface-muted"
          >{{ item.description }}</small
        >
      </button>
    </div>
  </DataList>
</template>
<style scoped>
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-xs);
  inline-size: var(--pb-layout-fill);
  min-block-size: var(--pb-size-touch);
  padding: var(--pb-spacing-sm-plus);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  border-block-end: var(--pb-border-hairline);
  font: var(--pb-typography-content);
  text-align: start;
  cursor: pointer;
}
.action-row.is-danger {
  color: var(--pb-color-error);
}
.action-row small {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.action-row:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
</style>

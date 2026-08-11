<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  items?: string[];
  modelValue?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.filter-bar`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { items, modelValue, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.filter-bar",
  instanceId: inspectId,
  componentId: "filter-bar",
  getProps: () => ({
    items: items.value ?? [],
    modelValue: modelValue.value ?? "全部",
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "color.surface",
    "color.border",
    "radius.sm",
    "spacing.sm",
    "typography.label",
  ],
  getTokenBindings: () => ({
    active: "color.primary",
    activeSurface: "color.primary-soft",
    surface: "color.surface",
    border: "color.border",
    radius: "radius.sm",
    gap: "spacing.sm",
    label: "typography.label",
  }),
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-filter-bar"
    data-pb-id="ds.filter-bar"
    data-pb-role="filter"
  >
    <v-chip-group
      class="pb-filter-chips"
      selected-class="is-active"
      :model-value="modelValue ?? '全部'"
      mandatory
      @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    >
      <v-chip
        v-for="item in items ?? ['全部', '进行中', '已完成']"
        :key="item"
        :value="item"
        :variant="modelValue === item ? 'tonal' : 'outlined'"
        :color="modelValue === item ? 'primary' : undefined"
        label
      >
        {{ item }}
      </v-chip>
    </v-chip-group>
  </div>
</template>

<style scoped>
.pb-filter-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--pb-spacing-sm);
}
.pb-filter-chips {
  flex: 1;
  min-width: 0;
}
.pb-filter-chips :deep(.v-chip) {
  border-color: transparent !important;
  border-radius: var(--pb-radius-sm);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-label);
  text-transform: none;
  letter-spacing: normal;
}
.pb-filter-chips :deep(.v-chip.is-active) {
  background: var(--pb-color-surface-variant) !important;
  color: var(--pb-color-on-surface) !important;
}
</style>

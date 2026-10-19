<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import PickerWheel, { type WheelOption } from "../_shared/PickerWheel.vue";
export interface WheelColumn {
  id: string;
  label: string;
  options: WheelOption[];
  unit?: string;
  numeric?: boolean;
}
const props = withDefaults(
  defineProps<{
    label?: string;
    columns: WheelColumn[];
    modelValue?: Array<string | number>;
    disabled?: boolean;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { label: "选择", modelValue: () => [], disabled: false },
);
const emit = defineEmits<{
  "update:modelValue": [value: Array<string | number>];
}>();
const rootRef = ref<HTMLElement | null>(null);
const wheelId = computed(
  () =>
    `${props.inspectId ?? "ds.duration-picker"}${props.pbKey ? "." + props.pbKey : ""}`,
);
const visibleColumns = computed(() => props.columns.slice(0, 3));
const values = computed(() =>
  visibleColumns.value.map(
    (column, index) =>
      column.options.find((option) => option.value === props.modelValue[index])
        ?.value ??
      column.options[0]?.value ??
      "",
  ),
);
function select(index: number, value: string | number) {
  if (props.disabled) return;
  const next = [...values.value];
  next[index] = value;
  emit("update:modelValue", next);
}
// Preserve the registered identity for existing captures and links.
usePbInspect({
  element: rootRef,
  pbId: "ds.duration-picker",
  componentId: "duration-picker",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.surface",
    surfaceRadius: "radius.surface",
    selectionRadius: "radius.control-compact",
    unit: "typography.caption",
    selectedFont: "typography.numeric-title",

    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    selection: "color.surface",
    textSelectedFont: "typography.subtitle",
    track: "color.surface",
    radius: "radius.control",
    padding: "spacing.xs",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    number: "typography.numeric-content",
    row: "size.control",
    settleDuration: "motion.duration-short",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="wheel-picker"
    data-pb-role="field"
    role="group"
    :aria-label="label"
    data-no-swipe
    :aria-disabled="disabled"
  >
    <PickerWheel
      v-for="(column, index) in visibleColumns"
      :key="column.id"
      :id="`${wheelId}-${column.id}`"
      :model-value="values[index]!"
      :options="column.options"
      :label="column.label"
      :unit="column.unit ?? ''"
      :numeric="Boolean(column.numeric)"
      :disabled="disabled || !column.options.length"
      @update:model-value="select(index, $event)"
    />
  </div>
</template>
<style scoped>
.wheel-picker {
  display: flex;
  min-inline-size: var(--pb-layout-zero);
  inline-size: var(--pb-layout-fill);
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-surface);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
</style>

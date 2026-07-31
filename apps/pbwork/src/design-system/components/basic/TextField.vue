<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  modelValue?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.text-field`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, disabled, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.text-field",
  instanceId: inspectId,
  componentId: "text-field",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    border: "color.border",
    surface: "color.surface",
    radius: "radius.md",
    height: "sizing.control-md",
    label: "typography.caption",
    input: "typography.content",
  }),
  getTokens: () => [
    "color.border",
    "color.surface",
    "color.on-surface",
    "radius.md",
    "sizing.control-md",
    "typography.caption",
    "typography.content",
    "spacing.xs",
    "spacing.md",
  ],
});
</script>

<template>
  <v-text-field
    ref="rootRef"
    class="pb-field radius-md"
    data-pb-id="ds.text-field"
    data-pb-role="field"
    :label="label"
    :model-value="modelValue ?? ''"
    :disabled="disabled ?? false"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.pb-field {
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.pb-field :deep(.v-field) {
  min-height: var(--pb-sizing-control-md, 40px);
  background: var(--pb-color-surface, #fff);
}
.pb-field :deep(.v-field__input) {
  min-height: var(--pb-sizing-control-md, 40px);
}
.pb-field.radius-sm :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-sm, 8px);
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-field.radius-md :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-md, 12px);
  border-radius: var(--pb-radius-md, 12px);
}
.pb-field.radius-lg :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-lg, 16px);
  border-radius: var(--pb-radius-lg, 16px);
}
</style>

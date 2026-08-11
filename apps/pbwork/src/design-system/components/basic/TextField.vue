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
    disabledOpacity: "opacity.disabled",
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
    "opacity.disabled",
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
  font: var(--pb-typography-content);
}
.pb-field :deep(.v-field) {
  min-height: var(--pb-sizing-control-md);
  background: var(--pb-color-surface);
}
.pb-field :deep(.v-field__input) {
  min-height: var(--pb-sizing-control-md);
}
.pb-field.radius-sm :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-sm);
  border-radius: var(--pb-radius-sm);
}
.pb-field.radius-md :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-md);
  border-radius: var(--pb-radius-md);
}
.pb-field.radius-lg :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-lg);
  border-radius: var(--pb-radius-lg);
}
.pb-field.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
</style>

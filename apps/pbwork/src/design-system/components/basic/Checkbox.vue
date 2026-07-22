<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  modelValue?: boolean;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.checkbox`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, disabled, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.checkbox",
  instanceId: inspectId,
  componentId: "checkbox",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? false,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary",
    "color.on-primary",
    "color.on-surface",
    "sizing.touch",
    "radius.xs",
    "typography.content",
  ],
  getTokenBindings: () => ({
    selected: "color.primary",
    onSelected: "color.on-primary",
    target: "sizing.touch",
    radius: "radius.xs",
    label: "typography.content",
  }),
});
</script>

<template>
  <v-checkbox
    ref="rootRef"
    class="pb-check"
    data-pb-id="ds.checkbox"
    color="primary"
    density="comfortable"
    hide-details
    :label="label"
    :model-value="modelValue ?? false"
    :disabled="disabled ?? false"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>

<style scoped>
.pb-check {
  min-height: var(--pb-sizing-touch, 44px);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-check :deep(.v-selection-control__input > .v-icon) {
  opacity: 1;
}
</style>

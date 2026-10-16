<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
const TEXTAREA_ROWS = useTokenNumber("textarea.rows");

const props = defineProps<{
  label?: string;
  showLabel?: boolean;
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.textarea`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { label, showLabel, modelValue, placeholder, disabled, inspectId } =
  toRefs(props);

const labeled = computed(() => showLabel.value === true);
const fieldVariant = computed(() =>
  labeled.value ? "outlined" : "solo-filled",
);

usePbInspect({
  element: rootRef,
  pbId: "ds.textarea",
  instanceId: inspectId,
  componentId: "textarea",
  getProps: () => ({
    label: label.value ?? "",
    showLabel: labeled.value,
    modelValue: modelValue.value ?? "",
    placeholder: placeholder.value ?? "",
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    labeled.value ? "color.surface" : "color.surface-recessed",
    "color.border",
    "color.on-surface",
    "color.primary",
    "radius.control",
    "typography.content",
    "opacity.disabled",
    "textarea.rows",
  ],
  getTokenBindings: () => ({
    surface: labeled.value ? "color.surface" : "color.surface-recessed",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.control",
    text: "typography.content",
    disabledOpacity: "opacity.disabled",
    rows: "textarea.rows",
  }),
});
</script>

<template>
  <v-textarea
    ref="rootRef"
    class="pb-textarea"
    :class="{ 'is-plain': !labeled, 'is-labeled': labeled }"
    data-pb-id="ds.textarea"
    data-pb-role="field"
    :label="labeled ? (label ?? '') : undefined"
    :hide-details="!labeled"
    :flat="!labeled"
    :variant="fieldVariant"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder ?? ''"
    :rows="TEXTAREA_ROWS"
    :disabled="disabled ?? false"
    :style="radiusStyle('md')"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.pb-textarea :deep(.v-field) {
  --v-field-border-radius: var(--pb-component-radius, var(--pb-radius-control));
  border-radius: var(
    --pb-component-radius,
    var(--pb-radius-control)
  ) !important;
  background: var(--pb-color-surface-recessed);
}
.pb-textarea.is-labeled :deep(.v-field) {
  background: var(--pb-color-surface);
}
.pb-textarea.is-plain :deep(.v-field) {
  box-shadow: none;
}
.pb-textarea.is-plain :deep(.v-field__outline) {
  display: none;
}
.pb-textarea.is-labeled :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-control))
    var(--pb-layout-zero) var(--pb-layout-zero)
    var(--pb-component-radius, var(--pb-radius-control)) !important;
}
.pb-textarea.is-labeled :deep(.v-field__outline__end) {
  border-radius: var(--pb-layout-zero)
    var(--pb-component-radius, var(--pb-radius-control))
    var(--pb-component-radius, var(--pb-radius-control)) var(--pb-layout-zero) !important;
}
.pb-textarea.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
</style>

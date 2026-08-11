<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const TEXTAREA_ROWS = tokenDefaultNumber("sizing.textarea-rows");

const props = defineProps<{
  label: string;
  modelValue?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.textarea`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, disabled, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.textarea",
  instanceId: inspectId,
  componentId: "textarea",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.primary",
    "radius.md",
    "typography.content",
    "opacity.disabled",
    "sizing.textarea-rows",
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.md",
    text: "typography.content",
    disabledOpacity: "opacity.disabled",
    rows: "sizing.textarea-rows",
  }),
});
</script>

<template>
  <v-textarea
    ref="rootRef"
    class="pb-textarea"
    data-pb-id="ds.textarea"
    data-pb-role="field"
    :label="label"
    :model-value="modelValue ?? ''"
    :rows="TEXTAREA_ROWS"
    :disabled="disabled ?? false"
    :style="radiusStyle('md')"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.pb-textarea :deep(.v-field) {
  --v-field-border-radius: var(--pb-component-radius, var(--pb-radius-md));
  border-radius: var(--pb-component-radius, var(--pb-radius-md)) !important;
  background: var(--pb-color-surface);
}
.pb-textarea :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-md))
    var(--pb-radius-none) var(--pb-radius-none)
    var(--pb-component-radius, var(--pb-radius-md)) !important;
}
.pb-textarea :deep(.v-field__outline__end) {
  border-radius: var(--pb-radius-none)
    var(--pb-component-radius, var(--pb-radius-md))
    var(--pb-component-radius, var(--pb-radius-md)) var(--pb-radius-none) !important;
}
.pb-textarea.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
</style>

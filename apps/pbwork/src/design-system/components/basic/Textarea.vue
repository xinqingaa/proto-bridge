<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import {
  controlSizeStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  label: string;
  modelValue?: string;
  rows?: number;
  size?: ComponentSize;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, rows, size, disabled } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.textarea",
  componentId: "textarea",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    rows: rows.value ?? 3,
    size: size.value ?? "md",
    disabled: disabled.value ?? false,
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.primary",
    "radius.md",
    "typography.content",
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.md",
    height: `sizing.control-${size.value ?? "md"}`,
    text: "typography.content",
  }),
});
</script>

<template>
  <v-textarea
    ref="rootRef"
    class="pb-textarea"
    data-pb-id="ds.textarea"
    :label="label"
    :model-value="modelValue ?? ''"
    :rows="rows ?? 3"
    :disabled="disabled ?? false"
    :style="[radiusStyle('md'), controlSizeStyle(size ?? 'md')]"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.pb-textarea :deep(.v-field) {
  --v-field-border-radius: var(
    --pb-component-radius,
    var(--pb-radius-md, 12px)
  );
  border-radius: var(
    --pb-component-radius,
    var(--pb-radius-md, 12px)
  ) !important;
  background: var(--pb-color-surface, #fff);
}
.pb-textarea :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-md, 12px)) 0 0
    var(--pb-component-radius, var(--pb-radius-md, 12px)) !important;
}
.pb-textarea :deep(.v-field__outline__end) {
  border-radius: 0 var(--pb-component-radius, var(--pb-radius-md, 12px))
    var(--pb-component-radius, var(--pb-radius-md, 12px)) 0 !important;
}
</style>

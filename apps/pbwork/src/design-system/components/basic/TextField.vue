<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  controlSizeStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  label: string;
  modelValue?: string;
  disabled?: boolean;
  radius?: "sm" | "md" | "lg";
  size?: ComponentSize;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, disabled, radius, size } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.text-field",
  componentId: "text-field",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    disabled: disabled.value ?? false,
    radius: radius.value ?? "md",
    size: size.value ?? "md",
  }),
  getTokenBindings: () => ({
    border: "color.border",
    surface: "color.surface",
    radius: `radius.${radius.value ?? "md"}`,
    height: `sizing.control-${size.value ?? "md"}`,
    label: "typography.caption",
    input: "typography.content",
  }),
  getTokens: () => [
    "color.border",
    "color.surface",
    "color.on-surface",
    `radius.${radius.value ?? "md"}`,
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
    class="pb-field"
    data-pb-id="ds.text-field"
    :class="`radius-${radius ?? 'md'}`"
    :style="controlSizeStyle(size ?? 'md')"
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
  min-height: var(--pb-component-height, var(--pb-sizing-control-md));
  background: var(--pb-color-surface, #fff);
}
.pb-field :deep(.v-field__input) {
  min-height: var(--pb-component-height, var(--pb-sizing-control-md));
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

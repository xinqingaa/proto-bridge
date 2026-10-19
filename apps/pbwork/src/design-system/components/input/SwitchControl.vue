<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  assertColorTokenRef,
  colorTokenCss,
} from "@/design-system/components/_shared/colorTokens";

const props = defineProps<{
  label: string;
  labelPosition?: "start" | "end";
  modelValue?: boolean;
  /** Active track Token-ref. */
  color?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.switch`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, color, disabled, inspectId } = toRefs(props);

const active = computed(() =>
  assertColorTokenRef(color.value, "color.primary"),
);

const switchStyle = computed(() => ({
  "--pb-switch-active": colorTokenCss(active.value),
}));

usePbInspect({
  element: rootRef,
  pbId: "ds.switch",
  instanceId: inspectId,
  componentId: "switch",
  getProps: () => ({
    labelPosition: props.labelPosition ?? "end",
    label: label.value,
    modelValue: modelValue.value ?? false,
    color: active.value,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    active.value,
    "color.outline",
    "color.surface",
    "size.touch",
    "typography.content",
    "opacity.disabled",
  ],
  getTokenBindings: () => ({
    active: active.value,
    track: "color.outline",
    thumb: "color.surface",
    text: "color.on-surface",
    target: "size.touch",
    label: "typography.content",
    disabledOpacity: "opacity.disabled",
  }),
});
</script>

<template>
  <v-switch
    ref="rootRef"
    class="pb-switch"
    data-pb-id="ds.switch"
    data-pb-role="field"
    hide-details
    inset
    :label="label"
    :class="{ 'label-start': labelPosition === 'start' }"
    :model-value="modelValue ?? false"
    :disabled="disabled ?? false"
    :style="switchStyle"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
    ><template #label
      ><slot name="label">{{ label }}</slot></template
    ></v-switch
  >
</template>

<style scoped>
.pb-switch {
  display: flex;
  min-height: var(--pb-size-touch);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-switch :deep(.v-input__control) {
  flex: var(--pb-layout-flex-fill);
}
.pb-switch.label-start {
  inline-size: var(--pb-layout-fill);
}
.pb-switch.label-start :deep(.v-selection-control) {
  flex-direction: row-reverse;
  justify-content: space-between;
  inline-size: var(--pb-layout-fill);
}
.pb-switch.label-start :deep(.v-label) {
  flex: var(--pb-layout-flex-fill);
  margin-inline: var(--pb-layout-zero);
}
.pb-switch.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
.pb-switch :deep(.v-switch__track) {
  opacity: var(--pb-opacity-visible);
  background: var(--pb-color-outline);
}
.pb-switch :deep(.v-switch__thumb) {
  color: var(--pb-color-surface);
}
.pb-switch :deep(.v-selection-control--dirty .v-switch__track) {
  background: var(--pb-switch-active, var(--pb-color-primary)) !important;
}
.pb-switch :deep(.v-selection-control--dirty .v-switch__thumb) {
  color: var(--pb-color-surface);
}
</style>

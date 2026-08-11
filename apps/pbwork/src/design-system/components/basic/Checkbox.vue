<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  assertColorTokenRef,
  colorTokenCss,
  defaultTextColorForBg,
} from "@/design-system/components/_shared/colorTokens";

const props = defineProps<{
  label: string;
  modelValue?: boolean;
  /** Checked fill Token-ref. */
  selectedColor?: string;
  /** Unchecked border Token-ref. */
  uncheckedBorderColor?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.checkbox`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const {
  label,
  modelValue,
  selectedColor,
  uncheckedBorderColor,
  disabled,
  inspectId,
} = toRefs(props);

const selected = computed(() =>
  assertColorTokenRef(selectedColor.value, "color.primary"),
);
const uncheckedBorder = computed(() =>
  assertColorTokenRef(uncheckedBorderColor.value, "color.outline"),
);
const onSelected = computed(() =>
  defaultTextColorForBg(selected.value, "color.on-primary"),
);

const checkStyle = computed(() => ({
  "--pb-check-selected": colorTokenCss(selected.value),
  "--pb-check-on-selected": colorTokenCss(onSelected.value),
  "--pb-check-unchecked-border": colorTokenCss(uncheckedBorder.value),
}));

usePbInspect({
  element: rootRef,
  pbId: "ds.checkbox",
  instanceId: inspectId,
  componentId: "checkbox",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? false,
    selectedColor: selected.value,
    uncheckedBorderColor: uncheckedBorder.value,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    selected.value,
    onSelected.value,
    uncheckedBorder.value,
    "color.on-surface",
    "sizing.touch",
    "radius.xs",
    "typography.content",
    "opacity.disabled",
  ],
  getTokenBindings: () => ({
    selected: selected.value,
    onSelected: onSelected.value,
    uncheckedBorder: uncheckedBorder.value,
    target: "sizing.touch",
    radius: "radius.xs",
    label: "typography.content",
    disabledOpacity: "opacity.disabled",
  }),
});
</script>

<template>
  <v-checkbox
    ref="rootRef"
    class="pb-check"
    data-pb-id="ds.checkbox"
    data-pb-role="field"
    density="comfortable"
    hide-details
    :label="label"
    :model-value="modelValue ?? false"
    :disabled="disabled ?? false"
    :style="checkStyle"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>

<style scoped>
.pb-check {
  min-height: var(--pb-sizing-touch);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-check.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
.pb-check :deep(.v-selection-control__input > .v-icon) {
  opacity: var(--pb-opacity-visible);
  border-radius: var(--pb-radius-xs);
  color: var(--pb-check-selected, var(--pb-color-primary));
}
.pb-check :deep(.v-selection-control__wrapper) {
  border-radius: var(--pb-radius-xs);
}
.pb-check :deep(.v-selection-control__input) {
  border-radius: var(--pb-radius-xs);
}
.pb-check
  :deep(
    .v-selection-control:not(.v-selection-control--dirty)
      .v-selection-control__input
      > .v-icon
  ) {
  color: var(--pb-check-unchecked-border, var(--pb-color-outline));
}
</style>

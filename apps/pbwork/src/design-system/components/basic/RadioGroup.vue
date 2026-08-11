<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  assertColorTokenRef,
  colorTokenCss,
} from "@/design-system/components/_shared/colorTokens";

const props = defineProps<{
  label: string;
  modelValue?: string;
  options?: string[];
  /** Selected control Token-ref. */
  color?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.radio-group`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, options, color, disabled, inspectId } = toRefs(props);

const selected = computed(() =>
  assertColorTokenRef(color.value, "color.primary"),
);

const radioStyle = computed(() => ({
  "--pb-radio-selected": colorTokenCss(selected.value),
}));

usePbInspect({
  element: rootRef,
  pbId: "ds.radio-group",
  instanceId: inspectId,
  componentId: "radio-group",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    options: options.value ?? [],
    color: selected.value,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    selected.value,
    "color.on-surface",
    "spacing.sm",
    "typography.content",
    "typography.caption",
    "opacity.disabled",
  ],
  getTokenBindings: () => ({
    selected: selected.value,
    label: "typography.caption",
    option: "typography.content",
    gap: "spacing.sm",
    disabledOpacity: "opacity.disabled",
  }),
});
</script>

<template>
  <v-radio-group
    ref="rootRef"
    class="pb-radio"
    data-pb-id="ds.radio-group"
    data-pb-role="field"
    hide-details
    :label="label"
    :model-value="modelValue ?? ''"
    :disabled="disabled ?? false"
    :style="radioStyle"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  >
    <v-radio
      v-for="item in options ?? ['选项一', '选项二']"
      :key="item"
      :label="item"
      :value="item"
    />
  </v-radio-group>
</template>

<style scoped>
.pb-radio {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-radio.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
.pb-radio :deep(.v-label) {
  font: var(--pb-typography-caption);
}
.pb-radio :deep(.v-selection-control__input > .v-icon) {
  color: var(--pb-radio-selected, var(--pb-color-primary));
}
</style>

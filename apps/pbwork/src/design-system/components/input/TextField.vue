<script setup lang="ts">
import { computed, toRefs, useSlots } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  showLabel?: boolean;
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.text-field`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();

const slots = useSlots();
const rootRef = usePbInspectRef();
const {
  label,
  showLabel,
  modelValue,
  placeholder,
  disabled,
  clearable,
  inspectId,
} = toRefs(props);

const labeled = computed(() => showLabel.value === true);
const fieldVariant = computed(() =>
  labeled.value ? "outlined" : "solo-filled",
);

usePbInspect({
  element: rootRef,
  pbId: "ds.text-field",
  instanceId: inspectId,
  componentId: "text-field",
  getProps: () => ({
    label: label.value ?? "",
    showLabel: labeled.value,
    modelValue: modelValue.value ?? "",
    placeholder: placeholder.value ?? "",
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
    :class="{ 'is-plain': !labeled, 'is-labeled': labeled }"
    data-pb-id="ds.text-field"
    data-pb-role="field"
    :label="labeled ? (label ?? '') : undefined"
    :hide-details="!labeled"
    :flat="!labeled"
    :variant="fieldVariant"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder ?? ''"
    :disabled="disabled ?? false"
    :clearable="clearable ?? false"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    @click:clear="$emit('update:modelValue', '')"
  >
    <template v-if="slots['prepend-inner']" #prepend-inner>
      <slot name="prepend-inner" />
    </template>
    <template v-if="slots['append-inner']" #append-inner>
      <slot name="append-inner" />
    </template>
  </v-text-field>
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
.pb-field.is-plain :deep(.v-field) {
  box-shadow: none;
}
.pb-field.is-plain :deep(.v-field__outline) {
  display: none;
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

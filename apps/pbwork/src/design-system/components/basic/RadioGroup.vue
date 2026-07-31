<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  modelValue?: string;
  options?: string[];
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.radio-group`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, options, disabled, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.radio-group",
  instanceId: inspectId,
  componentId: "radio-group",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    options: options.value ?? [],
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary",
    "color.on-surface",
    "spacing.sm",
    "typography.content",
    "typography.caption",
  ],
  getTokenBindings: () => ({
    selected: "color.primary",
    label: "typography.caption",
    option: "typography.content",
    gap: "spacing.sm",
  }),
});
</script>

<template>
  <v-radio-group
    ref="rootRef"
    class="pb-radio"
    data-pb-id="ds.radio-group"
    data-pb-role="field"
    color="primary"
    hide-details
    :label="label"
    :model-value="modelValue ?? ''"
    :disabled="disabled ?? false"
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
.pb-radio :deep(.v-label) {
  font: var(--pb-typography-caption);
}
</style>

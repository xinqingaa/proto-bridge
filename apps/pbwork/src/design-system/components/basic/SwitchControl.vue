<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  modelValue?: boolean;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { label, modelValue, disabled } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.switch",
  componentId: "switch",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? false,
    disabled: disabled.value ?? false,
  }),
  getTokens: () => [
    "color.primary",
    "color.surface-variant",
    "color.surface",
    "sizing.touch",
    "typography.content",
  ],
  getTokenBindings: () => ({
    active: "color.primary",
    track: "color.surface-variant",
    thumb: "color.surface",
    target: "sizing.touch",
    label: "typography.content",
  }),
});
</script>

<template>
  <v-switch
    ref="rootRef"
    class="pb-switch"
    data-pb-id="ds.switch"
    color="primary"
    hide-details
    inset
    :label="label"
    :model-value="modelValue ?? false"
    :disabled="disabled ?? false"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>

<style scoped>
.pb-switch {
  min-height: var(--pb-sizing-touch, 44px);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
</style>

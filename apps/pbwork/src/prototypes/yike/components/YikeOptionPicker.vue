<script setup lang="ts">
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
import type { WheelOption } from "@/design-system/components/_shared/PickerWheel.vue";
defineProps<{
  modelValue: string | number;
  options: WheelOption[];
  label: string;
  inspectId: string;
  unit?: string;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string | number] }>();
</script>
<template>
  <WheelPicker
    :columns="[{ id: 'option', label, options, unit: unit ?? '' }]"
    :model-value="[modelValue]"
    :label="label"
    :inspect-id="inspectId"
    :disabled="Boolean(disabled)"
    @update:model-value="$emit('update:modelValue', $event[0]!)"
  />
</template>

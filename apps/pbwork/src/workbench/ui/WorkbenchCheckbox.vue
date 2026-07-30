<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    label: string;
    disabled?: boolean;
    hideDetails?: boolean;
  }>(),
  { disabled: false, hideDetails: true },
);

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <v-checkbox
    class="wb-checkbox"
    :model-value="modelValue"
    :label="label"
    :disabled="disabled ?? false"
    :hide-details="hideDetails ?? true"
    density="compact"
    color="action"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  />
</template>

<style scoped>
.wb-checkbox {
  min-width: 0;
  font-size: 0.75rem;
}
.wb-checkbox :deep(.v-label) {
  font-size: 0.75rem;
  line-height: 1.35;
  opacity: 0.82;
}
</style>

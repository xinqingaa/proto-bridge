<script setup lang="ts">
defineProps<{
  label: string;
  modelValue?: string;
  disabled?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <v-text-field
    data-pb-id="ds.text-field"
    :model-value="modelValue ?? ''"
    :label="label"
    :disabled="disabled ?? false"
    variant="outlined"
    density="comfortable"
    hide-details
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

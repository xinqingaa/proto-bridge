<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
    disabled?: boolean;
    hideDetails?: boolean;
  }>(),
  {
    label: "",
    ariaLabel: "",
    placeholder: "",
    disabled: false,
    hideDetails: true,
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <v-text-field
    class="wb-text-field"
    :model-value="modelValue"
    :label="label || undefined"
    :aria-label="ariaLabel || label || '输入'"
    :placeholder="placeholder || undefined"
    :disabled="disabled ?? false"
    :hide-details="hideDetails ?? true"
    density="compact"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.wb-text-field :deep(.v-field) {
  min-height: 34px;
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
}
.wb-text-field :deep(.v-field__input) {
  min-height: 34px;
  padding-block: 5px;
  font-size: 0.75rem;
}
.wb-text-field :deep(.v-label) {
  font-size: 0.75rem;
}
</style>

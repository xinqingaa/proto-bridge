<script setup lang="ts">
export type WorkbenchSelectItem = {
  label: string;
  value: string;
  disabled?: boolean;
};

withDefaults(
  defineProps<{
    modelValue: string;
    items: WorkbenchSelectItem[];
    label?: string;
    ariaLabel?: string;
    disabled?: boolean;
    hideDetails?: boolean;
  }>(),
  {
    label: "",
    ariaLabel: "",
    disabled: false,
    hideDetails: true,
  },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <v-select
    class="wb-select"
    :model-value="modelValue"
    :items="items"
    item-title="label"
    item-value="value"
    item-props
    :label="label || undefined"
    :aria-label="ariaLabel || label || '选择'"
    :disabled="disabled ?? false"
    :hide-details="hideDetails ?? true"
    density="compact"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<style scoped>
.wb-select {
  min-width: 0;
  font-size: 0.75rem;
}
.wb-select :deep(.v-field) {
  min-height: 34px;
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
}
.wb-select :deep(.v-field__input) {
  min-height: 34px;
  padding-block: 5px;
  font-size: 0.75rem;
}
.wb-select :deep(.v-label) {
  font-size: 0.75rem;
}
</style>

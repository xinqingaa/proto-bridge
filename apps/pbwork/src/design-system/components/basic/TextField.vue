<script setup lang="ts">
defineProps<{
  label: string;
  modelValue?: string;
  disabled?: boolean;
  radius?: "sm" | "md" | "lg";
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <label class="pb-field" data-pb-id="ds.text-field">
    <span class="pb-field-label">{{ label }}</span>
    <input
      class="pb-field-input"
      :class="`radius-${radius ?? 'md'}`"
      :value="modelValue ?? ''"
      :disabled="disabled ?? false"
      @input="
        $emit(
          'update:modelValue',
          ($event.target as HTMLInputElement).value,
        )
      "
    />
  </label>
</template>

<style scoped>
.pb-field {
  display: grid;
  gap: var(--pb-spacing-xs, 4px);
}
.pb-field-label {
  color: var(--pb-color-on-surface, #1f2937);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.pb-field-input {
  min-height: 40px;
  padding: 0 var(--pb-spacing-md, 16px);
  border: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface, #fff);
  color: var(--pb-color-on-surface, #1f2937);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.pb-field-input.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-field-input.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-field-input.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-field-input:disabled {
  opacity: 0.45;
}
</style>

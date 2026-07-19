<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  items: Array<{ value: string; label: string }>;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div data-pb-id="ds.tabs" data-pb-role="tab-bar" class="pb-tabs tab-bar">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="pb-tab"
      :class="{ 'is-active': props.modelValue === item.value }"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.pb-tabs {
  display: flex;
  gap: var(--pb-spacing-xs, 4px);
  padding: var(--pb-spacing-xs, 4px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface, #fff);
}
.pb-tab {
  min-height: 36px;
  padding: 0 var(--pb-spacing-md, 16px);
  border: 0;
  border-radius: var(--pb-radius-md, 12px);
  background: transparent;
  color: color-mix(in srgb, var(--pb-color-on-surface, #1f2937) 65%, transparent);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
  cursor: pointer;
}
.pb-tab.is-active {
  background: color-mix(in srgb, var(--pb-color-primary, #2563eb) 12%, transparent);
  color: var(--pb-color-primary, #2563eb);
  font-weight: 600;
}
</style>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    items: Array<{ value: string; label: string; count?: number }>;
    label: string;
    fill?: boolean;
  }>(),
  { fill: false },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div
    class="wb-segmented"
    :class="{ 'is-fill': fill }"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      :class="{ 'is-active': modelValue === item.value }"
      :aria-pressed="modelValue === item.value"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
      <span v-if="item.count !== undefined">{{ item.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.wb-segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.wb-segmented.is-fill {
  display: flex;
  width: 100%;
}
.wb-segmented.is-fill button {
  flex: 1 1 0;
  justify-content: center;
  min-width: 0;
}
button {
  display: inline-flex;
  min-height: 27px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: pointer;
}
button:hover {
  color: rgba(var(--v-theme-on-surface), 0.9);
}
button.is-active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}
button span {
  min-width: 16px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
  font-size: 0.625rem;
}
</style>

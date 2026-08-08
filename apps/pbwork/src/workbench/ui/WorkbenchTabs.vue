<script setup lang="ts">
export type WorkbenchTabItem = {
  label: string;
  value: string;
  count?: number;
  testId?: string;
};

withDefaults(
  defineProps<{
    modelValue: string;
    items: WorkbenchTabItem[];
    label: string;
    fill?: boolean;
  }>(),
  { fill: false },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div
    class="wb-tabs"
    :class="{ 'is-fill': fill }"
    role="tablist"
    :aria-label="label"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :data-testid="item.testId"
      :aria-selected="modelValue === item.value"
      :class="{ 'is-active': modelValue === item.value }"
      @click="$emit('update:modelValue', item.value)"
    >
      <span>{{ item.label }}</span>
      <small v-if="item.count !== undefined">{{ item.count }}</small>
    </button>
  </div>
</template>

<style scoped>
.wb-tabs {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.wb-tabs.is-fill {
  display: flex;
  width: 100%;
}
.wb-tabs button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}
.wb-tabs.is-fill button {
  flex: 1 1 0;
  justify-content: center;
  min-width: 0;
  padding: 0 6px;
}
.wb-tabs button:hover {
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.wb-tabs button.is-active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}
.wb-tabs small {
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  padding-inline: 4px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
  font-size: 0.62rem;
}
</style>

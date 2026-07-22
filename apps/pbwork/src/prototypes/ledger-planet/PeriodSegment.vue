<script setup lang="ts">
import { periodTabs, type LedgerPeriod } from "./mock";

const period = defineModel<LedgerPeriod>({ required: true });
</script>

<template>
  <div
    class="period-segment"
    data-no-swipe
    role="tablist"
    aria-label="时间周期"
  >
    <button
      v-for="item in periodTabs"
      :key="item.value"
      type="button"
      role="tab"
      class="period-item"
      :class="{ 'is-active': period === item.value }"
      :aria-selected="period === item.value"
      data-no-swipe
      @click="period = item.value as LedgerPeriod"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.period-segment {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-surface);
}
.period-item {
  min-height: 36px;
  border: 0;
  border-radius: var(--pb-radius-full);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-label);
  cursor: pointer;
}
.period-item.is-active {
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
  font-weight: 600;
}
</style>

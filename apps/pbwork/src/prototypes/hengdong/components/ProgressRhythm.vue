<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  items: Array<{
    id: string;
    label: string;
    minutes: number;
    recordCount: number;
  }>;
  selectedKey: string;
  inspectId: string;
  ariaLabel: string;
}>();

defineEmits<{ select: [key: string] }>();

const maximumMinutes = computed(() =>
  Math.max(1, ...props.items.map((item) => item.minutes)),
);
</script>

<template>
  <figure
    class="progress-rhythm"
    :class="{ 'is-scrollable': items.length > 7 }"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.surface-recessed"
    data-pb-token-color="color.primary"
    data-pb-token-spacing="spacing.sm"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="progress-rhythm-item"
      :class="{ 'is-selected': selectedKey === item.id }"
      :data-pb-id="`${inspectId}.slice`"
      :data-pb-key="item.id.replaceAll(':', '-')"
      data-pb-role="button"
      data-pb-action="select-time-slice"
      :aria-label="`${item.label}，${item.recordCount} 次活动，${item.minutes} 分钟`"
      :aria-pressed="selectedKey === item.id"
      @click="$emit('select', item.id)"
    >
      <span class="progress-rhythm-value">{{ item.minutes }}</span>
      <span class="progress-rhythm-track" aria-hidden="true">
        <span
          class="progress-rhythm-bar"
          :class="{ 'is-empty': item.minutes === 0 }"
          :style="{ '--progress-rhythm-value': item.minutes / maximumMinutes }"
        />
      </span>
      <span class="progress-rhythm-label">{{ item.label }}</span>
    </button>
  </figure>
</template>

<style scoped>
.progress-rhythm {
  display: flex;
  min-height: var(--pb-layout-chart-min-height);
  align-items: stretch;
  gap: var(--pb-spacing-xs);
  margin: var(--pb-spacing-none);
  padding: var(--pb-spacing-md);
  overflow-x: auto;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface-recessed);
  scrollbar-width: none;
}

.progress-rhythm::-webkit-scrollbar {
  display: none;
}

.progress-rhythm-item {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-xs);
  border: none;
  border-radius: var(--pb-radius-md);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
}

.progress-rhythm.is-scrollable .progress-rhythm-item {
  min-width: var(--pb-sizing-avatar-sm);
}

.progress-rhythm-item.is-selected {
  background: var(--pb-color-surface-selected);
  color: var(--pb-color-primary);
}

.progress-rhythm-item:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}

.progress-rhythm-track {
  display: flex;
  width: var(--pb-layout-fill);
  min-height: var(--pb-layout-chart-plot-height);
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft);
}

.progress-rhythm-bar {
  height: calc(var(--pb-layout-fill) * var(--progress-rhythm-value));
  min-height: var(--pb-sizing-step-dot);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary);
}

.progress-rhythm-bar.is-empty {
  height: var(--pb-sizing-step-dot);
  background: var(--pb-color-border);
}

.progress-rhythm-value,
.progress-rhythm-label {
  font: var(--pb-typography-micro);
}

.progress-rhythm-label {
  white-space: nowrap;
}
</style>

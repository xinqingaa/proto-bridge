<script setup lang="ts">
defineProps<{
  items: Array<{ id: string; label: string; minutes: number }>;
  inspectId: string;
}>();
</script>

<template>
  <figure
    class="activity-chart"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.surface-recessed"
    data-pb-token-color="color.primary"
    data-pb-token-spacing="spacing.sm"
    aria-label="本周训练分钟趋势"
  >
    <div v-for="item in items" :key="item.id" class="activity-column">
      <span class="activity-value">{{ item.minutes }}</span>
      <div class="activity-track">
        <span
          class="activity-bar"
          :class="{ 'is-empty': item.minutes === 0 }"
          :style="{ '--activity-value': item.minutes }"
        />
      </div>
      <span class="activity-label">{{ item.label }}</span>
    </div>
  </figure>
</template>

<style scoped>
.activity-chart {
  display: flex;
  min-height: var(--pb-layout-chart-min-height);
  align-items: stretch;
  gap: var(--pb-spacing-sm);
  margin: var(--pb-spacing-none);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface-recessed);
}
.activity-column {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
}
.activity-track {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  width: var(--pb-layout-fill);
  min-height: var(--pb-layout-chart-plot-height);
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft);
}
.activity-bar {
  flex-grow: var(--activity-value);
  min-height: var(--pb-sizing-step-dot);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary);
}
.activity-bar.is-empty {
  background: var(--pb-color-border);
}
.activity-value,
.activity-label {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}
</style>

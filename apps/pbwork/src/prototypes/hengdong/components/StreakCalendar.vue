<script setup lang="ts">
defineProps<{
  weeks: Array<Array<{ id: string; label: string; state: string }>>;
  inspectId: string;
}>();
</script>

<template>
  <section
    class="streak-calendar"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.surface"
    data-pb-token-color="color.on-surface"
    data-pb-token-spacing="spacing.sm"
    aria-label="八月训练打卡日历"
  >
    <div class="week-labels" aria-hidden="true">
      <span
        v-for="label in ['一', '二', '三', '四', '五', '六', '日']"
        :key="label"
        >{{ label }}</span
      >
    </div>
    <div
      v-for="(week, weekIndex) in weeks"
      :key="weekIndex"
      class="calendar-week"
    >
      <span
        v-for="day in week"
        :key="day.id"
        class="calendar-day"
        :class="`is-${day.state}`"
        :aria-label="`${day.label} 日${day.state === 'done' ? '已完成' : ''}`"
        >{{ day.label }}</span
      >
    </div>
  </section>
</template>

<style scoped>
.streak-calendar,
.calendar-week,
.week-labels {
  display: flex;
}
.streak-calendar {
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.calendar-week,
.week-labels {
  gap: var(--pb-spacing-xs);
}
.calendar-day,
.week-labels span {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  min-height: var(--pb-sizing-touch);
  align-items: center;
  justify-content: center;
  border-radius: var(--pb-radius-md);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.week-labels span {
  min-height: var(--pb-sizing-icon-lg);
}
.calendar-day.is-done {
  background: var(--pb-color-success-soft);
  color: var(--pb-color-success);
  font: var(--pb-typography-caption-strong);
}
.calendar-day.is-today {
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
  font: var(--pb-typography-caption-strong);
}
.calendar-day.is-future {
  opacity: var(--pb-opacity-disabled);
}
</style>

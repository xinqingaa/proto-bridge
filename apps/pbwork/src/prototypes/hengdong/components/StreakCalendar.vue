<script setup lang="ts">
defineProps<{
  weeks: Array<
    Array<{
      id: string;
      label: string;
      state: "done" | "today" | "future" | "idle" | "blank";
    }>
  >;
  selectedDate?: string;
  inspectId: string;
}>();

defineEmits<{ select: [date: string] }>();
</script>

<template>
  <section
    class="hd-calendar"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-surface"
    data-pb-token-spacing="spacing.sm"
    aria-label="活动日历"
  >
    <div class="hd-calendar-week hd-calendar-labels" aria-hidden="true">
      <span
        v-for="label in ['一', '二', '三', '四', '五', '六', '日']"
        :key="label"
        >{{ label }}</span
      >
    </div>
    <div v-for="week in weeks" :key="week[0]?.id" class="hd-calendar-week">
      <template v-for="day in week" :key="day.id">
        <span
          v-if="day.state === 'blank'"
          class="hd-calendar-day is-blank"
          aria-hidden="true"
        />
        <button
          v-else
          type="button"
          class="hd-calendar-day"
          :class="[
            `is-${day.state}`,
            { 'is-selected': selectedDate === day.id },
          ]"
          :disabled="day.state === 'future'"
          :aria-label="`${day.label} 日${day.state === 'done' ? '有活动' : ''}`"
          :aria-pressed="selectedDate === day.id"
          @click="$emit('select', day.id)"
        >
          {{ day.label }}
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.hd-calendar,
.hd-calendar-week {
  display: flex;
}
.hd-calendar {
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.hd-calendar-week {
  gap: var(--pb-spacing-xs);
}
.hd-calendar-day,
.hd-calendar-labels span {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  min-height: var(--pb-sizing-touch);
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--pb-radius-md);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.hd-calendar-labels span {
  min-height: var(--pb-sizing-icon-lg);
}
.hd-calendar-day.is-done {
  background: var(--pb-color-success-soft);
  color: var(--pb-color-success);
  font: var(--pb-typography-caption-strong);
}
.hd-calendar-day.is-today {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption-strong);
}
.hd-calendar-day.is-selected {
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}
.hd-calendar-day:disabled {
  opacity: var(--pb-opacity-disabled);
}
.hd-calendar-day.is-blank {
  visibility: hidden;
}
</style>

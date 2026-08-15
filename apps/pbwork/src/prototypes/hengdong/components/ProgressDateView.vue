<script setup lang="ts">
import { computed } from "vue";
import {
  HENGDONG_TODAY,
  datesInRange,
  type DateRange,
  type ProgressPeriod,
  type WorkoutRecord,
} from "../model";

const props = defineProps<{
  period: ProgressPeriod;
  range: DateRange;
  records: WorkoutRecord[];
  selectedKey: string;
  inspectId: string;
}>();

defineEmits<{ select: [key: string] }>();

type DayCell = {
  id: string;
  label: string;
  state: "done" | "today" | "future" | "idle" | "blank";
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthsInRange(range: DateRange) {
  const months: string[] = [];
  let cursor = `${range.start.slice(0, 7)}-01`;
  const end = `${range.end.slice(0, 7)}-01`;
  while (cursor <= end) {
    months.push(monthKey(cursor));
    const date = new Date(`${cursor}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1, 1);
    cursor = date.toISOString().slice(0, 10);
  }
  return months;
}

const dates = computed(() => datesInRange(props.range));
const showMonths = computed(
  () => props.period === "year" || (props.period === "custom" && dates.value.length > 62),
);
const recordDates = computed(() => new Set(props.records.map((record) => record.date)));
const recordMonths = computed(
  () => new Set(props.records.map((record) => record.date.slice(0, 7))),
);
const monthItems = computed(() =>
  monthsInRange(props.range).map((month) => ({
    id: `month:${month}`,
    label: `${Number(month.slice(5))} 月`,
    active: recordMonths.value.has(month),
    future: `${month}-01` > HENGDONG_TODAY,
  })),
);

function dayCell(date: string): DayCell {
  const day = Number(date.slice(-2));
  const monthBoundary = day === 1 || date === props.range.start;
  return {
    id: `date:${date}`,
    label: monthBoundary ? `${Number(date.slice(5, 7))}/${day}` : String(day),
    state:
      date > HENGDONG_TODAY
        ? "future"
        : date === HENGDONG_TODAY
          ? "today"
          : recordDates.value.has(date)
            ? "done"
            : "idle",
  };
}

const calendarWeeks = computed(() => {
  const cells: DayCell[] = [];
  const startDay = new Date(`${props.range.start}T00:00:00Z`).getUTCDay() || 7;
  for (let index = 1; index < startDay; index += 1) {
    cells.push({
      id: `blank-start-${index}`,
      label: "",
      state: "blank",
    });
  }
  for (const date of dates.value) cells.push(dayCell(date));
  while (cells.length % 7 !== 0) {
    cells.push({
      id: `blank-end-${cells.length}`,
      label: "",
      state: "blank",
    });
  }
  const weeks: DayCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
});

function dateAria(cell: DayCell) {
  const date = cell.id.replace("date:", "");
  return `${date}${cell.state === "done" ? "有活动" : ""}`;
}
</script>

<template>
  <section
    class="progress-date-view"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-surface"
    data-pb-token-spacing="spacing.sm"
    aria-label="活动日期视图"
  >
    <div v-if="showMonths" class="progress-months">
      <button
        v-for="month in monthItems"
        :key="month.id"
        type="button"
        class="progress-month"
        :class="{
          'is-active': month.active,
          'is-selected': selectedKey === month.id,
        }"
        :disabled="month.future"
        :aria-pressed="selectedKey === month.id"
        :data-pb-id="`${inspectId}.month`"
        :data-pb-key="month.id.replaceAll(':', '-')"
        @click="$emit('select', month.id)"
      >
        <span>{{ month.label }}</span>
        <small>{{ month.active ? "有活动" : "未活动" }}</small>
      </button>
    </div>

    <template v-else>
      <div class="progress-calendar-week progress-calendar-labels" aria-hidden="true">
        <span v-for="label in ['一', '二', '三', '四', '五', '六', '日']" :key="label">
          {{ label }}
        </span>
      </div>
      <div v-for="week in calendarWeeks" :key="week[0]?.id" class="progress-calendar-week">
        <template v-for="cell in week" :key="cell.id">
          <span v-if="cell.state === 'blank'" class="progress-day is-blank" aria-hidden="true" />
          <button
            v-else
            type="button"
            class="progress-day"
            :class="[
              `is-${cell.state}`,
              { 'is-selected': selectedKey === cell.id },
            ]"
            :disabled="cell.state === 'future'"
            :aria-label="dateAria(cell)"
            :aria-pressed="selectedKey === cell.id"
            :data-pb-id="`${inspectId}.day`"
            :data-pb-key="cell.id.replaceAll(':', '-')"
            @click="$emit('select', cell.id)"
          >
            {{ cell.label }}
          </button>
        </template>
      </div>
    </template>
  </section>
</template>

<style scoped>
.progress-date-view,
.progress-calendar-week,
.progress-months,
.progress-month {
  display: flex;
}

.progress-date-view {
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}

.progress-calendar-week {
  gap: var(--pb-spacing-xs);
}

.progress-day,
.progress-calendar-labels span {
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

.progress-calendar-labels span {
  min-height: var(--pb-sizing-icon-lg);
}

.progress-day.is-done,
.progress-month.is-active {
  background: var(--pb-color-success-soft);
  color: var(--pb-color-success);
}

.progress-day.is-today {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption-strong);
}

.progress-day.is-selected,
.progress-month.is-selected {
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}

.progress-day:focus-visible,
.progress-month:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}

.progress-day:disabled,
.progress-month:disabled {
  opacity: var(--pb-opacity-disabled);
}

.progress-day.is-blank {
  visibility: hidden;
}

.progress-months {
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
}

.progress-month {
  min-width: var(--pb-layout-chart-plot-height);
  min-height: var(--pb-sizing-touch);
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--pb-spacing-xxs);
  padding: var(--pb-spacing-sm);
  border: none;
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-recessed);
  color: var(--pb-color-on-surface);
  text-align: left;
}

.progress-month span {
  font: var(--pb-typography-label);
}

.progress-month small {
  color: inherit;
  font: var(--pb-typography-micro);
}
</style>

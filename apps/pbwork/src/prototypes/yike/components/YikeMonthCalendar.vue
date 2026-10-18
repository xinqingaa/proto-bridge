<script setup lang="ts">
import MonthCalendar from "@/design-system/components/display/MonthCalendar.vue";
import { computed, useId } from "vue";
import {
  monthDays,
  parseDay,
} from "@/design-system/components/_shared/calendar";
import artwork from "./date-artwork.json";
const props = defineProps<{
  inspectId: string;
  face: "mechanical" | "water" | "sundial";
  month: string;
  today: string;
  days: Array<{ date: string; minutes: number }>;
  modelValue?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [string];
  "update:month": [string];
}>();
const id = `month-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const weeks = computed(() =>
  parseDay(props.today) ? monthDays(props.month) : [],
);
const values = computed(
  () =>
    new Map(
      props.days
        .filter((day) => parseDay(day.date) && day.date <= props.today)
        .map((day) => [
          day.date,
          Number.isFinite(day.minutes) ? Math.max(0, day.minutes) : 0,
        ]),
    ),
);
const max = computed(() =>
  Math.max(
    1,
    ...weeks.value
      .flat()
      .map((date) => (date ? (values.value.get(date) ?? 0) : 0)),
  ),
);
const minutes = (date: string) => values.value.get(date) ?? 0;
const level = (date: string) =>
  date > props.today ? 0 : minutes(date) / max.value;
const select = (date: string) =>
  emit("update:modelValue", props.modelValue === date ? "" : date);
const disabledDates = computed(() =>
  weeks.value
    .flat()
    .filter((date): date is string => Boolean(date) && date! > props.today),
);
const dayLabels = computed(() =>
  Object.fromEntries(
    weeks.value
      .flat()
      .filter((date): date is string => Boolean(date))
      .map((date) => [
        date,
        `${date}，${date > props.today ? "未来日期" : `${minutes(date)} 分钟`}`,
      ]),
  ),
);
</script>
<template>
  <MonthCalendar
    :month="parseDay(today) ? month : ''"
    :today="today"
    :model-value="modelValue ?? ''"
    :disabled-dates="disabledDates"
    :day-labels="dayLabels"
    :inspect-id="inspectId"
    label="每日专注"
    @update:model-value="select"
    @update:month="emit('update:month', $event)"
  >
    <template #day="{ date }"
      ><span class="date-artwork" :class="{ 'is-empty': minutes(date) === 0 }">
        <svg
          :viewBox="artwork.cell.viewBox"
          :width="artwork.cell.size"
          :height="artwork.cell.size"
          aria-hidden="true"
        >
          <defs>
            <clipPath :id="`${id}-${date}`">
              <circle
                :cx="artwork.cell.cx"
                :cy="artwork.cell.cy"
                :r="artwork.cell.radius"
              />
            </clipPath>
          </defs>
          <circle
            v-if="face === 'mechanical'"
            :cx="artwork.cell.cx"
            :cy="artwork.cell.cy"
            :r="artwork.cell.radius"
            fill="currentColor"
            :fill-opacity="level(date)"
            class="outline"
          />
          <template v-else-if="face === 'water'">
            <circle
              :cx="artwork.cell.cx"
              :cy="artwork.cell.cy"
              :r="artwork.cell.radius"
              class="vessel"
            />
            <rect
              :x="artwork.cell.edge"
              :y="artwork.cell.edge + artwork.cell.side * (1 - level(date))"
              :width="artwork.cell.side"
              :height="artwork.cell.side * level(date)"
              fill="currentColor"
              :clip-path="`url(#${id}-${date})`"
            />
          </template>
          <template v-else>
            <rect
              :x="artwork.cell.edge"
              :y="artwork.cell.edge"
              :width="artwork.cell.side"
              :height="artwork.cell.side"
              :rx="artwork.cell.corner"
              class="vessel"
            />
            <circle
              :cx="artwork.cell.cx"
              :cy="artwork.cell.cy"
              :r="artwork.cell.inkRadius"
              fill="currentColor"
              :fill-opacity="level(date)"
            />
          </template>
        </svg>
        <span class="number">{{ Number(date.slice(-2)) }}</span>
      </span></template
    >
  </MonthCalendar>
</template>
<style scoped>
.date-artwork {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-layout-fill);
  min-block-size: var(--pb-size-touch);
  color: var(--pb-color-primary);
}
svg {
  position: absolute;
  max-inline-size: var(--pb-layout-fill);
}
.number {
  position: relative;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-caption);
}
.is-empty .number {
  color: var(--pb-color-on-surface-muted);
}
.vessel {
  fill: transparent;
  stroke: var(--pb-color-divider);
  stroke-width: var(--pb-border-width);
}
.outline {
  stroke: var(--pb-color-divider);
  stroke-width: var(--pb-border-width);
}
</style>

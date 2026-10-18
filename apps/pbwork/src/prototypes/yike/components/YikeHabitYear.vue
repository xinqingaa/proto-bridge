<script setup lang="ts">
import { computed } from "vue";
import Heatmap from "@/design-system/components/display/Heatmap.vue";
import { shiftDay } from "@/design-system/components/_shared/calendar";
import { habitYearWeeks, habitDayLabels } from "./date-records";
import artwork from "./date-artwork.json";
const props = defineProps<{
  inspectId: string;
  face: "mechanical" | "water" | "sundial";
  today: string;
  createdOn: string;
  days: Array<{ date: string; completed: boolean | null }>;
  completeness?: "complete" | "partial";
  archived?: Array<{ from: string; to?: string }>;
}>();
const weeks = computed(() =>
  habitYearWeeks({
    today: props.today,
    createdOn: props.createdOn,
    days: props.days,
    completeness: props.completeness ?? "complete",
    archived: props.archived ?? [],
  }),
);
const days = computed(() => weeks.value.flat());
const states = computed(
  () => new Map(days.value.map((day) => [day.date, day.state])),
);
const records = computed(() => {
  const first = shiftDay(props.today, -364);
  return days.value
    .filter((day) => first && day.date >= first && day.date <= props.today)
    .map((day) => ({ date: day.date, value: day.state === "done" ? 1 : 0 }));
});
const stateFor = (date: string) =>
  states.value.get(date) ?? (date > props.today ? "future" : "before");
const total = computed(
  () => days.value.filter((day) => day.state === "done").length,
);
const viewBox = computed(
  () =>
    `0 0 ${Math.max(artwork.year.minimumColumns, weeks.value.length) * artwork.year.pitch} ${artwork.year.rows * artwork.year.pitch}`,
);
</script>
<template>
  <section
    class="habit-year"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-color="color.primary"
    data-pb-token-empty="color.divider"
    data-pb-token-gap="spacing.sm"
  >
    <p v-if="!weeks.length" role="status">日期无效</p>
    <Heatmap
      v-else
      :inspect-id="`${inspectId}.calendar`"
      :days="records"
      :readonly="true"
      :day-labels="
        Object.fromEntries(
          days.map((day) => [
            day.date,
            `${day.date}：${habitDayLabels[day.state]}`,
          ]),
        )
      "
      :label="`最近365天完成 ${total} 次`"
      model-value=""
    >
      <template #plot="{ weeks: dateWeeks }">
        <svg
          :viewBox="viewBox"
          role="img"
          :aria-label="`最近365天完成 ${total} 次；逐日状态可展开日期记录查看`"
          :data-pb-id="`${inspectId}.plot`"
          data-pb-role="image"
          data-pb-token-color="color.primary"
        >
          <g v-for="(week, column) in dateWeeks" :key="week[0]?.date">
            <g
              v-for="(day, row) in week"
              :key="day.date"
              :transform="`translate(${column * artwork.year.pitch} ${row * artwork.year.pitch})`"
              :class="`is-${stateFor(day.date)}`"
              :data-date="day.date"
              :data-state="stateFor(day.date)"
            >
              <title>
                {{ day.date }}：{{ habitDayLabels[stateFor(day.date)] }}
              </title>
              <rect
                v-if="face === 'sundial'"
                :width="artwork.year.cell"
                :height="artwork.year.cell"
                :rx="artwork.year.squareRadius"
              />
              <circle
                v-else
                :cx="artwork.year.circleRadius"
                :cy="artwork.year.circleRadius"
                :r="artwork.year.circleRadius"
              />
            </g>
          </g>
        </svg>
      </template>
      <template #legend>
        <div class="axis">
          <span>{{ days[0]?.date }}</span
          ><span>{{ today }} · {{ total }} 次</span>
        </div>
        <p class="legend">
          实心为完成，空心为缺失，淡色为归档期间；创建前与未来留空。空记录表示未打卡。
        </p>
        <details>
          <summary>日期记录</summary>
          <ul>
            <li v-for="day in days" :key="day.date">
              {{ day.date }} · {{ habitDayLabels[day.state] }}
            </li>
          </ul>
        </details>
      </template>
    </Heatmap>
  </section>
</template>
<style scoped>
.habit-year {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-primary);
}
svg {
  inline-size: var(--pb-layout-fill);
  overflow: visible;
}
.is-done {
  fill: var(--pb-color-primary);
}
.is-off {
  fill: var(--pb-color-divider);
}
.is-missing {
  fill: transparent;
  stroke: var(--pb-color-outline);
  stroke-width: var(--pb-border-width);
}
.is-archived {
  fill: var(--pb-color-on-surface-muted);
  opacity: var(--pb-opacity-disabled);
}
.is-before,
.is-future {
  fill: transparent;
}
.axis {
  display: flex;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.axis,
.legend,
details {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}
p {
  margin: var(--pb-layout-zero);
}
summary {
  cursor: pointer;
  min-block-size: var(--pb-size-touch);
  display: flex;
  align-items: center;
}
summary:focus-visible {
  outline: var(--pb-border-focus);
}
ul {
  padding-inline-start: var(--pb-spacing-lg);
}
</style>

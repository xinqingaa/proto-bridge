<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import Dial from "./Dial.vue";
import TabBar from "./TabBar.vue";
import type { ReviewState } from "./gallery";
import {
  SAMPLE_MONTH_FIRST_WEEKDAY,
  SAMPLE_MONTH_MINUTES,
  SAMPLE_MONTH_SUMMARY,
  SAMPLE_SELECTED_DAY,
  SAMPLE_TODAY_DATE,
  SAMPLE_TODAY_INDEX,
  SAMPLE_WEEKDAYS,
  SAMPLE_WEEK_MINUTES,
  SAMPLE_WEEK_SUMMARY,
  formatTotal,
  type StyleDirectionId,
} from "./sample";

const props = defineProps<{ theme: StyleDirectionId; state: ReviewState }>();

const CHART_HEIGHT = 148;
const BLOCK_MINUTES = 25;

const month = computed(() => props.state === "month");
const empty = computed(() => props.state === "empty");

const weekMinutes = computed(() =>
  empty.value ? SAMPLE_WEEK_MINUTES.map((value) => (value < 0 ? value : 0)) : SAMPLE_WEEK_MINUTES,
);
const weekMax = 125;
const bars = computed(() =>
  weekMinutes.value.map((minutes, index) => ({
    day: SAMPLE_WEEKDAYS[index]!,
    minutes,
    height: minutes > 0 ? `${(minutes / weekMax) * 100}%` : "0%",
    today: index === SAMPLE_TODAY_INDEX,
    future: minutes < 0,
    selected: props.state === "day" && index === SAMPLE_SELECTED_DAY.index,
  })),
);
const chartStyle = {
  "--y-chart-height": `${CHART_HEIGHT}px`,
  "--y-block": `${(BLOCK_MINUTES / weekMax) * CHART_HEIGHT}px`,
};

const monthMax = Math.max(...SAMPLE_MONTH_MINUTES);
const monthWeeks = computed(() => {
  const cells: Array<{ date: number; minutes: number } | null> = [
    ...Array.from({ length: SAMPLE_MONTH_FIRST_WEEKDAY }, () => null),
    ...SAMPLE_MONTH_MINUTES.map((minutes, index) => ({ date: index + 1, minutes })),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: Array<typeof cells> = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
});

function cellStyle(minutes: number) {
  const level = minutes > 0 ? Math.max(0.2, minutes / monthMax) : 0;
  return { "--y-level": String(level), "--y-pct": `${Math.round(level * 100)}%` };
}

const summary = computed(() => {
  if (month.value) {
    return [
      { label: "专注", value: formatTotal(SAMPLE_MONTH_SUMMARY.minutes) },
      { label: "专注天数", value: `${SAMPLE_MONTH_SUMMARY.focusDays} 天` },
      { label: "打卡", value: `${SAMPLE_MONTH_SUMMARY.checkIns} 次` },
    ];
  }
  if (empty.value) {
    return [
      { label: "专注", value: "0 分钟" },
      { label: "专注次数", value: "0 次" },
      { label: "打卡", value: "0 次" },
    ];
  }
  return [
    { label: "专注", value: formatTotal(SAMPLE_WEEK_SUMMARY.minutes) },
    { label: "专注次数", value: `${SAMPLE_WEEK_SUMMARY.sessions} 次` },
    { label: "打卡", value: `${SAMPLE_WEEK_SUMMARY.checkIns} 次` },
  ];
});
</script>

<template>
  <div class="y-screen">
    <header class="y-head">
      <h2>回顾</h2>
    </header>

    <div class="y-period">
      <div class="y-segmented is-small" role="radiogroup" aria-label="范围">
        <button type="button" role="radio" :aria-checked="!month" :class="{ 'is-active': !month }">周</button>
        <button type="button" role="radio" :aria-checked="month" :class="{ 'is-active': month }">月</button>
      </div>
      <div class="y-period-nav">
        <button type="button" class="y-icon-button is-small" aria-label="上一段">
          <ChevronLeft aria-hidden="true" />
        </button>
        <span>{{ month ? SAMPLE_MONTH_SUMMARY.range : SAMPLE_WEEK_SUMMARY.range }}</span>
        <button type="button" class="y-icon-button is-small" aria-label="下一段" disabled>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>

    <dl class="y-stats is-compact">
      <div v-for="item in summary" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd><b>{{ item.value }}</b></dd>
      </div>
    </dl>

    <div v-if="empty" class="y-empty is-review">
      <Dial :theme="theme" :minutes="0" :total="25" size="mini" tone="done" />
      <strong>这一周还没有专注记录</strong>
      <button type="button" class="y-button is-primary">去专注</button>
    </div>

    <template v-else-if="!month">
      <div class="y-chart" :style="chartStyle" role="img" aria-label="本周每天的专注时长">
        <div
          v-for="bar in bars"
          :key="bar.day"
          class="y-chart-day"
          :class="{ 'is-today': bar.today, 'is-future': bar.future, 'is-selected': bar.selected }"
        >
          <em>{{ bar.minutes > 0 ? bar.minutes : "" }}</em>
          <span class="y-bar"><i :style="{ height: bar.height }" /></span>
          <span class="y-chart-label">{{ bar.day }}</span>
        </div>
      </div>

      <section v-if="state === 'day'" class="y-day-card">
        <header>
          <strong>{{ SAMPLE_SELECTED_DAY.label }}</strong>
          <span>{{ formatTotal(SAMPLE_SELECTED_DAY.minutes) }}</span>
        </header>
        <ul>
          <li v-for="record in SAMPLE_SELECTED_DAY.records" :key="record.start">
            <span>{{ record.start }}</span>
            <span>{{ record.kind }}</span>
            <b>{{ record.minutes }} 分钟</b>
          </li>
        </ul>
        <p>打卡：{{ SAMPLE_SELECTED_DAY.habits.join("、") }}</p>
      </section>

      <section v-else class="y-section">
        <h3>按类型</h3>
        <ul class="y-kinds">
          <li v-for="kind in SAMPLE_WEEK_SUMMARY.kinds" :key="kind.label">
            <span>{{ kind.label }}</span>
            <span class="y-kind-bar">
              <i :style="{ width: `${(kind.minutes / SAMPLE_WEEK_SUMMARY.minutes) * 100}%` }" />
            </span>
            <b>{{ kind.count }} 次 · {{ formatTotal(kind.minutes) }}</b>
          </li>
        </ul>
      </section>
    </template>

    <div v-else class="y-calendar" role="img" aria-label="十月每天的专注时长">
      <div class="y-calendar-row is-head" aria-hidden="true">
        <span v-for="day in SAMPLE_WEEKDAYS" :key="day">{{ day }}</span>
      </div>
      <div v-for="(week, row) in monthWeeks" :key="row" class="y-calendar-row">
        <span
          v-for="(cell, column) in week"
          :key="column"
          class="y-cal-day"
          :class="{
            'is-blank': !cell,
            'is-future': cell && cell.minutes < 0,
            'is-zero': cell && cell.minutes === 0,
            'is-today': cell && cell.date === SAMPLE_TODAY_DATE,
          }"
          :style="cell ? cellStyle(cell.minutes) : undefined"
        >
          <i v-if="cell" />
          <b v-if="cell">{{ cell.date }}</b>
        </span>
      </div>
    </div>

    <TabBar :active="2" />
  </div>
</template>

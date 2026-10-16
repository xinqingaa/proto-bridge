<script setup lang="ts">
import { computed, ref } from "vue";
import {
  MONTH_FIRST_WEEKDAY,
  TODAY_DATE,
  TODAY_INDEX,
  WEEKDAYS,
  formatMinutes,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();

const range = ref<"week" | "month">("week");
const selectedDay = ref(TODAY_INDEX);
const selectedDate = ref(TODAY_DATE);

const weekMax = computed(() => Math.max(120, ...props.model.weekMinutes.value));
const hours = computed(() => Math.floor(props.model.weekTotal.value / 60));
const minutes = computed(() => props.model.weekTotal.value % 60);
const activeDays = computed(
  () => props.model.weekMinutes.value.filter((value) => value > 0).length,
);

const selectedRecords = computed(() =>
  props.model.records.value.filter(
    (item) => item.day === 12 + selectedDay.value,
  ),
);

const monthCells = computed(() => {
  const cells: Array<{ key: string; day: number | null; minutes: number }> = [];
  for (let index = 0; index < MONTH_FIRST_WEEKDAY; index += 1) {
    cells.push({ key: `pad-${index}`, day: null, minutes: -1 });
  }
  props.model.monthMinutes.value.forEach((value, index) => {
    cells.push({ key: `d-${index + 1}`, day: index + 1, minutes: value });
  });
  while (cells.length % 7) {
    cells.push({ key: `tail-${cells.length}`, day: null, minutes: -1 });
  }
  return cells;
});

const monthTotal = computed(() =>
  props.model.monthMinutes.value
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0),
);
const selectedMonthMinutes = computed(
  () => props.model.monthMinutes.value[selectedDate.value - 1] ?? 0,
);

function heat(value: number): number {
  if (value <= 0) return 0;
  if (value < 40) return 1;
  if (value < 80) return 2;
  if (value < 120) return 3;
  return 4;
}
</script>

<template>
  <section class="yf-page yf-review" aria-label="回顾">
    <header class="yf-page-head">
      <div class="yf-page-title">
        <span class="yf-eyebrow">{{
          range === "week" ? "10月12日 – 18日" : "2026 年 10 月"
        }}</span>
        <h2>时间去了哪里</h2>
      </div>
      <div class="yf-range" role="radiogroup" aria-label="回顾范围">
        <button
          type="button"
          role="radio"
          :aria-checked="range === 'week'"
          :class="{ 'is-active': range === 'week' }"
          @click="range = 'week'"
        >
          周
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="range === 'month'"
          :class="{ 'is-active': range === 'month' }"
          @click="range = 'month'"
        >
          月
        </button>
      </div>
    </header>

    <template v-if="range === 'week'">
      <div class="yf-metric">
        <span class="yf-metric-number">
          {{ hours }}<small>小时</small>{{ minutes }}<small>分</small>
        </span>
        <span class="yf-metric-copy">本周专注 · {{ activeDays }} 天有记录</span>
      </div>

      <div class="yf-bars" role="list" aria-label="每日专注分钟">
        <button
          v-for="(value, index) in model.weekMinutes.value"
          :key="index"
          type="button"
          role="listitem"
          class="yf-bar"
          :class="{
            'is-today': index === TODAY_INDEX,
            'is-future': index > TODAY_INDEX,
            'is-selected': index === selectedDay,
          }"
          :disabled="index > TODAY_INDEX"
          :aria-label="`周${WEEKDAYS[index]} ${value} 分钟`"
          @click="selectedDay = index"
        >
          <span class="yf-bar-value">{{ value || "" }}</span>
          <span class="yf-bar-track">
            <span
              class="yf-bar-fill"
              :style="{ height: `${(value / weekMax) * 100}%` }"
            />
          </span>
          <span class="yf-bar-day">{{ WEEKDAYS[index] }}</span>
        </button>
      </div>

      <div class="yf-day-detail">
        <span class="yf-section-label">
          周{{ WEEKDAYS[selectedDay] }} · {{ selectedRecords.length }} 段 ·
          {{ formatMinutes(model.weekMinutes.value[selectedDay] ?? 0) }}
        </span>
        <ul v-if="selectedRecords.length" class="yf-sessions">
          <li v-for="item in selectedRecords" :key="item.id">
            <time>{{ item.start }}</time>
            <span>{{ item.kind }}</span>
            <strong>{{ item.minutes }} 分</strong>
          </li>
        </ul>
        <p v-else class="yf-muted">这一天没有专注记录。</p>
      </div>

      <div class="yf-habit-week">
        <span class="yf-section-label">习惯</span>
        <div
          v-for="habit in model.habits.value"
          :key="habit.id"
          class="yf-habit-week-row"
        >
          <span>{{ habit.name }}</span>
          <span class="yf-punches is-compact" aria-hidden="true">
            <span
              v-for="(done, index) in habit.week"
              :key="index"
              :class="{
                'is-punched': done,
                'is-today': index === TODAY_INDEX,
                'is-future': index > TODAY_INDEX,
              }"
            />
          </span>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="yf-metric">
        <span class="yf-metric-number">
          {{ Math.floor(monthTotal / 60) }}<small>小时</small
          >{{ monthTotal % 60 }}<small>分</small>
        </span>
        <span class="yf-metric-copy">十月已专注</span>
      </div>

      <div class="yf-calendar">
        <div class="yf-calendar-head" aria-hidden="true">
          <span v-for="day in WEEKDAYS" :key="day">{{ day }}</span>
        </div>
        <div class="yf-calendar-body" role="list" aria-label="十月每日专注">
          <span
            v-for="cell in monthCells"
            :key="cell.key"
            class="yf-calendar-cell"
            role="listitem"
          >
            <button
              v-if="cell.day"
              type="button"
              class="yf-calendar-day"
              :data-heat="heat(cell.minutes)"
              :class="{
                'is-today': cell.day === TODAY_DATE,
                'is-future': cell.minutes < 0,
                'is-selected': cell.day === selectedDate,
              }"
              :disabled="cell.minutes < 0"
              :aria-label="`10月${cell.day}日 ${Math.max(0, cell.minutes)} 分钟`"
              @click="selectedDate = cell.day"
            >
              {{ cell.day }}
            </button>
          </span>
        </div>
      </div>

      <div class="yf-day-detail">
        <span class="yf-section-label">
          10月{{ selectedDate }}日 ·
          {{ formatMinutes(Math.max(0, selectedMonthMinutes)) }}
        </span>
      </div>
    </template>
  </section>
</template>

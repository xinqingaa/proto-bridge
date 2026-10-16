<script setup lang="ts">
import { computed, ref } from "vue";
import Card from "@/design-system/components/display/Card.vue";
import ProgressIndicator from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import SecondaryTabs from "@/design-system/components/navigation/SecondaryTabs.vue";
import {
  MONTH_FIRST_WEEKDAY,
  TODAY_DATE,
  TODAY_INDEX,
  WEEKDAYS,
  formatMinutes,
  habitProgress,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();

const range = ref("week");
const selectedDay = ref(TODAY_INDEX);
const selectedDate = ref(TODAY_DATE);
const RANGES = [
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

const weekMax = computed(() => Math.max(120, ...props.model.weekMinutes.value));
const selectedRecords = computed(() =>
  props.model.records.value.filter(
    (item) => item.day === 12 + selectedDay.value,
  ),
);

const monthWeeks = computed(() => {
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
  const weeks: (typeof cells)[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
});

const monthTotal = computed(() =>
  props.model.monthMinutes.value
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0),
);

function heat(value: number): string {
  if (value <= 0) return "none";
  if (value < 60) return "low";
  if (value < 110) return "mid";
  return "high";
}
</script>

<template>
  <section class="yd-page" aria-label="回顾">
    <AppBar title="回顾" inspect-id="yike-draft.review.app-bar" />
    <SecondaryTabs
      v-model="range"
      class="yd-range-tabs"
      :items="RANGES"
      grow
      inspect-id="yike-draft.review.range"
    >
      <template #week>
        <div class="yd-review">
          <Card class="yd-summary" inspect-id="yike-draft.review.week-summary">
            <span class="yd-caption">10月12日 – 18日 · 本周专注</span>
            <span class="yd-summary-number">
              <strong>{{ formatMinutes(model.weekTotal.value) }}</strong>
            </span>
            <div class="yd-bars" role="list" aria-label="每日专注分钟">
              <button
                v-for="(value, index) in model.weekMinutes.value"
                :key="index"
                type="button"
                role="listitem"
                class="yd-bar"
                :class="{
                  'is-today': index === TODAY_INDEX,
                  'is-selected': index === selectedDay,
                }"
                :disabled="index > TODAY_INDEX"
                :aria-label="`周${WEEKDAYS[index]} ${value} 分钟`"
                @click="selectedDay = index"
              >
                <span class="yd-bar-track">
                  <span
                    class="yd-bar-fill"
                    :style="{ height: `${(value / weekMax) * 100}%` }"
                  />
                </span>
                <span class="yd-bar-day">{{ WEEKDAYS[index] }}</span>
              </button>
            </div>
          </Card>

          <span class="yd-section-title">
            周{{ WEEKDAYS[selectedDay] }} · {{ selectedRecords.length }} 段
          </span>
          <DataList
            v-if="selectedRecords.length"
            surface="raised"
            inspect-id="yike-draft.review.sessions"
          >
            <div
              v-for="item in selectedRecords"
              :key="item.id"
              class="yd-session"
            >
              <time>{{ item.start }}</time>
              <span>{{ item.kind }}</span>
              <strong>{{ item.minutes }} 分钟</strong>
            </div>
          </DataList>
          <p v-else class="yd-caption">这一天没有专注记录。</p>

          <span class="yd-section-title">习惯 · 本周</span>
          <DataList surface="raised" inspect-id="yike-draft.review.habits">
            <div
              v-for="habit in model.habits.value"
              :key="habit.id"
              class="yd-habit-progress"
            >
              <ProgressIndicator
                :label="`${habit.name}  ${habitProgress(habit).done}/${habitProgress(habit).goal}`"
                :value="
                  Math.min(
                    100,
                    (habitProgress(habit).done / habitProgress(habit).goal) *
                      100,
                  )
                "
              />
            </div>
          </DataList>
        </div>
      </template>

      <template #month>
        <div class="yd-review">
          <Card class="yd-summary" inspect-id="yike-draft.review.month-summary">
            <span class="yd-caption">2026 年 10 月 · 已专注</span>
            <span class="yd-summary-number">
              <strong>{{ formatMinutes(monthTotal) }}</strong>
            </span>
            <div class="yd-calendar">
              <div class="yd-calendar-row is-head" aria-hidden="true">
                <span v-for="day in WEEKDAYS" :key="day">{{ day }}</span>
              </div>
              <div
                v-for="(week, row) in monthWeeks"
                :key="row"
                class="yd-calendar-row"
              >
                <span
                  v-for="cell in week"
                  :key="cell.key"
                  class="yd-calendar-cell"
                >
                  <button
                    v-if="cell.day"
                    type="button"
                    class="yd-calendar-day"
                    :data-heat="heat(cell.minutes)"
                    :class="{
                      'is-today': cell.day === TODAY_DATE,
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
          </Card>
          <span class="yd-section-title">
            10月{{ selectedDate }}日 ·
            {{
              formatMinutes(
                Math.max(0, model.monthMinutes.value[selectedDate - 1] ?? 0),
              )
            }}
          </span>
        </div>
      </template>
    </SecondaryTabs>
  </section>
</template>

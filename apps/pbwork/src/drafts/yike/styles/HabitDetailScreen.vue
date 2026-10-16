<script setup lang="ts">
import { computed } from "vue";
import { Archive, ChevronLeft, Trash2 } from "lucide-vue-next";
import HabitGlyph from "../HabitGlyph.vue";
import { habitYear } from "../model";
import Sheet from "./Sheet.vue";
import type { HabitState } from "./gallery";
import {
  SAMPLE_HABITS,
  SAMPLE_TODAY_INDEX,
  habitDone,
  habitMeta,
  type StyleDirectionId,
} from "./sample";

const props = defineProps<{ theme: StyleDirectionId; state: HabitState }>();

const habit = computed(
  () => SAMPLE_HABITS.find((item) => item.id === (props.state === "detail-weekly" ? "run" : "read"))!,
);
const weekly = computed(() => habit.value.frequency.kind === "weekly");
const year = computed(() => habitYear(habit.value, 52));
const yearDone = computed(() =>
  year.value.reduce((sum, week) => sum + week.filter((value) => value === 1).length, 0),
);

const stats = computed(() => {
  const done = habitDone(habit.value);
  if (habit.value.frequency.kind === "weekly") {
    return [
      { label: "本周", value: `${done}/${habit.value.frequency.times}`, unit: "次" },
      { label: "本月", value: "6", unit: "次" },
      { label: "一年", value: String(yearDone.value), unit: "次" },
    ];
  }
  return [
    { label: "本周", value: `${done}/${SAMPLE_TODAY_INDEX + 1}`, unit: "天" },
    { label: "本月", value: "12", unit: "天" },
    { label: "一年", value: String(yearDone.value), unit: "天" },
  ];
});
</script>

<template>
  <div class="y-screen is-pushed">
    <nav class="y-nav">
      <button type="button" class="y-nav-back">
        <ChevronLeft aria-hidden="true" />
        打卡
      </button>
      <button type="button" class="y-nav-action">编辑</button>
    </nav>

    <header class="y-detail-hero">
      <span class="y-glyph-badge"><HabitGlyph :icon="habit.icon" /></span>
      <h2>{{ habit.name }}</h2>
      <span class="y-total">{{ habitMeta(habit) }}</span>
    </header>

    <dl class="y-stats">
      <div v-for="stat in stats" :key="stat.label">
        <dt>{{ stat.label }}</dt>
        <dd>
          <b>{{ stat.value }}</b>
          {{ stat.unit }}
        </dd>
      </div>
    </dl>

    <section v-if="weekly" class="y-section">
      <h3>本周进度</h3>
      <div class="y-goal">
        <i
          v-for="index in habit.frequency.kind === 'weekly' ? habit.frequency.times : 0"
          :key="index"
          :class="{ 'is-on': index <= habitDone(habit) }"
        />
        <span>还差 {{ habit.frequency.kind === "weekly" ? habit.frequency.times - habitDone(habit) : 0 }} 次，周日前完成即可</span>
      </div>
    </section>

    <section class="y-section">
      <h3>最近一年</h3>
      <div class="y-heatmap" role="img" :aria-label="`最近一年完成 ${yearDone} 次`">
        <span v-for="(week, column) in year" :key="column" class="y-heat-week">
          <i
            v-for="(value, row) in week"
            :key="row"
            :class="{ 'is-on': value === 1, 'is-future': value === -1 }"
          />
        </span>
      </div>
      <div class="y-heat-axis" aria-hidden="true">
        <span>去年 10 月</span>
        <span>本周</span>
      </div>
    </section>

    <ul class="y-list">
      <li>
        <button type="button">
          <Archive aria-hidden="true" />
          <span>归档习惯</span>
          <em>保留记录，从打卡页隐藏</em>
        </button>
      </li>
      <li class="is-danger">
        <button type="button">
          <Trash2 aria-hidden="true" />
          <span>删除习惯</span>
        </button>
      </li>
    </ul>

    <Sheet
      v-if="state === 'delete'"
      :title="`删除「${habit.name}」？`"
      text="所有打卡记录会一起删除，无法恢复。只想暂停的话，可以选择归档。"
      :actions="[
        { label: '删除', kind: 'danger' },
        { label: '取消', kind: 'quiet' },
      ]"
    />
  </div>
</template>

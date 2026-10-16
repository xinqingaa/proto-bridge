<script setup lang="ts">
import { computed } from "vue";
import { Check, Plus } from "lucide-vue-next";
import HabitGlyph from "../HabitGlyph.vue";
import {
  TODAY_INDEX,
  TODAY_LABEL,
  WEEKDAYS,
  frequencyLabel,
  habitProgress,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();
const emit = defineEmits<{ create: [] }>();

const habits = computed(() => props.model.habits.value);
const doneCount = computed(() => props.model.habitsDoneToday.value);
const allDone = computed(
  () => habits.value.length > 0 && doneCount.value === habits.value.length,
);
</script>

<template>
  <section class="yf-page yf-checkin" aria-label="打卡">
    <header class="yf-page-head">
      <div class="yf-page-title">
        <span class="yf-eyebrow">{{ TODAY_LABEL }}</span>
        <h2>今天的习惯</h2>
      </div>
      <button
        class="yf-icon-button"
        type="button"
        aria-label="新建习惯"
        @click="emit('create')"
      >
        <Plus aria-hidden="true" />
      </button>
    </header>

    <div
      v-if="habits.length"
      class="yf-tally"
      :class="{ 'is-complete': allDone }"
    >
      <span class="yf-tally-number">
        {{ doneCount }}<small>/{{ habits.length }}</small>
      </span>
      <span class="yf-tally-copy">
        {{
          allDone ? "今天的都完成了" : `还剩 ${habits.length - doneCount} 个`
        }}
      </span>
    </div>

    <ul v-if="habits.length" class="yf-habits">
      <li
        v-for="habit in habits"
        :key="habit.id"
        class="yf-habit"
        :class="{ 'is-done': habit.week[TODAY_INDEX] }"
      >
        <span class="yf-habit-glyph">
          <HabitGlyph :icon="habit.icon" />
        </span>
        <div class="yf-habit-body">
          <strong>{{ habit.name }}</strong>
          <span class="yf-habit-meta">
            {{ frequencyLabel(habit.frequency) }} · 本周
            {{ habitProgress(habit).done }}/{{ habitProgress(habit).goal }}
          </span>
          <span class="yf-punches" aria-hidden="true">
            <span
              v-for="(done, index) in habit.week"
              :key="index"
              :class="{
                'is-punched': done,
                'is-today': index === TODAY_INDEX,
                'is-future': index > TODAY_INDEX,
              }"
            >
              <i>{{ WEEKDAYS[index] }}</i>
            </span>
          </span>
        </div>
        <button
          class="yf-punch"
          type="button"
          :aria-pressed="habit.week[TODAY_INDEX]"
          :aria-label="
            habit.week[TODAY_INDEX]
              ? `取消打卡：${habit.name}`
              : `打卡：${habit.name}`
          "
          @click="model.toggleHabit(habit.id)"
        >
          <Check aria-hidden="true" />
        </button>
      </li>
    </ul>

    <div v-else class="yf-empty">
      <strong>还没有习惯</strong>
      <span>从一个很小的开始，比如“喝一杯水”。</span>
      <button class="yf-primary" type="button" @click="emit('create')">
        新建习惯
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ChevronRight, Plus } from "lucide-vue-next";
import HabitGlyph from "../HabitGlyph.vue";
import PunchButton from "./PunchButton.vue";
import TabBar from "./TabBar.vue";
import type { CheckInState } from "./gallery";
import {
  SAMPLE_HABITS,
  SAMPLE_TODAY_INDEX,
  SAMPLE_WEEKDAYS,
  doneToday,
  habitMeta,
  withToday,
  type StyleDirectionId,
} from "./sample";

const props = defineProps<{ theme: StyleDirectionId; state: CheckInState }>();

const habits = computed(() => {
  if (props.state === "empty") return [];
  if (props.state === "all") return SAMPLE_HABITS.map((habit) => withToday(habit, true));
  if (props.state === "undo") {
    return SAMPLE_HABITS.map((habit) => (habit.id === "run" ? withToday(habit, true) : habit));
  }
  return SAMPLE_HABITS;
});
const doneCount = computed(() => habits.value.filter(doneToday).length);
</script>

<template>
  <div class="y-screen">
    <header class="y-head">
      <div>
        <h2>打卡</h2>
        <span class="y-total">
          <template v-if="habits.length">
            今天 <b>{{ doneCount }}</b> / {{ habits.length }}
          </template>
          <template v-else>还没有习惯</template>
        </span>
      </div>
      <button type="button" class="y-icon-button is-outlined" aria-label="新建习惯">
        <Plus aria-hidden="true" />
      </button>
    </header>

    <template v-if="habits.length">
      <p v-if="state === 'all'" class="y-banner">今天的习惯都完成了，明天见。</p>

      <div class="y-card-head" aria-hidden="true">
        <span
          v-for="(day, index) in SAMPLE_WEEKDAYS"
          :key="day"
          :class="{ 'is-today': index === SAMPLE_TODAY_INDEX }"
        >
          {{ day }}
        </span>
        <span class="y-card-action" />
      </div>

      <ul class="y-habits">
        <li v-for="habit in habits" :key="habit.id" class="y-habit">
          <div class="y-habit-name">
            <HabitGlyph :icon="habit.icon" />
            <div>
              <strong>{{ habit.name }}</strong>
              <span>{{ habitMeta(habit) }}</span>
            </div>
            <ChevronRight class="y-habit-more" aria-hidden="true" />
          </div>
          <div class="y-holes">
            <i
              v-for="(done, index) in habit.week"
              :key="index"
              :class="{
                'is-on': done,
                'is-today': index === SAMPLE_TODAY_INDEX,
                'is-future': index > SAMPLE_TODAY_INDEX,
              }"
            />
            <PunchButton :theme="theme" :habit="habit" :done="doneToday(habit)" />
          </div>
        </li>
      </ul>
    </template>

    <div v-else class="y-empty">
      <div class="y-empty-card" aria-hidden="true">
        <i v-for="index in 7" :key="index" />
      </div>
      <strong>从一个小习惯开始</strong>
      <p>比如喝够 8 杯水、读 20 页书。每天点一下就算完成，不会催你。</p>
      <button type="button" class="y-button is-primary">新建习惯</button>
    </div>

    <div v-if="state === 'undo'" class="y-toast" role="status">
      <span>「跑步」今天已打卡</span>
      <button type="button">撤销</button>
    </div>

    <TabBar :active="1" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePause,
  Play,
  Settings,
  Sparkles,
} from "lucide-vue-next";
import { computed } from "vue";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import ExerciseFigure from "../ExerciseFigure.vue";

defineProps<{
  view: "today" | "workout";
  paused: boolean;
  exerciseIndex: number;
  completed: boolean;
}>();

defineEmits<{
  start: [];
  back: [];
  togglePause: [];
  complete: [];
}>();

const darkStyle = computed(() => tokensToCssVars(resolveThemeTokens("dark")));
const exerciseNames = ["颈肩环绕", "自重深蹲", "死虫式"];
const poses = ["mobilize", "squat", "core"] as const;
</script>

<template>
  <section class="hdx-screen hdx-stage-direction" :style="darkStyle">
    <template v-if="view === 'today'">
      <div class="hdx-stage-hero">
        <header class="hdx-mobile-top">
          <div>
            <span class="hdx-kicker">8 月 13 日 · 今天</span>
            <strong>恒动</strong>
          </div>
          <button type="button" aria-label="设置"><Settings /></button>
        </header>

        <div class="hdx-body-stage" aria-hidden="true">
          <span class="hdx-body-orbit is-wide" />
          <span class="hdx-body-orbit is-tight" />
          <ExerciseFigure pose="squat" />
          <span class="hdx-body-shadow" />
        </div>

        <div class="hdx-stage-copy">
          <span>{{ completed ? "今日完成" : "现在适合" }}</span>
          <h1>{{ completed ? "让身体停在轻松里" : "15 分钟唤醒" }}</h1>
          <p>{{ completed ? "你已经完成本周第三次活动。" : "肩颈 · 下肢 · 核心，依次活动。" }}</p>
        </div>

        <button class="hdx-stage-start" type="button" @click="$emit('start')">
          <span><Play /><strong>{{ completed ? "再来一次" : "开始训练" }}</strong></span>
          <small>{{ completed ? "轻松完成即可" : "预计 15 分钟" }}</small>
        </button>
      </div>

      <section class="hdx-stage-lower">
        <div class="hdx-stage-progress">
          <div>
            <span>本周</span>
            <strong>{{ completed ? "3 / 3" : "2 / 3" }}</strong>
          </div>
          <div class="hdx-stage-progress-line"><i :class="{ 'is-complete': completed }" /></div>
          <small>{{ completed ? "目标完成" : "再完成一次即可" }}</small>
        </div>

        <button class="hdx-stage-record" type="button">
          <span><Sparkles /></span>
          <span><small>昨天 20:18</small><strong>15 分钟唤醒</strong><em>身体感觉刚好</em></span>
          <ChevronRight />
        </button>

        <footer class="hdx-bottom-nav hdx-stage-nav">
          <button class="is-active" type="button"><i />今天</button>
          <button type="button"><i />计划</button>
          <button type="button"><i />进度</button>
        </footer>
      </section>
    </template>

    <template v-else>
      <div class="hdx-stage-workout">
        <header class="hdx-workout-top">
          <button type="button" aria-label="退出训练" @click="$emit('back')"><ArrowLeft /></button>
          <span>动作 {{ exerciseIndex }} / 3</span>
          <strong>06:42</strong>
        </header>

        <div class="hdx-stage-counter">
          <span>{{ paused ? "暂停" : exerciseNames[exerciseIndex - 1] }}</span>
          <strong>{{ paused ? "—" : exerciseIndex === 2 ? "12" : "30" }}</strong>
          <small>{{ exerciseIndex === 2 ? "次" : "秒" }}</small>
        </div>

        <div class="hdx-body-stage hdx-workout-body" :class="{ 'is-paused': paused }" aria-hidden="true">
          <span class="hdx-body-orbit is-wide" />
          <span class="hdx-body-orbit is-tight" />
          <ExerciseFigure :pose="poses[exerciseIndex - 1] ?? 'mobilize'" />
          <span class="hdx-body-shadow" />
        </div>

        <section class="hdx-stage-instruction">
          <span>动作提示</span>
          <p>{{ exerciseIndex === 2 ? "臀部向后坐，膝盖保持稳定。" : "放松肩膀，让呼吸带动动作。" }}</p>
          <div><i /><i class="is-active" /><i /></div>
        </section>

        <div class="hdx-stage-next">
          <span>下一个</span>
          <strong>{{ exerciseNames[exerciseIndex] ?? "完成总结" }}</strong>
        </div>

        <footer class="hdx-stage-controls">
          <button type="button" @click="$emit('togglePause')"><CirclePause />{{ paused ? "继续" : "暂停" }}</button>
          <button type="button" :disabled="paused" @click="$emit('complete')"><Check />{{ exerciseIndex === 3 ? "完成训练" : "完成动作" }}</button>
        </footer>
      </div>
    </template>
  </section>
</template>

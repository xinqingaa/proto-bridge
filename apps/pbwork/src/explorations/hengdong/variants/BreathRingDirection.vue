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

const exercises = ["颈肩环绕", "自重深蹲", "死虫式"];
</script>

<template>
  <section class="hdx-screen hdx-ring-direction">
    <template v-if="view === 'today'">
      <header class="hdx-mobile-top">
        <div>
          <span class="hdx-kicker">8 月 13 日 · 星期四</span>
          <strong>下午好，林然</strong>
        </div>
        <button type="button" aria-label="设置"><Settings /></button>
      </header>

      <div class="hdx-ring-hero">
        <div class="hdx-ring-copy">
          <span>今天只做一件事</span>
          <h1>{{ completed ? "今天已经完成" : "15 分钟唤醒" }}</h1>
          <p>
            {{ completed ? "本周目标已经达成，明天继续。" : "4 个低压力动作，让身体从久坐里醒过来。" }}
          </p>
        </div>

        <button class="hdx-goal-ring" type="button" @click="$emit('start')">
          <span class="hdx-goal-ring-track" aria-hidden="true" />
          <span class="hdx-goal-ring-value">
            <Check v-if="completed" />
            <Play v-else />
            <strong>{{ completed ? "3 / 3" : "2 / 3" }}</strong>
            <small>本周训练</small>
          </span>
        </button>
      </div>

      <button class="hdx-primary-command" type="button" @click="$emit('start')">
        <span>{{ completed ? "再做一次轻训练" : "开始 15 分钟" }}</span>
        <ChevronRight aria-hidden="true" />
      </button>

      <section class="hdx-week-pulse">
        <div class="hdx-section-line">
          <div>
            <strong>本周节奏</strong>
            <span>保持两次活动，已经很好</span>
          </div>
          <span>47 分钟</span>
        </div>
        <div class="hdx-week-days" aria-label="本周活动">
          <span><small>一</small><i class="is-done" /></span>
          <span><small>二</small><i /></span>
          <span><small>三</small><i class="is-done" /></span>
          <span><small>四</small><i class="is-today" /></span>
          <span><small>五</small><i /></span>
          <span><small>六</small><i /></span>
          <span><small>日</small><i /></span>
        </div>
      </section>

      <button class="hdx-recent-result" type="button">
        <span class="hdx-result-icon"><Sparkles /></span>
        <span>
          <small>昨天 · 最近完成</small>
          <strong>15 分钟唤醒</strong>
          <em>16 分钟 · 体感刚好</em>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>

      <footer class="hdx-bottom-nav">
        <button class="is-active" type="button"><i />今天</button>
        <button type="button"><i />计划</button>
        <button type="button"><i />进度</button>
      </footer>
    </template>

    <template v-else>
      <header class="hdx-workout-top">
        <button type="button" aria-label="退出训练" @click="$emit('back')">
          <ArrowLeft />
        </button>
        <span>15 分钟唤醒</span>
        <strong>06:42</strong>
      </header>

      <div class="hdx-workout-ring-wrap">
        <div class="hdx-workout-ring" :class="{ 'is-paused': paused }">
          <span class="hdx-goal-ring-track" aria-hidden="true" />
          <div class="hdx-workout-ring-content">
            <span>动作 {{ exerciseIndex }} / 3</span>
            <strong>{{ paused ? "已暂停" : exerciseIndex === 2 ? "12" : "00:30" }}</strong>
            <small>{{ exerciseIndex === 2 ? "次" : "剩余" }}</small>
          </div>
        </div>
      </div>

      <section class="hdx-current-move">
        <span>当前动作</span>
        <h1>{{ exercises[exerciseIndex - 1] }}</h1>
        <p>{{ exerciseIndex === 2 ? "双脚与肩同宽，稳定下蹲再站起。" : "动作放慢，跟随呼吸完成。" }}</p>
      </section>

      <div class="hdx-next-move">
        <span>下一个</span>
        <strong>{{ exercises[exerciseIndex] ?? "训练总结" }}</strong>
        <small>{{ exerciseIndex < 3 ? "30 秒准备" : "保存本次结果" }}</small>
      </div>

      <footer class="hdx-workout-controls">
        <button class="hdx-secondary-command" type="button" @click="$emit('togglePause')">
          <CirclePause />
          {{ paused ? "继续" : "暂停" }}
        </button>
        <button class="hdx-primary-command" type="button" :disabled="paused" @click="$emit('complete')">
          <span>{{ exerciseIndex === 3 ? "完成训练" : "完成动作" }}</span>
          <Check />
        </button>
      </footer>
    </template>
  </section>
</template>

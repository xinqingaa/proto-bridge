<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePause,
  Dumbbell,
  Footprints,
  MoveDown,
  Play,
  Settings,
  TimerReset,
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

const moves = [
  { name: "颈肩环绕", meta: "30 秒", icon: TimerReset },
  { name: "自重深蹲", meta: "12 次", icon: MoveDown },
  { name: "死虫式", meta: "12 次", icon: Dumbbell },
];

function currentMove(index: number) {
  return moves[index - 1] ?? moves[0]!;
}
</script>

<template>
  <section class="hdx-screen hdx-sequence-direction">
    <template v-if="view === 'today'">
      <header class="hdx-mobile-top">
        <div>
          <span class="hdx-kicker">今天 · 低压力开始</span>
          <strong>身体需要一点活动</strong>
        </div>
        <button type="button" aria-label="设置"><Settings /></button>
      </header>

      <section class="hdx-sequence-lead">
        <span>今日处方</span>
        <h1>{{ completed ? "本周节奏已完成" : "唤醒身体，不追求力竭" }}</h1>
        <div class="hdx-prescription-meta">
          <strong>15</strong><span>分钟</span>
          <i />
          <strong>3</strong><span>个动作</span>
          <i />
          <strong>轻</strong><span>强度</span>
        </div>
      </section>

      <div class="hdx-move-sequence">
        <button
          v-for="(move, index) in moves"
          :key="move.name"
          type="button"
          @click="$emit('start')"
        >
          <span class="hdx-sequence-index">{{ index + 1 }}</span>
          <span class="hdx-sequence-icon"><component :is="move.icon" /></span>
          <span>
            <strong>{{ move.name }}</strong>
            <small>{{ move.meta }}</small>
          </span>
          <ChevronRight />
        </button>
      </div>

      <button class="hdx-primary-command" type="button" @click="$emit('start')">
        <Play />
        <span>{{ completed ? "再做一轮" : "按顺序开始" }}</span>
      </button>

      <section class="hdx-activity-ledger">
        <div class="hdx-section-line">
          <div>
            <strong>这周已经动过</strong>
            <span>周一训练 · 周三步行</span>
          </div>
          <strong>2 / 3</strong>
        </div>
        <div class="hdx-ledger-line">
          <span><i class="is-strong" /><i /><i class="is-strong" /><i class="is-today" /><i /><i /><i /></span>
          <small>离目标只差今天这一次</small>
        </div>
      </section>

      <button class="hdx-quick-record" type="button">
        <Footprints />
        <span><strong>刚刚只是走了走？</strong><small>快速记录，也算一次真实活动</small></span>
        <ChevronRight />
      </button>

      <footer class="hdx-bottom-nav">
        <button class="is-active" type="button"><i />今天</button>
        <button type="button"><i />计划</button>
        <button type="button"><i />进度</button>
      </footer>
    </template>

    <template v-else>
      <header class="hdx-workout-top hdx-sequence-workout-top">
        <button type="button" aria-label="退出训练" @click="$emit('back')"><ArrowLeft /></button>
        <div class="hdx-step-rail" aria-label="训练动作进度">
          <i v-for="index in 3" :key="index" :class="{ 'is-done': index < exerciseIndex, 'is-current': index === exerciseIndex }" />
        </div>
        <strong>06:42</strong>
      </header>

      <section class="hdx-sequence-workout-copy">
        <span>第 {{ exerciseIndex }} 个动作</span>
        <h1>{{ currentMove(exerciseIndex).name }}</h1>
        <p>{{ exerciseIndex === 2 ? "膝盖跟随脚尖方向，重心落在脚掌中部。" : "保持自然呼吸，动作不需要追求幅度。" }}</p>
      </section>

      <div class="hdx-rep-display" :class="{ 'is-paused': paused }">
        <span>{{ paused ? "暂停中" : "完成" }}</span>
        <strong>{{ exerciseIndex === 2 ? "12" : "30" }}</strong>
        <small>{{ exerciseIndex === 2 ? "次" : "秒" }}</small>
        <div class="hdx-rep-ticks" aria-hidden="true">
          <i v-for="index in 12" :key="index" :class="{ 'is-on': index <= 7 }" />
        </div>
      </div>

      <section class="hdx-form-cues">
        <div><span>发力</span><strong>{{ exerciseIndex === 2 ? "臀腿" : "肩颈" }}</strong></div>
        <div><span>节奏</span><strong>慢下 · 停顿 · 站起</strong></div>
      </section>

      <div class="hdx-sequence-next">
        <span>接下来</span>
        <strong>{{ moves[exerciseIndex]?.name ?? "训练总结" }}</strong>
        <small>{{ moves[exerciseIndex]?.meta ?? "保存体感" }}</small>
      </div>

      <footer class="hdx-workout-controls">
        <button class="hdx-secondary-command" type="button" @click="$emit('togglePause')">
          <CirclePause />{{ paused ? "继续" : "暂停" }}
        </button>
        <button class="hdx-primary-command" type="button" :disabled="paused" @click="$emit('complete')">
          <span>{{ exerciseIndex === 3 ? "完成训练" : "完成动作" }}</span><Check />
        </button>
      </footer>
    </template>
  </section>
</template>

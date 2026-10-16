<script setup lang="ts">
import { computed } from "vue";
import { Settings2 } from "lucide-vue-next";
import FreeDial from "./FreeDial.vue";
import {
  COUNTDOWN_PRESETS,
  POMODORO,
  TIMER_MODES,
  TODAY_LABEL,
  formatElapsed,
  formatMinutes,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();
const emit = defineEmits<{ settings: []; abandon: [] }>();

const timer = computed(() => props.model.timer);

const fraction = computed(() => {
  const { mode, status } = timer.value;
  if (mode === "stopwatch") {
    return (props.model.elapsedMs.value % 3_600_000) / 3_600_000;
  }
  if (status === "finished") return 0;
  const ms =
    status === "idle"
      ? props.model.totalMs.value
      : props.model.remainingMs.value;
  return ms / 3_600_000;
});

const handAngle = computed(() =>
  timer.value.mode === "stopwatch"
    ? ((props.model.elapsedMs.value % 60_000) / 60_000) * 360
    : undefined,
);

const finishedLabel = computed(() => {
  if (timer.value.mode === "countdown") return "时间到";
  return timer.value.phase === "focus" ? "完成" : "休息好了";
});

const breakMinutes = computed(() =>
  timer.value.round % POMODORO.roundsPerLongBreak === 0
    ? POMODORO.longBreak
    : POMODORO.shortBreak,
);

const roundPips = computed(() =>
  Array.from({ length: POMODORO.roundsPerLongBreak }, (_, index) => {
    const round = index + 1;
    const done =
      round < timer.value.round ||
      (round === timer.value.round &&
        (timer.value.phase !== "focus" || timer.value.status === "finished"));
    return { round, done, current: round === timer.value.round };
  }),
);

const lapRows = computed(() => {
  const laps = timer.value.laps;
  return laps.map((total, index) => {
    const previous = laps[index + 1] ?? 0;
    return {
      index: laps.length - index,
      split: formatElapsed(total - previous),
      total: formatElapsed(total),
    };
  });
});

function requestAbandon() {
  if (props.model.elapsedMs.value < 10_000) {
    props.model.abandon();
    return;
  }
  emit("abandon");
}
</script>

<template>
  <section class="yf-page yf-focus" aria-label="专注">
    <header class="yf-focus-head">
      <div class="yf-focus-context">
        <span class="yf-eyebrow">{{ TODAY_LABEL }}</span>
        <span class="yf-context-line">
          今天已专注
          <strong>{{ formatMinutes(model.todayMinutes.value) }}</strong>
        </span>
      </div>
      <button
        class="yf-icon-button"
        type="button"
        aria-label="设置"
        @click="emit('settings')"
      >
        <Settings2 aria-hidden="true" />
      </button>
    </header>

    <nav class="yf-modes" aria-label="计时方式">
      <button
        v-for="item in TIMER_MODES"
        :key="item.value"
        type="button"
        :class="{ 'is-active': timer.mode === item.value }"
        :aria-pressed="timer.mode === item.value"
        :disabled="timer.status === 'running' || timer.status === 'paused'"
        @click="model.setMode(item.value)"
      >
        {{ item.label }}
      </button>
    </nav>

    <FreeDial
      :fraction="fraction"
      :display="model.display.value"
      :paused="timer.status === 'paused'"
      :finished="timer.status === 'finished'"
      :finished-label="finishedLabel"
      :rest="model.isBreak.value"
      :hand-angle="handAngle"
    />

    <div class="yf-focus-status">
      <span class="yf-status-line" :class="{ 'is-rest': model.isBreak.value }">
        {{ model.statusLine.value }}
      </span>

      <div
        v-if="timer.mode === 'pomodoro'"
        class="yf-pips"
        :aria-label="`本组第 ${timer.round} 轮，共 ${POMODORO.roundsPerLongBreak} 轮`"
      >
        <span
          v-for="pip in roundPips"
          :key="pip.round"
          :class="{ 'is-done': pip.done, 'is-current': pip.current }"
        />
      </div>

      <div
        v-else-if="timer.mode === 'countdown' && timer.status === 'idle'"
        class="yf-presets"
        role="radiogroup"
        aria-label="倒计时时长"
      >
        <button
          v-for="minutes in COUNTDOWN_PRESETS"
          :key="minutes"
          type="button"
          role="radio"
          :aria-checked="timer.countdownMinutes === minutes"
          :class="{ 'is-active': timer.countdownMinutes === minutes }"
          @click="model.setCountdown(minutes)"
        >
          {{ minutes }}<small>分</small>
        </button>
      </div>
    </div>

    <ol v-if="timer.mode === 'stopwatch' && lapRows.length" class="yf-laps">
      <li v-for="row in lapRows" :key="row.index">
        <span>第 {{ row.index }} 圈</span>
        <strong>{{ row.split }}</strong>
        <em>{{ row.total }}</em>
      </li>
    </ol>

    <footer class="yf-controls">
      <!-- Pomodoro -->
      <template v-if="timer.mode === 'pomodoro'">
        <template v-if="timer.status === 'idle'">
          <button class="yf-primary" type="button" @click="model.start()">
            {{ timer.phase === "focus" ? "开始专注" : "开始休息" }}
          </button>
        </template>
        <template
          v-else-if="timer.status === 'running' || timer.status === 'paused'"
        >
          <button
            class="yf-quiet"
            type="button"
            @click="model.isBreak.value ? model.nextRound() : requestAbandon()"
          >
            {{ model.isBreak.value ? "跳过休息" : "放弃" }}
          </button>
          <button
            class="yf-primary is-round"
            :class="{ 'is-rest': model.isBreak.value }"
            type="button"
            @click="timer.status === 'running' ? model.pause() : model.resume()"
          >
            {{ timer.status === "running" ? "暂停" : "继续" }}
          </button>
          <span class="yf-quiet is-spacer" aria-hidden="true" />
        </template>
        <template v-else>
          <template v-if="timer.phase === 'focus'">
            <button class="yf-quiet" type="button" @click="model.nextRound()">
              跳过休息
            </button>
            <button
              class="yf-primary is-rest"
              type="button"
              @click="model.startBreak()"
            >
              休息 {{ breakMinutes }} 分钟
            </button>
          </template>
          <button
            v-else
            class="yf-primary"
            type="button"
            @click="model.nextRound()"
          >
            开始下一轮
          </button>
        </template>
      </template>

      <!-- Stopwatch -->
      <template v-else-if="timer.mode === 'stopwatch'">
        <template v-if="timer.status === 'idle'">
          <button class="yf-primary" type="button" @click="model.start()">
            开始计时
          </button>
        </template>
        <template v-else>
          <button
            v-if="timer.status === 'running'"
            class="yf-quiet"
            type="button"
            @click="model.lap()"
          >
            计圈
          </button>
          <button
            v-else
            class="yf-quiet"
            type="button"
            @click="model.finishStopwatch()"
          >
            结束并记录
          </button>
          <button
            class="yf-primary is-round"
            type="button"
            @click="timer.status === 'running' ? model.pause() : model.resume()"
          >
            {{ timer.status === "running" ? "暂停" : "继续" }}
          </button>
          <span class="yf-quiet is-spacer" aria-hidden="true" />
        </template>
      </template>

      <!-- Countdown -->
      <template v-else>
        <template v-if="timer.status === 'idle'">
          <button class="yf-primary" type="button" @click="model.start()">
            开始 {{ timer.countdownMinutes }} 分钟
          </button>
        </template>
        <template v-else-if="timer.status === 'finished'">
          <button
            class="yf-quiet"
            type="button"
            @click="model.setCountdown(timer.countdownMinutes)"
          >
            完成
          </button>
          <button class="yf-primary" type="button" @click="model.start()">
            再来一次
          </button>
        </template>
        <template v-else>
          <button class="yf-quiet" type="button" @click="requestAbandon">
            取消
          </button>
          <button
            class="yf-primary is-round"
            type="button"
            @click="timer.status === 'running' ? model.pause() : model.resume()"
          >
            {{ timer.status === "running" ? "暂停" : "继续" }}
          </button>
          <span class="yf-quiet is-spacer" aria-hidden="true" />
        </template>
      </template>
    </footer>
  </section>
</template>

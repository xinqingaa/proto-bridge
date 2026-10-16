<script setup lang="ts">
import { computed } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import {
  COUNTDOWN_PRESETS,
  POMODORO,
  formatElapsed,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();
const emit = defineEmits<{ abandon: [] }>();

const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const timer = computed(() => props.model.timer);
const running = computed(
  () => timer.value.status === "running" || timer.value.status === "paused",
);

const ringOffset = computed(() => {
  const { status, mode } = timer.value;
  if (mode === "stopwatch") {
    return RING_LENGTH * (1 - props.model.progress.value);
  }
  if (status === "idle") return 0;
  if (status === "finished") return RING_LENGTH;
  return RING_LENGTH * props.model.progress.value;
});

const breakMinutes = computed(() =>
  timer.value.round % POMODORO.roundsPerLongBreak === 0
    ? POMODORO.longBreak
    : POMODORO.shortBreak,
);

const finishedTitle = computed(() => {
  if (timer.value.mode === "countdown") return "时间到";
  return timer.value.phase === "focus" ? "完成" : "休息好了";
});

const lapRows = computed(() => {
  const laps = timer.value.laps;
  return laps.map((total, index) => ({
    index: laps.length - index,
    split: formatElapsed(total - (laps[index + 1] ?? 0)),
    total: formatElapsed(total),
  }));
});

function requestAbandon() {
  if (props.model.elapsedMs.value < 10_000) {
    props.model.abandon();
    return;
  }
  emit("abandon");
}

function togglePause() {
  if (timer.value.status === "running") props.model.pause();
  else props.model.resume();
}
</script>

<template>
  <div class="yd-timer">
    <div
      class="yd-ring"
      :class="{
        'is-rest': model.isBreak.value,
        'is-paused': timer.status === 'paused',
        'is-finished': timer.status === 'finished',
      }"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="yd-ring-track" cx="50" cy="50" :r="RING_RADIUS" />
        <circle
          class="yd-ring-value"
          cx="50"
          cy="50"
          :r="RING_RADIUS"
          :stroke-dasharray="RING_LENGTH"
          :stroke-dashoffset="ringOffset"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div class="yd-ring-readout">
        <span v-if="timer.status === 'finished'" class="yd-ring-title">
          {{ finishedTitle }}
        </span>
        <span v-else class="yd-ring-digits">{{ model.display.value }}</span>
        <span class="yd-ring-status">{{ model.statusLine.value }}</span>
      </div>
    </div>

    <div class="yd-timer-meta">
      <Chip
        v-if="timer.mode === 'pomodoro'"
        :label="`第 ${timer.round} / ${POMODORO.roundsPerLongBreak} 轮`"
        :tone="model.isBreak.value ? 'secondary' : 'primary'"
        inspect-id="yike-draft.focus.round"
      />
      <div
        v-else-if="timer.mode === 'countdown' && timer.status === 'idle'"
        class="yd-presets"
      >
        <Button
          v-for="minutes in COUNTDOWN_PRESETS"
          :key="minutes"
          :label="`${minutes} 分`"
          size="sm"
          :kind="timer.countdownMinutes === minutes ? 'primary' : 'outlined'"
          @click="model.setCountdown(minutes)"
        />
      </div>
    </div>

    <DataList
      v-if="timer.mode === 'stopwatch' && lapRows.length"
      class="yd-laps"
      surface="raised"
      inspect-id="yike-draft.focus.laps"
    >
      <div v-for="row in lapRows" :key="row.index" class="yd-lap">
        <span>第 {{ row.index }} 圈</span>
        <strong>{{ row.split }}</strong>
        <em>{{ row.total }}</em>
      </div>
    </DataList>

    <div class="yd-actions">
      <template v-if="timer.status === 'idle'">
        <Button
          block
          size="lg"
          :label="
            timer.mode === 'pomodoro'
              ? '开始专注'
              : timer.mode === 'stopwatch'
                ? '开始计时'
                : `开始 ${timer.countdownMinutes} 分钟`
          "
          inspect-id="yike-draft.focus.start"
          @click="model.start()"
        />
      </template>

      <template v-else-if="running">
        <Button
          v-if="timer.mode === 'stopwatch'"
          kind="outlined"
          size="lg"
          :label="timer.status === 'running' ? '计圈' : '结束并记录'"
          @click="
            timer.status === 'running' ? model.lap() : model.finishStopwatch()
          "
        />
        <Button
          v-else
          kind="outlined"
          size="lg"
          :label="
            model.isBreak.value
              ? '跳过休息'
              : timer.mode === 'countdown'
                ? '取消'
                : '放弃'
          "
          @click="model.isBreak.value ? model.nextRound() : requestAbandon()"
        />
        <Button
          class="yd-actions-main"
          size="lg"
          :kind="timer.status === 'running' ? 'secondary' : 'primary'"
          :label="timer.status === 'running' ? '暂停' : '继续'"
          @click="togglePause"
        />
      </template>

      <template v-else>
        <template v-if="timer.mode === 'pomodoro' && timer.phase === 'focus'">
          <Button
            kind="outlined"
            size="lg"
            label="跳过休息"
            @click="model.nextRound()"
          />
          <Button
            class="yd-actions-main"
            size="lg"
            :label="`休息 ${breakMinutes} 分钟`"
            @click="model.startBreak()"
          />
        </template>
        <Button
          v-else-if="timer.mode === 'pomodoro'"
          block
          size="lg"
          label="开始下一轮"
          @click="model.nextRound()"
        />
        <template v-else>
          <Button
            kind="outlined"
            size="lg"
            label="完成"
            @click="model.setCountdown(timer.countdownMinutes)"
          />
          <Button
            class="yd-actions-main"
            size="lg"
            label="再来一次"
            @click="model.start()"
          />
        </template>
      </template>
    </div>
  </div>
</template>

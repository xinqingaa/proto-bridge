<script setup lang="ts">
import { computed } from "vue";
import { Settings2 } from "lucide-vue-next";
import Dial, { type DialTone } from "./Dial.vue";
import Sheet, { type SheetAction } from "./Sheet.vue";
import TabBar from "./TabBar.vue";
import type { FocusState } from "./gallery";
import {
  SAMPLE_COUNTDOWN_PRESETS,
  SAMPLE_LAPS,
  SAMPLE_MODES,
  SAMPLE_TODAY,
  type StyleDirectionId,
} from "./sample";

type FocusConfig = {
  mode: number;
  minutes: number;
  total: number;
  digits: string;
  caption: string;
  tone: DialTone;
  round?: { text: string; done: number; current?: number };
  primary: string;
  secondary?: string;
  quiet?: string;
  hint?: string;
  laps?: boolean;
  presets?: boolean;
  sheet?: { title: string; text: string; actions: SheetAction[] };
};

const RUNNING = { minutes: 12.57, total: 25, digits: "12:34" };

const CONFIG: Record<FocusState, FocusConfig> = {
  "pomodoro-idle": {
    mode: 0,
    minutes: 25,
    total: 25,
    digits: "25:00",
    caption: "准备开始",
    tone: "idle",
    round: { text: "第 3 轮", done: 2 },
    primary: "开始专注",
    hint: "专注 25 分钟 · 短休 5 分钟",
  },
  "pomodoro-running": {
    mode: 0,
    ...RUNNING,
    caption: "剩余",
    tone: "run",
    round: { text: "第 3 轮专注", done: 2, current: 3 },
    primary: "暂停",
    quiet: "放弃本轮",
  },
  "pomodoro-paused": {
    mode: 0,
    ...RUNNING,
    caption: "已暂停",
    tone: "paused",
    round: { text: "第 3 轮专注", done: 2, current: 3 },
    primary: "继续",
    quiet: "提前结束并记录",
  },
  "short-break": {
    mode: 0,
    minutes: 3.2,
    total: 5,
    digits: "03:12",
    caption: "短休",
    tone: "break",
    round: { text: "第 3 轮已完成 · 休息一下", done: 3 },
    primary: "跳过休息",
  },
  "long-break": {
    mode: 0,
    minutes: 11.08,
    total: 15,
    digits: "11:05",
    caption: "长休",
    tone: "break",
    round: { text: "4 轮全部完成 · 好好休息", done: 4 },
    primary: "跳过休息",
  },
  "round-done": {
    mode: 0,
    minutes: 0,
    total: 25,
    digits: "00:00",
    caption: "本轮完成",
    tone: "done",
    round: { text: "今天已专注 75 分钟", done: 3 },
    primary: "开始短休",
    quiet: "跳过休息，直接下一轮",
  },
  abandon: {
    mode: 0,
    ...RUNNING,
    caption: "剩余",
    tone: "run",
    round: { text: "第 3 轮专注", done: 2, current: 3 },
    primary: "暂停",
    quiet: "放弃本轮",
    sheet: {
      title: "放弃这一轮？",
      text: "已经专注的 12 分钟不会被记录。想保留的话，可以选择提前结束。",
      actions: [
        { label: "继续专注", kind: "primary" },
        { label: "放弃本轮", kind: "danger" },
      ],
    },
  },
  recovery: {
    mode: 0,
    ...RUNNING,
    caption: "已中断",
    tone: "paused",
    round: { text: "第 3 轮专注", done: 2, current: 3 },
    primary: "继续",
    quiet: "提前结束并记录",
    sheet: {
      title: "上一轮被打断了",
      text: "10:12 开始的第 3 轮在 12:34 处停下。时间已经冻结，没有继续流逝。",
      actions: [
        { label: "从 12:34 继续", kind: "primary" },
        { label: "结束并记录 12 分钟", kind: "quiet" },
        { label: "放弃这一轮", kind: "danger" },
      ],
    },
  },
  stopwatch: {
    mode: 1,
    minutes: SAMPLE_LAPS.elapsedMinutes,
    total: 60,
    digits: SAMPLE_LAPS.elapsed,
    caption: "已计时",
    tone: "run",
    primary: "暂停",
    secondary: "计圈",
    laps: true,
  },
  "countdown-setup": {
    mode: 2,
    minutes: 5,
    total: 5,
    digits: "05:00",
    caption: "设置时长",
    tone: "idle",
    primary: "开始倒计时",
    presets: true,
  },
  "countdown-running": {
    mode: 2,
    minutes: 2.8,
    total: 5,
    digits: "02:48",
    caption: "剩余",
    tone: "run",
    primary: "暂停",
    quiet: "取消",
  },
  "countdown-done": {
    mode: 2,
    minutes: 0,
    total: 5,
    digits: "00:00",
    caption: "到点了",
    tone: "done",
    primary: "完成",
    quiet: "再计 1 分钟",
  },
};

const props = defineProps<{ theme: StyleDirectionId; state: FocusState }>();

const config = computed(() => CONFIG[props.state]);
const compact = computed(() => config.value.laps || config.value.presets);
const dateLabel = computed(() =>
  props.theme === "sundial" ? SAMPLE_TODAY.sundialLabel : SAMPLE_TODAY.label,
);
</script>

<template>
  <div class="y-screen">
    <header class="y-top">
      <div class="y-top-text">
        <span class="y-date">{{ dateLabel }}</span>
        <span class="y-total">
          今天已专注 <b>{{ SAMPLE_TODAY.minutes }}</b> 分钟
        </span>
      </div>
      <button type="button" class="y-icon-button" aria-label="设置">
        <Settings2 aria-hidden="true" />
      </button>
    </header>

    <nav class="y-modes" aria-label="计时模式">
      <span
        v-for="(mode, index) in SAMPLE_MODES"
        :key="mode"
        :class="{ 'is-active': index === config.mode }"
      >
        {{ mode }}
      </span>
    </nav>

    <Dial
      :theme="theme"
      :minutes="config.minutes"
      :total="config.total"
      :digits="config.digits"
      :caption="config.caption"
      :tone="config.tone"
      :size="compact ? 'compact' : 'full'"
    />

    <div v-if="config.round" class="y-round">
      <span>{{ config.round.text }}</span>
      <span class="y-pips" aria-hidden="true">
        <i
          v-for="index in 4"
          :key="index"
          :class="{
            'is-done': index <= config.round.done,
            'is-current': index === config.round.current,
          }"
        />
      </span>
    </div>

    <ol v-if="config.laps" class="y-laps" aria-label="计圈">
      <li class="is-current">
        <span>第 {{ SAMPLE_LAPS.current.index }} 圈</span>
        <b>{{ SAMPLE_LAPS.current.lap }}</b>
        <em>进行中</em>
      </li>
      <li v-for="lap in SAMPLE_LAPS.done" :key="lap.index">
        <span>第 {{ lap.index }} 圈</span>
        <b>{{ lap.lap }}</b>
        <em>累计 {{ lap.total }}</em>
      </li>
    </ol>

    <div v-if="config.presets" class="y-presets" role="radiogroup" aria-label="时长">
      <button
        v-for="preset in SAMPLE_COUNTDOWN_PRESETS"
        :key="preset"
        type="button"
        role="radio"
        :aria-checked="preset === 5"
        :class="{ 'is-active': preset === 5 }"
      >
        {{ preset }} 分
      </button>
      <button type="button" role="radio" aria-checked="false">自定义</button>
    </div>

    <div class="y-actions" :class="{ 'is-pair': config.secondary }">
      <button v-if="config.secondary" type="button" class="y-button is-secondary">
        {{ config.secondary }}
      </button>
      <button type="button" class="y-button is-primary">{{ config.primary }}</button>
      <button v-if="config.quiet" type="button" class="y-button is-quiet">
        {{ config.quiet }}
      </button>
      <span v-else-if="config.hint" class="y-hint">{{ config.hint }}</span>
    </div>

    <TabBar :active="0" />

    <Sheet
      v-if="config.sheet"
      :title="config.sheet.title"
      :text="config.sheet.text"
      :actions="config.sheet.actions"
    />
  </div>
</template>

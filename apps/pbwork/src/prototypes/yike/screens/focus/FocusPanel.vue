<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { useClock } from "@/runtime/useClock";
import { useReducedMotion } from "@/runtime/useReducedMotion";
import { useYikeStore } from "../../model";
import { useFrameClock } from "../../frame-clock";
import { useYikeSession } from "../../session";
import { elapsedMs, type YikeTimerMode } from "../../timer-engine";
import {
  dialReading,
  formatClock,
  formatDurationLabel,
} from "../../timer-readout";
import { yikeNavigation } from "../../navigation";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import YikeDial from "../../components/YikeDial.vue";
import YikeAction from "../../components/YikeAction.vue";
import { preciseDurationLabel } from "../../statistics";
import roundArtwork from "../../components/round-artwork.json";
import { scope } from "./screen";
const props = defineProps<{ mode: YikeTimerMode }>();
const emit = defineEmits<{ custom: []; abandon: [] }>();
const mode = computed(() => props.mode);
const route = useRoute(),
  router = useRouter();
const store = useYikeStore(),
  commands = useYikeSession(),
  now = useClock(),
  reducedMotion = useReducedMotion();
const face = computed(() => store.data.preferences.face);
const countdownSeconds = commands.countdownSeconds;
const presets = computed(() =>
  store.data.preferences.countdownPresets.filter(
    (value): value is number => typeof value === "number",
  ),
);
const session = computed(() =>
  store.data.session?.mode === mode.value ? store.data.session : null,
);
const recoveryOpen = computed(() => store.recoveryNeeded.value);
const openCustom = () => emit("custom");
const confirmAbandon = computed({
  get: () => false,
  set: (value: boolean) => {
    if (value) emit("abandon");
  },
});
const status = computed(() =>
  session.value?.status === "due"
    ? "finished"
    : (session.value?.status ?? "idle"),
);
const frameNow = useFrameClock(
  () => session.value?.status === "running" && !reducedMotion.value,
);
/** Running sessions read the frame clock; everything else the second clock. */
const clockNow = computed(() =>
  session.value?.status === "running" && !reducedMotion.value
    ? frameNow.value
    : now.value,
);
const elapsed = computed(() =>
  session.value ? elapsedMs(session.value, clockNow.value.getTime()) : 0,
);
const total = computed(
  () =>
    session.value?.targetMs ??
    (mode.value === "pomodoro"
      ? store.data.preferences.pomodoroMinutes * 60_000
      : mode.value === "countdown"
        ? countdownSeconds.value * 1000
        : 0),
);
const remaining = computed(() => Math.max(0, total.value - elapsed.value));
const display = computed(() =>
  formatClock(
    mode.value === "stopwatch"
      ? elapsed.value
      : status.value === "idle"
        ? total.value
        : remaining.value,
  ),
);
const reading = computed(() =>
  dialReading({
    mode: mode.value,
    elapsedMs: elapsed.value,
    totalMs: total.value,
  }),
);
const isBreak = computed(() =>
  Boolean(session.value?.phase && session.value.phase !== "focus"),
);
const fullRound = computed(
  () =>
    mode.value === "pomodoro" &&
    !isBreak.value &&
    status.value === "finished" &&
    elapsed.value >= total.value,
);
const caption = computed(() =>
  isBreak.value
    ? status.value === "finished"
      ? "休息结束"
      : status.value === "paused"
        ? "休息已暂停"
        : session.value?.phase === "long-break"
          ? "长休息"
          : "短休息"
    : status.value === "finished"
      ? mode.value === "countdown"
        ? "到点了"
        : "本轮完成"
      : status.value === "paused"
        ? "已暂停"
        : status.value === "running"
          ? mode.value === "stopwatch"
            ? "已计时"
            : "剩余"
          : mode.value === "countdown"
            ? "设置时长"
            : "准备开始",
);

const completedLaps = computed(() =>
  (session.value?.laps ?? [])
    .map((total, index, all) => ({
      index: index + 1,
      total,
      duration: total - (all[index - 1] ?? 0),
    }))
    .reverse(),
);
const roundLabel = computed(() =>
  isBreak.value
    ? session.value?.phase === "long-break"
      ? `${store.data.completedRounds} 轮全部完成 · 好好休息`
      : `第 ${store.data.completedRounds} 轮已完成 · 休息一下`
    : fullRound.value
      ? `第 ${store.data.completedRounds} 轮已完成`
      : `第 ${store.data.completedRounds + 1} 轮${status.value === "idle" ? "" : "专注"}`,
);
function syncVariant() {
  if (route.params.screenSlug === "focus")
    void yikeNavigation(router, route, store).variant();
}
function toggle() {
  commands.toggle();
  syncVariant();
}
function finish() {
  commands.finish();
  syncVariant();
}
function lap() {
  commands.lap();
}
function skipBreak() {
  commands.skipBreak();
  syncVariant();
}
function lapLabel(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function repeatLastCountdown() {
  commands.repeat();
  syncVariant();
}
</script>
<template>
  <main
    class="yike-focus-main"
    :class="{ 'is-stopwatch': mode === 'stopwatch' }"
    :data-face="face"
  >
    <div class="yike-stage">
      <YikeDial
        class="yike-focus-dial"
        :face="face"
        :fraction="reading.fraction"
        :note="reading.note"
        :elapsed-ms="reducedMotion ? 0 : elapsed"
        :scale="mode === 'countdown' ? 'session' : 'hour'"
        :digits="display"
        :readout-slots="formatClock(Math.max(total, elapsed)).length"
        :caption="caption"
        :tone="
          isBreak
            ? 'break'
            : status === 'running'
              ? 'run'
              : status === 'paused'
                ? 'paused'
                : status === 'finished'
                  ? 'done'
                  : 'idle'
        "
        inspect-id="yike.focus.timer"
      />
    </div>
    <div class="yike-support">
      <p
        v-if="status === 'finished' && store.data.preferences.sound"
        class="yike-completion-feedback"
        role="status"
        v-pb="
          scope.node('completion-feedback', 'status', {
            tokens: {
              typography: 'typography.caption',
              color: 'color.on-surface-muted',
            },
          })
        "
      >
        提示音已开启
      </p>
      <div
        v-if="mode === 'pomodoro'"
        class="yike-round"
        v-pb="
          scope.node('round', 'summary', {
            tokens: {
              typography: 'typography.content',
              gap: 'spacing.sm-plus',
            },
          })
        "
      >
        <span>{{ roundLabel }}</span>
        <span class="yike-pips" aria-hidden="true">
          <svg
            v-for="round in store.data.preferences.longBreakEvery"
            :key="round"
            :viewBox="roundArtwork.viewBox"
            :class="{
              'is-done': round <= store.data.completedRounds,
              'is-current':
                status !== 'idle' &&
                !fullRound &&
                !isBreak &&
                round === store.data.completedRounds + 1,
            }"
            v-pb="
              scope.node('round-marker', 'image', {
                key: `round-${round}`,
                tokens: { width: 'size.icon-inline', color: 'color.primary' },
              })
            "
          >
            <path :d="roundArtwork[face]" />
          </svg>
        </span>
      </div>
      <div
        v-if="mode === 'countdown' && status === 'idle'"
        class="yike-presets"
        role="group"
        aria-label="倒计时时长"
        data-no-swipe
      >
        <button
          v-for="(seconds, index) in presets"
          :key="`preset-${index}`"
          type="button"
          :class="{ 'is-active': countdownSeconds === seconds }"
          :aria-pressed="countdownSeconds === seconds"
          v-pb="
            scope.node('preset', 'button', {
              key: `preset-${index}`,
              tokens: {
                typography: 'typography.content',
                color:
                  countdownSeconds === seconds
                    ? 'color.primary'
                    : 'color.on-surface-muted',
                background:
                  countdownSeconds === seconds
                    ? 'color.primary-soft'
                    : 'color.background',
                border:
                  countdownSeconds === seconds
                    ? 'color.primary'
                    : 'color.border',
                radius: 'radius.control-compact',
                size: 'size.touch',
                padding: 'spacing.sm',
                focus: 'border.focus',
              },
            })
          "
          @click="countdownSeconds = seconds"
        >
          {{ formatDurationLabel(seconds) }}
        </button>
        <button
          type="button"
          class="is-custom"
          v-pb="
            scope.node('custom', 'button', {
              tokens: {
                typography: 'typography.content',
                color: 'color.on-surface-muted',
                background: 'color.background',
                radius: 'radius.control-compact',
                size: 'size.touch',
                padding: 'spacing.sm',
                focus: 'border.focus',
              },
            })
          "
          @click="openCustom"
        >
          自定义
        </button>
      </div>
      <ScrollableDataList
        v-if="mode === 'stopwatch' && session"
        class="yike-lap-scroll"
        inspect-id="yike.focus.lap-scroll"
        tabindex="0"
        aria-label="滚动计圈记录"
      >
        <ol
          class="yike-laps"
          aria-label="计圈记录"
          v-pb="
            scope.node('laps', 'list', {
              tokens: {
                typography: 'typography.numeric-content',
                color: 'color.on-surface',
              },
            })
          "
        >
          <li class="is-current">
            <span>第 {{ (session.laps?.length ?? 0) + 1 }} 圈</span
            ><b>{{ lapLabel(elapsed - (session.laps?.at(-1) ?? 0)) }}</b
            ><em>{{ status === "paused" ? "已暂停" : "进行中" }}</em>
          </li>
          <li v-for="lap in completedLaps" :key="lap.index">
            <span>第 {{ lap.index }} 圈</span><b>{{ lapLabel(lap.duration) }}</b
            ><em>累计 {{ lapLabel(lap.total) }}</em>
          </li>
        </ol>
      </ScrollableDataList>
      <div
        v-else-if="mode === 'stopwatch'"
        class="yike-lap-placeholder"
        aria-hidden="true"
      />
    </div>
    <div class="yike-actions">
      <div class="yike-primary-row">
        <YikeAction
          v-if="mode === 'stopwatch' && status === 'running'"
          label="计圈"
          kind="secondary"
          inspect-id="yike.focus.lap"
          @click="lap"
        />
        <YikeAction
          inspect-id="yike.focus.primary-action"
          :label="
            status === 'running'
              ? '暂停'
              : status === 'paused'
                ? '继续'
                : status === 'finished'
                  ? fullRound
                    ? session?.breakAfter === 'long-break'
                      ? '开始长休息'
                      : '开始休息'
                    : isBreak
                      ? '准备下一轮'
                      : '完成'
                  : mode === 'stopwatch'
                    ? '开始计时'
                    : mode === 'countdown'
                      ? `开始 ${preciseDurationLabel(countdownSeconds)}`
                      : '开始专注'
          "
          @click="status === 'finished' ? finish() : toggle()"
        />
      </div>
      <div class="yike-secondary-actions">
        <p
          v-if="status === 'idle' && mode === 'pomodoro'"
          class="yike-hint"
          v-pb="
            scope.node('configuration-hint', 'text', {
              tokens: {
                typography: 'typography.caption',
                color: 'color.on-surface-muted',
              },
            })
          "
        >
          专注 {{ store.data.preferences.pomodoroMinutes }} 分钟 · 短休
          {{ store.data.preferences.shortBreakMinutes }} 分钟
        </p>
        <YikeAction
          v-if="
            store.recoveryAvailable.value &&
            !recoveryOpen &&
            status === 'paused'
          "
          label="查看恢复选项"
          kind="quiet"
          inspect-id="yike.focus.recovery-open"
          @click="store.recoveryNeeded.value = true"
        />
        <YikeAction
          v-if="session?.status === 'due'"
          :label="`再计${formatDurationLabel(total / 1000)}`"
          kind="quiet"
          inspect-id="yike.focus.repeat"
          @click="repeatLastCountdown"
        />
        <YikeAction
          v-if="status === 'paused' && !isBreak"
          label="结束并记录"
          kind="quiet"
          inspect-id="yike.focus.finish"
          @click="finish"
        />
        <YikeAction
          v-if="!isBreak && (status === 'running' || status === 'paused')"
          :label="mode === 'pomodoro' ? '放弃本轮' : '取消计时'"
          kind="quiet"
          inspect-id="yike.focus.abandon"
          @click="confirmAbandon = true"
        />
        <YikeAction
          v-if="fullRound || (isBreak && status !== 'finished')"
          label="跳过休息"
          kind="quiet"
          inspect-id="yike.focus.skip-break"
          @click="skipBreak"
        />
      </div>
    </div>
  </main>
</template>
<style scoped>
.yike-focus-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  min-block-size: var(--pb-layout-zero);
  block-size: var(--pb-layout-fill);
  overflow: hidden;
  gap: var(--pb-spacing-xs);
  padding-block: var(--pb-spacing-xs) var(--pb-layout-zero);
}
.yike-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-layout-fill);
  min-block-size: var(--pb-layout-zero);
  flex: var(--pb-layout-flex-fill);
}
.yike-focus-dial {
  flex: none;
  min-block-size: var(--pb-layout-zero);
  block-size: auto;
  max-block-size: var(--pb-layout-fill);
}
.yike-support {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: none;
  inline-size: var(--pb-layout-fill);
  block-size: clamp(
    var(--pb-size-touch),
    calc(
      var(--pb-layout-fill) - var(--pb-size-plot) -
        var(--pb-size-control-large) - var(--pb-size-control-large) -
        var(--pb-spacing-lg)
    ),
    calc(var(--pb-size-control) + var(--pb-size-control))
  );
  min-block-size: var(--pb-layout-zero);
}
.yike-support:has(.yike-presets) {
  min-block-size: min-content;
}
.yike-round {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-sm-plus);
  font: var(--pb-typography-content);
  color: var(--pb-color-on-surface-muted);
}
.yike-pips {
  display: flex;
  gap: var(--pb-spacing-xs);
}
.yike-pips svg {
  inline-size: var(--pb-size-icon-inline);
  block-size: var(--pb-size-icon-inline);
  overflow: visible;
}
.yike-pips path {
  fill: var(--pb-color-outline);
  stroke: transparent;
  stroke-width: var(--pb-border-width);
}
.yike-pips .is-done path {
  fill: var(--pb-color-primary);
}
.yike-pips .is-current path {
  fill: var(--pb-color-background);
  stroke: var(--pb-color-primary);
  stroke-width: var(--pb-border-width-strong);
}
[data-face="water"] .yike-pips .is-current path,
[data-face="sundial"] .yike-pips .is-current path {
  fill: var(--pb-color-primary-soft);
}
.yike-actions {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
  margin-block-start: auto;
  padding-block-start: var(--pb-spacing-sm-plus);
  inline-size: var(--pb-layout-fill);
}
.yike-primary-row {
  display: flex;
  justify-content: center;
  gap: var(--pb-spacing-sm);
  inline-size: var(--pb-layout-fill);
}
.yike-secondary-actions {
  inline-size: var(--pb-layout-fill);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-xs);
  min-block-size: var(--pb-size-control-large);
}
.yike-completion-feedback {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.yike-hint {
  margin: var(--pb-layout-zero);
  padding-block: var(--pb-spacing-sm-plus);
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.yike-presets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--pb-spacing-xs);
}
.yike-presets button {
  min-inline-size: var(--pb-size-touch);
  min-block-size: var(--pb-size-touch);
  padding-inline: var(--pb-spacing-sm);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-background);
  font: var(--pb-typography-content);
  color: var(--pb-color-on-surface-muted);
  cursor: pointer;
  transition:
    background-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    border-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    color var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.yike-presets button.is-active {
  background: var(--pb-color-primary-soft);
  border-color: var(--pb-color-primary);
  color: var(--pb-color-primary);
}
.yike-presets button.is-custom {
  border-color: transparent;
}
.yike-presets button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
.yike-presets button:active {
  transform: scale(var(--pb-motion-press-scale));
}
.yike-laps {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: var(--pb-layout-zero);
  padding: var(--pb-layout-zero);
  inline-size: var(--pb-layout-fill);
  font: var(--pb-typography-content);
  font-variant-numeric: tabular-nums;
}
.yike-lap-scroll,
.yike-lap-placeholder {
  flex: var(--pb-layout-flex-fill);
  min-block-size: var(--pb-layout-zero);
  inline-size: var(--pb-layout-fill);
}
.yike-laps li {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: var(--pb-spacing-sm);
  padding-block: var(--pb-spacing-sm);
  border-block-end: var(--pb-border-hairline);
}
.yike-laps li > span {
  flex: none;
  inline-size: var(--pb-size-avatar-large);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
.yike-laps b {
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  font: var(--pb-typography-numeric-content);
}
.yike-laps em {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  font-style: normal;
}
.yike-laps .is-current b {
  color: var(--pb-color-primary);
}
</style>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .yike-presets button {
    transition: none;
  }
  .yike-presets button:active {
    transform: none;
  }
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Settings2 } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { useClock } from "@/runtime/useClock";
import { scope } from "./screen";
import YikeDial from "../../components/YikeDial.vue";
import YikeFocusModes from "../../components/YikeFocusModes.vue";
import YikeAction from "../../components/YikeAction.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import { useYikeStore } from "../../model";
import {
  advanceTimer, appendCountdownMinute, abandonTimer, checkpointTimer, completeTimer, createTimerSession, elapsedMs, lapTimer, pauseTimer,
  resumeTimer, startTimer,
  type YikeTimerMode,
} from "../../timer-engine";

const route = useRoute();
const router = useRouter();
const store = useYikeStore();
const now = useClock();
const face = computed(() => {
  const value = String(route.query.theme ?? store.data.preferences.face);
  return value === "water" || value === "sundial" ? value : "mechanical";
});
const mode = ref<YikeTimerMode>(store.data.session?.mode ?? "pomodoro");
const countdownMinutes = ref(5);
const confirmAbandon = ref(false);
const session = computed(() => store.data.session);
const recoveryOpen = computed({
  get: () => store.recoveryNeeded.value && route.params.screenSlug === "focus",
  set: (value: boolean) => { if (!value) store.recoveryNeeded.value = false; },
});
const status = computed(() => session.value?.status === "due" ? "finished" : session.value?.status ?? "idle");
const elapsed = computed(() => session.value ? elapsedMs(session.value, now.value.getTime()) : 0);
const total = computed(() => session.value?.targetMs ?? (mode.value === "pomodoro" ? store.data.preferences.pomodoroMinutes * 60_000 : mode.value === "countdown" ? countdownMinutes.value * 60_000 : 0));
const remaining = computed(() => Math.max(0, total.value - elapsed.value));
const progress = computed(() => mode.value === "stopwatch" ? (elapsed.value % 3_600_000) / 3_600_000 : total.value ? elapsed.value / total.value : 0);
const display = computed(() => {
  const milliseconds = mode.value === "stopwatch" ? elapsed.value : status.value === "idle" ? total.value : remaining.value;
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
});
const isBreak = computed(() => Boolean(session.value?.phase && session.value.phase !== "focus"));
const fullRound = computed(() => mode.value === "pomodoro" && !isBreak.value && status.value === "finished" && elapsed.value >= total.value);
const caption = computed(() => isBreak.value ? (status.value === "finished" ? "休息结束" : status.value === "paused" ? "休息已暂停" : session.value?.phase === "long-break" ? "长休息" : "短休息") : status.value === "finished" ? (mode.value === "countdown" ? "到点了" : "本轮完成") : status.value === "paused" ? "已暂停" : status.value === "running" ? (mode.value === "stopwatch" ? "已计时" : "剩余") : mode.value === "countdown" ? "设置时长" : "准备开始");
const todayMinutes = computed(() => Math.floor(store.data.focusRecords.reduce((sum, record) => sum + record.intervals.filter(interval => interval.date === store.today()).reduce((seconds, interval) => seconds + interval.durationSeconds, 0), 0) / 60));
function setVariant(variant: string) {
  if (route.params.screenSlug === "focus") void router.replace({ query: { ...route.query, variant } });
}
function toggle() {
  const timestamp = new Date().getTime();
  if (status.value === "idle") {
    const next = createTimerSession({ id: crypto.randomUUID(), mode: mode.value, now: timestamp, targetMs: total.value, breakAfter: store.data.completedRounds + 1 >= store.data.preferences.longBreakEvery ? "long-break" : "short-break" });
    store.setSession(startTimer(next, timestamp));
  } else if (status.value === "running" && session.value) store.setSession(pauseTimer(session.value, timestamp));
  else if (status.value === "paused" && session.value) store.setSession(resumeTimer(session.value, timestamp));
  else return;
  setVariant(status.value === "running" ? "running" : status.value === "paused" ? "paused" : "default");
}
function chooseMode(next: YikeTimerMode) {
  if (status.value !== "idle") return;
  mode.value = next;
  store.setSession(null);
}
function finish() {
  if (!session.value) return;
  if (isBreak.value) { store.leaveBreak(); setVariant("default"); return; }
  if (fullRound.value) { store.startBreak(); setVariant("running"); return; }
  store.setSession(completeTimer(session.value, new Date().getTime()));
  store.setSession(null);
  setVariant("default");
}
function lap() { if (session.value) store.setSession(lapTimer(session.value, new Date().getTime())); }
function skipBreak() { store.leaveBreak(); setVariant("default"); }
function lapLabel(ms: number) { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function appendMinute() {
  if (session.value) store.setSession(appendCountdownMinute(session.value, new Date().getTime()));
  setVariant("running");
}
function abandon() {
  if (session.value) store.setSession(abandonTimer(session.value, new Date().getTime()));
  store.setSession(null);
  confirmAbandon.value = false;
  setVariant("default");
}
watch(now, (date) => {
  if (session.value?.status !== "running") return;
  const advanced = advanceTimer(session.value, date.getTime());
  store.setSession(advanced === session.value ? checkpointTimer(session.value, date.getTime()) : advanced);
});
function checkpoint() {
  if (session.value?.status === "running") store.setSession(checkpointTimer(session.value, new Date().getTime()));
}
window.addEventListener("pagehide", checkpoint);
onBeforeUnmount(() => { checkpoint(); window.removeEventListener("pagehide", checkpoint); });
function tab(slug: string) { return prototypeNavigation(router, route, "yike").tab(slug); }
</script>

<template>

    <div class="yike-focus" v-pb="scope.node('root', 'page')">
      <header class="yike-focus-head"><div><span class="yike-date">{{ store.today() }}</span><span class="yike-total">今天已专注 <b>{{ todayMinutes }}</b> 分钟</span></div><button class="yike-icon" type="button" aria-label="设置"><Settings2 aria-hidden="true" /></button></header>
      <YikeFocusModes :model-value="mode" inspect-id="yike.focus.mode-tabs" :disabled="status !== 'idle'" @update:model-value="chooseMode" />
      <main class="yike-focus-main">
        <YikeDial :face="face" :minutes="(mode === 'stopwatch' ? elapsed : remaining) / 60_000" :total="total / 60_000" :digits="display" :caption="caption" :tone="isBreak ? 'break' : status === 'running' ? 'run' : status === 'paused' ? 'paused' : status === 'finished' ? 'done' : 'idle'" :counting-up="mode === 'stopwatch'" inspect-id="yike.focus.timer" />
        <div class="yike-round"><span>{{ isBreak ? caption : mode === 'pomodoro' ? `第 ${fullRound ? store.data.completedRounds : store.data.completedRounds + 1} 轮${fullRound ? '已完成' : '专注'}` : caption }}</span><span v-if="mode === 'pomodoro'" class="yike-pips"><i v-for="round in store.data.preferences.longBreakEvery" :key="round" :class="{ 'is-done': round <= store.data.completedRounds, 'is-current': round === store.data.completedRounds + 1 }" /></span></div>
        <div v-if="mode === 'countdown' && status === 'idle'" class="yike-presets" aria-label="倒计时时长"><button v-for="minutes in [3,5,10,20]" :key="minutes" type="button" :class="{ 'is-active': countdownMinutes === minutes }" @click="countdownMinutes = minutes">{{ minutes }}<small>分</small></button></div>
        <YikeAction inspect-id="yike.focus.primary-action" :label="status === 'running' ? '暂停' : status === 'paused' ? '继续' : status === 'finished' ? (fullRound ? (session?.breakAfter === 'long-break' ? '开始长休息' : '开始休息') : isBreak ? '准备下一轮' : '完成') : mode === 'stopwatch' ? '开始计时' : mode === 'countdown' ? `开始 ${countdownMinutes} 分钟` : '开始专注'" @click="status === 'finished' ? finish() : toggle()" />
        <YikeAction v-if="session?.status === 'due'" label="再计 1 分钟" kind="secondary" inspect-id="yike.focus.append" @click="appendMinute" />
        <YikeAction v-if="status === 'paused' && !isBreak" :label="elapsed < 60_000 ? '结束（不足 1 分钟不记录）' : '结束并记录'" kind="secondary" inspect-id="yike.focus.finish" @click="finish" />
        <YikeAction v-if="!isBreak && (status === 'running' || status === 'paused')" label="放弃本次" kind="quiet" inspect-id="yike.focus.abandon" @click="confirmAbandon = true" />
        <YikeAction v-if="fullRound || isBreak" label="跳过休息" kind="quiet" inspect-id="yike.focus.skip-break" @click="skipBreak" />
        <YikeAction v-if="mode === 'stopwatch' && status === 'running'" label="计圈" kind="secondary" inspect-id="yike.focus.lap" @click="lap" />
        <ol v-if="session?.laps?.length" class="yike-laps" aria-label="计圈记录">
          <li v-for="(value, index) in session.laps" :key="index">第 {{ index + 1 }} 圈 · {{ lapLabel(value - (session.laps[index - 1] ?? 0)) }} · 累计 {{ lapLabel(value) }}</li>
        </ol>
      </main>
      <BottomSheet material="glass" v-model="confirmAbandon" title="放弃这次专注？" inspect-id="yike.focus.abandon-sheet">
        <p>本次专注不会生成新记录。倒计时已完成部分会保留。</p>
        <div class="yike-confirm-actions">
          <YikeAction label="继续保留" kind="secondary" inspect-id="yike.focus.abandon-cancel" @click="confirmAbandon = false" />
          <YikeAction label="确认放弃" kind="danger" inspect-id="yike.focus.abandon-confirm" @click="abandon" />
        </div>
      </BottomSheet>
      <BottomSheet material="glass" v-model="recoveryOpen" title="上次的计时已暂停" inspect-id="yike.focus.recovery-sheet">
        <p>已恢复到最后保存的进度，关闭期间没有计时。</p>
        <div class="yike-confirm-actions">
          <YikeAction label="继续计时" inspect-id="yike.focus.recovery-resume" @click="toggle(); recoveryOpen = false" />
          <YikeAction :label="isBreak ? '跳过休息' : elapsed < 60_000 ? '结束（不足 1 分钟不记录）' : '结束并记录'" kind="secondary" inspect-id="yike.focus.recovery-finish" @click="finish(); recoveryOpen = false" />
        </div>
        <YikeAction v-if="!isBreak" label="放弃本次" kind="quiet" inspect-id="yike.focus.recovery-abandon" @click="recoveryOpen = false; confirmAbandon = true" />
      </BottomSheet>
    </div>

</template>

<style scoped>
.yike-focus { display: flex; min-block-size: var(--pb-layout-fill); block-size: var(--pb-layout-fill); overflow: auto; flex-direction: column; padding: var(--pb-spacing-lg) var(--pb-spacing-lg) var(--pb-spacing-xs); background: var(--pb-color-background); color: var(--pb-color-on-surface); }
.yike-laps { font:var(--pb-typography-numeric-content); padding-inline-start:var(--pb-spacing-lg); }
.yike-confirm-actions { display:flex; gap:var(--pb-spacing-sm); }
.yike-focus-head, .yike-navigation, .yike-modes, .yike-round { display: flex; align-items: center; justify-content: space-between; }
.yike-focus-head { color: var(--pb-color-on-surface-muted); font: var(--pb-typography-caption); }
.yike-focus-head > div { display: flex; flex-direction: column; gap: var(--pb-spacing-xs); }
.yike-total b { color: var(--pb-color-on-surface); font-weight: var(--pb-typography-body-lg-weight); }
.yike-icon { display: inline-flex; min-inline-size: var(--pb-size-touch); min-block-size: var(--pb-size-touch); align-items: center; justify-content: center; color: var(--pb-color-on-surface); }
.yike-icon svg { inline-size: var(--pb-size-icon); block-size: var(--pb-size-icon); }
.yike-modes { justify-content: center; gap: var(--pb-spacing-lg); margin-block-start: var(--pb-spacing-lg); color: var(--pb-color-on-surface-muted); font: var(--pb-typography-subtitle); }
.yike-modes button { position: relative; min-block-size: var(--pb-size-touch); color: inherit; }
.yike-modes button.is-active { color: var(--pb-color-on-surface); }
.yike-modes button.is-active::after { position: absolute; right: var(--pb-layout-half); bottom: var(--pb-spacing-xs); inline-size: var(--pb-size-marker); block-size: var(--pb-size-marker); border-radius: var(--pb-radius-pill); background: var(--pb-color-primary); content: ''; transform: translateX(var(--pb-layout-half)); }
.yike-focus-main { display: flex; flex: var(--pb-layout-flex-fill); flex-direction: column; align-items: center; justify-content: center; gap: var(--pb-spacing-lg); }
.yike-round { width: var(--pb-layout-fill); max-inline-size: var(--pb-size-panel-medium); justify-content: center; gap: var(--pb-spacing-sm); color: var(--pb-color-on-surface-muted); font: var(--pb-typography-content); }
.yike-pips { display: inline-flex; gap: var(--pb-spacing-xs); }
.yike-pips i { inline-size: var(--pb-size-marker); block-size: var(--pb-size-marker); border: var(--pb-border-width) solid var(--pb-color-outline); border-radius: var(--pb-radius-pill); }
.yike-pips i.is-done, .yike-pips i.is-current { border-color: var(--pb-color-primary); background: var(--pb-color-primary); }
.yike-presets { display: flex; gap: var(--pb-spacing-xs); }
.yike-presets button { min-inline-size: var(--pb-size-control-compact); min-block-size: var(--pb-size-control-compact); border-radius: var(--pb-radius-control-compact); color: var(--pb-color-on-surface-muted); }
.yike-presets button.is-active { background: var(--pb-color-primary-soft); color: var(--pb-color-primary); }
.yike-presets small { margin-inline-start: var(--pb-spacing-xs); }
.yike-primary { min-block-size: var(--pb-size-control-large); min-inline-size: var(--pb-size-panel-medium); padding-inline: var(--pb-spacing-lg); border-radius: var(--pb-radius-pill); background: var(--pb-color-primary); color: var(--pb-color-on-primary); font: var(--pb-typography-subtitle); }
.yike-navigation { justify-content: space-around; border-block-start: var(--pb-border-width) solid var(--pb-color-outline); color: var(--pb-color-on-surface-muted); }
.yike-navigation button { min-block-size: var(--pb-size-touch); padding-inline: var(--pb-spacing-lg); color: inherit; font: var(--pb-typography-caption); }
.yike-navigation button.is-active { color: var(--pb-color-on-surface); }
</style>

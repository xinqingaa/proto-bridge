<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Settings2 } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { scope } from "./screen";
import YikeDial from "./YikeDial.vue";

type Face = "mechanical" | "water" | "sundial";
type TimerMode = "pomodoro" | "stopwatch" | "countdown";
const route = useRoute();
const router = useRouter();
const face = computed<Face>(() => {
  const value = String(route.query.theme ?? "mechanical");
  return value === "water" || value === "sundial" ? value : "mechanical";
});
const mode = ref<TimerMode>("pomodoro");
const status = ref<"idle" | "running" | "paused" | "finished">(route.query.variant === "running" ? "running" : "idle");
const startedAt = ref(status.value === "running" ? Date.now() : 0);
const accumulated = ref(0);
const countdownMinutes = ref(5);
const now = ref(Date.now());
const ticker = window.setInterval(() => {
  now.value = Date.now();
  if (status.value === "running" && mode.value === "countdown" && remaining.value <= 0) status.value = "finished";
}, 250);
onBeforeUnmount(() => window.clearInterval(ticker));
const elapsed = computed(() => accumulated.value + (status.value === "running" ? now.value - startedAt.value : 0));
const total = computed(() => mode.value === "pomodoro" ? 25 * 60_000 : mode.value === "countdown" ? countdownMinutes.value * 60_000 : 0);
const remaining = computed(() => Math.max(0, total.value - elapsed.value));
const progress = computed(() => mode.value === "stopwatch" ? (elapsed.value % 3_600_000) / 3_600_000 : total.value ? elapsed.value / total.value : 0);
const display = computed(() => {
  const milliseconds = mode.value === "stopwatch" ? elapsed.value : status.value === "idle" ? total.value : remaining.value;
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
});
const caption = computed(() => status.value === "finished" ? (mode.value === "countdown" ? "到点了" : "本轮完成") : status.value === "paused" ? "已暂停" : status.value === "running" ? (mode.value === "stopwatch" ? "已计时" : "剩余") : mode.value === "countdown" ? "设置时长" : "准备开始");
function setVariant(variant: string) { void router.replace({ query: { ...route.query, variant } }); }
function start() { status.value = "running"; startedAt.value = Date.now() - accumulated.value; setVariant("running"); }
function toggle() {
  if (status.value === "idle" || status.value === "finished") { accumulated.value = 0; start(); }
  else if (status.value === "running") { accumulated.value = elapsed.value; status.value = "paused"; setVariant("paused"); }
  else start();
}
function chooseMode(next: TimerMode) { if (status.value === "running" || status.value === "paused") return; mode.value = next; accumulated.value = 0; status.value = "idle"; setVariant("default"); }
function tab(slug: string) { return prototypeNavigation(router, route, "yike").tab(slug); }
</script>

<template>
  <PrototypeShell title="专注" screen-id="yike.focus">
    <div class="yike-focus" v-pb="scope.node('root', 'page')">
      <header class="yike-focus-head"><div><span class="yike-date">10月16日 · 周五</span><span class="yike-total">今天已专注 <b>50</b> 分钟</span></div><button class="yike-icon" type="button" aria-label="设置"><Settings2 aria-hidden="true" /></button></header>
      <nav class="yike-modes" aria-label="计时模式" v-pb="scope.node('mode-tabs', 'tab-bar')"><button v-for="item in ([['pomodoro','番茄'],['stopwatch','正计时'],['countdown','倒计时']])" :key="item[0]" type="button" :class="{ 'is-active': mode === item[0] }" :disabled="status === 'running' || status === 'paused'" @click="chooseMode(item[0] as TimerMode)">{{ item[1] }}</button></nav>
      <main class="yike-focus-main">
        <YikeDial :face="face" :progress="progress" :display="display" :caption="caption" :paused="status === 'paused'" :rest="false" :finished="status === 'finished'" v-pb="scope.node('timer', 'status')" />
        <div class="yike-round"><span>{{ mode === 'pomodoro' ? '第 3 轮专注' : caption }}</span><span v-if="mode === 'pomodoro'" class="yike-pips"><i class="is-done" /><i class="is-done" /><i class="is-current" /><i /></span></div>
        <div v-if="mode === 'countdown' && status === 'idle'" class="yike-presets" aria-label="倒计时时长"><button v-for="minutes in [3,5,10,20]" :key="minutes" type="button" :class="{ 'is-active': countdownMinutes === minutes }" @click="countdownMinutes = minutes">{{ minutes }}<small>分</small></button></div>
        <button class="yike-primary" type="button" v-pb="scope.node('primary-action', 'button')" @click="toggle">{{ status === 'running' ? '暂停' : status === 'paused' ? '继续' : mode === 'stopwatch' ? '开始计时' : mode === 'countdown' ? `开始 ${countdownMinutes} 分钟` : '开始专注' }}</button>
      </main>
      <nav class="yike-navigation" aria-label="主导航" v-pb="scope.node('navigation', 'navigation')"><button class="is-active" type="button">专注</button><button type="button" @click="tab('checkin')">打卡</button><button type="button" @click="tab('review')">回顾</button></nav>
    </div>
  </PrototypeShell>
</template>

<style scoped>
.yike-focus { display: flex; min-block-size: var(--pb-layout-fill); flex-direction: column; padding: var(--pb-space-6) var(--pb-space-6) var(--pb-space-2); background: var(--pb-color-background); color: var(--pb-color-on-surface); }
.yike-focus-head, .yike-navigation, .yike-modes, .yike-round { display: flex; align-items: center; justify-content: space-between; }
.yike-focus-head { color: var(--pb-color-on-surface-muted); font: var(--pb-typography-caption); }
.yike-focus-head > div { display: flex; flex-direction: column; gap: var(--pb-space-2); }
.yike-total b { color: var(--pb-color-on-surface); font-weight: var(--pb-typography-body-lg-weight); }
.yike-icon { display: inline-flex; min-inline-size: var(--pb-size-touch); min-block-size: var(--pb-size-touch); align-items: center; justify-content: center; color: var(--pb-color-on-surface); }
.yike-icon svg { inline-size: var(--pb-size-icon); block-size: var(--pb-size-icon); }
.yike-modes { justify-content: center; gap: var(--pb-space-6); margin-block-start: var(--pb-space-6); color: var(--pb-color-on-surface-muted); font: var(--pb-typography-subtitle); }
.yike-modes button { position: relative; min-block-size: var(--pb-size-touch); color: inherit; }
.yike-modes button.is-active { color: var(--pb-color-on-surface); }
.yike-modes button.is-active::after { position: absolute; right: var(--pb-layout-half); bottom: var(--pb-space-2); inline-size: var(--pb-size-marker); block-size: var(--pb-size-marker); border-radius: var(--pb-radius-round); background: var(--pb-color-primary); content: ''; transform: translateX(var(--pb-layout-half)); }
.yike-focus-main { display: flex; flex: var(--pb-layout-flex-fill); flex-direction: column; align-items: center; justify-content: center; gap: var(--pb-space-6); }
.yike-round { width: var(--pb-layout-fill); max-inline-size: var(--pb-size-panel-medium); justify-content: center; gap: var(--pb-space-4); color: var(--pb-color-on-surface-muted); font: var(--pb-typography-content); }
.yike-pips { display: inline-flex; gap: var(--pb-space-2); }
.yike-pips i { inline-size: var(--pb-size-marker); block-size: var(--pb-size-marker); border: var(--pb-border-width) solid var(--pb-color-outline); border-radius: var(--pb-radius-round); }
.yike-pips i.is-done, .yike-pips i.is-current { border-color: var(--pb-color-primary); background: var(--pb-color-primary); }
.yike-presets { display: flex; gap: var(--pb-space-2); }
.yike-presets button { min-inline-size: var(--pb-size-control-compact); min-block-size: var(--pb-size-control-compact); border-radius: var(--pb-radius-control-compact); color: var(--pb-color-on-surface-muted); }
.yike-presets button.is-active { background: var(--pb-color-primary-soft); color: var(--pb-color-primary); }
.yike-presets small { margin-inline-start: var(--pb-space-2); }
.yike-primary { min-block-size: var(--pb-size-control-large); min-inline-size: var(--pb-size-panel-medium); padding-inline: var(--pb-space-6); border-radius: var(--pb-radius-pill); background: var(--pb-color-primary); color: var(--pb-color-on-primary); font: var(--pb-typography-subtitle); }
.yike-navigation { justify-content: space-around; border-block-start: var(--pb-border-width) solid var(--pb-color-outline); color: var(--pb-color-on-surface-muted); }
.yike-navigation button { min-block-size: var(--pb-size-touch); padding-inline: var(--pb-space-6); color: inherit; font: var(--pb-typography-caption); }
.yike-navigation button.is-active { color: var(--pb-color-on-surface); }
</style>

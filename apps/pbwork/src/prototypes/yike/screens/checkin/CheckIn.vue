<script setup lang="ts">
import { ref, computed } from "vue";
import { Plus, Check, Settings2 } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { scope } from "./screen";

const route = useRoute();
const router = useRouter();
const habits = ref([
  { name: "喝一杯水", note: "每天 · 本周 4/7", days: [true, true, false, true, false, false, false], done: false },
  { name: "阅读 20 分钟", note: "工作日 · 本周 3/5", days: [true, false, true, false, true, false, false], done: true },
  { name: "拉伸", note: "每天 · 本周 2/7", days: [false, true, false, false, false, false, false], done: false },
]);
const doneCount = computed(() => habits.value.filter((habit) => habit.done).length);
function tab(slug: string) { return prototypeNavigation(router, route, "yike").tab(slug); }
</script>

<template>
  <PrototypeShell title="打卡" screen-id="yike.checkin">
    <div class="yike-checkin" v-pb="scope.node('root', 'page')">
      <header class="yike-page-head"><div><span class="yike-eyebrow">10月16日 · 周五</span><h1>今天的习惯</h1></div><button class="yike-icon" type="button" aria-label="设置"><Settings2 aria-hidden="true" /></button></header>
      <div class="yike-tally"><strong>{{ doneCount }}<small>/{{ habits.length }}</small></strong><span>{{ doneCount === habits.length ? '今天的都完成了' : `还剩 ${habits.length - doneCount} 个` }}</span><button type="button" aria-label="新建习惯"><Plus aria-hidden="true" /></button></div>
      <ul class="yike-habits" v-pb="scope.node('habit-list', 'list')">
        <li v-for="habit in habits" :key="habit.name" class="yike-habit" :class="{ 'is-done': habit.done }">
          <div class="yike-habit-mark" aria-hidden="true">{{ habit.name.slice(0, 1) }}</div><div class="yike-habit-body"><strong>{{ habit.name }}</strong><span>{{ habit.note }}</span><div class="yike-days"><i v-for="(day, index) in habit.days" :key="index" :class="{ 'is-done': day, 'is-today': index === 4 }">{{ ['一','二','三','四','五','六','日'][index] }}</i></div></div>
          <button class="yike-punch" type="button" :aria-label="habit.done ? `取消打卡：${habit.name}` : `打卡：${habit.name}`" :aria-pressed="habit.done" @click="habit.done = !habit.done"><Check aria-hidden="true" /></button>
        </li>
      </ul>
      <nav class="yike-navigation" aria-label="主导航" v-pb="scope.node('navigation', 'navigation')"><button type="button" @click="tab('focus')">专注</button><button class="is-active" type="button">打卡</button><button type="button" @click="tab('review')">回顾</button></nav>
    </div>
  </PrototypeShell>
</template>

<style scoped>
.yike-checkin { display:flex; min-block-size:var(--pb-layout-fill); flex-direction:column; padding:var(--pb-space-6) var(--pb-space-6) var(--pb-space-2); background:var(--pb-color-background); color:var(--pb-color-on-surface); }
.yike-page-head,.yike-tally,.yike-navigation { display:flex; align-items:center; justify-content:space-between; }.yike-page-head h1 { margin:var(--pb-space-2) var(--pb-layout-zero) var(--pb-layout-zero); font:var(--pb-typography-heading); }.yike-eyebrow { color:var(--pb-color-on-surface-muted); font:var(--pb-typography-caption); }.yike-icon { min-inline-size:var(--pb-size-touch); min-block-size:var(--pb-size-touch); color:var(--pb-color-on-surface); }.yike-icon svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }
.yike-tally { margin-block:var(--pb-space-6); padding:var(--pb-space-4); border:var(--pb-border-width) solid var(--pb-color-outline); border-radius:var(--pb-radius-surface); background:var(--pb-color-surface); gap:var(--pb-space-4); }.yike-tally strong { font:var(--pb-typography-numeric-display); }.yike-tally small { font:var(--pb-typography-body-sm); }.yike-tally span { flex:var(--pb-layout-flex-fill); color:var(--pb-color-on-surface-muted); font:var(--pb-typography-content); }.yike-tally button { min-inline-size:var(--pb-size-touch); min-block-size:var(--pb-size-touch); color:var(--pb-color-primary); }.yike-tally svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }
.yike-habits { display:flex; flex-direction:column; gap:var(--pb-space-2); padding:var(--pb-layout-zero); margin:var(--pb-layout-zero); list-style:none; }.yike-habit { display:flex; align-items:center; gap:var(--pb-space-4); padding:var(--pb-space-4); border-block-end:var(--pb-border-width) solid var(--pb-color-outline); }.yike-habit-mark { display:flex; inline-size:var(--pb-size-control); block-size:var(--pb-size-control); align-items:center; justify-content:center; border-radius:var(--pb-radius-round); background:var(--pb-color-primary-soft); color:var(--pb-color-primary); font:var(--pb-typography-subtitle); }.yike-habit-body { display:flex; min-inline-size:var(--pb-layout-zero); flex:var(--pb-layout-flex-fill); flex-direction:column; gap:var(--pb-space-2); }.yike-habit-body strong { font:var(--pb-typography-subtitle); }.yike-habit-body > span { color:var(--pb-color-on-surface-muted); font:var(--pb-typography-caption); }.yike-days { display:flex; gap:var(--pb-space-2); }.yike-days i { display:flex; inline-size:var(--pb-size-marker); block-size:var(--pb-size-marker); align-items:center; justify-content:center; border:var(--pb-border-width) solid var(--pb-color-outline); border-radius:var(--pb-radius-round); color:var(--pb-color-on-surface-muted); font:var(--pb-typography-micro); font-style:normal; }.yike-days i.is-done { border-color:var(--pb-color-primary); background:var(--pb-color-primary); color:var(--pb-color-on-primary); }.yike-punch { display:flex; inline-size:var(--pb-size-control); block-size:var(--pb-size-control); align-items:center; justify-content:center; border:var(--pb-border-width-strong) solid var(--pb-color-outline); border-radius:var(--pb-radius-round); color:transparent; }.yike-punch svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }.is-done .yike-punch { border-color:var(--pb-color-primary); background:var(--pb-color-primary); color:var(--pb-color-on-primary); }.yike-navigation { justify-content:space-around; margin-block-start:auto; border-block-start:var(--pb-border-width) solid var(--pb-color-outline); color:var(--pb-color-on-surface-muted); }.yike-navigation button { min-block-size:var(--pb-size-touch); padding-inline:var(--pb-space-6); color:inherit; font:var(--pb-typography-caption); }.yike-navigation button.is-active { color:var(--pb-color-on-surface); }
</style>

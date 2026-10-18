<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, Check, Settings2 } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { scope } from "./screen";
import { useYikeStore } from "../../model";
import YikeHabitGlyph from "../../components/YikeHabitGlyph.vue";
import { useClock } from "@/runtime/useClock";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Button from "@/design-system/components/action/Button.vue";

const route = useRoute();
const router = useRouter();
const store = useYikeStore();
const clock = useClock();
const showReset = ref(false);
const habits = computed(() => store.data.habits.filter((habit) => !habit.archivedOn));
const today = computed(() => { void clock.value; return store.today(); });
const todayDate = computed(() => new Date(`${today.value}T12:00:00`));
const monday = computed(() => {
  const date = new Date(todayDate.value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
});
const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date(monday.value);
  date.setDate(date.getDate() + index);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { key, label: ["一", "二", "三", "四", "五", "六", "日"][index], isToday: key === today.value };
}));
const doneCount = computed(() => habits.value.filter((habit) => store.data.checkins.some((item) => item.habitId === habit.id && item.date === today.value)).length);
function checked(habitId: string, date: string) { return store.data.checkins.some((item) => item.habitId === habitId && item.date === date); }
function weekProgress(habitId: string) { return weekDays.value.filter((day) => checked(habitId, day.key)).length; }
function toggle(habitId: string) { store.toggleCheckin(habitId); }
function resetCorruptData() {
  store.reset();
  showReset.value = false;
}
function tab(slug: string) { return prototypeNavigation(router, route, "yike").tab(slug); }
</script>

<template>

    <div class="yike-checkin" v-pb="scope.node('root', 'page')">
      <header class="yike-page-head"><div><span class="yike-eyebrow">{{ today }}</span><h1>今天的习惯</h1></div><button class="yike-icon" type="button" aria-label="设置"><Settings2 aria-hidden="true" /></button></header>
      <p v-if="store.storageIssue.value" class="yike-storage-warning" role="alert">
        {{ store.storageIssue.value === 'corrupt' ? '本机数据无法读取。重置后会恢复默认习惯并清除记录。' : '暂未保存，关闭后可能丢失。' }}
        <button v-if="store.storageIssue.value === 'corrupt'" type="button" @click="showReset = true">重置数据</button>
        <button v-else type="button" @click="store.retrySave">重试保存</button>
      </p>
      <div class="yike-tally"><strong>{{ doneCount }}<small>/{{ habits.length }}</small></strong><span>{{ habits.length === 0 ? '从一个小习惯开始' : doneCount === habits.length ? '今天的都完成了' : `还剩 ${habits.length - doneCount} 个` }}</span><button type="button" aria-label="新建习惯"><Plus aria-hidden="true" /></button></div>
      <p v-if="habits.length === 0" class="yike-empty">还没有进行中的习惯</p>
      <ul class="yike-habits" v-pb="scope.node('habit-list', 'list')">
        <li v-for="habit in habits" :key="habit.id" class="yike-habit" :class="{ 'is-done': checked(habit.id, today) }">
          <div class="yike-habit-mark"><YikeHabitGlyph :icon="habit.icon" /></div><div class="yike-habit-body"><strong>{{ habit.name }}</strong><span>{{ habit.frequency === 'daily' ? '每天' : `每周 ${habit.target} 次` }} · 本周 {{ weekProgress(habit.id) }}/{{ habit.frequency === 'daily' ? Math.min(weekDays.filter(day => day.key <= today && day.key >= habit.createdOn).length, 7) : habit.target }}</span><div class="yike-days"><i v-for="day in weekDays" :key="day.key" :class="{ 'is-done': checked(habit.id, day.key), 'is-today': day.isToday }">{{ day.label }}</i></div></div>
          <button class="yike-punch" type="button" :aria-label="checked(habit.id, today) ? `取消打卡：${habit.name}` : `打卡：${habit.name}`" :aria-pressed="checked(habit.id, today)" @click="toggle(habit.id)"><Check aria-hidden="true" /></button>
        </li>
      </ul>
      <BottomSheet v-model="showReset" title="重置本机数据？" inspect-id="yike.checkin.corrupt-reset">
        <p>无法恢复本机数据。重置将清除会话、历史和用户习惯，恢复默认配置与四个预置习惯。</p>
        <div class="yike-storage-warning">
          <Button label="取消" kind="secondary" inspect-id="yike.checkin.reset-cancel" @click="showReset = false" />
          <Button label="重置数据" kind="danger" inspect-id="yike.checkin.reset-confirm" @click="resetCorruptData" />
        </div>
      </BottomSheet>
    </div>

</template>

<style scoped>
.yike-checkin { display:flex; min-block-size:var(--pb-layout-fill); block-size:var(--pb-layout-fill); overflow:auto; flex-direction:column; padding:var(--pb-spacing-lg) var(--pb-spacing-lg) var(--pb-spacing-xs); background:var(--pb-color-background); color:var(--pb-color-on-surface); }
.yike-storage-warning,.yike-empty { color:var(--pb-color-on-surface-muted); font:var(--pb-typography-content); }
.yike-storage-warning { display:flex; flex-wrap:wrap; align-items:center; gap:var(--pb-spacing-xs); }
.yike-storage-warning button { color:var(--pb-color-primary); text-decoration:underline; }
.yike-page-head,.yike-tally,.yike-navigation { display:flex; align-items:center; justify-content:space-between; }.yike-page-head h1 { margin:var(--pb-spacing-xs) var(--pb-layout-zero) var(--pb-layout-zero); font:var(--pb-typography-headline); }.yike-eyebrow { color:var(--pb-color-on-surface-muted); font:var(--pb-typography-caption); }.yike-icon { min-inline-size:var(--pb-size-touch); min-block-size:var(--pb-size-touch); color:var(--pb-color-on-surface); }.yike-icon svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }
.yike-tally { margin-block:var(--pb-spacing-lg); padding:var(--pb-spacing-sm); border:var(--pb-border-width) solid var(--pb-color-outline); border-radius:var(--pb-radius-surface); background:var(--pb-color-surface); gap:var(--pb-spacing-sm); }.yike-tally strong { font:var(--pb-typography-numeric-display); }.yike-tally small { font:var(--pb-typography-body-sm); }.yike-tally span { flex:var(--pb-layout-flex-fill); color:var(--pb-color-on-surface-muted); font:var(--pb-typography-content); }.yike-tally button { min-inline-size:var(--pb-size-touch); min-block-size:var(--pb-size-touch); color:var(--pb-color-primary); }.yike-tally svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }
.yike-habits { display:flex; flex-direction:column; gap:var(--pb-spacing-xs); padding:var(--pb-layout-zero); margin:var(--pb-layout-zero); list-style:none; }.yike-habit { display:flex; align-items:center; gap:var(--pb-spacing-sm); padding:var(--pb-spacing-sm); border-block-end:var(--pb-border-width) solid var(--pb-color-outline); }.yike-habit-mark { display:flex; inline-size:var(--pb-size-control); block-size:var(--pb-size-control); align-items:center; justify-content:center; border-radius:var(--pb-radius-pill); background:var(--pb-color-primary-soft); color:var(--pb-color-primary); font:var(--pb-typography-subtitle); }.yike-habit-body { display:flex; min-inline-size:var(--pb-layout-zero); flex:var(--pb-layout-flex-fill); flex-direction:column; gap:var(--pb-spacing-xs); }.yike-habit-body strong { font:var(--pb-typography-subtitle); }.yike-habit-body > span { color:var(--pb-color-on-surface-muted); font:var(--pb-typography-caption); }.yike-days { display:flex; gap:var(--pb-spacing-xs); }.yike-days i { display:flex; inline-size:var(--pb-size-marker); block-size:var(--pb-size-marker); align-items:center; justify-content:center; border:var(--pb-border-width) solid var(--pb-color-outline); border-radius:var(--pb-radius-pill); color:var(--pb-color-on-surface-muted); font:var(--pb-typography-micro); font-style:normal; }.yike-days i.is-done { border-color:var(--pb-color-primary); background:var(--pb-color-primary); color:var(--pb-color-on-primary); }.yike-punch { display:flex; inline-size:var(--pb-size-control); block-size:var(--pb-size-control); align-items:center; justify-content:center; border:var(--pb-border-width-strong) solid var(--pb-color-outline); border-radius:var(--pb-radius-pill); color:transparent; }.yike-punch svg { inline-size:var(--pb-size-icon); block-size:var(--pb-size-icon); }.is-done .yike-punch { border-color:var(--pb-color-primary); background:var(--pb-color-primary); color:var(--pb-color-on-primary); }.yike-navigation { justify-content:space-around; margin-block-start:auto; border-block-start:var(--pb-border-width) solid var(--pb-color-outline); color:var(--pb-color-on-surface-muted); }.yike-navigation button { min-block-size:var(--pb-size-touch); padding-inline:var(--pb-spacing-lg); color:inherit; font:var(--pb-typography-caption); }.yike-navigation button.is-active { color:var(--pb-color-on-surface); }
</style>

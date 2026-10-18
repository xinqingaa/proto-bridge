<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { PreviewDeviceSession } from "@/workbench/preview/model";
import Button from "@/design-system/components/action/Button.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import YikeHabitCard from "../components/YikeHabitCard.vue";
import type { YikeHabitIcon } from "../components/YikeHabitGlyph.vue";
const props = defineProps<{
  device: PreviewDeviceSession;
  table: ResolvedThemeTable;
  states: Array<{ id: string; label: string }>;
}>();
watchEffect(() => {
  props.device.demo.session ??= {};
});
const session = computed(() => props.device.demo.session!);
const face = computed(
  () => props.table.identity.theme as "mechanical" | "water" | "sundial",
);
const habits: Array<{
  id: string;
  name: string;
  icon: YikeHabitIcon;
  meta: string;
}> = [
  { id: "water", name: "喝够 8 杯水", icon: "water", meta: "每天" },
  { id: "read", name: "读 20 页书", icon: "book", meta: "每天" },
  { id: "run", name: "跑步", icon: "run", meta: "每周 3 次" },
  { id: "sleep", name: "23 点前睡", icon: "moon", meta: "每天" },
];
const today = "2026-10-16";
const dates = [
  "2026-10-12",
  "2026-10-13",
  "2026-10-14",
  "2026-10-15",
  today,
  "2026-10-17",
  "2026-10-18",
];
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const state = computed(() => String(session.value.habitState ?? "initial"));
const completed = computed(() =>
  Array.isArray(session.value.completed)
    ? (session.value.completed as string[])
    : [],
);
function prepare(id: string) {
  session.value.habitState = id;
  session.value.completed =
    id === "all"
      ? habits.map((h) => h.id)
      : id === "partial"
        ? ["water", "read"]
        : [];
  session.value.result = "";
}
function days(id: string) {
  return dates.map((date, index) => ({
    date,
    completed:
      date === today
        ? completed.value.includes(id)
        : state.value !== "initial" && date < today && index % 2 === 0,
  }));
}
function toggle(id: string) {
  session.value.completed = completed.value.includes(id)
    ? completed.value.filter((value) => value !== id)
    : [...completed.value, id];
  session.value.result = `${habits.find((h) => h.id === id)?.name}：${completed.value.includes(id) ? "今天已打卡" : "今天已取消"}`;
}
</script>
<template>
  <section class="habit-preview">
    <div class="tools" aria-label="代表状态">
      <Button
        v-for="item in states"
        :key="item.id"
        :label="item.label"
        kind="outlined"
        size="sm"
        @click="prepare(item.id)"
      /><Button
        label="复位"
        kind="secondary"
        size="sm"
        @click="prepare('initial')"
      />
    </div>
    <p role="status">
      {{ session.result || `今天 ${completed.length} / ${habits.length}` }}
    </p>
    <EmptyState
      v-if="state === 'empty'"
      title="从一个小习惯开始"
      description="资源空态：没有进行中的习惯。"
    />
    <template v-else>
      <div class="weekdays" aria-label="2026年10月12日至18日">
        <span
          v-for="(label, index) in weekdays"
          :key="label"
          :class="{ 'is-today': dates[index] === today }"
          >{{ label }}</span
        ><i />
      </div>
      <YikeHabitCard
        v-for="habit in habits"
        :key="habit.id"
        :habit="habit"
        :face="face"
        :days="days(habit.id)"
        :today="today"
        :disabled="state === 'disabled'"
        :inspect-id="`preview.${device.id}.habit`"
        @toggle-today="toggle"
        @open="session.result = `详情入口：${habit.name}`"
      />
    </template>
  </section>
</template>
<style scoped>
.habit-preview {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
}
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
p {
  font: var(--pb-typography-body-sm);
  color: var(--pb-color-on-surface-muted);
}
.weekdays {
  display: flex;
  padding: var(--pb-layout-zero) var(--pb-spacing-md);
  font: var(--pb-typography-micro);
  color: var(--pb-color-on-surface-muted);
}
.weekdays span {
  flex: var(--pb-layout-flex-fill);
  text-align: center;
}
.weekdays i {
  inline-size: calc(var(--pb-size-touch) + var(--pb-spacing-sm));
}
.is-today {
  color: var(--pb-color-primary);
}
</style>

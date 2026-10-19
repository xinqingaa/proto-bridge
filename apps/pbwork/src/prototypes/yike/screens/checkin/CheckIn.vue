<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Plus } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { yikeNavigation } from "../../navigation";
import { useYikeScroll } from "../../runtime";
import YikeHabitCard from "../../components/YikeHabitCard.vue";
import { scope } from "./screen";
import { useYikeStore } from "../../model";
import { useClock } from "@/runtime/useClock";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Button from "@/design-system/components/action/Button.vue";

const route = useRoute();
const router = useRouter();
const store = useYikeStore();
const clock = useClock();
const root = ref<HTMLElement | null>(null);
useYikeScroll(root, "checkin");
const archivedOpen = ref(false);
const archived = computed(() =>
  store.data.habits.filter((habit) => habit.archivedOn),
);
const face = computed(() => store.data.preferences.face);
const nav = () => yikeNavigation(router, route, store);

const showReset = ref(false);
const habits = computed(() =>
  store.data.habits.filter((habit) => !habit.archivedOn),
);
const today = computed(() => {
  void clock.value;
  return store.today();
});
const todayDate = computed(() => new Date(`${today.value}T12:00:00`));
const monday = computed(() => {
  const date = new Date(todayDate.value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
});
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.value);
    date.setDate(date.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      key,
      label: ["一", "二", "三", "四", "五", "六", "日"][index],
      isToday: key === today.value,
    };
  }),
);
const doneCount = computed(
  () =>
    habits.value.filter((habit) =>
      store.data.checkins.some(
        (item) => item.habitId === habit.id && item.date === today.value,
      ),
    ).length,
);
function checked(habitId: string, date: string) {
  return store.data.checkins.some(
    (item) => item.habitId === habitId && item.date === date,
  );
}
function weekProgress(habitId: string) {
  return weekDays.value.filter((day) => checked(habitId, day.key)).length;
}
const notice = ref(false);
const noticeText = ref("");
watch(notice, (open) => {
  if (!open) store.undoCheckin.value = null;
});

function toggle(habitId: string) {
  if (store.toggleCheckin(habitId)) {
    noticeText.value = checked(habitId, today.value)
      ? "今天已打卡"
      : "今天已取消打卡";
    notice.value = true;
  }
}
function undo() {
  noticeText.value = store.undoLastCheckin()
    ? "已撤销本次打卡变化"
    : "这次操作已不能撤销";
}
function resetCorruptData() {
  store.reset();
  showReset.value = false;
}
</script>

<template>
  <div
    ref="root"
    class="yike-checkin"
    v-pb="
      scope.node('root', 'page', {
        tokens: { background: 'color.background', padding: 'spacing.lg' },
      })
    "
  >
    <header class="yike-page-head">
      <div>
        <span class="yike-eyebrow">{{ today }}</span>
        <h1>今天的习惯</h1>
      </div>
    </header>
    <p
      v-if="store.storageIssue.value"
      class="yike-storage-warning"
      role="alert"
    >
      {{
        store.storageIssue.value === "corrupt"
          ? "本机数据无法读取。重置后会恢复默认习惯并清除记录。"
          : "暂未保存，关闭后可能丢失。"
      }}
      <button
        v-if="store.storageIssue.value === 'corrupt'"
        type="button"
        @click="showReset = true"
      >
        重置数据
      </button>
      <button v-else type="button" @click="store.retrySave">重试保存</button>
    </p>
    <div class="yike-tally">
      <strong
        >{{ doneCount }}<small>/{{ habits.length }}</small></strong
      ><span>{{
        habits.length === 0
          ? "从一个小习惯开始"
          : doneCount === habits.length
            ? "今天的都完成了"
            : `还剩 ${habits.length - doneCount} 个`
      }}</span
      ><button
        type="button"
        aria-label="新建习惯"
        @click="nav().editor()"
        v-pb="
          scope.node('create', 'button', {
            tokens: { size: 'size.touch', color: 'color.primary' },
          })
        "
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
    <p v-if="habits.length === 0" class="yike-empty">还没有进行中的习惯</p>
    <p v-if="store.presentation.message" role="status">
      {{ store.presentation.message }}
    </p>
    <div
      class="yike-habits"
      v-pb="scope.node('habit-list', 'list', { tokens: { gap: 'spacing.md' } })"
    >
      <YikeHabitCard
        v-for="habit in habits"
        :key="habit.id"
        :inspect-id="`yike.checkin.habit.${habit.id}`"
        :face="face"
        :habit="{
          ...habit,
          meta: `${habit.frequency === 'daily' ? '每天' : `每周 ${habit.target} 次`} · 本周 ${weekProgress(habit.id)} 次`,
        }"
        :days="
          weekDays.map((day) => ({
            date: day.key,
            completed: checked(habit.id, day.key),
          }))
        "
        :today="today"
        @open="(id) => nav().habit(id)"
        @toggle-today="toggle"
      />
    </div>
    <Button
      label="已归档习惯"
      kind="quiet"
      inspect-id="yike.checkin.archived"
      @click="archivedOpen = true"
    />
    <BottomSheet
      v-model="archivedOpen"
      title="已归档习惯"
      material="glass"
      inspect-id="yike.checkin.archived-sheet"
    >
      <p v-if="!archived.length">还没有已归档习惯。</p>
      <div v-for="habit in archived" :key="habit.id" class="yike-archive-row">
        <Button
          :label="habit.name"
          kind="quiet"
          :inspect-id="`yike.checkin.archived.${habit.id}.open`"
          @click="
            archivedOpen = false;
            nav().habit(habit.id);
          "
        />
        <Button
          label="恢复"
          kind="outlined"
          :inspect-id="`yike.checkin.archived.${habit.id}.restore`"
          @click="
            store.archiveHabit(habit.id, false);
            store.presentation.message = `已恢复：${habit.name}`;
          "
        />
      </div>
    </BottomSheet>
    <Toast
      v-model="notice"
      :message="noticeText"
      action-label="撤销"
      inspect-id="yike.checkin.undo"
      @undo="undo"
    />
    <BottomSheet
      v-model="showReset"
      title="重置本机数据？"
      inspect-id="yike.checkin.corrupt-reset"
    >
      <p>
        无法恢复本机数据。重置将清除会话、历史和用户习惯，恢复默认配置与四个预置习惯。
      </p>
      <div class="yike-storage-warning">
        <Button
          label="取消"
          kind="secondary"
          inspect-id="yike.checkin.reset-cancel"
          @click="showReset = false"
        />
        <Button
          label="重置数据"
          kind="danger"
          inspect-id="yike.checkin.reset-confirm"
          @click="resetCorruptData"
        />
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.yike-archive-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-md);
}
.yike-checkin {
  display: flex;
  min-block-size: var(--pb-layout-fill);
  block-size: var(--pb-layout-fill);
  overflow: auto;
  flex-direction: column;
  padding: var(--pb-spacing-lg) var(--pb-spacing-lg) var(--pb-spacing-xs);
  background: var(--pb-color-background);
  color: var(--pb-color-on-surface);
}
.yike-storage-warning,
.yike-empty {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
.yike-storage-warning {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pb-spacing-xs);
}
.yike-storage-warning button {
  color: var(--pb-color-primary);
  text-decoration: underline;
}
.yike-page-head,
.yike-tally,
.yike-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.yike-page-head h1 {
  margin: var(--pb-spacing-xs) var(--pb-layout-zero) var(--pb-layout-zero);
  font: var(--pb-typography-headline);
}
.yike-eyebrow {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.yike-icon {
  min-inline-size: var(--pb-size-touch);
  min-block-size: var(--pb-size-touch);
  color: var(--pb-color-on-surface);
}
.yike-icon svg {
  inline-size: var(--pb-size-icon);
  block-size: var(--pb-size-icon);
}
.yike-tally {
  margin-block: var(--pb-spacing-lg);
  padding: var(--pb-spacing-sm);
  border: var(--pb-border-width) solid var(--pb-color-outline);
  border-radius: var(--pb-radius-surface);
  background: var(--pb-color-surface);
  gap: var(--pb-spacing-sm);
}
.yike-tally strong {
  font: var(--pb-typography-numeric-display);
}
.yike-tally small {
  font: var(--pb-typography-body-sm);
}
.yike-tally span {
  flex: var(--pb-layout-flex-fill);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
.yike-tally button {
  min-inline-size: var(--pb-size-touch);
  min-block-size: var(--pb-size-touch);
  color: var(--pb-color-primary);
}
.yike-tally svg {
  inline-size: var(--pb-size-icon);
  block-size: var(--pb-size-icon);
}
.yike-habits {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
  padding: var(--pb-layout-zero);
  margin: var(--pb-layout-zero);
  list-style: none;
}
</style>

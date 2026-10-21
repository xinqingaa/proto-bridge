<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { yikeNavigation } from "../../navigation";
import { useYikeScroll } from "../../runtime";
import YikeActionRows from "../../components/YikeActionRows.vue";
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
const messageOpen = computed({
  get: () =>
    route.params.screenSlug === "checkin" &&
    Boolean(store.presentation.message),
  set: (open: boolean) => {
    if (!open) store.presentation.message = "";
  },
});
const notice = ref(false);
const noticeText = ref("");
watch(notice, (open) => {
  if (!open) store.undoCheckin.value = null;
});

function toggle(habitId: string) {
  store.presentation.message = "";
  if (store.toggleCheckin(habitId)) {
    noticeText.value = checked(habitId, today.value)
      ? `「${store.data.habits.find((habit) => habit.id === habitId)?.name}」今天已打卡`
      : `「${store.data.habits.find((habit) => habit.id === habitId)?.name}」今天已取消打卡`;
    notice.value = true;
  }
}
watch(
  () => store.presentation.message,
  (message) => {
    if (message) notice.value = false;
  },
);
watch(
  () => route.params.screenSlug,
  (slug) => {
    if (slug !== "checkin") notice.value = false;
  },
);
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
        <h1
          v-pb="
            scope.node('title', 'text', {
              tokens: {
                typography: 'typography.headline',
                color: 'color.on-surface',
              },
            })
          "
        >
          打卡
        </h1>
        <div
          class="yike-tally"
          v-pb="
            scope.node('tally', 'summary', {
              tokens: { typography: 'typography.content', gap: 'spacing.xs' },
            })
          "
          aria-live="polite"
        >
          <span>今天</span
          ><strong
            v-pb="
              scope.node('done-count', 'text', {
                tokens: {
                  typography: 'typography.content',
                  color: 'color.on-surface',
                },
              })
            "
            >{{ doneCount }}</strong
          ><span>/ {{ habits.length }}</span>
          <span
            v-pb="
              scope.node('remaining', 'text', {
                tokens: {
                  typography: 'typography.caption',
                  color: 'color.on-surface-muted',
                },
              })
            "
            >{{
              !habits.length
                ? "还没有习惯"
                : doneCount === habits.length
                  ? "今天都完成了"
                  : `还剩 ${habits.length - doneCount} 个`
            }}</span
          >
        </div>
      </div>
      <button
        class="yike-icon"
        type="button"
        aria-label="新建习惯"
        @click="nav().editor()"
        v-pb="
          scope.node('create', 'button', {
            tokens: { size: 'size.touch', color: 'color.primary' },
          })
        "
      >
        <Icon name="plus" />
      </button>
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
      <Button
        v-if="store.storageIssue.value === 'corrupt'"
        label="重置数据"
        kind="quiet"
        shape="pill"
        size="lg"
        inspect-id="yike.checkin.storage-reset"
        @click="showReset = true"
      />
      <Button
        v-else
        label="重试保存"
        kind="quiet"
        shape="pill"
        size="lg"
        inspect-id="yike.checkin.storage-retry"
        @click="store.retrySave"
      />
    </p>
    <p v-if="habits.length === 0" class="yike-empty">还没有进行中的习惯</p>
    <Button
      v-if="habits.length === 0"
      label="新建习惯"
      kind="accent"
      shape="pill"
      size="lg"
      inspect-id="yike.checkin.empty-create"
      @click="nav().editor()"
    />
    <div
      v-if="habits.length"
      class="yike-week-head"
      v-pb="
        scope.node('week-head', 'text', {
          tokens: {
            typography: 'typography.caption',
            color: 'color.on-surface-muted',
            padding: 'spacing.md',
          },
        })
      "
      aria-label="本周一至周日记录，最右侧为今日打卡"
    >
      <span
        v-for="day in weekDays"
        :key="day.key"
        :class="{ 'is-today': day.isToday }"
        >{{ day.label }}</span
      >
      <span class="today-label">今天</span>
    </div>
    <TransitionGroup
      name="habit-list"
      tag="div"
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
    </TransitionGroup>
    <div class="yike-archive-entry">
      <YikeActionRows
        inspect-id="yike.checkin.archive-actions"
        :items="[
          {
            id: 'archived',
            inspectId: 'yike.checkin.archived',
            label: '已归档习惯',
            description: archived.length
              ? `${archived.length} 个习惯 · 查看与恢复`
              : '查看与恢复',
          },
        ]"
        @select="archivedOpen = true"
      />
    </div>
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
          shape="pill"
          :inspect-id="`yike.checkin.archived.${habit.id}.restore`"
          @click="
            store.archiveHabit(habit.id, false);
            store.presentation.message = `已恢复：${habit.name}`;
          "
        />
      </div>
    </BottomSheet>
    <Toast
      attach="#yike-notices"
      v-model="messageOpen"
      :message="store.presentation.message"
      inspect-id="yike.checkin.saved"
    />
    <Toast
      attach="#yike-notices"
      v-model="notice"
      :message="noticeText"
      action-label="撤销"
      inspect-id="yike.checkin.undo"
      @undo="undo"
    />
    <BottomSheet
      v-model="showReset"
      title="重置本机数据？"
      material="glass"
      inspect-id="yike.checkin.corrupt-reset"
    >
      <p>
        无法恢复本机数据。重置将清除会话、历史和用户习惯，恢复默认配置与四个预置习惯。
      </p>
      <template #actions>
        <Button
          label="取消"
          kind="quiet"
          shape="pill"
          inspect-id="yike.checkin.reset-cancel"
          @click="showReset = false"
        />
        <Button
          label="重置数据"
          kind="danger"
          shape="pill"
          inspect-id="yike.checkin.reset-confirm"
          @click="resetCorruptData"
        />
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.yike-archive-entry {
  margin-block-start: var(--pb-spacing-lg);
  padding-block-start: var(--pb-spacing-sm);
  border-block-start: var(--pb-border-hairline);
}
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
.yike-complete {
  padding: var(--pb-spacing-sm-plus);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-primary-soft);
  font: var(--pb-typography-caption);
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
  margin-block: var(--pb-spacing-xs) var(--pb-spacing-md);
  justify-content: flex-start;
  white-space: nowrap;
  gap: var(--pb-spacing-sm);
}
.yike-tally strong {
  font: var(--pb-typography-content);
}
.yike-tally small {
  font: var(--pb-typography-body-sm);
}
.yike-tally span {
  flex: none;
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
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-layout-zero);
  margin: var(--pb-layout-zero);
  list-style: none;
}
.yike-week-head {
  display: flex;
  align-items: center;
  padding-inline: var(--pb-spacing-md);
  margin-block-end: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-align: center;
}
.yike-week-head > span {
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
}
.yike-week-head .today-label {
  flex: none;
  inline-size: var(--pb-size-touch);
  margin-inline-start: var(--pb-spacing-sm);
}
.yike-week-head .is-today {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption-strong);
}
</style>

<style scoped>
.habit-list-move,
.habit-list-enter-active {
  transition:
    transform var(--pb-motion-duration-medium) var(--pb-motion-easing-standard),
    opacity var(--pb-motion-duration-medium) var(--pb-motion-easing-standard);
}
.habit-list-enter-from {
  opacity: var(--pb-opacity-hidden);
  transform: translateY(var(--pb-spacing-sm));
}
@media (prefers-reduced-motion: reduce) {
  .habit-list-move,
  .habit-list-enter-active {
    transition: none;
  }
}
</style>

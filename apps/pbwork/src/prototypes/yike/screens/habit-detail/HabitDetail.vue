<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import Button from "@/design-system/components/action/Button.vue";
import Metric from "@/design-system/components/display/Metric.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import YikeHabitYear from "../../components/YikeHabitYear.vue";
import { useYikeRuntime } from "../../runtime";
import { yikeNavigation } from "../../navigation";
import { reviewPeriod } from "../../statistics";
import { scope } from "./screen";
import "../stack.css";

const route = useRoute(),
  router = useRouter();
const { store, clock } = useYikeRuntime();
const nav = () => yikeNavigation(router, route, store);
const habit = computed(() =>
  store.data.habits.find(
    (item) => item.id === (route.query.habit ?? "habit-water"),
  ),
);
const today = computed(() => {
  void clock.value;
  return store.today();
});
const records = computed(() =>
  store.data.checkins.filter((item) => item.habitId === habit.value?.id),
);
const count = (range: "week" | "month") => {
  const { start, end } = reviewPeriod(today.value, range);
  return records.value.filter((item) => item.date >= start && item.date <= end)
    .length;
};
const deleting = ref(false);
watch(
  () => store.presentation.revision,
  () => {
    deleting.value = false;
  },
);
function archive() {
  if (!habit.value) return;
  const { id, name, archivedOn } = habit.value;
  store.archiveHabit(id, !archivedOn);
  store.presentation.message = `${archivedOn ? "已恢复" : "已归档"}：${name}`;
  void nav().home("checkin");
}
function remove() {
  if (!habit.value) return;
  const name = habit.value.name;
  store.deleteHabit(habit.value.id);
  deleting.value = false;
  store.presentation.message = `已删除：${name}`;
  void nav().home("checkin");
}
</script>
<template>
  <PrototypeShell
    title="习惯详情"
    :screen-id="scope.screenId"
    show-back
    @back="nav().back()"
  >
    <div
      :key="store.presentation.revision"
      class="yike-stack"
      v-pb="
        scope.node('root', 'page', {
          tokens: { padding: 'spacing.lg', background: 'color.background' },
        })
      "
    >
      <template v-if="habit">
        <div class="section">
          <h1
            v-pb="
              scope.node('name', 'text', {
                tokens: {
                  typography: 'typography.title-lg',
                  color: 'color.on-surface',
                },
              })
            "
          >
            {{ habit.name }}
          </h1>
          <p class="muted">
            {{ habit.frequency === "daily" ? "每天" : `每周 ${habit.target} 次`
            }}{{ habit.reminder ? ` · 提醒 ${habit.reminderTime}` : "" }}
          </p>
          <p v-if="habit.archivedOn" role="status">
            已归档 · {{ habit.archivedOn }}
          </p>
          <Button
            label="编辑习惯"
            kind="quiet"
            :inspect-id="scope.id('edit')"
            @click="nav().editor(habit.id)"
          />
        </div>
        <div class="metrics">
          <Metric
            label="本周"
            :value="count('week')"
            unit="次"
            :inspect-id="scope.id('week')"
          />
          <Metric
            label="本月"
            :value="count('month')"
            unit="次"
            :inspect-id="scope.id('month')"
          />
        </div>
        <p v-if="habit.frequency === 'weekly'" class="muted">
          本周
          {{
            count("week") >= habit.target
              ? "已达周目标，仍可继续打卡"
              : `还差 ${habit.target - count("week")} 次达成周目标`
          }}
        </p>
        <section class="section">
          <h2>最近一年</h2>
          <YikeHabitYear
            :inspect-id="scope.id('year')"
            :face="store.data.preferences.face"
            :today="today"
            :created-on="habit.createdOn"
            :days="
              records.map((item) => ({ date: item.date, completed: true }))
            "
            :archived="habit.archivedOn ? [{ from: habit.archivedOn }] : []"
          />
        </section>
        <p v-if="store.presentation.message" role="status">
          {{ store.presentation.message }}
        </p>
        <div class="actions">
          <Button
            :label="habit.archivedOn ? '恢复习惯' : '归档习惯'"
            kind="outlined"
            :inspect-id="scope.id('archive')"
            @click="archive"
          />
          <Button
            label="删除习惯"
            kind="danger"
            :inspect-id="scope.id('delete')"
            @click="deleting = true"
          />
        </div>
      </template>
      <template v-else>
        <p
          role="status"
          v-pb="
            scope.node('missing', 'text', {
              tokens: {
                typography: 'typography.content',
                color: 'color.on-surface',
              },
            })
          "
        >
          这个习惯不存在或已删除。
        </p>
        <Button
          label="返回打卡"
          :inspect-id="scope.id('return')"
          @click="nav().home('checkin')"
        />
      </template>
    </div>
    <BottomSheet
      v-model="deleting"
      title="删除这个习惯？"
      material="glass"
      :inspect-id="scope.id('delete-sheet')"
    >
      <div class="yike-decision">
        <p>「{{ habit?.name }}」及其全部打卡记录都会删除，无法恢复。</p>
        <Button
          label="取消"
          kind="quiet"
          :inspect-id="scope.id('delete-cancel')"
          @click="deleting = false"
        />
        <Button
          label="确认删除"
          kind="danger"
          :inspect-id="scope.id('delete-confirm')"
          @click="remove"
        />
      </div>
    </BottomSheet>
  </PrototypeShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import Button from "@/design-system/components/action/Button.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import YikeActionRows from "../../components/YikeActionRows.vue";
import YikeHabitYear from "../../components/YikeHabitYear.vue";
import YikeHabitGlyph from "../../components/YikeHabitGlyph.vue";
import { shiftDay } from "@/design-system/components/_shared/calendar";
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
const yearCount = computed(
  () =>
    records.value.filter(
      (item) =>
        item.date >= shiftDay(today.value, -364)! && item.date <= today.value,
    ).length,
);
const weekTarget = computed(() => {
  if (!habit.value) return 0;
  if (habit.value.frequency === "weekly") return habit.value.target;
  const start = reviewPeriod(today.value, "week").start;
  return Array.from({ length: 7 }, (_, index) =>
    shiftDay(start, index)!,
  ).filter(
    (day) =>
      day <= today.value &&
      day >= habit.value!.createdOn &&
      (!habit.value!.archivedOn || day < habit.value!.archivedOn),
  ).length;
});
const metrics = computed(() => [
  { id: "week", label: "本周", value: `${count("week")}/${weekTarget.value}` },
  { id: "month", label: "本月", value: count("month") },
  { id: "year-total", label: "最近一年", value: yearCount.value },
]);
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
    <template #app-bar
      ><AppBar
        title=""
        show-back
        back-label="打卡"
        dense
        background="transparent"
        :inspect-id="scope.id('app-bar')"
        @back="nav().back()"
        ><template #append
          ><Button
            v-if="habit"
            label="编辑"
            kind="quiet"
            :inspect-id="scope.id('edit')"
            @click="nav().editor(habit.id)" /></template></AppBar
    ></template>
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
          <div class="habit-heading">
            <span
              class="habit-glyph"
              v-pb="
                scope.node('icon', 'image', {
                  tokens: {
                    size: 'size.touch',
                    color: 'color.primary',
                    background: 'color.primary-soft',
                    radius: 'radius.control',
                  },
                })
              "
              :aria-label="`习惯图标：${habit.icon}`"
              role="img"
              ><YikeHabitGlyph :icon="habit.icon"
            /></span>
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
          </div>
          <p class="muted">
            {{ habit.frequency === "daily" ? "每天" : `每周 ${habit.target} 次`
            }}{{ habit.reminder ? ` · 提醒 ${habit.reminderTime}` : "" }}
          </p>
          <p v-if="habit.archivedOn" role="status">
            已归档 · {{ habit.archivedOn }}
          </p>
        </div>
        <dl class="habit-stats">
          <div
            v-for="metric in metrics"
            :key="metric.id"
            v-pb="
              scope.node(metric.id, 'summary', {
                tokens: { gap: 'spacing.sm' },
              })
            "
          >
            <dt
              v-pb="
                scope.node(`${metric.id}.label`, 'text', {
                  tokens: {
                    typography: 'typography.caption',
                    color: 'color.on-surface-muted',
                  },
                })
              "
            >
              {{ metric.label }}
            </dt>
            <dd>
              <strong
                v-pb="
                  scope.node(`${metric.id}.value`, 'text', {
                    tokens: {
                      typography: 'typography.numeric-title',
                      color: 'color.on-surface',
                    },
                  })
                "
                >{{ metric.value }}</strong
              ><span
                v-pb="
                  scope.node(`${metric.id}.unit`, 'text', {
                    tokens: {
                      typography: 'typography.caption',
                      color: 'color.on-surface-muted',
                    },
                  })
                "
                >{{ habit.frequency === "daily" ? "天" : "次" }}</span
              >
            </dd>
          </div>
        </dl>
        <section v-if="habit.frequency === 'weekly'" class="section">
          <h2>本周进度</h2>
          <div
            class="week-goal"
            v-pb="
              scope.node('week-goal', 'summary', {
                tokens: { gap: 'spacing.sm', color: 'color.primary' },
              })
            "
          >
            <i
              v-for="index in habit.target"
              :key="index"
              :class="{ 'is-done': index <= count('week') }"
            />
          </div>
          <p class="muted">
            本周
            {{
              count("week") >= habit.target
                ? "已达周目标，仍可继续打卡"
                : `还差 ${habit.target - count("week")} 次达成周目标`
            }}
          </p>
        </section>
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
        <YikeActionRows
          :inspect-id="scope.id('actions')"
          :items="[
            {
              id: 'archive',
              inspectId: scope.id('archive'),
              label: habit.archivedOn ? '恢复习惯' : '归档习惯',
              description: '保留记录，从打卡页隐藏',
            },
            {
              id: 'delete',
              inspectId: scope.id('delete'),
              label: '删除习惯',
              danger: true,
            },
          ]"
          @select="(id) => (id === 'archive' ? archive() : (deleting = true))"
        />
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
      </div>
      <template #actions>
        <Button
          label="取消"
          kind="secondary"
          shape="pill"
          :inspect-id="scope.id('delete-cancel')"
          @click="deleting = false"
        />
        <Button
          label="确认删除"
          kind="danger"
          shape="pill"
          :inspect-id="scope.id('delete-confirm')"
          @click="remove"
        />
      </template>
    </BottomSheet>
  </PrototypeShell>
</template>
<style scoped>
.week-goal {
  display: flex;
  gap: var(--pb-spacing-sm);
}
.week-goal i {
  inline-size: var(--pb-size-icon);
  block-size: var(--pb-size-icon);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-pill);
}
.week-goal .is-done {
  background: var(--pb-color-primary);
  border-color: var(--pb-color-primary);
}
.yike-stack {
  padding-block-start: var(--pb-spacing-sm);
}

.habit-heading {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-md);
}
.habit-glyph {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-size-touch);
  block-size: var(--pb-size-touch);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
h1 {
  overflow-wrap: anywhere;
}
.habit-stats {
  display: flex;
  gap: var(--pb-spacing-md);
  margin: var(--pb-layout-zero);
}
.habit-stats > div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.habit-stats dd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
  margin: var(--pb-layout-zero);
}
.habit-stats dt,
.habit-stats span {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.habit-stats strong {
  font: var(--pb-typography-numeric-title);
  color: var(--pb-color-on-surface);
}
</style>

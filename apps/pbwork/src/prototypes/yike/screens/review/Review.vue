<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import { useRoute } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { useClock } from "@/runtime/useClock";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import Button from "@/design-system/components/action/Button.vue";
import GlassSurface from "@/design-system/components/display/GlassSurface.vue";
import YikeWeekChart from "../../components/YikeWeekChart.vue";
import YikeMonthCalendar from "../../components/YikeMonthCalendar.vue";
import { useYikeStore } from "../../model";
import {
  durationLabel,
  reviewPeriod,
  reviewSummary,
  shiftReviewPeriod,
} from "../../statistics";
import { useYikeScroll } from "../../runtime";
import { scope } from "./screen";

const route = useRoute();
const store = useYikeStore();
const clock = useClock();
const today = computed(() => {
  void clock.value;
  return store.today();
});
const { range, anchor, selected } = toRefs(store.presentation.review);
const root = ref<HTMLElement | null>(null);
useYikeScroll(root, "review");
const period = computed(() => reviewPeriod(anchor.value, range.value));
const summary = computed(() =>
  reviewSummary(store.data, period.value.start, period.value.end),
);
const earliest = computed(
  () =>
    [
      store.data.initializedOn,
      ...store.data.focusRecords.flatMap((record) =>
        record.intervals.map((interval) => interval.date),
      ),
      ...store.data.checkins.map((item) => item.date),
    ].sort()[0] ?? today.value,
);
const canPrevious = computed(
  () => period.value.start > reviewPeriod(earliest.value, range.value).start,
);
const canNext = computed(
  () => period.value.start < reviewPeriod(today.value, range.value).start,
);
const face = computed(() =>
  (route.query.theme ?? store.data.preferences.face) === "water"
    ? "water"
    : (route.query.theme ?? store.data.preferences.face) === "sundial"
      ? "sundial"
      : "mechanical",
);
const selectedRecords = computed(() =>
  store.data.focusRecords.flatMap((record) => {
    const seconds = record.intervals
      .filter((interval) => interval.date === selected.value)
      .reduce((sum, interval) => sum + interval.durationSeconds, 0);
    return seconds > 0 ? [{ ...record, seconds }] : [];
  }),
);
const selectedHabits = computed(() =>
  store.data.checkins
    .filter((item) => item.date === selected.value)
    .map((item) => store.data.habits.find((habit) => habit.id === item.habitId))
    .filter((habit) => habit !== undefined),
);
const modeLabels = {
  pomodoro: "番茄钟",
  stopwatch: "正计时",
  countdown: "倒计时",
};
function chooseRange(value: string) {
  if (value !== "week" && value !== "month") return;
  anchor.value = selected.value || period.value.start;
  range.value = value;
  selected.value = "";
}
function move(offset: number) {
  if ((offset < 0 && !canPrevious.value) || (offset > 0 && !canNext.value))
    return;
  anchor.value = shiftReviewPeriod(period.value.start, range.value, offset);
  selected.value = "";
}
function chooseMonth(month: string) {
  const date = `${month}-01`;
  if (date > today.value || date < reviewPeriod(earliest.value, "month").start)
    return;
  anchor.value = date;
  selected.value = "";
}
</script>
<template>
  <div
    class="yike-review"
    ref="root"
    v-pb="
      scope.node('root', 'page', {
        tokens: { background: 'color.background', padding: 'spacing.lg' },
      })
    "
  >
    <header>
      <p>回顾</p>
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
        时间去了哪里
      </h1>
    </header>
    <SegmentedControl
      :model-value="range"
      :items="[
        { id: 'week', label: '周' },
        { id: 'month', label: '月' },
      ]"
      label="回顾范围"
      material="glass"
      inspect-id="yike.review.range-tabs"
      @update:model-value="chooseRange"
    />
    <div class="period">
      <Button
        label="上一期"
        kind="quiet"
        size="sm"
        :disabled="!canPrevious"
        inspect-id="yike.review.previous"
        @click="move(-1)"
      />
      <span
        v-pb="
          scope.node('period', 'text', {
            tokens: {
              typography: 'typography.caption',
              color: 'color.on-surface-muted',
            },
          })
        "
        >{{ period.start }} — {{ period.end }}</span
      >
      <Button
        label="下一期"
        kind="quiet"
        size="sm"
        :disabled="!canNext"
        inspect-id="yike.review.next"
        @click="move(1)"
      />
    </div>
    <GlassSurface inspect-id="yike.review.summary" class="summary">
      <strong
        v-pb="
          scope.node('duration', 'text', {
            tokens: {
              typography: 'typography.numeric-title',
              color: 'color.on-surface',
            },
          })
        "
        >{{ durationLabel(summary.seconds) }}</strong
      >
      <p
        v-pb="
          scope.node('counts', 'text', {
            tokens: {
              typography: 'typography.content',
              color: 'color.on-surface-muted',
            },
          })
        "
      >
        {{
          range === "week"
            ? `专注 ${summary.focusCount} 次`
            : `专注 ${summary.focusDays} 天`
        }}
        · 打卡 {{ summary.checkinCount }} 次
      </p>
    </GlassSurface>
    <YikeWeekChart
      v-if="range === 'week'"
      :face="face"
      :week-start="period.start"
      :today="today"
      :days="summary.days"
      v-model="selected"
      inspect-id="yike.review.chart"
    />
    <YikeMonthCalendar
      v-else
      :show-header="false"
      :face="face"
      :month="period.start.slice(0, 7)"
      :today="today"
      :days="summary.days"
      v-model="selected"
      inspect-id="yike.review.chart"
      @update:month="chooseMonth"
    />
    <GlassSurface
      v-if="selected"
      inspect-id="yike.review.day-detail"
      class="day-detail"
    >
      <h2>{{ selected }}</h2>
      <p v-if="!selectedRecords.length && !selectedHabits.length">
        这一天还没有记录。
      </p>
      <ul v-else>
        <li
          v-for="record in selectedRecords"
          :key="record.id"
          v-pb="
            scope.node('record', 'text', {
              key: record.id,
              tokens: {
                typography: 'typography.content',
                color: 'color.on-surface',
              },
            })
          "
        >
          {{
            new Date(record.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }}
          · {{ modeLabels[record.mode] }} · {{ durationLabel(record.seconds) }}
        </li>
        <li
          v-for="habit in selectedHabits"
          :key="habit.id"
          v-pb="
            scope.node('habit', 'text', {
              key: habit.id,
              tokens: {
                typography: 'typography.content',
                color: 'color.on-surface',
              },
            })
          "
        >
          已完成 · {{ habit.name }}
        </li>
      </ul>
    </GlassSurface>
    <p
      v-else-if="summary.seconds === 0 && summary.checkinCount === 0"
      class="empty"
    >
      这段时间还没有记录。可以从底部「专注」开始一段时间，或到「打卡」完成今天的习惯。
    </p>
    <section v-else-if="summary.seconds > 0" class="distribution">
      <h2>专注方式</h2>
      <p
        v-for="(seconds, mode) in summary.byMode"
        :key="mode"
        v-pb="
          scope.node('type', 'text', {
            key: mode,
            tokens: {
              typography: 'typography.content',
              color: 'color.on-surface-muted',
            },
          })
        "
      >
        {{ modeLabels[mode] }} · {{ durationLabel(seconds) }}
      </p>
    </section>
  </div>
</template>
<style scoped>
.yike-review {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-lg);
  padding: var(--pb-spacing-lg);
  min-block-size: var(--pb-layout-fill);
  block-size: var(--pb-layout-fill);
  overflow: auto;
  color: var(--pb-color-on-surface);
}
header p,
.period,
.empty,
.summary p,
.day-detail p,
.distribution p {
  font: var(--pb-typography-content);
  color: var(--pb-color-on-surface-muted);
}
h1 {
  font: var(--pb-typography-headline);
}
h2 {
  font: var(--pb-typography-title-sm);
}
p,
h1,
h2 {
  margin: var(--pb-layout-zero);
}
.period {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-xs);
}
.period span {
  font: var(--pb-typography-caption);
  text-align: center;
}
.summary,
.day-detail {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-surface);
}
.summary strong {
  font: var(--pb-typography-numeric-title);
}
ul {
  margin: var(--pb-layout-zero);
  padding-inline-start: var(--pb-spacing-lg);
  font: var(--pb-typography-content);
}
.distribution {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
</style>

<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { useClock } from "@/runtime/useClock";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import Button from "@/design-system/components/action/Button.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import YikeDial from "../../components/YikeDial.vue";
import { yikeNavigation } from "../../navigation";
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

const route = useRoute(),
  router = useRouter();
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
const isCurrentPeriod = computed(
  () => period.value.start === reviewPeriod(today.value, range.value).start,
);
function returnToToday() {
  anchor.value = today.value;
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
        回顾
      </h1>
    </header>
    <div class="period-controls">
      <SegmentedControl
        class="range-switch"
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
        <IconButton
          ariaLabel="上一期"
          icon="chevron-left"
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
          >{{
            range === "month"
              ? `${period.start.slice(0, 4)} 年 ${Number(period.start.slice(5, 7))} 月`
              : `${Number(period.start.slice(5, 7))}月${Number(period.start.slice(8))}日 – ${period.start.slice(0, 7) === period.end.slice(0, 7) ? "" : `${Number(period.end.slice(5, 7))}月`}${Number(period.end.slice(8))}日`
          }}</span
        >
        <IconButton
          ariaLabel="下一期"
          icon="chevron-right"
          size="sm"
          :disabled="!canNext"
          inspect-id="yike.review.next"
          @click="move(1)"
        />
      </div>
    </div>
    <div v-if="!isCurrentPeriod" class="return-current">
      <Button
        :label="range === 'week' ? '回到本周' : '回到本月'"
        kind="quiet"
        shape="pill"
        inspect-id="yike.review.today"
        @click="returnToToday"
      />
    </div>
    <dl
      class="summary"
      v-pb="
        scope.node('summary', 'summary', {
          tokens: { gap: 'spacing.md', padding: 'spacing.sm' },
        })
      "
    >
      <div>
        <dt>专注</dt>
        <strong
          v-pb="
            scope.node('duration', 'text', {
              tokens: {
                typography: 'typography.subtitle',
                color: 'color.on-surface',
              },
            })
          "
          >{{ durationLabel(summary.seconds) }}</strong
        >
      </div>
      <div
        class="summary-counts"
        v-pb="
          scope.node('counts', 'summary', {
            tokens: {
              typography: 'typography.content',
              color: 'color.on-surface-muted',
            },
          })
        "
      >
        <div>
          <dt>{{ range === "week" ? "专注次数" : "专注天数" }}</dt>
          <dd>
            {{ range === "week" ? summary.focusCount : summary.focusDays }}
            {{ range === "week" ? "次" : "天" }}
          </dd>
        </div>
        <div>
          <dt>打卡</dt>
          <dd>{{ summary.checkinCount }} 次</dd>
        </div>
      </div>
    </dl>
    <div
      v-if="range === 'week' && summary.seconds === 0"
      class="review-empty"
      v-pb="
        scope.node('chart', 'section', {
          tokens: { gap: 'spacing.md', color: 'color.on-surface-muted' },
        })
      "
    >
      <div class="empty-object">
        <YikeDial
          :face="face"
          :minutes="0"
          :total="25"
          digits=""
          caption=""
          inspect-id="yike.review.empty-object"
        />
      </div>
      <h2>
        {{ summary.checkinCount ? "习惯已经留下记录" : "这一周还没有专注记录" }}
      </h2>
      <p>
        {{
          summary.checkinCount
            ? `这段时间完成了 ${summary.checkinCount} 次打卡，专注记录会显示在这里。`
            : "完成或提前结束的专注会出现在这里；放弃的不会。"
        }}
      </p>
      <Button
        label="去专注"
        kind="accent"
        shape="pill"
        inspect-id="yike.review.go-focus"
        @click="yikeNavigation(router, route, store).tab('focus')"
      />
    </div>
    <YikeWeekChart
      v-else-if="range === 'week'"
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
    <section v-else-if="summary.seconds > 0" class="distribution">
      <h2>按类型</h2>
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
        <span>{{ modeLabels[mode] }}</span
        ><span class="type-track"
          ><i
            :style="{
              flexGrow: seconds,
              flexBasis: 'var(--pb-layout-zero)',
            }" /><i
            class="type-rest"
            :style="{
              flexGrow: summary.seconds - seconds,
              flexBasis: 'var(--pb-layout-zero)',
            }" /></span
        ><b
          >{{
            store.data.focusRecords.filter(
              (record) =>
                record.mode === mode &&
                record.intervals.some(
                  (interval) =>
                    interval.date >= period.start &&
                    interval.date <= period.end,
                ),
            ).length
          }}
          次 · {{ durationLabel(seconds) }}</b
        >
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
.return-current {
  display: flex;
  justify-content: flex-end;
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
.day-detail {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-surface);
}
.summary {
  display: flex;
  align-items: baseline;
  gap: var(--pb-spacing-md);
  padding-block: var(--pb-spacing-md);
  margin: var(--pb-layout-zero);
  border-block: var(--pb-border-hairline);
}
.summary > div {
  flex: var(--pb-layout-flex-fill);
}
.summary-counts {
  display: flex;
  gap: var(--pb-spacing-md);
  flex-basis: var(--pb-layout-half);
}
.summary-counts > div {
  flex: var(--pb-layout-flex-fill);
}
.summary dt {
  margin-block-end: var(--pb-spacing-xs);
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.summary dd {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-subtitle);
}
.summary strong {
  font: var(--pb-typography-subtitle);
}
.period-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
.range-switch {
  inline-size: calc(
    var(--pb-size-control-large) + var(--pb-size-control-large)
  );
  flex: none;
}
.review-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--pb-spacing-md);
  flex: var(--pb-layout-flex-fill);
  padding-block: var(--pb-spacing-lg);
}
.empty-object {
  inline-size: var(--pb-size-brand);
}
.review-empty p {
  font: var(--pb-typography-content);
  color: var(--pb-color-on-surface-muted);
}
.distribution p {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.distribution b {
  font: var(--pb-typography-caption);
}
.type-track {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  block-size: var(--pb-size-marker);
  border-radius: var(--pb-radius-pill);
  overflow: hidden;
}
.type-track i {
  background: var(--pb-color-primary);
}
.type-track .type-rest {
  background: var(--pb-color-surface-variant);
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

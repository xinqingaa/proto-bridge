<script setup lang="ts">
import {
  computed,
  ref,
  toRefs,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { useClock } from "@/runtime/useClock";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import YikeDial from "../../components/YikeDial.vue";
import { yikeNavigation } from "../../navigation";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import {
  parseDay,
  shiftDay,
} from "@/design-system/components/_shared/calendar";
import YikeWeekChart from "../../components/YikeWeekChart.vue";
import YikeMonthCalendar from "../../components/YikeMonthCalendar.vue";
import { useYikeStore } from "../../model";
import {
  durationLabel,
  preciseDurationLabel,
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
const { range, anchor, selected, detailOpen } = toRefs(
  store.presentation.review,
);
const root = ref<HTMLElement | null>(null);
const detailContent = ref<HTMLElement | null>(null);
watch(selected, async () => {
  await nextTick();
  // The shared sheet owns scrolling; changing dates returns its slot to the top.
  detailContent.value?.parentElement?.scrollTo({ top: 0 });
});
useYikeScroll(root, "review");
const period = computed(() => reviewPeriod(anchor.value, range.value));
const periodOffset = ref("var(--pb-layout-zero)");
watch(
  () => `${range.value}:${period.value.start}`,
  (value, previous) => {
    periodOffset.value =
      value.split(":")[0] !== previous.split(":")[0]
        ? "var(--pb-layout-zero)"
        : value > previous
          ? "var(--pb-spacing-sm)"
          : "var(--pb-layout-inset-sm-negative)";
  },
  { flush: "sync" },
);
const summary = computed(() =>
  reviewSummary(store.data, period.value.start, period.value.end),
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
  store.data.focusRecords
    .flatMap((record) => {
      const seconds = record.intervals
        .filter((interval) => interval.date === selected.value)
        .reduce((sum, interval) => sum + interval.durationSeconds, 0);
      return seconds > 0 ? [{ ...record, seconds }] : [];
    })
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt)),
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
const selectedTitle = computed(() => {
  const date = parseDay(selected.value);
  return date
    ? `${date.getUTCMonth() + 1}月${date.getUTCDate()}日 周${["日", "一", "二", "三", "四", "五", "六"][date.getUTCDay()]}`
    : "当日记录";
});
const selectedSeconds = computed(() =>
  selectedRecords.value.reduce((sum, record) => sum + record.seconds, 0),
);
const canPreviousDay = computed(() => selected.value > period.value.start);
const canNextDay = computed(
  () => selected.value < period.value.end && selected.value < today.value,
);
function chooseDay(date: string) {
  // Date components toggle their selection; a retained selection reopens its sheet.
  const target = date || selected.value;
  if (
    !parseDay(target) ||
    target < period.value.start ||
    target > period.value.end ||
    target > today.value
  )
    return;
  selected.value = target;
  detailOpen.value = true;
}
function moveDay(offset: number) {
  if (offset < 0 ? !canPreviousDay.value : !canNextDay.value) return;
  chooseDay(shiftDay(selected.value, offset)!);
}
watch(
  () => [range.value, anchor.value, route.params.screenSlug],
  () => {
    detailOpen.value = false;
  },
  { flush: "sync" },
);
function chooseRange(value: string) {
  if (value !== "week" && value !== "month") return;
  anchor.value =
    selected.value || (isCurrentPeriod.value ? today.value : anchor.value);
  range.value = value;
  selected.value = "";
}
function move(offset: number) {
  if (offset > 0 && !canNext.value) return;
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
  if (date > today.value) return;
  anchor.value = date;
  selected.value = "";
}
// Animate only intrinsic layout changes; geometry comes from the actual content.
const chartContent = ref<HTMLElement | null>(null);
const chartHeight = ref(0);
let chartObserver: ResizeObserver | undefined;
onMounted(() => {
  chartObserver = new ResizeObserver(([entry]) => {
    if (entry) chartHeight.value = entry.target.getBoundingClientRect().height;
  });
  if (chartContent.value) chartObserver.observe(chartContent.value);
});
watch(chartContent, (element, previous) => {
  if (previous) chartObserver?.unobserve(previous);
  if (element) chartObserver?.observe(element);
});
onBeforeUnmount(() => chartObserver?.disconnect());
</script>
<template>
  <div
    class="yike-review"
    :style="{ '--yike-review-offset': periodOffset }"
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
      <IconButton
        :ariaLabel="range === 'week' ? '回到本周' : '回到本月'"
        icon="calendar-current"
        variant="text"
        size="sm"
        :disabled="isCurrentPeriod"
        inspect-id="yike.review.today"
        @click="returnToToday"
      />
    </header>
    <div class="period-controls">
      <PrimaryTabs
        :viewport="false"
        :swipe="false"
        :grow="true"
        class="range-switch"
        size="sm"
        :model-value="range"
        :items="[
          { value: 'week', label: '周' },
          { value: 'month', label: '月' },
        ]"
        label="回顾范围"
        inspect-id="yike.review.range-tabs"
        @update:model-value="chooseRange"
      />
      <div class="period">
        <IconButton
          ariaLabel="上一期"
          icon="chevron-left"
          variant="text"
          size="sm"
          inspect-id="yike.review.previous"
          @click="move(-1)"
        />
        <Transition name="review-period">
          <span
            :key="`${range}-${period.start}`"
            aria-live="polite"
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
        </Transition>
        <IconButton
          ariaLabel="下一期"
          icon="chevron-right"
          variant="text"
          size="sm"
          :disabled="!canNext"
          inspect-id="yike.review.next"
          @click="move(1)"
        />
      </div>
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
      class="chart-stage"
      :style="chartHeight ? { blockSize: `${chartHeight}px` } : undefined"
    >
      <div
        ref="chartContent"
        :key="`${range}-${period.start}`"
        class="chart-content"
      >
        <div
          v-if="
            range === 'week' &&
            summary.seconds === 0 &&
            summary.checkinCount === 0
          "
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
              :fraction="0"
              digits=""
              caption=""
              inspect-id="yike.review.empty-object"
            />
          </div>
          <h2>
            {{
              summary.checkinCount ? "习惯已经留下记录" : "这一周还没有专注记录"
            }}
          </h2>
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
          :model-value="selected"
          @update:model-value="chooseDay"
          inspect-id="yike.review.chart"
        />
        <YikeMonthCalendar
          v-else
          :show-header="false"
          :face="face"
          :month="period.start.slice(0, 7)"
          :today="today"
          :days="summary.days"
          :model-value="selected"
          @update:model-value="chooseDay"
          inspect-id="yike.review.chart"
          @update:month="chooseMonth"
        />
        <p
          v-if="
            range === 'month' &&
            summary.seconds === 0 &&
            summary.checkinCount === 0
          "
          class="empty-month"
          role="status"
          v-pb="
            scope.node('empty-month', 'text', {
              tokens: {
                typography: 'typography.caption',
                color: 'color.on-surface-muted',
              },
            })
          "
        >
          这个月还没有记录
        </p>
      </div>
    </div>
    <section v-if="summary.seconds > 0" class="distribution">
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
        <span class="type-label">{{ modeLabels[mode] }}</span
        ><b
          v-pb="
            scope.node('type-value', 'text', {
              key: mode,
              tokens: {
                typography: 'typography.caption',
                color: 'color.on-surface-muted',
              },
            })
          "
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
        <span
          class="type-track"
          role="progressbar"
          :aria-label="modeLabels[mode]"
          :aria-valuenow="seconds"
          :aria-valuemin="0"
          :aria-valuemax="summary.seconds"
          v-pb="
            scope.node('type-track', 'chart', {
              key: mode,
              tokens: {
                color: 'color.primary',
                background: 'color.surface-variant',
                size: 'size.marker',
                radius: 'radius.pill',
              },
            })
          "
          ><i
            :style="{
              flexGrow: seconds,
              flexBasis: 'var(--pb-layout-zero)',
            }" /><i
            class="type-rest"
            :style="{
              flexGrow: summary.seconds - seconds,
              flexBasis: 'var(--pb-layout-zero)',
            }"
        /></span>
      </p>
    </section>
    <BottomSheet
      v-model="detailOpen"
      :title="range === 'week' ? '本周' : '本月'"
      material="glass"
      detent="medium"
      inspect-id="yike.review.day-detail"
    >
      <div
        ref="detailContent"
        class="day-browser"
        v-pb="
          scope.node('day-browser', 'section', {
            tokens: { gap: 'spacing.sm' },
          })
        "
      >
        <div class="day-heading" aria-live="polite" aria-atomic="true">
          <h3
            v-pb="
              scope.node('day-title', 'text', {
                tokens: {
                  typography: 'typography.subtitle',
                  color: 'color.on-surface',
                },
              })
            "
          >
            {{ selectedTitle }}
          </h3>
          <span
            v-pb="
              scope.node('day-total', 'text', {
                tokens: {
                  typography: 'typography.caption',
                  color: 'color.on-surface-muted',
                },
              })
            "
            >{{ preciseDurationLabel(selectedSeconds) }}</span
          >
        </div>
        <div
          :key="selected"
          class="day-records"
          aria-label="当日专注与打卡记录"
          v-pb="
            scope.node('day-records', 'section', {
              tokens: { typography: 'typography.content' },
            })
          "
        >
          <p
            v-if="!selectedRecords.length && !selectedHabits.length"
            class="day-empty"
            role="status"
            v-pb="
              scope.node('day-empty', 'text', {
                tokens: {
                  typography: 'typography.content',
                  color: 'color.on-surface-muted',
                },
              })
            "
          >
            这一天还没有记录
          </p>
          <ul
            v-if="selectedRecords.length"
            class="day-focus-records"
            aria-label="专注记录"
          >
            <li
              v-for="record in selectedRecords"
              :key="record.id"
              v-pb="
                scope.node('record', 'text', {
                  key: record.id,
                  tokens: {
                    typography: 'typography.content',
                    color: 'color.on-surface',
                    padding: 'spacing.sm',
                    border: 'border.hairline',
                  },
                })
              "
            >
              <time class="record-time">{{
                new Date(record.startedAt).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                })
              }}</time>
              <span class="record-mode">{{ modeLabels[record.mode] }}</span>
              <strong>{{ preciseDurationLabel(record.seconds) }}</strong>
            </li>
          </ul>
          <p
            v-if="selectedHabits.length"
            class="day-habits"
            v-pb="
              scope.node('day-habits', 'text', {
                tokens: {
                  typography: 'typography.content',
                  color: 'color.on-surface-muted',
                  padding: 'spacing.sm',
                },
              })
            "
          >
            打卡：<span
              v-for="(habit, index) in selectedHabits"
              :key="habit.id"
              v-pb="
                scope.node('habit', 'text', {
                  key: habit.id,
                  tokens: {
                    typography: 'typography.content',
                    color: 'color.on-surface-muted',
                  },
                })
              "
              >{{ index ? "、" : "" }}{{ habit.name }}</span
            >
          </p>
        </div>
      </div>
      <template #actions>
        <Button
          label="前一天"
          kind="quiet"
          :disabled="!canPreviousDay"
          inspect-id="yike.review.day-previous"
          @click="moveDay(-1)"
          ><template #prepend
            ><Icon
              name="chevron-left"
              size="sm"
              inspect-id="yike.review.day-previous-symbol" /></template
        ></Button>
        <Button
          label="后一天"
          kind="quiet"
          :disabled="!canNextDay"
          inspect-id="yike.review.day-next"
          @click="moveDay(1)"
          ><template #append
            ><Icon
              name="chevron-right"
              size="sm"
              inspect-id="yike.review.day-next-symbol" /></template
        ></Button>
      </template>
    </BottomSheet>
  </div>
</template>
<style scoped>
.yike-review {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
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
  align-items: baseline;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--pb-spacing-xs);
}
.distribution b {
  font: var(--pb-typography-caption);
}
.type-track {
  display: flex;
  flex: none;
  inline-size: var(--pb-layout-fill);
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
.distribution {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
}
.day-browser {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.day-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.day-heading h3 {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-subtitle);
}
.day-heading > span {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.day-records {
  background: transparent;
}
.day-focus-records {
  list-style: none;
  margin: var(--pb-layout-zero);
  padding: var(--pb-layout-zero);
}
.day-focus-records li {
  display: flex;
  align-items: baseline;
  gap: var(--pb-spacing-sm-plus);
  padding-block: var(--pb-spacing-sm);
  border-block-start: var(--pb-border-hairline);
  font: var(--pb-typography-content);
}
.record-time {
  flex: none;
  min-inline-size: var(--pb-size-control-large);
  color: var(--pb-color-on-surface-muted);
  font-variant-numeric: tabular-nums;
}
.record-mode {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  white-space: nowrap;
}
.day-focus-records strong {
  font: var(--pb-typography-label);
  text-align: end;
  font-variant-numeric: tabular-nums;
}
.day-habits {
  padding-block: var(--pb-spacing-sm-plus);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
.day-empty {
  padding-block: var(--pb-spacing-lg);
  color: var(--pb-color-on-surface-muted);
  text-align: center;
}
</style>

<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.period {
  min-inline-size: var(--pb-layout-zero);
  flex: var(--pb-layout-flex-fill);
  gap: var(--pb-layout-zero);
}
.period span {
  flex: var(--pb-layout-flex-fill);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.chart-stage {
  flex: none;
  overflow: hidden;
  transition: block-size var(--pb-motion-duration-medium)
    var(--pb-motion-easing-standard);
}
.empty-month {
  margin-block-start: var(--pb-spacing-sm);
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  text-align: center;
}
.chart-content {
  display: flow-root;
  animation: review-appear var(--pb-motion-duration-medium)
    var(--pb-motion-easing-standard);
}
@keyframes review-appear {
  from {
    opacity: var(--pb-opacity-hidden);
    transform: translateX(var(--yike-review-offset));
  }
  to {
    opacity: var(--pb-opacity-visible);
    transform: none;
  }
}
.period {
  position: relative;
}
.review-period-enter-active,
.review-period-leave-active {
  transition:
    opacity var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.review-period-leave-active {
  position: absolute;
  inset-inline: var(--pb-size-touch);
  pointer-events: none;
}
.review-period-enter-from {
  opacity: var(--pb-opacity-hidden);
  transform: translateX(var(--yike-review-offset));
}
.review-period-leave-to {
  opacity: var(--pb-opacity-hidden);
  transform: translateX(
    calc(var(--pb-layout-zero) - var(--yike-review-offset))
  );
}
.distribution b {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
  .review-period-enter-active,
  .review-period-leave-active,
  .chart-stage {
    transition: none;
  }
  .chart-content {
    animation: none;
  }
}
</style>

<style scoped>
.type-label {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.day-heading h3 {
  font: var(--pb-typography-label);
}
.day-heading > span {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
</style>

<style scoped>
.day-focus-records li {
  align-items: center;
}
.day-focus-records strong {
  white-space: nowrap;
}
</style>

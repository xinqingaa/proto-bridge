<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import {
  HENGDONG_TODAY,
  activeDayCount,
  addIsoDays,
  datesInRange,
  progressRange,
  recordsInRange,
  shiftProgressAnchor,
  totalMinutes,
  type ActivityType,
  type DateRange,
  type FitnessGoals,
  type ProgressPeriod,
  type WorkoutRecord,
} from "../model";
import ProgressDateView from "./ProgressDateView.vue";
import ProgressRhythm from "./ProgressRhythm.vue";

const props = defineProps<{
  period: ProgressPeriod;
  anchor: string;
  customRange: DateRange;
  records: WorkoutRecord[];
  filter: "全部" | ActivityType;
  goals: FitnessGoals;
  selectedKey: string;
  refreshing?: boolean;
  empty?: boolean;
}>();

const emit = defineEmits<{
  navigate: [amount: -1 | 1];
  select: [key: string];
  open: [recordId: string];
  refresh: [];
}>();

type RhythmItem = {
  id: string;
  label: string;
  start: string;
  end: string;
  minutes: number;
  recordCount: number;
};

const range = computed(() =>
  progressRange(props.period, props.anchor, props.customRange),
);
const sourceRecords = computed(() => (props.empty ? [] : props.records));
const periodRecords = computed(() =>
  recordsInRange(sourceRecords.value, range.value).filter(
    (record) => props.filter === "全部" || record.activityType === props.filter,
  ),
);

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function nextMonth(value: string) {
  const date = new Date(`${monthStart(value)}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return date.toISOString().slice(0, 10);
}

function monthEnd(value: string) {
  return addIsoDays(nextMonth(value), -1);
}

function recordsFor(start: string, end: string) {
  return periodRecords.value.filter(
    (record) => record.date >= start && record.date <= end,
  );
}

function makeItem(id: string, label: string, start: string, end: string): RhythmItem {
  const records = recordsFor(start, end);
  return {
    id,
    label,
    start,
    end,
    minutes: totalMinutes(records),
    recordCount: records.length,
  };
}

const rhythmItems = computed<RhythmItem[]>(() => {
  if (props.period === "week") {
    return datesInRange(range.value).map((date, index) =>
      makeItem(
        `date:${date}`,
        ["一", "二", "三", "四", "五", "六", "日"][index] ?? String(index + 1),
        date,
        date,
      ),
    );
  }

  if (props.period === "month") {
    const items: RhythmItem[] = [];
    let start = range.value.start;
    let index = 1;
    while (start <= range.value.end) {
      const end = [addIsoDays(start, 6), range.value.end].sort()[0]!;
      items.push(makeItem(`range:${start}:${end}`, `第 ${index} 周`, start, end));
      start = addIsoDays(end, 1);
      index += 1;
    }
    return items;
  }

  if (props.period === "year") {
    const items: RhythmItem[] = [];
    let start = range.value.start;
    while (start <= range.value.end) {
      const end = [monthEnd(start), range.value.end].sort()[0]!;
      const month = start.slice(0, 7);
      items.push(makeItem(`month:${month}`, `${Number(month.slice(5))} 月`, start, end));
      start = nextMonth(start);
    }
    return items;
  }

  const dates = datesInRange(range.value);
  if (dates.length <= 14) {
    return dates.map((date) =>
      makeItem(`date:${date}`, `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`, date, date),
    );
  }
  if (dates.length <= 90) {
    const items: RhythmItem[] = [];
    let start = range.value.start;
    let index = 1;
    while (start <= range.value.end) {
      const end = [addIsoDays(start, 6), range.value.end].sort()[0]!;
      items.push(makeItem(`range:${start}:${end}`, `${index} 周`, start, end));
      start = addIsoDays(end, 1);
      index += 1;
    }
    return items;
  }
  const items: RhythmItem[] = [];
  let start = monthStart(range.value.start);
  while (start <= range.value.end) {
    const itemStart = [start, range.value.start].sort()[1]!;
    const itemEnd = [monthEnd(start), range.value.end].sort()[0]!;
    const month = start.slice(0, 7);
    items.push(makeItem(`month:${month}`, `${Number(month.slice(5))} 月`, itemStart, itemEnd));
    start = nextMonth(start);
  }
  return items;
});

function recordsForFocus(key: string | undefined) {
  if (!key) return periodRecords.value;
  if (key.startsWith("date:")) {
    const date = key.slice(5);
    return periodRecords.value.filter((record) => record.date === date);
  }
  if (key.startsWith("month:")) {
    const month = key.slice(6);
    return periodRecords.value.filter((record) => record.date.startsWith(month));
  }
  if (key.startsWith("range:")) {
    const [, start, end] = key.split(":");
    return start && end ? recordsFor(start, end) : periodRecords.value;
  }
  return periodRecords.value;
}

const focusedRecords = computed(() =>
  [...recordsForFocus(props.selectedKey)]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 3),
);
const activityDays = computed(() => activeDayCount(periodRecords.value));
const minutes = computed(() => totalMinutes(periodRecords.value));
const canMoveNext = computed(() => {
  if (props.period === "custom") return false;
  const nextAnchor = shiftProgressAnchor(props.period, props.anchor, 1);
  return progressRange(props.period, nextAnchor).start <= HENGDONG_TODAY;
});
const rangeLabel = computed(() => {
  const { start, end } = range.value;
  if (props.period === "year") return `${start.slice(0, 4)} 年`;
  if (props.period === "month") {
    return `${start.slice(0, 4)} 年 ${Number(start.slice(5, 7))} 月`;
  }
  if (props.period === "week" && start.slice(0, 7) === end.slice(0, 7)) {
    return `${Number(start.slice(5, 7))} 月 ${Number(start.slice(8))}—${Number(end.slice(8))} 日`;
  }
  return `${start.replaceAll("-", ".")}—${end.replaceAll("-", ".")}`;
});
const focusLabel = computed(() => {
  const key = props.selectedKey;
  if (!key) return "当前周期最近记录";
  if (key.startsWith("date:")) {
    const date = key.slice(5);
    return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8))} 日`;
  }
  if (key.startsWith("month:")) return `${Number(key.slice(-2))} 月活动`;
  return rhythmItems.value.find((item) => item.id === key)?.label ?? "当前时间焦点";
});
const conclusion = computed(() => {
  if (!periodRecords.value.length) return "这段时间还没有活动事实，节奏会从下一次记录开始形成。";
  if (activityDays.value === 1) return "已经留下 1 个活动日，不需要为了连续而临时补量。";
  return `活动分布在 ${activityDays.value} 天，先看节奏是否适合继续保持。`;
});

function select(key: string) {
  emit("select", props.selectedKey === key ? "" : key);
}
</script>

<template>
  <ScrollableDataList
    class="progress-panel-scroll"
    :pull-refresh="periodRecords.length > 0"
    :load-more="false"
    :refreshing="refreshing ?? false"
    :inspect-id="`hengdong.progress.scroll-list.${period}`"
    @refresh="$emit('refresh')"
  >
    <div class="hd-content progress-panel-content">
      <div
        class="progress-range"
        :data-pb-id="`hengdong.progress.range.${period}`"
        data-pb-role="toolbar"
        data-pb-token-spacing="spacing.sm"
      >
        <Button
          v-if="period !== 'custom'"
          label="上一周期"
          size="sm"
          kind="outlined"
          :inspect-id="`hengdong.progress.previous.${period}`"
          @click="$emit('navigate', -1)"
        >
          <ChevronLeft aria-hidden="true" />
          <span class="progress-visually-hidden">上一周期</span>
        </Button>
        <div class="progress-range-copy">
          <span class="hd-overline">{{ period === 'custom' ? '自定义范围' : '当前周期' }}</span>
          <strong>{{ rangeLabel }}</strong>
        </div>
        <Button
          v-if="period !== 'custom'"
          label="下一周期"
          size="sm"
          kind="outlined"
          :disabled="!canMoveNext"
          :inspect-id="`hengdong.progress.next.${period}`"
          @click="$emit('navigate', 1)"
        >
          <span class="progress-visually-hidden">下一周期</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <header
        class="progress-summary"
        data-pb-id="hengdong.progress.summary"
        :data-pb-key="period"
        data-pb-role="summary"
        data-pb-token-color="color.on-surface"
        data-pb-token-spacing="spacing.md"
      >
        <span class="hd-overline">{{ filter === '全部' ? '全部活动' : filter }}</span>
        <h1 class="hd-display">{{ periodRecords.length }} 次活动</h1>
        <p class="hd-muted">{{ conclusion }}</p>
      </header>

      <div class="hd-statline" :data-pb-key="period">
        <div class="hd-stat"><strong>{{ minutes }}</strong><span>累计分钟</span></div>
        <div class="hd-stat"><strong>{{ activityDays }}</strong><span>活动天数</span></div>
        <div class="hd-stat"><strong>{{ periodRecords.length }}</strong><span>活动次数</span></div>
      </div>

      <div v-if="period === 'week'" class="progress-goal">
        <span>本周目标</span>
        <strong>{{ Math.min(periodRecords.length, goals.weeklySessions) }} / {{ goals.weeklySessions }}</strong>
      </div>

      <ProgressRhythm
        :items="rhythmItems"
        :selected-key="selectedKey"
        :inspect-id="`hengdong.progress.rhythm.${period}`"
        :ariaLabel="`${rangeLabel}活动节奏`"
        @select="select"
      />

      <Divider :inspect-id="`hengdong.progress.divider.date.${period}`" />

      <section class="hd-section">
        <div class="hd-section-heading">
          <div class="hd-row-main">
            <h2 class="hd-section-title">日期视图</h2>
            <span class="hd-caption">{{ selectedKey ? '已聚焦一个时间片' : '选择日期或月份查看事实' }}</span>
          </div>
          <Button
            v-if="selectedKey"
            label="清除"
            size="sm"
            kind="outlined"
            :inspect-id="`hengdong.progress.clear-focus.${period}`"
            @click="select('')"
          />
        </div>
        <ProgressDateView
          :period="period"
          :range="range"
          :records="periodRecords"
          :selected-key="selectedKey"
          :inspect-id="`hengdong.progress.date-view.${period}`"
          @select="select"
        />
      </section>

      <Divider :inspect-id="`hengdong.progress.divider.records.${period}`" />

      <section class="hd-section">
        <div class="hd-section-heading">
          <div class="hd-row-main">
            <h2 class="hd-section-title">{{ focusLabel }}</h2>
            <span class="hd-caption">{{ focusedRecords.length }} 条匹配记录</span>
          </div>
        </div>
        <DataList
          v-if="focusedRecords.length"
          surface="none"
          rounded="none"
          :inspect-id="`hengdong.progress.record-list.${period}`"
        >
          <button
            v-for="record in focusedRecords"
            :key="record.id"
            type="button"
            class="hd-row hd-row-action"
            data-pb-id="hengdong.progress.record-row"
            :data-pb-key="`${period}-${record.id}`"
            data-pb-role="list-item"
            data-pb-token-spacing="spacing.md"
            data-pb-action="open-record"
            @click="$emit('open', record.id)"
          >
            <span class="hd-row-main">
              <strong class="hd-row-title">{{ record.title }}</strong>
              <span class="hd-caption">{{ record.date }} · {{ record.activityType }}</span>
            </span>
            <strong class="progress-record-duration">{{ record.minutes }} 分钟</strong>
            <Icon name="chevron-right" size="sm" tone="muted" />
          </button>
        </DataList>
        <EmptyState
          v-else
          title="这个时间焦点还没有记录"
          description="保留当前周期和筛选，下一次活动会自然出现在这里。"
          :inspect-id="`hengdong.progress.empty.${period}`"
        />
      </section>
    </div>
  </ScrollableDataList>
</template>

<style scoped>
.progress-panel-scroll {
  height: var(--pb-layout-fill);
}

.progress-panel-content {
  padding-top: var(--pb-spacing-sm);
}

.progress-range,
.progress-range-copy,
.progress-summary,
.progress-goal {
  display: flex;
}

.progress-range {
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}

.progress-range-copy,
.progress-summary {
  min-width: var(--pb-spacing-none);
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
  text-align: center;
}

.progress-range-copy strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}

.progress-summary {
  align-items: flex-start;
  text-align: left;
}

.progress-summary h1,
.progress-summary p {
  margin: var(--pb-spacing-none);
}

.progress-goal {
  align-items: center;
  justify-content: space-between;
  padding: var(--pb-spacing-sm) var(--pb-spacing-md);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}

.progress-goal strong,
.progress-record-duration {
  flex: none;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}

.progress-visually-hidden {
  position: absolute;
  width: var(--pb-spacing-none);
  height: var(--pb-spacing-none);
  overflow: hidden;
}
</style>

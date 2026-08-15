<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import type { PbIconName } from "@/design-system/components/_shared/icons";
import type { ActivityType, WorkoutRecord } from "../model";

const props = defineProps<{
  records: WorkoutRecord[];
  visibleCount: number;
  tabKey: string;
  tabLabel: string;
  refreshing?: boolean;
  loadingMore?: boolean;
  inspectId: string;
}>();

defineEmits<{
  refresh: [];
  loadMore: [];
  open: [recordId: string];
}>();

const activityIcons: Record<ActivityType, PbIconName> = {
  训练: "dumbbell",
  步行: "footprints",
  拉伸: "person-standing",
  自由活动: "sparkles",
};

const sortedRecords = computed(() =>
  [...props.records].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  ),
);
const visibleRecords = computed(() =>
  sortedRecords.value.slice(0, props.visibleCount),
);
const hasMore = computed(
  () => visibleRecords.value.length < sortedRecords.value.length,
);

const monthGroups = computed(() => {
  const months = new Map<
    string,
    Map<string, { date: string; records: WorkoutRecord[] }>
  >();
  for (const record of visibleRecords.value) {
    const month = record.date.slice(0, 7);
    const dates = months.get(month) ?? new Map();
    const dateGroup = dates.get(record.date) ?? { date: record.date, records: [] };
    dateGroup.records.push(record);
    dates.set(record.date, dateGroup);
    months.set(month, dates);
  }
  return Array.from(months, ([month, dates]) => ({
    month,
    dates: Array.from(dates.values()),
  }));
});

function monthLabel(month: string) {
  const [year, value] = month.split("-");
  return `${year} 年 ${Number(value)} 月`;
}

function dayLabel(date: string) {
  return String(Number(date.slice(-2)));
}

function weekdayLabel(date: string) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `周${["日", "一", "二", "三", "四", "五", "六"][weekday]}`;
}
</script>

<template>
  <ScrollableDataList
    class="history-scroll"
    :pull-refresh="records.length > 0"
    :load-more="records.length > 0"
    :refreshing="refreshing ?? false"
    :loading-more="loadingMore ?? false"
    :has-more="hasMore"
    :inspect-id="inspectId"
    @refresh="$emit('refresh')"
    @load-more="$emit('loadMore')"
  >
    <div
      v-if="visibleRecords.length"
      class="history-content"
      data-pb-id="hengdong.activity-history.timeline"
      :data-pb-key="tabKey"
      data-pb-role="list"
      data-pb-token-spacing="spacing.lg"
    >
      <section
        v-for="month in monthGroups"
        :key="month.month"
        class="history-month"
        data-pb-id="hengdong.activity-history.month"
        :data-pb-key="`${tabKey}-${month.month}`"
        data-pb-role="section"
        data-pb-token-spacing="spacing.md"
      >
        <h2
          class="history-month-title"
          data-pb-id="hengdong.activity-history.month-title"
          :data-pb-key="`${tabKey}-${month.month}`"
          data-pb-role="text"
          data-pb-token-typography="typography.subtitle"
          data-pb-token-color="color.on-surface"
        >
          {{ monthLabel(month.month) }}
        </h2>

        <div
          v-for="date in month.dates"
          :key="date.date"
          class="history-date-group"
          data-pb-id="hengdong.activity-history.date-group"
          :data-pb-key="`${tabKey}-${date.date}`"
          data-pb-role="section"
          data-pb-token-spacing="spacing.md"
        >
          <div class="history-date" aria-hidden="true">
            <strong>{{ dayLabel(date.date) }}</strong>
            <span>{{ weekdayLabel(date.date) }}</span>
          </div>

          <DataList
            class="history-day-list"
            surface="none"
            rounded="none"
            :inspect-id="`${inspectId}.date.${date.date}`"
          >
            <button
              v-for="record in date.records"
              :key="record.id"
              type="button"
              class="history-record"
              data-pb-id="hengdong.activity-history.record-row"
              :data-pb-key="`${tabKey}-${record.id}`"
              data-pb-role="list-item"
              data-pb-token-spacing="spacing.md"
              data-pb-action="open-record"
              @click="$emit('open', record.id)"
            >
              <span class="history-record-icon">
                <Icon
                  :name="activityIcons[record.activityType]"
                  size="sm"
                  tone="primary"
                  :inspect-id="`${inspectId}.icon.${record.id}`"
                />
              </span>
              <span class="history-record-copy">
                <strong>{{ record.title }}</strong>
                <span>{{ record.activityType }} · 体感{{ record.feeling }}</span>
              </span>
              <strong class="history-record-duration">{{ record.minutes }} 分钟</strong>
              <Icon name="chevron-right" size="sm" tone="muted" />
            </button>
          </DataList>
        </div>
      </section>
    </div>

    <EmptyState
      v-else
      :title="tabKey === 'all' ? '还没有活动记录' : `还没有${tabLabel}记录`"
      :description="
        tabKey === 'all'
          ? '完成训练或记录一次活动后，会按日期出现在这里。'
          : `切换到其他分类，或者继续按自己的节奏记录${tabLabel}。`
      "
      :inspect-id="`${inspectId}.empty`"
    />
  </ScrollableDataList>
</template>

<style scoped>
.history-scroll {
  height: var(--pb-layout-fill);
}

.history-content,
.history-month {
  display: flex;
  flex-direction: column;
}

.history-content {
  gap: var(--pb-spacing-xl);
  padding: var(--pb-spacing-lg);
}

.history-month {
  gap: var(--pb-spacing-md);
}

.history-month-title {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}

.history-date-group {
  display: flex;
  align-items: flex-start;
  gap: var(--pb-spacing-md);
}

.history-date {
  display: flex;
  flex: none;
  min-width: var(--pb-sizing-avatar-lg);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xxs);
  padding-top: var(--pb-spacing-md);
  color: var(--pb-color-on-surface-muted);
}

.history-date strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-title-lg);
}

.history-date span {
  font: var(--pb-typography-caption);
}

.history-day-list,
.history-record-copy {
  min-width: var(--pb-spacing-none);
}

.history-day-list {
  flex: var(--pb-layout-flex-fill);
}

.history-record {
  display: flex;
  width: var(--pb-layout-fill);
  min-height: var(--pb-sizing-menu-item);
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md) var(--pb-spacing-none);
  border: none;
  background: transparent;
  color: var(--pb-color-on-surface);
  text-align: left;
}

.history-record:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}

.history-record-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--pb-sizing-avatar-sm);
  height: var(--pb-sizing-avatar-sm);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft);
}

.history-record-copy {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}

.history-record-copy strong,
.history-record-duration {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}

.history-record-copy span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}

.history-record-duration {
  flex: none;
}
</style>

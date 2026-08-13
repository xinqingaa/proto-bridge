<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import HengdongRoot from "../HengdongRoot.vue";
import StreakCalendar from "../components/StreakCalendar.vue";
import WeeklyActivityBars from "../components/WeeklyActivityBars.vue";
import {
  HENGDONG_TODAY,
  HENGDONG_WEEK_DATES,
  recordsInMonth,
  recordsInWeek,
  totalMinutes,
  type ActivityType,
  type WorkoutRecord,
} from "../model";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import {
  hengdongState,
  removeRecord,
  restoreRecord,
  updateHengdongUi,
} from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const selectedDate = ref("");
const removedRecord = ref<WorkoutRecord | null>(null);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const period = computed({
  get: () => hengdongState.ui.progressPeriod,
  set: (value: "week" | "month") => {
    selectedDate.value = "";
    updateHengdongUi({ progressPeriod: value });
  },
});
const filter = computed({
  get: () => hengdongState.ui.progressFilter,
  set: (value: string) => updateHengdongUi({ progressFilter: value }),
});
const filterOpen = computed({
  get: () => variant.value === "filter-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "filter-open" : "default"),
});
const recordSheetOpen = computed({
  get: () =>
    variant.value === "record-detail-open" ||
    variant.value === "delete-confirm-open",
  set: (open) => {
    if (!open) void replaceVariant(router, route, "default", { record: "" });
  },
});
const deleteOpen = computed({
  get: () => variant.value === "delete-confirm-open",
  set: (open) =>
    void replaceVariant(
      router,
      route,
      open ? "delete-confirm-open" : "record-detail-open",
    ),
});
const rangeRecords = computed(() => {
  if (variant.value === "empty") return [];
  return period.value === "week"
    ? recordsInWeek(hengdongState.records)
    : recordsInMonth(hengdongState.records);
});
const visibleRecords = computed(() =>
  rangeRecords.value.filter(
    (record) =>
      (!selectedDate.value || record.date === selectedDate.value) &&
      (filter.value === "全部" || record.activityType === filter.value),
  ),
);
const selectedRecord = computed(() => {
  const recordId =
    typeof route.query.record === "string" ? route.query.record : "";
  return (
    hengdongState.records.find((record) => record.id === recordId) ??
    visibleRecords.value[0] ??
    null
  );
});
const total = computed(() => totalMinutes(rangeRecords.value));
const average = computed(() =>
  rangeRecords.value.length
    ? Math.round(total.value / rangeRecords.value.length)
    : 0,
);
const chartItems = computed(() => {
  if (period.value === "week") {
    return HENGDONG_WEEK_DATES.map((date, index) => ({
      id: date,
      label: ["一", "二", "三", "四", "五", "六", "日"][index]!,
      minutes: hengdongState.records
        .filter((record) => record.date === date)
        .reduce((sum, record) => sum + record.minutes, 0),
    }));
  }
  return [
    ["week-1", "1 周", 1, 7],
    ["week-2", "2 周", 8, 14],
    ["week-3", "3 周", 15, 21],
    ["week-4", "4 周", 22, 28],
    ["week-5", "5 周", 29, 31],
  ].map(([id, label, start, end]) => ({
    id: String(id),
    label: String(label),
    minutes: hengdongState.records
      .filter((record) => {
        const day = Number(record.date.slice(-2));
        return day >= Number(start) && day <= Number(end);
      })
      .reduce((sum, record) => sum + record.minutes, 0),
  }));
});

function dayState(date: string) {
  if (!date) return "blank" as const;
  if (date > HENGDONG_TODAY) return "future" as const;
  if (date === HENGDONG_TODAY) return "today" as const;
  return hengdongState.records.some((record) => record.date === date)
    ? ("done" as const)
    : ("idle" as const);
}

function day(date: string, label: string) {
  return { id: date || `blank-${label}`, label, state: dayState(date) };
}

const calendarWeeks = computed(() => {
  if (period.value === "week") {
    return [
      HENGDONG_WEEK_DATES.map((date) =>
        day(date, String(Number(date.slice(-2)))),
      ),
    ];
  }
  const weeks: Array<Array<ReturnType<typeof day>>> = [];
  const cells = [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `blank-start-${index}`,
      label: "",
      state: "blank" as const,
    })),
    ...Array.from({ length: 31 }, (_, index) => {
      const value = index + 1;
      return day(`2026-08-${String(value).padStart(2, "0")}`, String(value));
    }),
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `blank-end-${index}`,
      label: "",
      state: "blank" as const,
    })),
  ];
  while (cells.length) weeks.push(cells.splice(0, 7));
  return weeks;
});

function selectDate(date: string) {
  if (date.startsWith("blank-")) return;
  selectedDate.value = selectedDate.value === date ? "" : date;
}

function openRecord(recordId: string) {
  void replaceVariant(router, route, "record-detail-open", {
    record: recordId,
  });
}

function confirmDelete() {
  if (!selectedRecord.value) return;
  removedRecord.value = removeRecord(selectedRecord.value.id);
  void replaceVariant(router, route, "default", { record: "" });
  toast.value = true;
}

function undoDelete() {
  if (!removedRecord.value) return;
  restoreRecord(removedRecord.value);
  removedRecord.value = null;
  toast.value = false;
}
</script>

<template>
  <HengdongRoot active="progress" screen-id="hengdong.progress">
    <section
      class="hd-page"
      data-pb-id="hengdong.progress.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <AppBar
        title="进度"
        dense
        :show-action="true"
        action-icon="more"
        action-label="筛选活动"
        inspect-id="hengdong.progress.app-bar"
        @action="filterOpen = true"
      />
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.progress.scroll-list"
      >
        <div class="hd-content">
          <div
            class="hd-period period-segment"
            data-no-swipe
            data-pb-id="hengdong.progress.period"
            data-pb-role="filter"
            data-pb-token-background="color.surface-recessed"
            data-pb-token-radius="radius.md"
            data-pb-token-spacing="spacing.xs"
          >
            <button
              type="button"
              :class="{ 'is-active': period === 'week' }"
              @click="period = 'week'"
            >
              本周
            </button>
            <button
              type="button"
              :class="{ 'is-active': period === 'month' }"
              @click="period = 'month'"
            >
              本月
            </button>
          </div>

          <header
            data-pb-id="hengdong.progress.summary"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-spacing="spacing.md"
          >
            <span class="hd-overline">{{
              period === "week" ? "8 月 10—16 日" : "2026 年 8 月"
            }}</span>
            <h1 class="hd-display">{{ rangeRecords.length }} 次活动</h1>
            <p class="hd-muted">
              {{
                rangeRecords.length
                  ? `累计 ${total} 分钟，比完全没动更进一步。`
                  : "这个范围还没有活动记录。"
              }}
            </p>
          </header>

          <div class="hd-statline">
            <div class="hd-stat">
              <strong>{{ total }}</strong
              ><span>累计分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{ average }}</strong
              ><span>平均分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{
                rangeRecords.filter((record) => record.feeling !== "吃力")
                  .length
              }}</strong
              ><span>体感稳定</span>
            </div>
          </div>

          <WeeklyActivityBars
            :items="chartItems"
            inspect-id="hengdong.progress.activity-chart"
            :aria-label="period === 'week' ? '本周活动趋势' : '本月活动趋势'"
          />

          <Divider inspect-id="hengdong.progress.divider.calendar" />

          <section class="hd-section">
            <div class="hd-section-heading">
              <div class="hd-row-main">
                <h2 class="hd-section-title">活动日历</h2>
                <span class="hd-caption">{{
                  selectedDate
                    ? `${selectedDate.slice(5).replace("-", " 月 ")} 日已选中`
                    : "点选日期查看当天记录"
                }}</span>
              </div>
              <Button
                v-if="selectedDate"
                label="清除"
                size="sm"
                bg-color="transparent"
                border-color="transparent"
                text-color="color.primary"
                @click="selectedDate = ''"
              />
            </div>
            <StreakCalendar
              :weeks="calendarWeeks"
              :selected-date="selectedDate"
              inspect-id="hengdong.progress.calendar"
              @select="selectDate"
            />
          </section>

          <Divider inspect-id="hengdong.progress.divider.records" />

          <section class="hd-section">
            <div class="hd-section-heading">
              <div class="hd-row-main">
                <h2 class="hd-section-title">
                  {{
                    selectedDate
                      ? "当天记录"
                      : period === "week"
                        ? "本周记录"
                        : "本月记录"
                  }}
                </h2>
                <span class="hd-caption"
                  >{{ filter === "全部" ? "全部活动" : filter }} ·
                  {{ visibleRecords.length }} 条</span
                >
              </div>
            </div>
            <div v-if="removedRecord" class="hd-undo" role="status">
              <span>已删除“{{ removedRecord.title }}”</span>
              <Button
                label="撤销"
                size="sm"
                bg-color="transparent"
                border-color="transparent"
                text-color="color.success"
                inspect-id="hengdong.progress.undo-delete"
                @click="undoDelete"
              />
            </div>
            <DataList
              v-if="visibleRecords.length"
              class="hd-flat-list"
              surface="none"
              rounded="none"
              inspect-id="hengdong.progress.record-list"
            >
              <button
                v-for="record in visibleRecords"
                :key="record.id"
                type="button"
                class="hd-row hd-row-action"
                data-pb-id="hengdong.progress.record-row"
                :data-pb-key="record.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.md"
                @click="openRecord(record.id)"
              >
                <span class="hd-row-main">
                  <strong class="hd-row-title">{{ record.title }}</strong>
                  <span class="hd-caption"
                    >{{ record.date.slice(5).replace("-", " 月 ") }} 日 ·
                    {{ record.minutes }} 分钟</span
                  >
                </span>
                <Chip
                  :label="record.activityType"
                  :tone="record.kind === 'session' ? 'primary' : 'success'"
                />
              </button>
            </DataList>
            <EmptyState
              v-else
              title="这个范围还没有记录"
              description="调整日期或筛选，或者从今天完成一次轻量活动。"
              action-label="回到今天"
              inspect-id="hengdong.progress.empty"
              @action="replaceHengdongScreen(router, route, 'today')"
            />
          </section>
        </div>
      </ScrollableDataList>

      <BottomSheet
        v-model="filterOpen"
        title="筛选活动"
        inspect-id="hengdong.progress.filter-sheet"
      >
        <div class="hd-choice-list">
          <button
            v-for="item in ['全部', '训练', '步行', '拉伸', '自由活动']"
            :key="item"
            type="button"
            class="hd-choice"
            :class="{ 'is-selected': filter === item }"
            @click="filter = item"
          >
            <span>{{ item }}</span
            ><span>{{ filter === item ? "已选择" : "" }}</span>
          </button>
        </div>
        <Button label="查看结果" block @click="filterOpen = false" />
      </BottomSheet>

      <BottomSheet
        v-model="recordSheetOpen"
        title="活动记录"
        inspect-id="hengdong.progress.record-detail"
      >
        <div v-if="selectedRecord" class="hd-flow-step">
          <span class="hd-overline">{{ selectedRecord.date }}</span>
          <h3>{{ selectedRecord.title }}</h3>
          <div class="hd-statline">
            <div class="hd-stat">
              <strong>{{ selectedRecord.minutes }}</strong
              ><span>分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{ selectedRecord.feeling }}</strong
              ><span>体感</span>
            </div>
            <div class="hd-stat">
              <strong>{{ selectedRecord.activityType }}</strong
              ><span>类型</span>
            </div>
          </div>
          <p class="hd-muted">
            {{ selectedRecord.note || "这次没有留下备注。" }}
          </p>
          <Button
            label="删除这条记录"
            bg-color="color.error-soft"
            border-color="color.error-soft"
            text-color="color.error"
            inspect-id="hengdong.progress.delete-record"
            @click="deleteOpen = true"
          />
        </div>
      </BottomSheet>

      <Confirm
        v-model="deleteOpen"
        title="删除这条活动记录？"
        message="删除后，本周期统计和日历标记会同步更新。"
        confirm-label="删除记录"
        inspect-id="hengdong.progress.delete-confirm"
        @confirm="confirmDelete"
      />

      <Toast
        v-model="toast"
        message="记录已删除，可在列表上方撤销"
        inspect-id="hengdong.progress.toast"
      />
    </section>
  </HengdongRoot>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import HengdongRoot from "../HengdongRoot.vue";
import ProgressPeriodPanel from "../components/ProgressPeriodPanel.vue";
import {
  HENGDONG_TODAY,
  shiftProgressAnchor,
  type ActivityType,
  type DateRange,
  type ProgressPeriod,
} from "../model";
import { replaceVariant } from "../nav";
import {
  hengdongState,
  refreshHengdongRecords,
  updateHengdongUi,
} from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const refreshingPeriod = ref<ProgressPeriod | null>(null);
const refreshToast = ref(false);
const refreshMessage = ref("已是最新");
const selectedFocus = reactive<Record<ProgressPeriod, string>>({
  week: "",
  month: "",
  year: "",
  custom: "",
});
const customDraftStart = ref(hengdongState.ui.progressCustomStart);
const customDraftEnd = ref(hengdongState.ui.progressCustomEnd);
const customError = ref("");

const activePeriod = computed<ProgressPeriod>({
  get: () => {
    if (variant.value === "month") return "month";
    if (variant.value === "year") return "year";
    if (variant.value === "custom") return "custom";
    return hengdongState.ui.progressPeriod;
  },
  set: (value) => {
    selectedFocus[value] = "";
    updateHengdongUi({ progressPeriod: value });
    if (["month", "year", "custom"].includes(variant.value)) {
      void replaceVariant(router, route, "default");
    }
  },
});
const periodItems = computed(() => {
  const items = [
    { value: "week", label: "本周" },
    { value: "month", label: "本月" },
    { value: "year", label: "本年" },
  ];
  if (activePeriod.value === "custom") {
    items.push({ value: "custom", label: "自定义" });
  }
  return items;
});

const filter = computed<"全部" | ActivityType>({
  get: () => hengdongState.ui.progressFilter,
  set: (value) => {
    selectedFocus[activePeriod.value] = "";
    updateHengdongUi({ progressFilter: value });
  },
});
const filterOptions: Array<"全部" | ActivityType> = [
  "全部",
  "训练",
  "步行",
  "拉伸",
  "自由活动",
];
const customRange = computed<DateRange>(() => ({
  start: hengdongState.ui.progressCustomStart,
  end: hengdongState.ui.progressCustomEnd,
}));

const filterOpen = computed({
  get: () => variant.value === "filter-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "filter-open" : "default"),
});
const customRangeOpen = computed({
  get: () => variant.value === "custom-range-open",
  set: (open) => {
    if (!open) {
      customError.value = "";
      void replaceVariant(router, route, "default");
    }
  },
});
const recordSheetOpen = computed({
  get: () => variant.value === "record-detail-open",
  set: (open) => {
    if (!open) void replaceVariant(router, route, "default", { record: "" });
  },
});
const selectedRecord = computed(() => {
  const recordId = typeof route.query.record === "string" ? route.query.record : "";
  return hengdongState.records.find((record) => record.id === recordId) ?? null;
});

function openCustomRange() {
  customDraftStart.value = hengdongState.ui.progressCustomStart;
  customDraftEnd.value = hengdongState.ui.progressCustomEnd;
  customError.value = "";
  void replaceVariant(router, route, "custom-range-open");
}

function validateCustomRange() {
  if (!customDraftStart.value || !customDraftEnd.value) return "请选择开始和结束日期。";
  if (customDraftStart.value > customDraftEnd.value) return "开始日期不能晚于结束日期。";
  if (customDraftEnd.value > HENGDONG_TODAY) return "结束日期不能晚于今天。";
  const start = new Date(`${customDraftStart.value}T00:00:00Z`).getTime();
  const end = new Date(`${customDraftEnd.value}T00:00:00Z`).getTime();
  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > 365) return "自定义范围最长为一年。";
  return "";
}

function applyCustomRange() {
  customError.value = validateCustomRange();
  if (customError.value) return;
  selectedFocus.custom = "";
  updateHengdongUi({
    progressPeriod: "custom",
    progressCustomStart: customDraftStart.value,
    progressCustomEnd: customDraftEnd.value,
  });
  void replaceVariant(router, route, "custom");
}

function navigatePeriod(period: ProgressPeriod, amount: -1 | 1) {
  if (period === "custom") return;
  selectedFocus[period] = "";
  updateHengdongUi({
    progressAnchor: shiftProgressAnchor(period, hengdongState.ui.progressAnchor, amount),
  });
}

function selectFocus(period: ProgressPeriod, key: string) {
  selectedFocus[period] = key;
}

async function refresh(period: ProgressPeriod) {
  refreshingPeriod.value = period;
  await Promise.resolve();
  const changed = refreshHengdongRecords();
  refreshingPeriod.value = null;
  refreshMessage.value = changed ? "进度已更新" : "已是最新";
  refreshToast.value = true;
}

function openRecord(recordId: string) {
  void replaceVariant(router, route, "record-detail-open", { record: recordId });
}
</script>

<template>
  <HengdongRoot active="progress" screen-id="hengdong.progress">
    <section
      class="progress-page"
      data-pb-id="hengdong.progress.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <AppBar title="进度" dense inspect-id="hengdong.progress.app-bar">
        <template #append>
          <Button
            label="日期"
            size="sm"
            kind="outlined"
            inspect-id="hengdong.progress.open-custom-range"
            @click="openCustomRange"
          />
          <IconButton
            ariaLabel="筛选活动"
            icon="sliders-horizontal"
            size="sm"
            variant="text"
            inspect-id="hengdong.progress.open-filter"
            @click="filterOpen = true"
          />
        </template>
      </AppBar>

      <PrimaryTabs
        v-model="activePeriod"
        class="progress-tabs"
        :items="periodItems"
        grow
        fill
        inspect-id="hengdong.progress.period-tabs"
      >
        <template #week>
          <ProgressPeriodPanel
            period="week"
            :anchor="hengdongState.ui.progressAnchor"
            :custom-range="customRange"
            :records="hengdongState.records"
            :filter="filter"
            :goals="hengdongState.goals"
            :selected-key="variant === 'selected-date' ? 'date:2026-08-12' : selectedFocus.week"
            :refreshing="refreshingPeriod === 'week'"
            :empty="variant === 'empty'"
            @navigate="navigatePeriod('week', $event)"
            @select="selectFocus('week', $event)"
            @open="openRecord"
            @refresh="refresh('week')"
          />
        </template>
        <template #month>
          <ProgressPeriodPanel
            period="month"
            :anchor="hengdongState.ui.progressAnchor"
            :custom-range="customRange"
            :records="hengdongState.records"
            :filter="filter"
            :goals="hengdongState.goals"
            :selected-key="selectedFocus.month"
            :refreshing="refreshingPeriod === 'month'"
            :empty="variant === 'empty'"
            @navigate="navigatePeriod('month', $event)"
            @select="selectFocus('month', $event)"
            @open="openRecord"
            @refresh="refresh('month')"
          />
        </template>
        <template #year>
          <ProgressPeriodPanel
            period="year"
            :anchor="hengdongState.ui.progressAnchor"
            :custom-range="customRange"
            :records="hengdongState.records"
            :filter="filter"
            :goals="hengdongState.goals"
            :selected-key="selectedFocus.year"
            :refreshing="refreshingPeriod === 'year'"
            :empty="variant === 'empty'"
            @navigate="navigatePeriod('year', $event)"
            @select="selectFocus('year', $event)"
            @open="openRecord"
            @refresh="refresh('year')"
          />
        </template>
        <template #custom>
          <ProgressPeriodPanel
            period="custom"
            :anchor="hengdongState.ui.progressAnchor"
            :custom-range="customRange"
            :records="hengdongState.records"
            :filter="filter"
            :goals="hengdongState.goals"
            :selected-key="selectedFocus.custom"
            :refreshing="refreshingPeriod === 'custom'"
            :empty="variant === 'empty'"
            @select="selectFocus('custom', $event)"
            @open="openRecord"
            @refresh="refresh('custom')"
          />
        </template>
      </PrimaryTabs>

      <BottomSheet
        v-model="filterOpen"
        title="筛选活动"
        inspect-id="hengdong.progress.filter-sheet"
      >
        <div class="hd-choice-list">
          <button
            v-for="item in filterOptions"
            :key="item"
            type="button"
            class="hd-choice"
            :class="{ 'is-selected': filter === item }"
            :aria-pressed="filter === item"
            @click="filter = item"
          >
            <span>{{ item }}</span><span>{{ filter === item ? "已选择" : "" }}</span>
          </button>
        </div>
        <template #actions>
          <Button label="查看结果" block @click="filterOpen = false" />
        </template>
      </BottomSheet>

      <FlowSheet
        v-model="customRangeOpen"
        title="自定义日期"
        :step-count="1"
        :swipe="false"
        inspect-id="hengdong.progress.custom-range-sheet"
      >
        <section
          class="progress-custom-form"
          data-pb-id="hengdong.progress.custom-range-form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
        >
          <label>
            <span>开始日期</span>
            <input
              v-model="customDraftStart"
              type="date"
              :max="HENGDONG_TODAY"
              data-pb-id="hengdong.progress.custom-start"
              data-pb-role="field"
            />
          </label>
          <label>
            <span>结束日期</span>
            <input
              v-model="customDraftEnd"
              type="date"
              :max="HENGDONG_TODAY"
              data-pb-id="hengdong.progress.custom-end"
              data-pb-role="field"
            />
          </label>
          <p v-if="customError" class="progress-custom-error" role="alert">{{ customError }}</p>
        </section>
        <template #actions>
          <Button
            label="取消"
            kind="secondary"
            @click="customRangeOpen = false"
          />
          <Button
            label="应用范围"
            inspect-id="hengdong.progress.apply-custom-range"
            @click="applyCustomRange"
          />
        </template>
      </FlowSheet>

      <BottomSheet
        v-model="recordSheetOpen"
        title="活动记录"
        inspect-id="hengdong.progress.record-detail"
      >
        <div
          v-if="selectedRecord"
          class="hd-record-detail"
          data-pb-id="hengdong.progress.record-detail-content"
          data-pb-role="section"
          data-pb-token-spacing="spacing.lg"
        >
          <div class="hd-record-detail-hero">
            <div class="hd-record-detail-copy">
              <span class="hd-record-detail-status">{{ selectedRecord.date }}</span>
              <h3>{{ selectedRecord.title }}</h3>
              <span class="hd-record-detail-meta">{{ selectedRecord.activityType }}</span>
            </div>
          </div>
          <div class="hd-record-detail-facts">
            <div class="hd-record-detail-fact"><strong>{{ selectedRecord.minutes }}</strong><span>分钟</span></div>
            <div class="hd-record-detail-fact"><strong>{{ selectedRecord.feeling }}</strong><span>体感</span></div>
            <div class="hd-record-detail-fact"><strong>{{ selectedRecord.completedExerciseIds.length }}</strong><span>完成动作</span></div>
          </div>
          <section class="hd-record-detail-note">
            <h4>备注</h4>
            <p>{{ selectedRecord.note || "这次没有留下备注。" }}</p>
          </section>
        </div>
      </BottomSheet>

      <Toast
        v-model="refreshToast"
        :message="refreshMessage"
        inspect-id="hengdong.progress.refresh-toast"
      />
    </section>
  </HengdongRoot>
</template>

<style scoped>
.progress-page {
  display: flex;
  height: var(--pb-layout-fill);
  min-height: var(--pb-spacing-none);
  flex-direction: column;
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}

.progress-tabs {
  flex: var(--pb-layout-flex-fill);
  min-height: var(--pb-spacing-none);
  padding: var(--pb-spacing-sm) var(--pb-spacing-md) var(--pb-spacing-none);
}

.progress-custom-form,
.progress-custom-form label {
  display: flex;
  flex-direction: column;
}

.progress-custom-form {
  gap: var(--pb-spacing-md);
}

.progress-custom-form label {
  gap: var(--pb-spacing-xs);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}

.progress-custom-form input {
  box-sizing: border-box;
  width: var(--pb-layout-fill);
  min-height: var(--pb-sizing-control-md);
  padding: var(--pb-spacing-sm) var(--pb-spacing-md);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}

.progress-custom-form input:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}

.progress-custom-error {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
</style>

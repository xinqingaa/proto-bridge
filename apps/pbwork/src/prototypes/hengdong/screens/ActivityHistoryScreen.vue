<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import SecondaryTabs from "@/design-system/components/navigation/SecondaryTabs.vue";
import ActivityRecordList from "../components/ActivityRecordList.vue";
import HengdongShell from "../HengdongShell.vue";
import {
  defaultRecords,
  type ActivityHistoryTab,
  type ActivityType,
  type WorkoutRecord,
} from "../model";
import { replaceVariant } from "../nav";
import {
  hengdongState,
  refreshHengdongRecords,
  removeRecord,
  restoreRecord,
  updateHengdongUi,
} from "../storage";
import "../hengdong.css";

const tabs: Array<{ value: ActivityHistoryTab; label: string }> = [
  { value: "all", label: "全部" },
  { value: "training", label: "训练" },
  { value: "walking", label: "步行" },
  { value: "stretching", label: "拉伸" },
  { value: "free", label: "自由活动" },
];

const tabActivity: Partial<Record<ActivityHistoryTab, ActivityType>> = {
  training: "训练",
  walking: "步行",
  stretching: "拉伸",
  free: "自由活动",
};

const longNoteFixture: WorkoutRecord = {
  id: "history-long-note",
  date: "2026-08-10",
  kind: "session",
  activityType: "训练",
  planId: "full-body-basic",
  title: "全身基础训练",
  minutes: 31,
  feeling: "吃力",
  note: "前半段节奏很稳定，弓步时左侧稍微紧了一些，所以主动放慢速度并缩短了最后一组。完成后呼吸恢复得很快，下次继续保留这个节奏，不需要为了追求次数勉强加量。训练结束后走动了几分钟，左侧紧张感已经缓解。",
  completedExerciseIds: ["squat", "push-up", "lunge", "plank"],
};

const route = useRoute();
const router = useRouter();
const pageSizes = reactive<Record<ActivityHistoryTab, number>>({
  all: 6,
  training: 6,
  walking: 6,
  stretching: 6,
  free: 6,
});
const refreshingTab = ref<ActivityHistoryTab | null>(null);
const loadingTab = ref<ActivityHistoryTab | null>(null);
const removedRecord = ref<WorkoutRecord | null>(null);
const deletingRecord = ref(false);
const refreshToast = ref(false);
const refreshMessage = ref("已是最新");
const selectedMonth = ref("");

const variant = computed(() => String(route.query.variant ?? "default"));
const activeTab = computed<ActivityHistoryTab>({
  get: () => {
    if (variant.value === "training") return "training";
    if (variant.value === "filtered-empty") return "free";
    return hengdongState.ui.historyTab;
  },
  set: (value) => {
    updateHengdongUi({ historyTab: value });
    if (["training", "filtered-empty"].includes(variant.value)) {
      void replaceVariant(router, route, "default");
    }
  },
});

const presentedRecords = computed(() =>
  variant.value === "empty" ? [] : hengdongState.records,
);
const monthOptions = computed(() =>
  Array.from(new Set(presentedRecords.value.map((record) => record.date.slice(0, 7))))
    .sort((left, right) => right.localeCompare(left))
    .map((month) => `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`),
);

function recordsForTab(tab: ActivityHistoryTab) {
  if (variant.value === "filtered-empty" && tab === "free") return [];
  const type = tabActivity[tab];
  return type
    ? presentedRecords.value.filter((record) => record.activityType === type)
    : presentedRecords.value;
}

function tabLabel(tab: ActivityHistoryTab) {
  return tabs.find((item) => item.value === tab)?.label ?? "活动";
}

async function refresh(tab: ActivityHistoryTab) {
  refreshingTab.value = tab;
  await nextTick();
  const changed = refreshHengdongRecords();
  await nextTick();
  refreshingTab.value = null;
  refreshMessage.value = changed ? "活动记录已更新" : "已是最新";
  refreshToast.value = true;
}

async function loadMore(tab: ActivityHistoryTab) {
  loadingTab.value = tab;
  await nextTick();
  pageSizes[tab] += 6;
  await nextTick();
  loadingTab.value = null;
}

function monthValue(label: string) {
  const match = label.match(/(\d{4}) 年 (\d+) 月/);
  return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}` : "";
}

async function locateMonth(label: string) {
  selectedMonth.value = label;
  await nextTick();
  const month = monthValue(label);
  document
    .querySelector(
      `[data-pb-id="hengdong.activity-history.month"][data-pb-key="${activeTab.value}-${month}"]`,
    )
    ?.scrollIntoView({ block: "start" });
}

const recordSheetOpen = computed({
  get: () =>
    ["record-detail-open", "record-detail-long-note", "delete-confirm-open"].includes(
      variant.value,
    ),
  set: (open) => {
    if (!open) void replaceVariant(router, route, "default", { record: "" });
  },
});
const deleteOpen = computed({
  get: () => variant.value === "delete-confirm-open",
  set: (open) => {
    if (!open && deletingRecord.value) {
      deletingRecord.value = false;
      return;
    }
    void replaceVariant(
      router,
      route,
      open ? "delete-confirm-open" : "record-detail-open",
    );
  },
});
const selectedRecord = computed(() => {
  if (variant.value === "record-detail-long-note") return longNoteFixture;
  const recordId = typeof route.query.record === "string" ? route.query.record : "";
  return (
    hengdongState.records.find((record) => record.id === recordId) ??
    recordsForTab(activeTab.value)[0] ??
    defaultRecords[0] ??
    null
  );
});
const selectedExercises = computed(() => {
  const record = selectedRecord.value;
  if (!record?.planId) return [];
  const plan = hengdongState.plans.find((item) => item.id === record.planId);
  return (plan?.exercises ?? []).filter((exercise) =>
    record.completedExerciseIds.includes(exercise.id),
  );
});

function openRecord(recordId: string) {
  void replaceVariant(router, route, "record-detail-open", { record: recordId });
}

function confirmDelete() {
  if (!selectedRecord.value || selectedRecord.value.id === longNoteFixture.id) return;
  deletingRecord.value = true;
  removedRecord.value = removeRecord(selectedRecord.value.id);
  void replaceVariant(router, route, "default", { record: "" });
}

function undoDelete() {
  if (!removedRecord.value) return;
  restoreRecord(removedRecord.value);
  removedRecord.value = null;
}
</script>

<template>
  <HengdongShell
    title="活动记录"
    screen-id="hengdong.activity-history"
    back-to="today"
  >
    <section
      class="history-page"
      data-pb-id="hengdong.activity-history.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <div class="history-tools">
        <Menu
          v-if="monthOptions.length"
          label="定位月份"
          :model-value="selectedMonth"
          :options="monthOptions"
          inspect-id="hengdong.activity-history.month-menu"
          @update:model-value="locateMonth"
        />
      </div>

      <div
        v-if="removedRecord || variant === 'undo-visible'"
        class="history-undo"
        role="status"
        data-pb-id="hengdong.activity-history.undo-feedback"
        data-pb-role="status"
        data-pb-token-background="color.success-soft"
        data-pb-token-color="color.success"
      >
        <span>已删除“{{ removedRecord?.title ?? '15 分钟唤醒' }}”</span>
        <Button
          label="撤销"
          size="sm"
          kind="outlined"
          inspect-id="hengdong.activity-history.undo-delete"
          @click="undoDelete"
        />
      </div>

      <SecondaryTabs
        v-model="activeTab"
        class="history-tabs"
        :items="tabs"
        show-divider
        grow
        size="sm"
        fill
        inspect-id="hengdong.activity-history.tabs"
      >
        <template
          v-for="tab in tabs"
          :key="tab.value"
          #[tab.value]
        >
          <ActivityRecordList
            :records="recordsForTab(tab.value)"
            :visible-count="pageSizes[tab.value]"
            :tab-key="tab.value"
            :tab-label="tab.label"
            :refreshing="
              refreshingTab === tab.value ||
              (variant === 'refreshing' && activeTab === tab.value)
            "
            :loading-more="
              loadingTab === tab.value ||
              (variant === 'loading-more' && activeTab === tab.value)
            "
            :inspect-id="`hengdong.activity-history.list.${tab.value}`"
            @refresh="refresh(tab.value)"
            @load-more="loadMore(tab.value)"
            @open="openRecord"
          />
        </template>
      </SecondaryTabs>
    </section>

    <BottomSheet
      v-model="recordSheetOpen"
      title="活动记录"
      inspect-id="hengdong.activity-history.record-detail"
    >
      <div
        v-if="selectedRecord"
        class="hd-record-detail"
        data-pb-id="hengdong.activity-history.record-detail-content"
        data-pb-role="section"
        data-pb-token-spacing="spacing.lg"
      >
        <div class="hd-record-detail-hero">
          <span class="hd-record-detail-mark">
            <Icon name="check" size="lg" tone="success" />
          </span>
          <div class="hd-record-detail-copy">
            <span class="hd-record-detail-status">活动已记录</span>
            <h3>{{ selectedRecord.title }}</h3>
            <span class="hd-record-detail-meta">{{ selectedRecord.date }}</span>
          </div>
        </div>

        <div class="hd-record-detail-facts">
          <div class="hd-record-detail-fact">
            <strong>{{ selectedRecord.minutes }}</strong><span>分钟</span>
          </div>
          <div class="hd-record-detail-fact">
            <strong>{{ selectedRecord.activityType }}</strong><span>类型</span>
          </div>
          <div class="hd-record-detail-fact">
            <strong>{{ selectedRecord.feeling }}</strong><span>体感</span>
          </div>
        </div>

        <section v-if="selectedExercises.length" class="hd-record-detail-section">
          <div class="hd-record-detail-section-heading">
            <h4>完成内容</h4>
            <span>{{ selectedExercises.length }} 个动作</span>
          </div>
          <div class="hd-record-exercise-list">
            <div
              v-for="exercise in selectedExercises"
              :key="exercise.id"
              class="hd-record-exercise"
            >
              <Icon name="check" size="sm" tone="success" />
              <div class="hd-record-exercise-copy">
                <strong>{{ exercise.name }}</strong>
                <span>{{ exercise.prescription }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="hd-record-detail-note">
          <h4>备注</h4>
          <p>{{ selectedRecord.note || "这次没有留下备注。" }}</p>
        </section>

        <Button
          label="删除这条记录"
          kind="secondary"
          inspect-id="hengdong.activity-history.delete-record"
          :disabled="selectedRecord.id === longNoteFixture.id"
          @click="deleteOpen = true"
        />
      </div>
    </BottomSheet>

    <Confirm
      v-model="deleteOpen"
      title="删除这条活动记录？"
      message="删除后，今天和进度中的相关结果也会同步更新。"
      confirm-label="删除记录"
      inspect-id="hengdong.activity-history.delete-confirm"
      @confirm="confirmDelete"
    />

    <Toast
      v-model="refreshToast"
      :message="refreshMessage"
      inspect-id="hengdong.activity-history.refresh-toast"
    />
  </HengdongShell>
</template>

<style scoped>
.history-page {
  display: flex;
  height: var(--pb-layout-fill);
  min-height: var(--pb-spacing-none);
  flex-direction: column;
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}

.history-tools,
.history-undo {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-md);
  padding: var(--pb-spacing-sm) var(--pb-spacing-lg);
}

.history-tools :deep(.pb-select) {
  flex: var(--pb-layout-flex-fill);
}

.history-undo {
  background: var(--pb-color-success-soft);
  color: var(--pb-color-success);
  font: var(--pb-typography-content);
}

.history-tabs {
  flex: var(--pb-layout-flex-fill);
  min-height: var(--pb-spacing-none);
}

.history-tabs :deep(.pb-tab-bar) {
  padding-inline: var(--pb-spacing-sm);
}
</style>

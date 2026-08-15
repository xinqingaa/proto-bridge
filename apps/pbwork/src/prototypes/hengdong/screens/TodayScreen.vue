<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import type { PbIconName } from "@/design-system/components/_shared/icons";
import HengdongRoot from "../HengdongRoot.vue";
import WeeklyGoalRing from "../components/WeeklyGoalRing.vue";
import WeeklyRhythm from "../components/WeeklyRhythm.vue";
import {
  HENGDONG_TODAY,
  HENGDONG_WEEK_DATES,
  latestRecords,
  recordsInWeek,
  totalMinutes,
  type ActivityType,
  type Exercise,
  type Feeling,
  type WorkoutRecord,
  type WorkoutSession,
} from "../model";
import {
  openHengdongScreen,
  replaceHengdongScreen,
  replaceVariant,
} from "../nav";
import { hengdongState, saveRecord } from "../storage";
import "../hengdong.css";

type TodayState =
  "default" | "in-progress" | "completed" | "no-plan" | "recent-empty";

const todayStates: TodayState[] = [
  "default",
  "in-progress",
  "completed",
  "no-plan",
  "recent-empty",
];
const recordDetailVariants = [
  "record-detail-open",
  "record-detail-quick",
  "record-detail-long-note",
];

const completedFixture: WorkoutRecord = {
  id: "record-20260813-completed",
  date: HENGDONG_TODAY,
  kind: "session",
  activityType: "训练",
  planId: "wake-up-15",
  title: "15 分钟唤醒",
  minutes: 15,
  feeling: "刚好",
  note: "今天已经完成，身体轻松了一些。",
  completedExerciseIds: ["neck-roll", "body-squat", "incline-push", "dead-bug"],
};

const recordDetailFixtures: WorkoutRecord[] = [
  {
    id: "record-detail-quick-no-note",
    date: HENGDONG_TODAY,
    kind: "quick",
    activityType: "步行",
    title: "晚饭后散步",
    minutes: 20,
    feeling: "轻松",
    note: "",
    completedExerciseIds: [],
  },
  {
    id: "record-detail-long-note",
    date: "2026-08-10",
    kind: "session",
    activityType: "训练",
    planId: "full-body-basic",
    title: "全身基础训练",
    minutes: 31,
    feeling: "吃力",
    note: "前半段节奏很稳定，弓步时左侧稍微紧了一些，所以主动放慢速度并缩短了最后一组。完成后呼吸恢复得很快，下次继续保留这个节奏，不需要为了追求次数勉强加量。深蹲和俯卧撑的动作比上周更稳定，核心部分仍然容易抢速度，之后可以把注意力放回呼吸和控制。训练结束后走动了几分钟，左侧紧张感已经缓解，没有继续加练。今天的目标只是完整做完并记住身体反馈，这个程度刚好。下次开始前先做一轮轻柔活动，如果左侧仍然紧，就继续减少弓步幅度。",
    completedExerciseIds: ["squat", "push-up", "lunge", "plank"],
  },
];

const inProgressFixture: WorkoutSession = {
  planId: "wake-up-15",
  currentExerciseIndex: 2,
  completedExerciseIds: ["neck-roll", "body-squat"],
  elapsedSeconds: 420,
  currentExerciseSeconds: 12,
  status: "paused",
};

const route = useRoute();
const router = useRouter();
const step = ref(0);
const activityType = ref<ActivityType>("步行");
const duration = ref("20 分钟");
const feeling = ref<Feeling>("刚好");
const savedFeedback = ref(false);

const variant = computed(() => String(route.query.variant ?? "default"));
const pageState = computed<TodayState>(() => {
  const stateQuery = String(route.query.state ?? "");
  if (todayStates.includes(stateQuery as TodayState)) {
    return stateQuery as TodayState;
  }
  return todayStates.includes(variant.value as TodayState)
    ? (variant.value as TodayState)
    : "default";
});

const presentedRecords = computed<WorkoutRecord[]>(() => {
  if (pageState.value === "recent-empty") return [];
  if (pageState.value === "completed") {
    return [
      completedFixture,
      ...hengdongState.records.filter(
        (record) => record.date !== HENGDONG_TODAY,
      ),
    ];
  }
  return hengdongState.records;
});

const presentedSession = computed<WorkoutSession | null>(() => {
  if (pageState.value === "in-progress") return inProgressFixture;
  if (["completed", "no-plan", "recent-empty"].includes(pageState.value)) {
    return null;
  }
  return hengdongState.workoutSession;
});

const activePlan = computed(() => {
  if (pageState.value === "no-plan") return null;
  const planId =
    presentedSession.value?.planId ?? hengdongState.activePlanId ?? "";
  return hengdongState.plans.find((plan) => plan.id === planId) ?? null;
});

const weekRecords = computed(() => recordsInWeek(presentedRecords.value));
const todayRecords = computed(() =>
  presentedRecords.value.filter((record) => record.date === HENGDONG_TODAY),
);
const hasSession = computed(() => Boolean(presentedSession.value));
const hasPendingSummary = computed(
  () => presentedSession.value?.status === "summary",
);
const isCompleted = computed(
  () => !hasSession.value && todayRecords.value.length > 0,
);
const weekProgress = computed(() =>
  Math.min(
    100,
    Math.round(
      (weekRecords.value.length /
        Math.max(1, hengdongState.goals.weeklySessions)) *
        100,
    ),
  ),
);
const recentRecords = computed(() => latestRecords(presentedRecords.value, 5));
const weekRhythm = computed(() =>
  HENGDONG_WEEK_DATES.map((date, index) => {
    const minutes = totalMinutes(
      presentedRecords.value.filter((record) => record.date === date),
    );
    return {
      date,
      label: ["一", "二", "三", "四", "五", "六", "日"][index]!,
      minutes,
      active: minutes > 0,
      today: date === HENGDONG_TODAY,
    };
  }),
);
const activeDays = computed(
  () => weekRhythm.value.filter((item) => item.active).length,
);
const weekSummary = computed(() => {
  if (activeDays.value >= hengdongState.goals.weeklySessions) {
    return "这周已经达成目标，保持轻松";
  }
  if (activeDays.value === 0) return "从一次轻活动开始就好";
  return `已经活动 ${activeDays.value} 天，按自己的节奏继续`;
});

const heroKicker = computed(() => {
  if (!activePlan.value) return "今天先做一个选择";
  if (hasPendingSummary.value) return "训练结果待保存";
  if (hasSession.value) return "继续上次训练";
  if (isCompleted.value) return "今天已经动过";
  return "今天只做一件事";
});
const heroTitle = computed(() => {
  if (!activePlan.value) return "选一个刚好的计划";
  if (hasPendingSummary.value) return "完成这次记录";
  if (hasSession.value) return "接着完成剩下的动作";
  if (isCompleted.value) return "完成比完美重要";
  return activePlan.value.name;
});
const heroDescription = computed(() => {
  if (!activePlan.value) return "计划会决定今天的建议，之后仍然可以随时调整。";
  if (hasPendingSummary.value) {
    return "动作已经结束，补充体感后即可保存到本周记录。";
  }
  if (hasSession.value) {
    return `已完成 ${presentedSession.value?.completedExerciseIds.length ?? 0} / ${activePlan.value.exercises.length} 个动作，进度已保留。`;
  }
  if (isCompleted.value) {
    return `今天已记录 ${totalMinutes(todayRecords.value)} 分钟，可以安心停在这里。`;
  }
  return `${activePlan.value.exercises.length} 个低压力动作，让身体从久坐里醒过来。`;
});
const primaryLabel = computed(() => {
  if (!activePlan.value) return "选择一个计划";
  if (hasPendingSummary.value) return "继续填写结果";
  if (hasSession.value) return "继续训练";
  if (isCompleted.value) return "再做一次轻训练";
  return `开始 ${activePlan.value.minutes} 分钟`;
});
const ringActionLabel = computed(() => {
  if (!activePlan.value) return "选择计划";
  if (hasPendingSummary.value) return "继续填写结果";
  if (hasSession.value) return "继续训练";
  if (isCompleted.value) return "再练一次";
  return "开始训练";
});
const ringState = computed(() => {
  if (!activePlan.value) return "select-plan" as const;
  return isCompleted.value ? ("complete" as const) : ("active" as const);
});

const activityIcons: Record<ActivityType, PbIconName> = {
  训练: "dumbbell",
  步行: "footprints",
  拉伸: "person-standing",
  自由活动: "sparkles",
};

const selectedRecord = computed(() => {
  const recordId =
    typeof route.query.record === "string" ? route.query.record : "";
  return (
    [...presentedRecords.value, ...recordDetailFixtures].find(
      (record) => record.id === recordId,
    ) ??
    recentRecords.value[0] ??
    null
  );
});
const selectedRecordPlan = computed(() => {
  const planId = selectedRecord.value?.planId;
  if (!planId) return null;
  return hengdongState.plans.find((plan) => plan.id === planId) ?? null;
});
const selectedRecordExercises = computed<Exercise[]>(() => {
  const record = selectedRecord.value;
  const plan = selectedRecordPlan.value;
  if (!record || !plan || record.kind !== "session") return [];
  return record.completedExerciseIds
    .map((exerciseId) =>
      plan.exercises.find((exercise) => exercise.id === exerciseId),
    )
    .filter((exercise): exercise is Exercise => Boolean(exercise));
});
const selectedEmptyDate = computed(() =>
  typeof route.query.date === "string" ? route.query.date : "",
);
const emptyDayMessage = computed(() => {
  const date = selectedEmptyDate.value;
  if (!date) return "这一天还没有活动记录";
  return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日还没有活动记录`;
});

function closeOverlay(nextState: TodayState = pageState.value) {
  const { record: _record, date: _date, state: _state, ...query } = route.query;
  void router.replace({ query: { ...query, variant: nextState } });
}

const quickRecordOpen = computed({
  get: () => variant.value === "quick-record-open",
  set: (open) => {
    if (!open) {
      step.value = 0;
      closeOverlay();
    }
  },
});
const recordSheetOpen = computed({
  get: () => recordDetailVariants.includes(variant.value),
  set: (open) => {
    if (!open) closeOverlay();
  },
});
const emptyDayFeedback = computed({
  get: () => variant.value === "day-empty-feedback",
  set: (open) => {
    if (!open) closeOverlay();
  },
});

function recordDateLabel(date: string) {
  if (date === HENGDONG_TODAY) return "今天";
  if (date === "2026-08-12") return "昨天";
  return `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
}

function openPrimaryAction() {
  if (!activePlan.value) {
    void replaceHengdongScreen(router, route, "plans");
    return;
  }
  const planId = presentedSession.value?.planId ?? activePlan.value.id;
  if (presentedSession.value?.status === "summary") {
    void openHengdongScreen(
      router,
      route,
      "workout-complete",
      presentedSession.value.summaryKind === "partial" ? "partial" : "default",
      { plan: planId },
    );
    return;
  }
  void openHengdongScreen(
    router,
    route,
    "workout-session",
    presentedSession.value?.status === "paused" ? "resumed" : "default",
    {
      plan: planId,
    },
  );
}

function openQuickRecord() {
  savedFeedback.value = false;
  void replaceVariant(router, route, "quick-record-open", {
    state: pageState.value,
  });
}

function saveQuickRecord() {
  const minutes = Number.parseInt(duration.value, 10);
  const recordNumber =
    hengdongState.records.filter(
      (record) => record.date === HENGDONG_TODAY && record.kind === "quick",
    ).length + 1;
  saveRecord({
    id: `quick-${HENGDONG_TODAY}-${recordNumber}`,
    date: HENGDONG_TODAY,
    kind: "quick",
    activityType: activityType.value,
    title: activityType.value,
    minutes,
    feeling: feeling.value,
    note: "今天也主动活动了一会儿。",
    completedExerciseIds: [],
  });
  step.value = 0;
  closeOverlay("default");
  savedFeedback.value = true;
}

function openRecord(recordId: string) {
  void replaceVariant(router, route, "record-detail-open", {
    record: recordId,
    state: pageState.value,
  });
}

function openRhythmDay(date: string) {
  savedFeedback.value = false;
  const records = presentedRecords.value.filter(
    (record) => record.date === date,
  );
  if (records[0]) {
    openRecord(records[0].id);
    return;
  }
  void replaceVariant(router, route, "day-empty-feedback", {
    date,
    state: pageState.value,
  });
}
</script>

<template>
  <HengdongRoot active="today" screen-id="hengdong.today">
    <section
      class="hd-page"
      data-pb-id="hengdong.today.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.today.scroll-list"
      >
        <div class="hd-content hd-content-safe">
          <div
            class="hd-utility-row hd-today-utility"
            data-pb-id="hengdong.today.utility"
            data-pb-role="section"
            data-pb-token-spacing="spacing.sm"
          >
            <div class="hd-row-main">
              <span class="hd-overline">8 月 13 日 · 星期四</span>
              <span class="hd-caption"
                >{{ hengdongState.profile.name }}，下午好</span
              >
            </div>
            <IconButton
              ariaLabel="设置"
              icon="settings"
              variant="text"
              size="sm"
              inspect-id="hengdong.today.settings"
              @click="openHengdongScreen(router, route, 'settings-goals')"
            />
          </div>

          <section
            class="hd-today-hero"
            data-pb-id="hengdong.today.next-action"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-typography="typography.headline"
            data-pb-token-spacing="spacing.sm"
          >
            <header class="hd-today-copy">
              <span class="hd-overline">{{ heroKicker }}</span>
              <h1 class="hd-today-title">{{ heroTitle }}</h1>
              <p class="hd-muted">{{ heroDescription }}</p>
            </header>
            <WeeklyGoalRing
              :completed="weekRecords.length"
              :target="hengdongState.goals.weeklySessions"
              :progress="weekProgress"
              :action-label="ringActionLabel"
              action-id="activate-ring"
              :state="ringState"
              inspect-id="hengdong.today.goal-ring"
              @activate="openPrimaryAction"
            />
          </section>

          <div
            class="hd-primary-action"
            data-pb-id="hengdong.today.primary-action"
            data-pb-role="section"
            data-pb-token-spacing="spacing.sm"
          >
            <Button
              :label="primaryLabel"
              block
              inspect-id="hengdong.today.start-workout"
              data-pb-action="activate-primary"
              @click="openPrimaryAction"
            >
              <template #append>
                <Icon name="chevron-right" tone="inherit" />
              </template>
            </Button>
            <Button
              label="记录其他活动"
              kind="outlined"
              block
              inspect-id="hengdong.today.quick-record"
              data-pb-action="open-quick-record"
              @click="openQuickRecord"
            />
          </div>

          <div class="hd-rhythm-block">
            <WeeklyRhythm
              :items="weekRhythm"
              :total-minutes="totalMinutes(weekRecords)"
              :summary="weekSummary"
              inspect-id="hengdong.today.week-rhythm"
              @select="openRhythmDay"
            />
            <p
              v-if="emptyDayFeedback"
              class="hd-rhythm-feedback"
              role="status"
              data-pb-id="hengdong.today.day-empty-feedback"
              data-pb-role="status"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
              data-pb-token-spacing="spacing.sm"
            >
              {{ emptyDayMessage }}
            </p>
            <p
              v-if="savedFeedback"
              class="hd-rhythm-feedback"
              role="status"
              data-pb-id="hengdong.today.save-feedback"
              data-pb-role="status"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
              data-pb-token-spacing="spacing.sm"
            >
              活动已记录，本周进度已更新
            </p>
          </div>

          <section
            class="hd-section hd-recent-section"
            data-pb-id="hengdong.today.recent"
            data-pb-role="section"
            data-pb-token-spacing="spacing.md"
          >
            <div class="hd-section-heading">
              <h2 class="hd-section-title">最近记录</h2>
              <Button
                v-if="recentRecords.length"
                label="查看全部"
                size="sm"
                kind="outlined"
                inspect-id="hengdong.today.open-activity-history"
                @click="openHengdongScreen(router, route, 'activity-history')"
              />
            </div>
            <DataList
              v-if="recentRecords.length"
              class="hd-flat-list"
              surface="none"
              rounded="none"
              inspect-id="hengdong.today.recent-list"
            >
              <button
                v-for="record in recentRecords"
                :key="record.id"
                type="button"
                class="hd-row hd-row-action"
                data-pb-id="hengdong.today.record-row"
                :data-pb-key="record.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.md"
                data-pb-action="open-recent-record"
                @click="openRecord(record.id)"
              >
                <span class="hd-record-icon">
                  <Icon
                    :name="activityIcons[record.activityType]"
                    size="md"
                    tone="primary"
                    :inspect-id="`hengdong.today.record-icon.${record.id}`"
                  />
                </span>
                <span class="hd-row-main">
                  <span class="hd-record-primary">
                    <strong class="hd-row-title">{{ record.title }}</strong>
                    <strong class="hd-record-duration"
                      >{{ record.minutes }} 分钟</strong
                    >
                  </span>
                  <span class="hd-caption">
                    {{ recordDateLabel(record.date) }} ·
                    {{ record.activityType }} · 体感{{ record.feeling }}
                  </span>
                  <span v-if="record.note" class="hd-record-note">{{
                    record.note
                  }}</span>
                </span>
                <Icon name="chevron-right" size="sm" tone="muted" />
              </button>
            </DataList>
            <p v-else class="hd-empty-copy">
              还没有最近记录，今天完成的活动会出现在这里。
            </p>
          </section>
        </div>
      </ScrollableDataList>

      <FlowSheet
        v-model="quickRecordOpen"
        v-model:step="step"
        title="记录其他活动"
        :step-count="3"
        :swipe="false"
        inspect-id="hengdong.today.quick-record-sheet"
      >
        <section class="hd-flow-step">
          <h3>刚刚做了什么？</h3>
          <p class="hd-muted">选择最接近的一项，不需要精确分类。</p>
          <div class="hd-choice-list">
            <button
              v-for="item in ['步行', '拉伸', '自由活动'] as ActivityType[]"
              :key="item"
              type="button"
              class="hd-choice"
              :class="{ 'is-selected': activityType === item }"
              @click="activityType = item"
            >
              <span>{{ item }}</span
              ><span>{{ activityType === item ? "已选择" : "" }}</span>
            </button>
          </div>
        </section>
        <section class="hd-flow-step">
          <h3>留下刚好的信息</h3>
          <Menu
            v-model="duration"
            label="活动时长"
            :options="['10 分钟', '15 分钟', '20 分钟', '30 分钟']"
            inspect-id="hengdong.today.quick-duration"
          />
          <RadioGroup
            v-model="feeling"
            label="完成后的体感"
            :options="['轻松', '刚好', '吃力']"
            inspect-id="hengdong.today.quick-feeling"
          />
        </section>
        <section class="hd-flow-step">
          <h3>确认这次活动</h3>
          <div class="hd-statline">
            <div class="hd-stat">
              <strong>{{ Number.parseInt(duration, 10) }}</strong
              ><span>分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{ activityType }}</strong
              ><span>活动类型</span>
            </div>
            <div class="hd-stat">
              <strong>{{ feeling }}</strong
              ><span>完成体感</span>
            </div>
          </div>
          <p class="hd-muted">保存后会立即计入今天和本周进度。</p>
        </section>
        <template #actions>
          <Button v-if="step < 2" label="下一步" @click="step += 1" />
          <Button
            v-else
            label="保存活动"
            inspect-id="hengdong.today.save-quick-record"
            @click="saveQuickRecord"
          />
        </template>
      </FlowSheet>

      <BottomSheet
        v-model="recordSheetOpen"
        title="活动记录"
        inspect-id="hengdong.today.record-detail"
      >
        <div
          v-if="selectedRecord"
          class="hd-record-detail"
          data-pb-id="hengdong.today.record-detail-content"
          data-pb-role="summary"
          data-pb-token-color="color.on-surface"
          data-pb-token-spacing="spacing.lg"
        >
          <header
            class="hd-record-detail-hero"
            data-pb-id="hengdong.today.record-detail-outcome"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-typography="typography.title"
            data-pb-token-spacing="spacing.md"
          >
            <span class="hd-record-detail-mark" aria-hidden="true">
              <Icon
                name="clipboard-check"
                size="lg"
                tone="success"
                inspect-id="hengdong.today.record-detail-icon"
              />
            </span>
            <span class="hd-record-detail-copy">
              <span class="hd-record-detail-status">
                {{
                  selectedRecord.kind === "session"
                    ? "正式训练已完成"
                    : "日常活动已记录"
                }}
              </span>
              <h3>{{ selectedRecord.title }}</h3>
              <span class="hd-record-detail-meta">
                {{ recordDateLabel(selectedRecord.date) }} ·
                {{
                  selectedRecord.kind === "session"
                    ? "来自训练计划"
                    : "快捷记录"
                }}
              </span>
            </span>
          </header>

          <div
            class="hd-record-detail-facts"
            data-pb-id="hengdong.today.record-detail-facts"
            data-pb-role="section"
            data-pb-token-spacing="spacing.sm"
          >
            <div class="hd-record-detail-fact">
              <strong
                data-pb-id="hengdong.today.record-detail-fact-value"
                data-pb-key="duration"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.title-lg"
                >{{ selectedRecord.minutes }}</strong
              >
              <span
                data-pb-id="hengdong.today.record-detail-fact-label"
                data-pb-key="duration"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
                >分钟</span
              >
            </div>
            <div class="hd-record-detail-fact">
              <strong
                data-pb-id="hengdong.today.record-detail-fact-value"
                data-pb-key="activity-type"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.title-lg"
                >{{ selectedRecord.activityType }}</strong
              >
              <span
                data-pb-id="hengdong.today.record-detail-fact-label"
                data-pb-key="activity-type"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
                >活动类型</span
              >
            </div>
            <div class="hd-record-detail-fact">
              <strong
                data-pb-id="hengdong.today.record-detail-fact-value"
                data-pb-key="feeling"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.title-lg"
                >{{ selectedRecord.feeling }}</strong
              >
              <span
                data-pb-id="hengdong.today.record-detail-fact-label"
                data-pb-key="feeling"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
                >完成体感</span
              >
            </div>
          </div>

          <section
            v-if="selectedRecord.kind === 'session'"
            class="hd-record-detail-section"
            data-pb-id="hengdong.today.record-detail-exercises"
            data-pb-role="list"
            data-pb-token-color="color.on-surface"
            data-pb-token-spacing="spacing.sm"
          >
            <div class="hd-record-detail-section-heading">
              <h4>完成内容</h4>
              <span>{{ selectedRecordExercises.length }} 个动作</span>
            </div>
            <ul
              v-if="selectedRecordExercises.length"
              class="hd-record-exercises"
            >
              <li
                v-for="exercise in selectedRecordExercises"
                :key="exercise.id"
                class="hd-record-exercise"
                data-pb-id="hengdong.today.record-detail-exercise"
                :data-pb-key="exercise.id"
                data-pb-role="list-item"
                data-pb-token-color="color.on-surface"
                data-pb-token-spacing="spacing.sm"
              >
                <span class="hd-record-exercise-check" aria-hidden="true">
                  <Icon
                    name="check"
                    size="sm"
                    tone="success"
                    :inspect-id="`hengdong.today.record-detail-exercise-icon.${exercise.id}`"
                  />
                </span>
                <span class="hd-record-exercise-copy">
                  <strong>{{ exercise.name }}</strong>
                  <span>{{ exercise.prescription }}</span>
                </span>
              </li>
            </ul>
            <p v-else class="hd-record-detail-empty">
              这次训练已保存，没有可展示的动作明细。
            </p>
          </section>

          <section
            class="hd-record-detail-note"
            data-pb-id="hengdong.today.record-detail-note"
            data-pb-role="section"
            data-pb-token-background="color.surface-recessed"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.md"
            data-pb-token-spacing="spacing.md"
          >
            <h4>备注</h4>
            <p>{{ selectedRecord.note || "这次没有留下备注。" }}</p>
          </section>
        </div>
      </BottomSheet>
    </section>
  </HengdongRoot>
</template>

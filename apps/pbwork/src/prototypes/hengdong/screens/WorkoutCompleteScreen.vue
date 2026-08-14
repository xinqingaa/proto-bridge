<script setup lang="ts">
import { computed, ref } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
  type RouteLocationNormalized,
} from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import ConfirmDialog from "@/design-system/components/feedback/ConfirmDialog.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import Textarea from "@/design-system/components/input/Textarea.vue";
import {
  HENGDONG_TODAY,
  recordsInWeek,
  type Feeling,
  type WorkoutSession,
} from "../model";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, persistHengdong, saveRecord, saveWorkoutSession } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const initialVariant = String(route.query.variant ?? "default");
const plan = computed(
  () =>
    hengdongState.plans.find((item) => item.id === route.query.plan) ??
    hengdongState.plans.find(
      (item) => item.id === hengdongState.workoutSession?.planId,
    ) ??
    hengdongState.plans[0] ??
    null,
);

function summaryFixture(
  kind: "complete" | "partial",
  ready = false,
): WorkoutSession | null {
  if (!plan.value) return null;
  const completed =
    kind === "partial"
      ? plan.value.exercises.slice(
          0,
          Math.max(1, Math.ceil(plan.value.exercises.length / 2)),
        )
      : plan.value.exercises;
  return {
    planId: plan.value.id,
    currentExerciseIndex: Math.max(0, completed.length - 1),
    completedExerciseIds: completed.map((item) => item.id),
    elapsedSeconds:
      kind === "partial"
        ? Math.max(1, Math.round(plan.value.minutes / 2)) * 60
        : plan.value.minutes * 60,
    currentExerciseSeconds: 0,
    status: "summary",
    summaryKind: kind,
    summaryFeeling: ready ? "刚好" : "",
    summaryNote: "",
  };
}

function prepareSummary() {
  if (!plan.value || initialVariant === "invalid-summary") return;
  const existing = hengdongState.workoutSession;
  const hasMatchingSummary =
    existing?.planId === plan.value.id && existing.status === "summary";
  if (initialVariant === "partial") {
    if (!hasMatchingSummary || existing.summaryKind !== "partial") {
      saveWorkoutSession(summaryFixture("partial"));
    }
    return;
  }
  if (initialVariant === "ready-to-save") {
    if (!hasMatchingSummary || !existing.summaryFeeling) {
      saveWorkoutSession(summaryFixture("complete", true));
    }
    return;
  }
  if (initialVariant === "leave-confirm-open") {
    if (!hasMatchingSummary) {
      saveWorkoutSession(summaryFixture("complete"));
    }
    return;
  }
  if (
    !hengdongState.workoutSession ||
    hengdongState.workoutSession.planId !== plan.value.id ||
    hengdongState.workoutSession.status !== "summary"
  ) {
    saveWorkoutSession(summaryFixture("complete"));
  }
}

prepareSummary();

const session = computed(() => hengdongState.workoutSession);
const variant = computed(() => String(route.query.variant ?? "default"));
const partial = computed(() => session.value?.summaryKind === "partial");
const completedExercises = computed(() => {
  if (!plan.value || !session.value) return [];
  return session.value.completedExerciseIds
    .map((id) => plan.value!.exercises.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
});
const minutes = computed(() =>
  session.value
    ? Math.max(1, Math.round(session.value.elapsedSeconds / 60))
    : 0,
);
const resultingWeekCount = computed(
  () => recordsInWeek(hengdongState.records).length + 1,
);
const resultingGoalCount = computed(() =>
  Math.min(resultingWeekCount.value, hengdongState.goals.weeklySessions),
);
const completionPercent = computed(() => {
  if (!plan.value) return 0;
  return Math.round(
    (completedExercises.value.length / Math.max(1, plan.value.exercises.length)) *
      100,
  );
});
const ringStyle = computed(() => ({
  "--hd-completion-progress": `${completionPercent.value}%`,
}));
const feeling = computed<Feeling | "">({
  get: () => session.value?.summaryFeeling ?? "",
  set: (value) => {
    if (!session.value) return;
    session.value.summaryFeeling = value;
    persistHengdong();
  },
});
const note = computed({
  get: () => session.value?.summaryNote ?? "",
  set: (value: string) => {
    if (!session.value) return;
    session.value.summaryNote = value;
    persistHengdong();
  },
});
const canSave = computed(() => Boolean(feeling.value));
const saving = ref(false);
const allowNavigation = ref(false);
const previousVariant = ref("default");
const pendingDestination = ref("");
const forcedLeaveConfirmOpen = ref(false);
const leaveConfirmOpen = computed({
  get: () =>
    forcedLeaveConfirmOpen.value || variant.value === "leave-confirm-open",
  set: (open) => {
    if (!open) {
      forcedLeaveConfirmOpen.value = false;
      if (variant.value === "leave-confirm-open") {
        void replaceVariant(router, route, previousVariant.value);
      }
    }
  },
});

function guardSummaryNavigation(to: RouteLocationNormalized) {
  if (to.params.screenSlug === route.params.screenSlug) return true;
  if (allowNavigation.value || !session.value) return true;
  pendingDestination.value = to.fullPath;
  previousVariant.value =
    variant.value === "leave-confirm-open" ? "default" : variant.value;
  forcedLeaveConfirmOpen.value = true;
  return false;
}

onBeforeRouteUpdate(guardSummaryNavigation);
onBeforeRouteLeave(guardSummaryNavigation);

function save() {
  if (
    !canSave.value ||
    saving.value ||
    !session.value ||
    !plan.value ||
    !feeling.value
  ) {
    return;
  }
  saving.value = true;
  const recordNumber =
    hengdongState.records.filter(
      (record) => record.date === HENGDONG_TODAY && record.kind === "session",
    ).length + 1;
  saveRecord({
    id: `record-${HENGDONG_TODAY}-session-${recordNumber}`,
    date: HENGDONG_TODAY,
    kind: "session",
    activityType: "训练",
    planId: plan.value.id,
    title: plan.value.name,
    minutes: minutes.value,
    feeling: feeling.value,
    note: note.value.trim(),
    completedExerciseIds: completedExercises.value.map((item) => item.id),
  });
  saveWorkoutSession(null);
  allowNavigation.value = true;
  void replaceHengdongScreen(router, route, "today");
}

function discardAndLeave() {
  saveWorkoutSession(null);
  allowNavigation.value = true;
  if (pendingDestination.value) {
    void router.replace(pendingDestination.value);
    return;
  }
  void replaceHengdongScreen(router, route, "today");
}

function recoverToToday() {
  saveWorkoutSession(null);
  allowNavigation.value = true;
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <main
    class="hd-complete"
    data-pb-id="hengdong.workout-complete.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
  >
    <template v-if="initialVariant === 'invalid-summary' || !plan || !session">
      <section
        class="hd-complete-recovery"
        data-pb-id="hengdong.workout-complete.recovery"
        data-pb-role="error-state"
        data-pb-token-color="color.on-background"
        data-pb-token-spacing="spacing.xl"
      >
        <span class="hd-overline">结果无法恢复</span>
        <h1>这次训练还没有可保存的结果</h1>
        <p class="hd-muted">回到今天后可以重新开始，不会生成空记录。</p>
        <Button
          label="回到今天"
          block
          inspect-id="hengdong.workout-complete.recover"
          @click="recoverToToday"
        />
      </section>
    </template>

    <template v-else>
      <div class="hd-complete-scroll">
        <header
          class="hd-complete-result"
          data-pb-id="hengdong.workout-complete.summary"
          data-pb-role="summary"
          data-pb-token-color="color.on-background"
          data-pb-token-spacing="spacing.lg"
        >
          <div
            class="hd-completion-ring"
            :class="{ 'is-partial': partial }"
            :style="ringStyle"
            data-pb-id="hengdong.workout-complete.result-ring"
            data-pb-role="chart"
            data-pb-token-background="color.success-soft"
            data-pb-token-color="color.success"
            data-pb-token-size="layout.chart-min-height"
            data-pb-token-stroke="sizing.progress-track"
          >
            <div class="hd-completion-ring__content">
              <strong>{{ minutes }}</strong>
              <span>分钟</span>
              <small>{{ completedExercises.length }} / {{ plan.exercises.length }} 个动作</small>
            </div>
          </div>
          <div class="hd-complete-copy">
            <span class="hd-overline">{{ partial ? "已保存完成的部分" : "完成训练" }}</span>
            <h1>{{ partial ? "已完成一部分" : "这次训练完成了" }}</h1>
            <p class="hd-muted">
              {{ partial ? "按实际完成保存，也是一条真实记录。" : "停在刚刚好的位置，让结果留下来。" }}
            </p>
          </div>
        </header>

        <section
          class="hd-complete-facts"
          data-pb-id="hengdong.workout-complete.facts"
          data-pb-role="summary"
          data-pb-token-color="color.on-surface"
          data-pb-token-spacing="spacing.md"
        >
          <div>
            <span>计划</span>
            <strong>{{ plan.name }}</strong>
          </div>
          <div>
            <span>实际用时</span>
            <strong>{{ minutes }} 分钟</strong>
          </div>
          <div>
            <span>完成动作</span>
            <strong>{{ completedExercises.length }} / {{ plan.exercises.length }}</strong>
          </div>
        </section>

        <section
          class="hd-complete-exercises"
          data-pb-id="hengdong.workout-complete.exercise-list"
          data-pb-role="list"
          data-pb-token-color="color.on-surface"
          data-pb-token-spacing="spacing.sm"
        >
          <div class="hd-complete-section-heading">
            <h2>本次完成</h2>
            <span>{{ partial ? "按实际进度保存" : "全部完成" }}</span>
          </div>
          <div
            v-for="item in completedExercises"
            :key="item.id"
            class="hd-complete-exercise"
            data-pb-id="hengdong.workout-complete.exercise"
            :data-pb-key="item.id"
            data-pb-role="list-item"
            data-pb-token-color="color.on-surface"
            data-pb-token-spacing="spacing.sm"
          >
            <span class="hd-complete-check" aria-hidden="true" />
            <strong>{{ item.name }}</strong>
            <small>{{ item.prescription }}</small>
          </div>
        </section>

        <section
          class="hd-complete-week"
          data-pb-id="hengdong.workout-complete.week-impact"
          data-pb-role="status"
          data-pb-token-background="color.primary-soft"
          data-pb-token-color="color.primary"
          data-pb-token-spacing="spacing.md"
        >
          <span>保存后，本周将达到</span>
          <strong>{{ resultingGoalCount }} / {{ hengdongState.goals.weeklySessions }} 次活动</strong>
        </section>

        <section
          class="hd-complete-reflection"
          data-pb-id="hengdong.workout-complete.reflection"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
        >
          <div class="hd-complete-section-heading">
            <h2>这次身体感觉怎样？</h2>
            <span>选择后即可保存</span>
          </div>
          <RadioGroup
            v-model="feeling"
            label="完成体感"
            :options="['轻松', '刚好', '吃力']"
            inspect-id="hengdong.workout-complete.feeling"
          />
          <Textarea
            v-model="note"
            label="备注（可选）"
            :show-label="true"
            placeholder="例如：肩颈松了一些"
            inspect-id="hengdong.workout-complete.note"
          />
        </section>
      </div>

      <footer
        class="hd-complete-actions"
        data-pb-id="hengdong.workout-complete.actions"
        data-pb-role="bottom-bar"
        data-pb-token-background="color.surface-raised"
        data-pb-token-border="color.border"
        data-pb-token-spacing="spacing.sm"
      >
        <p v-if="!canSave" class="hd-complete-required">
          选择本次体感后才能保存。
        </p>
        <Button
          label="保存并回到今天"
          block
          :disabled="!canSave"
          :loading="saving"
          inspect-id="hengdong.workout-complete.save"
          data-pb-action="save-workout"
          @click="save"
        />
      </footer>
    </template>

    <ConfirmDialog
      v-model="leaveConfirmOpen"
      title="这次训练还没有保存"
      message="离开会丢弃当前结果、体感和备注。"
      confirm-label="放弃并离开"
      inspect-id="hengdong.workout-complete.leave-confirm"
      @confirm="discardAndLeave"
    />
  </main>
</template>

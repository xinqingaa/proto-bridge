<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
  type RouteLocationNormalized,
} from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";
import { formatDuration, type Exercise, type WorkoutSession } from "../model";
import { goBackHengdong, openHengdongScreen, replaceHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, persistHengdong, saveWorkoutSession } from "../storage";
import WorkoutPose, {
  type WorkoutPoseName,
} from "../components/WorkoutPose.vue";
import "../hengdong.css";

const FEEDBACK_DURATION = tokenDefaultNumber("motion.duration-toast");
const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const requestedPlanId = computed(() =>
  typeof route.query.plan === "string" ? route.query.plan : "",
);
const requestedPlan = computed(() =>
  hengdongState.plans.find((item) => item.id === requestedPlanId.value),
);
const invalidSession = computed(
  () =>
    variant.value === "invalid-session" ||
    (Boolean(requestedPlanId.value) && !requestedPlan.value),
);
const plan = computed(
  () =>
    requestedPlan.value ??
    hengdongState.plans.find(
      (item) => item.id === hengdongState.workoutSession?.planId,
    ) ??
    hengdongState.plans.find((item) => item.id === hengdongState.activePlanId) ??
    hengdongState.plans[0] ??
    null,
);

function fixtureSession(
  kind: "default" | "progress" | "last" | "empty-exit",
): WorkoutSession | null {
  const selectedPlan = plan.value;
  if (!selectedPlan) return null;
  const lastIndex = Math.max(0, selectedPlan.exercises.length - 1);
  if (kind === "last") {
    return {
      planId: selectedPlan.id,
      currentExerciseIndex: lastIndex,
      completedExerciseIds: selectedPlan.exercises
        .slice(0, lastIndex)
        .map((item) => item.id),
      elapsedSeconds: 812,
      currentExerciseSeconds: 0,
      status: "running",
    };
  }
  if (kind === "progress") {
    const currentIndex = Math.min(1, lastIndex);
    return {
      planId: selectedPlan.id,
      currentExerciseIndex: currentIndex,
      completedExerciseIds:
        currentIndex > 0 ? [selectedPlan.exercises[0]!.id] : [],
      elapsedSeconds: 402,
      currentExerciseSeconds: 0,
      status: "paused",
    };
  }
  return {
    planId: selectedPlan.id,
    currentExerciseIndex: 0,
    completedExerciseIds: [],
    elapsedSeconds: kind === "empty-exit" ? 42 : 0,
    currentExerciseSeconds: 0,
    status: kind === "empty-exit" ? "paused" : "running",
  };
}

function prepareSession(variantId: string, preserveProductSession = false) {
  if (invalidSession.value || !plan.value) {
    saveWorkoutSession(null);
    return;
  }
  if (variantId === "last-exercise") {
    saveWorkoutSession(fixtureSession("last"));
    return;
  }
  const existing = hengdongState.workoutSession;
  const hasMatchingSession =
    existing?.planId === plan.value.id && existing.status !== "summary";
  if (preserveProductSession && hasMatchingSession) {
    if (["paused", "resumed", "exit-confirm-open"].includes(variantId)) {
      existing.status = "paused";
      persistHengdong();
    }
    return;
  }
  if (["paused", "resumed", "exit-confirm-open"].includes(variantId)) {
    saveWorkoutSession(fixtureSession("progress"));
    return;
  }
  if (variantId === "exit-confirm-empty") {
    saveWorkoutSession(fixtureSession("empty-exit"));
    return;
  }
  saveWorkoutSession(fixtureSession("default"));
}

const session = computed(() => hengdongState.workoutSession);
const exercise = computed<Exercise | null>(() => {
  if (!plan.value || !session.value) return null;
  return plan.value.exercises[session.value.currentExerciseIndex] ?? null;
});
const nextExercise = computed(() => {
  if (!plan.value || !session.value) return null;
  return plan.value.exercises[session.value.currentExerciseIndex + 1] ?? null;
});
const isLastExercise = computed(
  () =>
    Boolean(plan.value && session.value) &&
    session.value!.currentExerciseIndex >= plan.value!.exercises.length - 1,
);
const forcedExitOpen = ref(false);
const exitOpen = computed({
  get: () =>
    forcedExitOpen.value ||
    ["exit-confirm-open", "exit-confirm-empty"].includes(variant.value),
  set: (open) => {
    if (!open) {
      forcedExitOpen.value = false;
      continueTraining();
    }
  },
});
const progressLabel = computed(() => {
  if (!plan.value || !session.value) return "";
  return `${session.value.completedExerciseIds.length} / ${plan.value.exercises.length} 个动作已完成`;
});
const targetValue = computed(() => {
  if (!exercise.value || !session.value) return "";
  if (exercise.value.mode === "reps") return String(exercise.value.target);
  return formatDuration(
    Math.max(0, exercise.value.target - session.value.currentExerciseSeconds),
  );
});
const targetUnit = computed(() =>
  exercise.value?.mode === "reps" ? "次" : "剩余",
);
const cue = computed(() => {
  switch (exercise.value?.id) {
    case "neck-roll":
      return "放松肩膀，让呼吸带动缓慢环绕。";
    case "body-squat":
    case "squat":
      return "臀部向后坐，膝盖跟随脚尖方向。";
    case "incline-push":
    case "push-up":
      return "身体保持一条直线，推起时自然呼气。";
    case "dead-bug":
    case "plank":
      return "保持腹部稳定，不需要追求动作速度。";
    default:
      return exercise.value?.prescription ?? "动作放慢，保持自然呼吸。";
  }
});
const pose = computed<WorkoutPoseName>(() => {
  const id = exercise.value?.id ?? "";
  if (["neck-roll", "cat-cow"].includes(id)) return "mobilize";
  if (["body-squat", "squat", "lunge"].includes(id)) return "squat";
  if (["incline-push", "push-up"].includes(id)) return "push";
  if (["dead-bug", "plank"].includes(id)) return "core";
  return "neutral";
});
const resumedNotice = computed(() => variant.value === "resumed");
const transitionFeedback = ref("");
const exitPreviousStatus = ref<"running" | "paused">("running");
const allowNavigation = ref(false);

let timer: number | undefined;
let feedbackTimer: number | undefined;
let preservedVariantNavigation: string | null = null;
let hasPreparedRoute = false;

function replaceVariantPreservingSession(nextVariant: string) {
  if (variant.value === nextVariant) return;
  preservedVariantNavigation = nextVariant;
  void replaceVariant(router, route, nextVariant).catch(() => {
    if (preservedVariantNavigation === nextVariant) {
      preservedVariantNavigation = null;
    }
  });
}

watch(
  [variant, requestedPlanId],
  ([nextVariant]) => {
    if (preservedVariantNavigation === nextVariant) {
      preservedVariantNavigation = null;
      return;
    }
    const preserveProductSession =
      !hasPreparedRoute && window.history.state?.pbScope === "hengdong";
    hasPreparedRoute = true;
    forcedExitOpen.value = false;
    transitionFeedback.value = "";
    allowNavigation.value = false;
    prepareSession(nextVariant, preserveProductSession);
  },
  { immediate: true },
);

function setTransitionFeedback(message: string) {
  transitionFeedback.value = message;
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    transitionFeedback.value = "";
  }, FEEDBACK_DURATION);
}

function tick() {
  if (session.value?.status !== "running" || !exercise.value) return;
  session.value.elapsedSeconds += 1;
  session.value.currentExerciseSeconds += 1;
  if (
    exercise.value.mode === "timer" &&
    session.value.currentExerciseSeconds >= exercise.value.target
  ) {
    completeCurrent();
    return;
  }
  persistHengdong();
}

onMounted(() => {
  if (session.value?.status === "summary" && plan.value) {
    allowNavigation.value = true;
    void replaceHengdongScreen(
      router,
      route,
      "workout-complete",
      session.value.summaryKind === "partial" ? "partial" : "default",
      { plan: plan.value.id },
    );
    return;
  }
  timer = window.setInterval(tick, 1000);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
  if (session.value) persistHengdong();
});

function guardSessionNavigation(to: RouteLocationNormalized) {
  if (to.params.screenSlug === route.params.screenSlug) return true;
  if (
    allowNavigation.value ||
    invalidSession.value ||
    !session.value ||
    session.value.status === "summary"
  ) {
    return true;
  }
  exitPreviousStatus.value =
    session.value.status === "paused" ? "paused" : "running";
  session.value.status = "paused";
  persistHengdong();
  forcedExitOpen.value = true;
  return false;
}

onBeforeRouteUpdate(guardSessionNavigation);
onBeforeRouteLeave(guardSessionNavigation);

function togglePause() {
  if (!session.value) return;
  if (session.value.status === "paused") {
    session.value.status = "running";
    replaceVariantPreservingSession("default");
  } else {
    session.value.status = "paused";
    replaceVariantPreservingSession("paused");
  }
  persistHengdong();
}

function completeCurrent() {
  if (!session.value || !exercise.value || !plan.value) return;
  const current = exercise.value;
  if (!session.value.completedExerciseIds.includes(current.id)) {
    session.value.completedExerciseIds.push(current.id);
  }
  if (isLastExercise.value) {
    session.value.status = "summary";
    session.value.summaryKind = "complete";
    session.value.summaryFeeling = "";
    session.value.summaryNote = "";
    persistHengdong();
    allowNavigation.value = true;
    void openHengdongScreen(
      router,
      route,
      "workout-complete",
      "default",
      { plan: plan.value.id },
    );
    return;
  }
  session.value.currentExerciseIndex += 1;
  session.value.currentExerciseSeconds = 0;
  session.value.status = "running";
  persistHengdong();
  setTransitionFeedback(`${current.name}已完成，接着做下一个动作`);
  if (variant.value !== "default") {
    replaceVariantPreservingSession("default");
  }
}

function previousExercise() {
  if (!session.value || !plan.value || session.value.currentExerciseIndex <= 0)
    return;
  const previous = plan.value.exercises[session.value.currentExerciseIndex - 1];
  session.value.currentExerciseIndex -= 1;
  session.value.currentExerciseSeconds = 0;
  session.value.status = "running";
  if (previous) {
    session.value.completedExerciseIds =
      session.value.completedExerciseIds.filter((id) => id !== previous.id);
  }
  persistHengdong();
  replaceVariantPreservingSession("default");
}

function openExit() {
  if (!session.value) return;
  exitPreviousStatus.value =
    session.value.status === "paused" ? "paused" : "running";
  session.value.status = "paused";
  persistHengdong();
  replaceVariantPreservingSession(
    session.value.completedExerciseIds.length > 0
      ? "exit-confirm-open"
      : "exit-confirm-empty",
  );
}

function continueTraining() {
  if (!session.value) return;
  forcedExitOpen.value = false;
  session.value.status = exitPreviousStatus.value;
  persistHengdong();
  if (["exit-confirm-open", "exit-confirm-empty"].includes(variant.value)) {
    replaceVariantPreservingSession(
      session.value.status === "paused" ? "paused" : "default",
    );
  }
}

function leaveForLater() {
  if (!session.value) return;
  session.value.status = "paused";
  persistHengdong();
  allowNavigation.value = true;
  void replaceHengdongScreen(router, route, "today");
}

function savePartial() {
  if (
    !session.value ||
    !plan.value ||
    session.value.completedExerciseIds.length === 0
  ) {
    return;
  }
  session.value.status = "summary";
  session.value.summaryKind = "partial";
  session.value.summaryFeeling = "";
  session.value.summaryNote = "";
  persistHengdong();
  allowNavigation.value = true;
  void openHengdongScreen(router, route, "workout-complete", "partial", {
    plan: plan.value.id,
  });
}

function discard() {
  saveWorkoutSession(null);
  allowNavigation.value = true;
  void goBackHengdong(router, route, "today");
}

function recoverToToday() {
  allowNavigation.value = true;
  void replaceHengdongScreen(router, route, "today");
}
</script>

<template>
  <main
    class="hd-session"
    :class="{
      'is-paused': session?.status === 'paused',
      'is-invalid': invalidSession,
    }"
    data-pb-id="hengdong.workout-session.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
  >
    <template v-if="invalidSession || !plan || !session || !exercise">
      <section
        class="hd-session-recovery"
        data-pb-id="hengdong.workout-session.recovery"
        data-pb-role="error-state"
        data-pb-token-color="color.on-background"
        data-pb-token-spacing="spacing.xl"
      >
        <span class="hd-overline">训练无法恢复</span>
        <h1>这次训练信息已经失效</h1>
        <p class="hd-muted">回到今天后可以重新开始，不会生成错误记录。</p>
        <Button
          label="回到今天"
          block
          inspect-id="hengdong.workout-session.recover"
          @click="recoverToToday"
        />
      </section>
    </template>

    <template v-else>
      <header
        class="hd-session-top"
        data-pb-id="hengdong.workout-session.focus-header"
        data-pb-role="app-bar"
        data-pb-token-background="color.background"
        data-pb-token-color="color.on-background"
        data-pb-token-spacing="spacing.lg"
      >
        <Button
          label="退出"
          size="sm"
          kind="outlined"
          inspect-id="hengdong.workout-session.exit"
          data-pb-action="open-exit"
          @click="openExit"
        />
        <div class="hd-session-context">
          <strong>{{ plan.name }}</strong>
          <span>动作 {{ session.currentExerciseIndex + 1 }} / {{ plan.exercises.length }}</span>
        </div>
        <strong class="hd-session-elapsed">{{ formatDuration(session.elapsedSeconds) }}</strong>
      </header>

      <section
        class="hd-session-sequence"
        :aria-label="progressLabel"
        data-pb-id="hengdong.workout-session.sequence"
        data-pb-role="status"
        data-pb-token-color="color.primary"
        data-pb-token-background="color.primary-soft"
        data-pb-token-size="sizing.step-dot"
        data-pb-token-spacing="spacing.sm"
      >
        <span
          v-for="(item, index) in plan.exercises"
          :key="item.id"
          class="hd-session-sequence__item"
          :class="{
            'is-done': session.completedExerciseIds.includes(item.id),
            'is-current': index === session.currentExerciseIndex,
          }"
          :data-pb-id="'hengdong.workout-session.sequence.item'"
          :data-pb-key="item.id"
          data-pb-role="status"
          data-pb-token-color="color.primary"
          data-pb-token-background="color.primary-soft"
          data-pb-token-size="sizing.step-dot"
          :aria-current="index === session.currentExerciseIndex ? 'step' : undefined"
        />
      </section>

      <div class="hd-session-scroll">
        <p
          v-if="resumedNotice"
          class="hd-session-notice"
          data-pb-id="hengdong.workout-session.resume-notice"
          data-pb-role="status"
          data-pb-token-background="color.primary-soft"
          data-pb-token-color="color.primary"
          data-pb-token-spacing="spacing.sm"
        >
          进度已保留，准备好后继续
        </p>
        <p
          v-if="transitionFeedback"
          class="hd-session-notice"
          data-pb-id="hengdong.workout-session.transition-feedback"
          data-pb-role="status"
          data-pb-token-background="color.success-soft"
          data-pb-token-color="color.success"
          data-pb-token-spacing="spacing.sm"
          aria-live="polite"
        >
          {{ transitionFeedback }}
        </p>

        <section
          class="hd-session-body"
          data-pb-id="hengdong.workout-session.current-exercise"
          data-pb-role="summary"
          data-pb-token-color="color.on-background"
          data-pb-token-spacing="spacing.lg"
        >
          <div class="hd-session-heading">
            <span class="hd-session-index">当前动作</span>
            <h1>{{ exercise.name }}</h1>
            <p class="hd-session-target">{{ exercise.prescription }}</p>
          </div>

          <div
            class="hd-session-stage"
            data-pb-id="hengdong.workout-session.body-stage"
            data-pb-role="image"
            data-pb-token-color="color.primary"
            data-pb-token-background="color.primary-soft"
            data-pb-token-border="color.border"
            data-pb-token-motion="motion.duration-normal"
          >
            <span class="hd-session-orbit is-wide" aria-hidden="true" />
            <span class="hd-session-orbit is-tight" aria-hidden="true" />
            <WorkoutPose :pose="pose" />
            <div class="hd-session-count" aria-live="polite">
              <strong>{{ session.status === "paused" ? "暂停" : targetValue }}</strong>
              <span>{{ session.status === "paused" ? "计时已停止" : targetUnit }}</span>
            </div>
          </div>

          <section
            class="hd-session-cue"
            data-pb-id="hengdong.workout-session.cue"
            data-pb-role="text"
            data-pb-token-color="color.on-surface-muted"
            data-pb-token-typography="typography.content"
            data-pb-token-spacing="spacing.sm"
          >
            <span>动作提示</span>
            <p>{{ cue }}</p>
          </section>

          <div
            class="hd-session-next"
            data-pb-id="hengdong.workout-session.next-exercise"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-background="color.surface-recessed"
            data-pb-token-spacing="spacing.md"
          >
            <span>{{ nextExercise ? "接下来" : "完成后" }}</span>
            <strong>{{ nextExercise?.name ?? "确认这次训练结果" }}</strong>
            <small>{{ nextExercise?.prescription ?? "保存体感并回到今天" }}</small>
          </div>

          <Button
            v-if="session.currentExerciseIndex > 0 && session.status !== 'paused'"
            label="回到上一个动作"
            kind="outlined"
            inspect-id="hengdong.workout-session.previous"
            @click="previousExercise"
          />
        </section>
      </div>

      <footer
        class="hd-session-actions"
        data-pb-id="hengdong.workout-session.actions"
        data-pb-role="bottom-bar"
        data-pb-token-background="color.surface-raised"
        data-pb-token-border="color.border"
        data-pb-token-spacing="spacing.md"
      >
        <Button
          v-if="session.status === 'paused'"
          label="继续训练"
          block
          inspect-id="hengdong.workout-session.resume"
          data-pb-action="resume-workout"
          @click="togglePause"
        />
        <template v-else>
          <Button
            label="暂停"
            kind="secondary"
            inspect-id="hengdong.workout-session.pause"
            data-pb-action="pause-workout"
            @click="togglePause"
          />
          <Button
            :label="isLastExercise ? '完成训练' : '完成当前动作'"
            inspect-id="hengdong.workout-session.complete-exercise"
            data-pb-action="complete-exercise"
            @click="completeCurrent"
          />
        </template>
      </footer>
    </template>

    <BottomSheet
      v-if="session"
      v-model="exitOpen"
      title="这次训练要怎么处理？"
      inspect-id="hengdong.workout-session.exit-sheet"
    >
      <div
        class="hd-exit-options"
        data-pb-id="hengdong.workout-session.exit-results"
        data-pb-role="section"
        data-pb-token-spacing="spacing.sm"
      >
        <p class="hd-muted">
          已完成 {{ session.completedExerciseIds.length }} / {{ plan?.exercises.length ?? 0 }} 个动作。离开时不会在后台继续计时。
        </p>
        <Button
          label="继续训练"
          block
          inspect-id="hengdong.workout-session.exit-continue"
          @click="continueTraining"
        />
        <Button
          label="稍后继续"
          block
          kind="secondary"
          inspect-id="hengdong.workout-session.leave-later"
          data-pb-action="leave-for-later"
          @click="leaveForLater"
        />
        <Button
          label="保存已完成部分"
          block
          :disabled="session.completedExerciseIds.length === 0"
          kind="secondary"
          inspect-id="hengdong.workout-session.save-partial"
          data-pb-action="save-partial-workout"
          @click="savePartial"
        />
        <p v-if="session.completedExerciseIds.length === 0" class="hd-exit-hint">
          完成至少一个动作后，才能保存部分训练。
        </p>
        <Button
          label="放弃本次"
          block
          kind="secondary"
          inspect-id="hengdong.workout-session.discard"
          @click="discard"
        />
      </div>
    </BottomSheet>
  </main>
</template>

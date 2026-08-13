<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import { formatDuration } from "../model";
import { goBackHengdong, openHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, persistHengdong, saveWorkoutSession } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const plan = computed(
  () =>
    hengdongState.plans.find((item) => item.id === route.query.plan) ??
    hengdongState.plans[0]!,
);

if (
  !hengdongState.workoutSession ||
  hengdongState.workoutSession.planId !== plan.value.id
) {
  saveWorkoutSession({
    planId: plan.value.id,
    currentExerciseIndex: 0,
    completedExerciseIds: [],
    elapsedSeconds: 0,
    currentExerciseSeconds: 0,
    status: "running",
  });
}

const session = computed(() => hengdongState.workoutSession!);
const exercise = computed(
  () => plan.value.exercises[session.value.currentExerciseIndex]!,
);
const variant = computed(() => String(route.query.variant ?? "default"));
const exitOpen = computed({
  get: () => variant.value === "exit-confirm-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "exit-confirm-open" : "default"),
});
const progress = computed(() =>
  Math.round(
    (session.value.completedExerciseIds.length / plan.value.exercises.length) *
      100,
  ),
);
const timerText = computed(() => {
  if (exercise.value.mode === "reps") return `${exercise.value.target} 次`;
  return formatDuration(
    Math.max(0, exercise.value.target - session.value.currentExerciseSeconds),
  );
});

let timer: number | undefined;

function tick() {
  if (session.value.status !== "running") return;
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
  timer = window.setInterval(tick, 1000);
});

onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer);
  persistHengdong();
});

function togglePause() {
  session.value.status =
    session.value.status === "paused" ? "running" : "paused";
  persistHengdong();
}

function completeCurrent() {
  const current = exercise.value;
  if (!session.value.completedExerciseIds.includes(current.id)) {
    session.value.completedExerciseIds.push(current.id);
  }
  if (session.value.currentExerciseIndex >= plan.value.exercises.length - 1) {
    persistHengdong();
    void openHengdongScreen(router, route, "workout-complete", "default", {
      plan: plan.value.id,
    });
    return;
  }
  session.value.currentExerciseIndex += 1;
  session.value.currentExerciseSeconds = 0;
  session.value.status = "running";
  persistHengdong();
}

function previousExercise() {
  if (session.value.currentExerciseIndex <= 0) return;
  const previous = plan.value.exercises[session.value.currentExerciseIndex - 1];
  session.value.currentExerciseIndex -= 1;
  session.value.currentExerciseSeconds = 0;
  if (previous) {
    session.value.completedExerciseIds =
      session.value.completedExerciseIds.filter((id) => id !== previous.id);
  }
  persistHengdong();
}

function savePartial() {
  exitOpen.value = false;
  void openHengdongScreen(router, route, "workout-complete", "default", {
    plan: plan.value.id,
    partial: "1",
  });
}

function discard() {
  saveWorkoutSession(null);
  exitOpen.value = false;
  void goBackHengdong(router, route, "today");
}
</script>

<template>
  <main
    class="hd-session"
    :class="{ 'is-paused': session.status === 'paused' }"
    data-pb-id="hengdong.workout-session.root"
    data-pb-role="page"
    data-pb-token-background="color.background"
    data-pb-token-color="color.on-background"
  >
    <header
      class="hd-session-top"
      data-pb-id="hengdong.workout-session.focus-header"
      data-pb-role="section"
      data-pb-token-spacing="spacing.lg"
    >
      <Button
        label="退出"
        size="sm"
        bg-color="transparent"
        border-color="transparent"
        text-color="color.on-surface-muted"
        inspect-id="hengdong.workout-session.exit"
        @click="exitOpen = true"
      />
      <span class="hd-caption">{{ plan.name }}</span>
      <span class="hd-caption">{{
        formatDuration(session.elapsedSeconds)
      }}</span>
    </header>

    <Progress
      :value="progress"
      :label="`已完成 ${session.completedExerciseIds.length} / ${plan.exercises.length}`"
      inspect-id="hengdong.workout-session.progress"
    />

    <section
      class="hd-session-body"
      data-pb-id="hengdong.workout-session.current-exercise"
      data-pb-role="summary"
      data-pb-token-color="color.on-surface"
      data-pb-token-spacing="spacing.xl"
    >
      <span class="hd-session-index"
        >动作 {{ session.currentExerciseIndex + 1 }} /
        {{ plan.exercises.length }}</span
      >
      <h1>{{ exercise.name }}</h1>
      <p class="hd-session-target">{{ exercise.prescription }}</p>
      <strong class="hd-session-timer">{{
        session.status === "paused" ? "已暂停" : timerText
      }}</strong>
      <Button
        v-if="session.currentExerciseIndex > 0"
        label="回到上一个动作"
        bg-color="transparent"
        border-color="transparent"
        text-color="color.primary"
        inspect-id="hengdong.workout-session.previous"
        @click="previousExercise"
      />
    </section>

    <footer class="hd-session-actions">
      <Button
        :label="session.status === 'paused' ? '继续' : '暂停'"
        bg-color="color.surface"
        border-color="color.border"
        text-color="color.on-surface"
        inspect-id="hengdong.workout-session.pause"
        @click="togglePause"
      />
      <Button
        :label="
          session.currentExerciseIndex === plan.exercises.length - 1
            ? '完成训练'
            : '完成当前动作'
        "
        :disabled="session.status === 'paused'"
        inspect-id="hengdong.workout-session.complete-exercise"
        data-pb-action="complete-exercise"
        @click="completeCurrent"
      />
    </footer>

    <BottomSheet
      v-model="exitOpen"
      title="要结束这次训练吗？"
      inspect-id="hengdong.workout-session.exit-sheet"
    >
      <div class="hd-flow-step">
        <p class="hd-muted">
          已完成
          {{
            session.completedExerciseIds.length
          }}
          个动作。你可以保存已完成的部分，或稍后继续。
        </p>
        <Button
          label="保存已完成部分"
          inspect-id="hengdong.workout-session.save-partial"
          @click="savePartial"
        />
        <Button
          label="继续训练"
          bg-color="color.surface"
          border-color="color.border"
          text-color="color.on-surface"
          @click="exitOpen = false"
        />
        <Button
          label="放弃本次"
          bg-color="color.error-soft"
          border-color="color.error-soft"
          text-color="color.error"
          inspect-id="hengdong.workout-session.discard"
          @click="discard"
        />
      </div>
    </BottomSheet>
  </main>
</template>

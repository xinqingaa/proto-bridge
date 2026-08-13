<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import Textarea from "@/design-system/components/input/Textarea.vue";
import { HENGDONG_TODAY, recordsInWeek, type Feeling } from "../model";
import { replaceHengdongScreen } from "../nav";
import { hengdongState, saveRecord, saveWorkoutSession } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const feeling = ref<Feeling>("刚好");
const note = ref("");
const plan = computed(
  () =>
    hengdongState.plans.find((item) => item.id === route.query.plan) ??
    hengdongState.plans[0]!,
);
const session = computed(() => hengdongState.workoutSession);
const partial = computed(() => route.query.partial === "1");
const completedIds = computed(
  () =>
    session.value?.completedExerciseIds ??
    plan.value.exercises.map((exercise) => exercise.id),
);
const minutes = computed(() =>
  session.value
    ? Math.max(1, Math.round(session.value.elapsedSeconds / 60))
    : plan.value.minutes,
);
const resultingWeekCount = computed(
  () => recordsInWeek(hengdongState.records).length + 1,
);
const goalProgress = computed(() =>
  Math.min(
    100,
    Math.round(
      (resultingWeekCount.value / hengdongState.goals.weeklySessions) * 100,
    ),
  ),
);

function save() {
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
    completedExerciseIds: completedIds.value,
  });
  saveWorkoutSession(null);
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
    data-pb-token-spacing="spacing.xl"
  >
    <header
      class="hd-complete-surface"
      data-pb-id="hengdong.workout-complete.summary"
      data-pb-role="summary"
      data-pb-token-background="color.success-soft"
      data-pb-token-color="color.success"
      data-pb-token-radius="radius.xl"
      data-pb-token-spacing="spacing.lg"
    >
      <span class="hd-overline">{{
        partial ? "已保存完成的部分" : "这次训练完成了"
      }}</span>
      <h1>{{ minutes }} 分钟</h1>
      <p>
        {{ plan.name }} · {{ completedIds.length }} /
        {{ plan.exercises.length }} 个动作
      </p>
      <Progress
        :value="goalProgress"
        :label="`保存后，本周 ${resultingWeekCount} / ${hengdongState.goals.weeklySessions} 次`"
        inspect-id="hengdong.workout-complete.goal-progress"
      />
    </header>

    <section
      class="hd-form-section"
      data-pb-id="hengdong.workout-complete.reflection"
      data-pb-role="form"
      data-pb-token-spacing="spacing.md"
    >
      <h2>给这次训练留一个感觉</h2>
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

    <div class="hd-spacer" />
    <Button
      label="保存并回到今天"
      block
      inspect-id="hengdong.workout-complete.save"
      data-pb-action="save-workout"
      @click="save"
    />
  </main>
</template>

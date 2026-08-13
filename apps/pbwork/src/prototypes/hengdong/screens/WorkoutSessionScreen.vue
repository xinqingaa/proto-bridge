<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import HengdongShell from "../HengdongShell.vue";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import { getPlans, saveRecord } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const storedPlans = getPlans();
const fallbackPlan = storedPlans[0]!;
const plan = computed(
  () =>
    storedPlans.find((item) => item.id === route.query.plan) ?? fallbackPlan,
);
const checked = ref<Record<string, boolean>>({});
const paused = ref(false);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const exitOpen = computed({
  get: () => variant.value === "exit-confirm-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "exit-confirm-open" : "default"),
});
const doneCount = computed(
  () => plan.value.exercises.filter((item) => checked.value[item.id]).length,
);
const progress = computed(() =>
  Math.round((doneCount.value / plan.value.exercises.length) * 100),
);

function finish() {
  saveRecord({
    id: "record-20260813",
    date: "2026-08-13",
    planId: plan.value.id,
    planName: plan.value.name,
    minutes: plan.value.minutes,
    feeling: "刚好",
    note: "完成今日训练。",
    completedExerciseIds: plan.value.exercises.map((item) => item.id),
  });
  toast.value = true;
  void replaceHengdongScreen(router, route, "record-detail", "completed", {
    record: "record-20260813",
  });
}
</script>

<template>
  <HengdongShell
    title="训练进行中"
    screen-id="hengdong.workout-session"
    back-to="plans"
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.workout-session.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <div class="hd-session-content">
        <header
          class="hd-session-head"
          data-pb-id="hengdong.workout-session.summary"
          data-pb-role="summary"
          data-pb-token-background="color.primary-soft"
          data-pb-token-color="color.on-surface"
          data-pb-token-spacing="spacing.lg"
        >
          <span class="hd-inline"
            ><Chip
              :label="paused ? '已暂停' : '进行中'"
              :tone="paused ? 'warning' : 'success'"
            /><span class="hd-caption">{{ plan.name }}</span></span
          >
          <strong class="hd-session-time">{{
            paused ? "暂停" : "12:48"
          }}</strong>
          <Progress
            :value="progress"
            :label="`完成 ${doneCount} / ${plan.exercises.length} 个动作`"
            inspect-id="hengdong.workout-session.progress"
          />
        </header>
        <div class="hd-session-list">
          <Card
            v-for="(exercise, index) in plan.exercises"
            :key="exercise.id"
            semantic-role="card"
            :inspect-id="`hengdong.workout-session.exercise.${exercise.id}`"
          >
            <div class="hd-card-body hd-session-card">
              <span class="hd-eyebrow">动作 {{ index + 1 }}</span>
              <h2 class="hd-card-title">{{ exercise.name }}</h2>
              <p class="hd-muted">{{ exercise.prescription }}</p>
              <Checkbox
                :model-value="Boolean(checked[exercise.id])"
                label="这一项已完成"
                :inspect-id="`hengdong.workout-session.check.${exercise.id}`"
                @update:model-value="checked[exercise.id] = $event"
              />
            </div>
          </Card>
        </div>
        <div class="hd-session-actions">
          <Button
            :label="paused ? '继续' : '暂停'"
            bg-color="color.surface"
            border-color="color.border"
            text-color="color.on-surface"
            inspect-id="hengdong.workout-session.pause"
            @click="paused = !paused"
          /><Button
            label="完成训练"
            inspect-id="hengdong.workout-session.finish"
            data-pb-action="finish-session"
            @click="finish"
          />
        </div>
      </div>
      <Confirm
        v-model="exitOpen"
        title="结束本次训练？"
        message="当前完成状态会保留在此页面，尚不会生成训练记录。"
        confirm-label="结束训练"
        inspect-id="hengdong.workout-session.exit-confirm"
      />
      <Toast
        v-model="toast"
        message="本次训练已记录"
        inspect-id="hengdong.workout-session.toast"
      />
    </section>
  </HengdongShell>
</template>

<style scoped>
.hd-session-content {
  display: flex;
  flex-direction: column;
  height: var(--pb-layout-fill);
  min-height: var(--pb-spacing-none);
}
.hd-session-head {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-lg);
  background: var(--pb-color-primary-soft);
}
.hd-session-time {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-display);
}
.hd-session-list {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-height: var(--pb-spacing-none);
  flex-direction: column;
  gap: var(--pb-spacing-md);
  overflow: auto;
  padding: var(--pb-spacing-md);
}
.hd-session-card {
  min-height: var(--pb-sizing-menu-item);
}
.hd-session-actions {
  display: flex;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  border-top: var(--pb-border-hairline);
  background: var(--pb-color-surface-raised);
}
.hd-session-actions > * {
  flex: var(--pb-layout-flex-fill);
}
</style>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import HengdongShell from "../HengdongShell.vue";
import PlanEditorFlow from "../components/PlanEditorFlow.vue";
import { recordsInWeek } from "../model";
import {
  openHengdongScreen,
  replaceHengdongScreen,
  replaceVariant,
} from "../nav";
import {
  adoptPlan as adoptStoredPlan,
  hengdongState,
  setActivePlan,
} from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const previousPlanId = ref(
  variant.value === "adopted-feedback" ? "wake-up-15" : "",
);
const toast = ref(false);
const requestedPlanId = computed(() =>
  variant.value === "invalid-plan"
    ? "__missing-plan__"
    : typeof route.query.plan === "string"
      ? route.query.plan
      : ["candidate", "adopted-feedback"].includes(variant.value)
        ? "full-body-basic"
        : "",
);
const plan = computed(() => {
  if (requestedPlanId.value) {
    return (
      hengdongState.plans.find((item) => item.id === requestedPlanId.value) ??
      null
    );
  }
  return (
    hengdongState.plans.find(
      (item) => item.id === hengdongState.activePlanId,
    ) ??
    hengdongState.plans[0] ??
    null
  );
});
const planMissing = computed(
  () => Boolean(requestedPlanId.value) && !plan.value,
);
const isCurrent = computed(
  () =>
    variant.value === "adopted-feedback" ||
    (Boolean(plan.value) && plan.value!.id === hengdongState.activePlanId),
);
const editorOpen = computed({
  get: () =>
    ["plan-editor-open", "plan-editor-validation"].includes(variant.value),
  set: (open) =>
    void replaceVariant(router, route, open ? "plan-editor-open" : "default"),
});
const completed = computed(() => {
  const planId = plan.value?.id;
  if (!planId) return 0;
  return recordsInWeek(hengdongState.records).filter(
    (record) => record.planId === planId,
  ).length;
});
const progress = computed(() => {
  const weeklyTarget = plan.value?.weeklyTarget;
  if (!weeklyTarget) return 0;
  return Math.min(100, Math.round((completed.value / weeklyTarget) * 100));
});

function adoptPlan() {
  if (!plan.value || isCurrent.value) return;
  previousPlanId.value = adoptStoredPlan(plan.value.id) ?? "";
  if (!previousPlanId.value) return;
  toast.value = true;
}

function undoAdopt() {
  if (!previousPlanId.value) return;
  setActivePlan(previousPlanId.value);
  previousPlanId.value = "";
  toast.value = false;
  if (variant.value === "adopted-feedback") {
    void replaceVariant(router, route, "candidate", {
      plan: plan.value?.id ?? "full-body-basic",
    });
  }
}

function onSaved() {
  toast.value = true;
}

function returnToPlans() {
  void replaceHengdongScreen(router, route, "plans");
}
</script>

<template>
  <HengdongShell
    title="计划详情"
    screen-id="hengdong.plan-detail"
    back-to="plans"
    dense
    :show-action="Boolean(plan) && !planMissing"
    action-icon="more"
    action-label="编辑计划"
    @action="editorOpen = true"
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.plan-detail.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.plan-detail.scroll-list"
      >
        <div class="hd-content">
          <EmptyState
            v-if="planMissing || !plan"
            title="这套计划已不可用"
            description="它可能已经被移除。返回计划页后，可以继续使用当前计划或选择另一套。"
            action-label="返回计划页"
            inspect-id="hengdong.plan-detail.invalid"
            @action="returnToPlans"
          />
          <template v-else>
            <header
              class="hd-plan-detail-lead"
              data-pb-id="hengdong.plan-detail.summary"
              data-pb-role="summary"
              data-pb-token-color="color.on-surface"
              data-pb-token-typography="typography.display"
              data-pb-token-spacing="spacing.sm"
            >
              <span class="hd-overline">{{
                isCurrent
                  ? "当前计划"
                  : plan.origin === "custom"
                    ? "你的计划"
                    : "推荐计划"
              }}</span>
              <h1 class="hd-display">{{ plan.name }}</h1>
              <p class="hd-plan-promise">适合：{{ plan.description }}</p>
              <div
                class="hd-plan-identity"
                data-pb-id="hengdong.plan-detail.identity"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-spacing="spacing.sm"
              >
                <span>{{ plan.goal }}训练</span>
                <span>{{ plan.level }}</span>
                <span>每周 {{ plan.weeklyTarget }} 次</span>
              </div>
            </header>

            <div
              class="hd-plan-cost"
              data-pb-id="hengdong.plan-detail.facts"
              data-pb-role="summary"
              data-pb-token-color="color.on-surface"
              data-pb-token-spacing="spacing.sm"
            >
              <span><strong>{{ plan.minutes }}</strong> 分钟</span>
              <span><strong>{{ plan.exercises.length }}</strong> 个动作</span>
              <span><strong>{{ plan.weeklyTarget }}</strong> 次 / 周</span>
            </div>
            <div
              v-if="previousPlanId"
              class="hd-undo"
              role="status"
              data-pb-id="hengdong.plan-detail.adopt-feedback"
              data-pb-role="status"
              data-pb-token-background="color.success-soft"
              data-pb-token-color="color.success"
            >
              <span>已设为当前计划</span>
              <Button
                label="撤销"
                size="sm"
                kind="outlined"
                inspect-id="hengdong.plan-detail.undo-adopt"
                data-pb-action="undo-adopt"
                @click="undoAdopt"
              />
            </div>

            <Divider inspect-id="hengdong.plan-detail.divider.exercises" />

            <section class="hd-section hd-plan-prescription">
              <div class="hd-row-main">
                <h2 class="hd-section-title">这套计划会怎么进行</h2>
                <p class="hd-caption">按顺序完成，每个动作只保留一个明确目标。</p>
              </div>
              <DataList
                class="hd-flat-list"
                surface="none"
                rounded="none"
                inspect-id="hengdong.plan-detail.exercise-list"
              >
                <div
                  v-for="(exercise, index) in plan.exercises"
                  :key="exercise.id"
                  class="hd-row hd-plan-prescription-row"
                  data-pb-id="hengdong.plan-detail.exercise-row"
                  :data-pb-key="exercise.id"
                  data-pb-role="list-item"
                  data-pb-token-spacing="spacing.md"
                >
                  <span class="hd-plan-sequence-index">
                    {{ String(index + 1).padStart(2, "0") }}
                  </span>
                  <strong class="hd-row-title">{{ exercise.name }}</strong>
                  <span class="hd-plan-dose">{{ exercise.prescription }}</span>
                </div>
              </DataList>
            </section>

            <section
              class="hd-plan-week"
              data-pb-id="hengdong.plan-detail.week"
              data-pb-role="summary"
              data-pb-token-spacing="spacing.md"
            >
              <div class="hd-section-heading">
                <div class="hd-row-main">
                  <h2 class="hd-section-title">本周完成</h2>
                  <p class="hd-caption">按计划保持节奏，不需要补做。</p>
                </div>
                <strong>{{ completed }} / {{ plan.weeklyTarget }}</strong>
              </div>
              <Progress
                :value="progress"
                :label="`本周 ${completed} / ${plan.weeklyTarget} 次`"
                inspect-id="hengdong.plan-detail.progress"
              />
            </section>

            <div class="hd-primary-action">
              <Button
                :label="isCurrent ? '开始这次训练' : '设为当前计划'"
                block
                inspect-id="hengdong.plan-detail.primary"
                data-pb-action="plan-primary"
                @click="
                  isCurrent
                    ? openHengdongScreen(
                        router,
                        route,
                        'workout-session',
                        'default',
                        { plan: plan.id },
                      )
                    : adoptPlan()
                "
              />
              <Button
                v-if="!isCurrent"
                label="只开始这一次"
                kind="outlined"
                block
                inspect-id="hengdong.plan-detail.start-once"
                @click="
                  openHengdongScreen(
                    router,
                    route,
                    'workout-session',
                    'default',
                    { plan: plan.id },
                  )
                "
              />
            </div>
          </template>
        </div>
      </ScrollableDataList>

      <PlanEditorFlow
        v-if="plan"
        v-model="editorOpen"
        :plan-id="plan.id"
        inspect-id="hengdong.plan-detail.plan-editor"
        :initial-state="
          variant === 'plan-editor-validation' ? 'validation-error' : 'default'
        "
        @saved="onSaved"
      />
      <Toast
        v-model="toast"
        :message="
          previousPlanId ? '当前计划已更换，可在页面中撤销' : '计划已保存'
        "
        inspect-id="hengdong.plan-detail.toast"
      />
    </section>
  </HengdongShell>
</template>

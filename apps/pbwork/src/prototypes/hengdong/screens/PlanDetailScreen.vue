<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import HengdongShell from "../HengdongShell.vue";
import PlanEditorFlow from "../components/PlanEditorFlow.vue";
import { recordsInWeek } from "../model";
import { openHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, setActivePlan } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const previousPlanId = ref("");
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const plan = computed(
  () =>
    hengdongState.plans.find((item) => item.id === route.query.plan) ??
    hengdongState.plans[0]!,
);
const isCurrent = computed(() => plan.value.id === hengdongState.activePlanId);
const editorOpen = computed({
  get: () => variant.value === "plan-editor-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "plan-editor-open" : "default"),
});
const completed = computed(
  () =>
    recordsInWeek(hengdongState.records).filter(
      (record) => record.planId === plan.value.id,
    ).length,
);
const progress = computed(() =>
  Math.min(100, Math.round((completed.value / plan.value.weeklyTarget) * 100)),
);

function adoptPlan() {
  if (isCurrent.value) return;
  previousPlanId.value = hengdongState.activePlanId;
  setActivePlan(plan.value.id);
  toast.value = true;
}

function undoAdopt() {
  if (!previousPlanId.value) return;
  setActivePlan(previousPlanId.value);
  previousPlanId.value = "";
  toast.value = false;
}
</script>

<template>
  <HengdongShell
    title="计划详情"
    screen-id="hengdong.plan-detail"
    back-to="plans"
    dense
    :show-action="true"
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
          <header
            class="hd-lead"
            data-pb-id="hengdong.plan-detail.summary"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-typography="typography.display"
            data-pb-token-spacing="spacing.sm"
          >
            <div class="hd-inline">
              <Chip :label="plan.goal" tone="primary" />
              <span class="hd-caption"
                >{{ plan.level }} · 每周 {{ plan.weeklyTarget }} 次</span
              >
            </div>
            <h1 class="hd-display">{{ plan.name }}</h1>
            <p class="hd-muted">{{ plan.description }}</p>
          </header>

          <div class="hd-statline">
            <div class="hd-stat">
              <strong>{{ plan.minutes }}</strong
              ><span>预计分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{ plan.exercises.length }}</strong
              ><span>训练动作</span>
            </div>
            <div class="hd-stat">
              <strong>{{ completed }}</strong
              ><span>本周完成</span>
            </div>
          </div>
          <Progress
            :value="progress"
            :label="`本周 ${completed} / ${plan.weeklyTarget} 次`"
            inspect-id="hengdong.plan-detail.progress"
          />

          <div v-if="previousPlanId" class="hd-undo" role="status">
            <span>已设为当前计划</span>
            <Button
              label="撤销"
              size="sm"
              bg-color="transparent"
              border-color="transparent"
              text-color="color.success"
              @click="undoAdopt"
            />
          </div>

          <Divider inspect-id="hengdong.plan-detail.divider.exercises" />

          <section class="hd-section">
            <div class="hd-row-main">
              <h2 class="hd-section-title">动作安排</h2>
              <p class="hd-caption">
                按顺序完成，也可以提前保存已经完成的部分。
              </p>
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
                class="hd-row"
                data-pb-id="hengdong.plan-detail.exercise-row"
                :data-pb-key="exercise.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.md"
              >
                <span class="hd-overline">{{ index + 1 }}</span>
                <span class="hd-row-main">
                  <strong class="hd-row-title">{{ exercise.name }}</strong>
                  <span class="hd-caption">{{ exercise.prescription }}</span>
                </span>
              </div>
            </DataList>
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
              bg-color="transparent"
              border-color="transparent"
              text-color="color.primary"
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
        </div>
      </ScrollableDataList>

      <PlanEditorFlow
        v-model="editorOpen"
        :plan-id="plan.id"
        inspect-id="hengdong.plan-detail.plan-editor"
        @saved="toast = true"
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

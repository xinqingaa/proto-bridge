<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import FilterBar from "@/design-system/components/navigation/FilterBar.vue";
import HengdongRoot from "../HengdongRoot.vue";
import PlanEditorFlow from "../components/PlanEditorFlow.vue";
import { recordsInWeek } from "../model";
import { openHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, setActivePlan, updateHengdongUi } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const filter = computed({
  get: () =>
    String(route.query.variant ?? "default") === "filtered"
      ? "力量"
      : hengdongState.ui.planFilter,
  set: (value: string) => updateHengdongUi({ planFilter: value }),
});
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const editorOpen = computed({
  get: () => variant.value === "plan-editor-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "plan-editor-open" : "default"),
});
const editingPlanId = computed(() =>
  typeof route.query.plan === "string" ? route.query.plan : undefined,
);
const currentPlan = computed(
  () =>
    hengdongState.plans.find(
      (plan) => plan.id === hengdongState.activePlanId,
    ) ?? hengdongState.plans[0]!,
);
const recommendations = computed(() => {
  if (variant.value === "empty") return [];
  return hengdongState.plans.filter(
    (plan) =>
      plan.id !== currentPlan.value.id &&
      (filter.value === "全部" || plan.goal === filter.value),
  );
});
const completedCurrent = computed(
  () =>
    recordsInWeek(hengdongState.records).filter(
      (record) => record.planId === currentPlan.value.id,
    ).length,
);
const currentProgress = computed(() =>
  Math.min(
    100,
    Math.round((completedCurrent.value / currentPlan.value.weeklyTarget) * 100),
  ),
);

function openEditor() {
  void replaceVariant(router, route, "plan-editor-open");
}

function afterSave(planId: string) {
  setActivePlan(planId);
  toast.value = true;
  void replaceVariant(router, route, "default");
}
</script>

<template>
  <HengdongRoot active="plans" screen-id="hengdong.plans">
    <section
      class="hd-page"
      data-pb-id="hengdong.plans.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <AppBar
        title="计划"
        dense
        :show-action="true"
        action-icon="plus"
        action-label="新建计划"
        inspect-id="hengdong.plans.app-bar"
        @action="openEditor"
      />
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.plans.scroll-list"
      >
        <div class="hd-content">
          <section
            class="hd-current-plan"
            data-pb-id="hengdong.plans.current"
            data-pb-role="summary"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.xl"
            data-pb-token-spacing="spacing.lg"
          >
            <div class="hd-section-heading">
              <div class="hd-row-main">
                <span class="hd-overline">当前计划</span>
                <h1 class="hd-display hd-display-compact">
                  {{ currentPlan.name }}
                </h1>
              </div>
              <Chip :label="currentPlan.goal" tone="primary" />
            </div>
            <p class="hd-muted">{{ currentPlan.description }}</p>
            <Progress
              :value="currentProgress"
              :label="`本周 ${completedCurrent} / ${currentPlan.weeklyTarget} 次`"
              inspect-id="hengdong.plans.current-progress"
            />
            <div class="hd-action-row">
              <Button
                label="查看计划"
                bg-color="color.surface"
                border-color="color.border"
                text-color="color.on-surface"
                inspect-id="hengdong.plans.open-current"
                @click="
                  openHengdongScreen(router, route, 'plan-detail', 'default', {
                    plan: currentPlan.id,
                  })
                "
              />
              <Button
                label="开始训练"
                inspect-id="hengdong.plans.start-current"
                @click="
                  openHengdongScreen(
                    router,
                    route,
                    'workout-session',
                    'default',
                    { plan: currentPlan.id },
                  )
                "
              />
            </div>
          </section>

          <Divider inspect-id="hengdong.plans.divider.recommended" />

          <section class="hd-section">
            <div class="hd-row-main">
              <h2 class="hd-section-title">选择下一套节奏</h2>
              <p class="hd-caption">筛选会直接改变下方推荐内容。</p>
            </div>
            <FilterBar
              v-model="filter"
              :items="['全部', '唤醒', '力量', '舒缓']"
              inspect-id="hengdong.plans.filters"
            />
            <DataList
              v-if="recommendations.length"
              class="hd-flat-list"
              surface="none"
              rounded="none"
              inspect-id="hengdong.plans.list"
            >
              <button
                v-for="plan in recommendations"
                :key="plan.id"
                type="button"
                class="hd-row hd-row-action"
                data-pb-id="hengdong.plans.plan-row"
                :data-pb-key="plan.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.md"
                @click="
                  openHengdongScreen(router, route, 'plan-detail', 'default', {
                    plan: plan.id,
                  })
                "
              >
                <span class="hd-row-main">
                  <strong class="hd-row-title">{{ plan.name }}</strong>
                  <span class="hd-caption"
                    >{{ plan.minutes }} 分钟 ·
                    {{ plan.exercises.length }} 个动作 · 每周
                    {{ plan.weeklyTarget }} 次</span
                  >
                </span>
                <Chip
                  :label="plan.goal"
                  :tone="
                    plan.goal === '力量'
                      ? 'warning'
                      : plan.goal === '舒缓'
                        ? 'success'
                        : 'primary'
                  "
                />
              </button>
            </DataList>
            <EmptyState
              v-else
              title="这个目标暂时没有更多计划"
              description="可以换个筛选条件，或创建一套自己的轻量计划。"
              action-label="新建计划"
              inspect-id="hengdong.plans.empty"
              @action="openEditor"
            />
          </section>
        </div>
      </ScrollableDataList>

      <PlanEditorFlow
        v-model="editorOpen"
        v-bind="editingPlanId ? { planId: editingPlanId } : {}"
        inspect-id="hengdong.plans.plan-editor"
        @saved="afterSave"
      />
      <Toast
        v-model="toast"
        message="计划已保存，并设为当前计划"
        inspect-id="hengdong.plans.toast"
      />
    </section>
  </HengdongRoot>
</template>

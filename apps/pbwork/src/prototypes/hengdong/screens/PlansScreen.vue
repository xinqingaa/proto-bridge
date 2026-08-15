<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import SecondaryTabs from "@/design-system/components/navigation/SecondaryTabs.vue";
import HengdongRoot from "../HengdongRoot.vue";
import PlanEditorFlow from "../components/PlanEditorFlow.vue";
import { recordsInWeek } from "../model";
import { openHengdongScreen, replaceVariant } from "../nav";
import { hengdongState, updateHengdongUi } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const planTabs = [
  { value: "all", label: "全部" },
  { value: "wake", label: "唤醒" },
  { value: "strength", label: "力量" },
  { value: "recovery", label: "舒缓" },
];
const goalByTab: Record<string, string | undefined> = {
  all: undefined,
  wake: "唤醒",
  strength: "力量",
  recovery: "舒缓",
};
const activePlanTab = ref(
  String(route.query.variant ?? "default") === "filtered"
    ? "strength"
    : String(route.query.variant ?? "default") === "empty"
      ? "wake"
      : "all",
);
watch(activePlanTab, (value) => updateHengdongUi({ planFilter: value }));
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const editorOpen = computed({
  get: () =>
    ["plan-editor-open", "plan-editor-validation"].includes(variant.value),
  set: (open) =>
    void replaceVariant(router, route, open ? "plan-editor-open" : "default"),
});
const currentPlan = computed(
  () =>
    hengdongState.plans.find(
      (plan) => plan.id === hengdongState.activePlanId,
    ) ?? hengdongState.plans[0]!,
);
function recommendationsFor(goal: string) {
  if (variant.value === "empty") return [];
  const planGoal = goalByTab[goal];
  return hengdongState.plans.filter(
    (plan) =>
      plan.id !== currentPlan.value.id &&
      (!planGoal || plan.goal === planGoal),
  );
}
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

function afterSave() {
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
            <span class="hd-overline">当前计划</span>
            <div class="hd-plan-current-copy">
              <h1 class="hd-display hd-display-compact">
                {{ currentPlan.name }}
              </h1>
              <p class="hd-plan-promise">{{ currentPlan.description }}</p>
            </div>
            <div
              class="hd-plan-facts"
              aria-label="当前计划信息"
              data-pb-id="hengdong.plans.current-facts"
              data-pb-role="text"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-spacing="spacing.sm"
            >
              <span>{{ currentPlan.goal }} · {{ currentPlan.level }}</span>
              <span>{{ currentPlan.minutes }} 分钟</span>
              <span>{{ currentPlan.exercises.length }} 个动作</span>
              <span>每周 {{ currentPlan.weeklyTarget }} 次</span>
            </div>
            <Progress
              :value="currentProgress"
              :label="`本周 ${completedCurrent} / ${currentPlan.weeklyTarget} 次`"
              inspect-id="hengdong.plans.current-progress"
            />
            <div class="hd-plan-current-actions">
              <Button
                label="开始这次训练"
                block
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
              <Button
                class="hd-plan-link-action"
                label="查看计划详情"
                size="sm"
                bg-color="transparent"
                border-color="transparent"
                text-color="color.primary"
                inspect-id="hengdong.plans.open-current"
                @click="
                  openHengdongScreen(router, route, 'plan-detail', 'default', {
                    plan: currentPlan.id,
                  })
                "
              />
            </div>
          </section>

          <Divider inspect-id="hengdong.plans.divider.recommended" />

          <section class="hd-section hd-plan-library">
            <div class="hd-row-main">
              <h2 class="hd-section-title">计划库</h2>
              <p class="hd-caption">选择一套适合最近节奏的训练。</p>
            </div>
            <SecondaryTabs
              v-model="activePlanTab"
              :items="planTabs"
              show-divider
              grow
              size="sm"
              inspect-id="hengdong.plans.filters"
            >
              <template
                v-for="tab in planTabs"
                :key="tab.value"
                #[tab.value]
              >
                <DataList
                  v-if="recommendationsFor(tab.value).length"
                  class="hd-flat-list hd-plan-list"
                  surface="none"
                  rounded="none"
                  :inspect-id="
                    tab.value === activePlanTab
                      ? 'hengdong.plans.list'
                      : 'hengdong.plans.list.' + tab.value
                  "
                >
                  <button
                    v-for="plan in recommendationsFor(tab.value)"
                    :key="plan.id"
                    type="button"
                    class="hd-row hd-row-action hd-plan-library-row"
                    data-pb-id="hengdong.plans.plan-row"
                    :data-pb-key="tab.value + '-' + plan.id"
                    data-pb-role="list-item"
                    data-pb-token-spacing="spacing.md"
                    @click="
                      openHengdongScreen(
                        router,
                        route,
                        'plan-detail',
                        'candidate',
                        { plan: plan.id },
                      )
                    "
                  >
                    <span class="hd-row-main">
                      <span class="hd-overline">
                        {{ plan.origin === "custom" ? "你的计划" : "推荐计划" }}
                      </span>
                      <strong class="hd-plan-list-title">{{ plan.name }}</strong>
                      <span class="hd-caption">{{ plan.description }}</span>
                      <span class="hd-plan-list-facts">
                        {{ plan.goal }} · {{ plan.level }} ·
                        {{ plan.minutes }} 分钟 · 每周 {{ plan.weeklyTarget }} 次
                      </span>
                    </span>
                    <Icon name="chevron-right" size="sm" tone="muted" />
                  </button>
                </DataList>
                <EmptyState
                  v-else
                  title="这个分类暂时没有更多计划"
                  description="可以选择其它训练方向，或创建一套自己的计划。"
                  action-label="新建计划"
                  :inspect-id="
                    tab.value === activePlanTab
                      ? 'hengdong.plans.empty'
                      : 'hengdong.plans.empty.' + tab.value
                  "
                  @action="openEditor"
                />
              </template>
            </SecondaryTabs>
          </section>
        </div>
      </ScrollableDataList>

      <PlanEditorFlow
        v-model="editorOpen"
        inspect-id="hengdong.plans.plan-editor"
        :initial-state="
          variant === 'plan-editor-validation' ? 'validation-error' : 'default'
        "
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

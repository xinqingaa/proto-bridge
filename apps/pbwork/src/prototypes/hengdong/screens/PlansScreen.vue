<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import HengdongRoot from "../HengdongRoot.vue";
import PlanEditorFlow from "../components/PlanEditorFlow.vue";
import { planGlyph } from "../glyphs";
import { catalogPlans, recordsInWeek, type FitnessPlan, type PlanGoal } from "../model";
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
const goalByTab: Record<string, PlanGoal | undefined> = {
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
function catalogFor(tab: string) {
  if (variant.value === "empty") return [];
  return catalogPlans(
    hengdongState.plans,
    currentPlan.value.id,
    goalByTab[tab],
  );
}
function isCurrent(plan: FitnessPlan) {
  return plan.id === currentPlan.value.id;
}
function glyphFor(plan: FitnessPlan) {
  return planGlyph(plan.goal);
}
function openPlan(plan: FitnessPlan) {
  openHengdongScreen(
    router,
    route,
    "plan-detail",
    isCurrent(plan) ? "default" : "candidate",
    { plan: plan.id },
  );
}
const completedCurrent = computed(
  () =>
    recordsInWeek(hengdongState.records).filter(
      (record) => record.planId === currentPlan.value.id,
    ).length,
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
            data-pb-token-background="color.background"
            data-pb-token-color="color.on-surface"
            data-pb-token-spacing="spacing.lg"
          >
            <button
              type="button"
              class="hd-current-plan-hit"
              :aria-label="`查看计划详情，${currentPlan.name}`"
              data-pb-id="hengdong.plans.open-current"
              data-pb-role="button"
              data-pb-action="open-current-plan"
              data-pb-token-color="color.on-surface"
              data-pb-token-typography="typography.display"
              data-pb-token-spacing="spacing.md"
              @click="
                openHengdongScreen(router, route, 'plan-detail', 'default', {
                  plan: currentPlan.id,
                })
              "
            >
              <span class="hd-current-plan-lead">
                <span class="hd-kicker">当前计划</span>
                <Icon name="chevron-right" size="sm" tone="muted" />
              </span>
              <strong class="hd-display">{{ currentPlan.name }}</strong>
              <span
                class="hd-plan-facts"
                aria-label="当前计划信息"
                data-pb-id="hengdong.plans.current-facts"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-spacing="spacing.sm"
              >
                <span>{{ currentPlan.minutes }} 分钟</span>
                <span>{{ currentPlan.goal }}</span>
                <span>{{ currentPlan.level }}</span>
              </span>
              <span
                class="hd-caption"
                data-pb-id="hengdong.plans.current-week"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
              >
                本周 {{ completedCurrent }} / {{ currentPlan.weeklyTarget }} 次
              </span>
            </button>
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
          </section>

          <section class="hd-section hd-plan-library">
            <PrimaryTabs
              v-model="activePlanTab"
              :items="planTabs"
              grow
              inspect-id="hengdong.plans.filters"
            >
              <template
                v-for="tab in planTabs"
                :key="tab.value"
                #[tab.value]
              >
                <DataList
                  v-if="catalogFor(tab.value).length"
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
                    v-for="plan in catalogFor(tab.value)"
                    :key="plan.id"
                    type="button"
                    class="hd-row hd-row-action hd-plan-library-row"
                    data-pb-id="hengdong.plans.plan-row"
                    :data-pb-key="tab.value + '-' + plan.id"
                    data-pb-role="list-item"
                    data-pb-token-spacing="spacing.md"
                    :aria-label="
                      isCurrent(plan)
                        ? `当前计划，${plan.name}`
                        : plan.name
                    "
                    @click="openPlan(plan)"
                  >
                    <span
                      class="hd-record-icon hd-type-icon"
                      :class="'is-' + glyphFor(plan).kind"
                      data-pb-id="hengdong.plans.plan-row.icon"
                      :data-pb-key="tab.value + '-' + plan.id"
                      data-pb-role="icon"
                      data-pb-token-background="transparent"
                      :data-pb-token-color="glyphFor(plan).color"
                    >
                      <Icon
                        :name="glyphFor(plan).icon"
                        size="md"
                        tone="inherit"
                        :inspect-id="
                          'hengdong.plans.plan-icon.' +
                          tab.value +
                          '-' +
                          plan.id
                        "
                      />
                    </span>
                    <span class="hd-row-main">
                      <span class="hd-record-primary">
                        <span class="hd-plan-list-name">
                          <strong class="hd-row-title">{{ plan.name }}</strong>
                          <span
                            v-if="isCurrent(plan)"
                            class="hd-plan-current-mark"
                            data-pb-id="hengdong.plans.plan-row.current"
                            :data-pb-key="tab.value + '-' + plan.id"
                            data-pb-role="text"
                            data-pb-token-background="color.primary-soft"
                            data-pb-token-color="color.primary"
                            data-pb-token-radius="radius.full"
                            data-pb-token-spacing="spacing.sm"
                            data-pb-token-typography="typography.caption-strong"
                            >当前</span
                          >
                        </span>
                        <strong class="hd-record-duration"
                          >{{ plan.minutes }} 分钟</strong
                        >
                      </span>
                      <span
                        class="hd-caption"
                        data-pb-id="hengdong.plans.plan-row.facts"
                        :data-pb-key="tab.value + '-' + plan.id"
                        data-pb-role="text"
                        data-pb-token-color="color.on-surface-muted"
                        data-pb-token-typography="typography.caption"
                      >
                        {{ plan.goal }} · {{ plan.level }}
                      </span>
                    </span>
                    <Icon name="chevron-right" size="sm" tone="muted" />
                  </button>
                </DataList>
                <EmptyState
                  v-else
                  title="这个分类暂时没有计划"
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
            </PrimaryTabs>
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

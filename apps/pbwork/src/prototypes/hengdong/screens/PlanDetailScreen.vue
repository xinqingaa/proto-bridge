<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import HengdongShell from "../HengdongShell.vue";
import { openHengdongScreen } from "../nav";
import { getPlans } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const storedPlans = getPlans();
const fallbackPlan = storedPlans[0]!;
const plan = computed(
  () =>
    storedPlans.find((item) => item.id === route.query.plan) ?? fallbackPlan,
);
</script>

<template>
  <HengdongShell
    title="计划详情"
    screen-id="hengdong.plan-detail"
    back-to="plans"
    :show-action="true"
    action-icon="more"
    action-label="编辑计划"
    @action="
      openHengdongScreen(router, route, 'plan-editor', 'default', {
        plan: plan.id,
      })
    "
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
            class="hd-hero"
            data-pb-id="hengdong.plan-detail.hero"
            data-pb-role="summary"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.xl"
            data-pb-token-spacing="spacing.lg"
          >
            <span class="hd-inline"
              ><Chip :label="plan.level" tone="primary" /><span
                class="hd-caption"
                >每周 {{ plan.weeklyTarget }} 次</span
              ></span
            >
            <h1>{{ plan.name }}</h1>
            <p class="hd-muted">{{ plan.description }}</p>
            <div class="hd-metrics">
              <div class="hd-metric">
                <strong>{{ plan.minutes }}</strong
                ><span>预计分钟</span>
              </div>
              <div class="hd-metric">
                <strong>{{ plan.exercises.length }}</strong
                ><span>训练动作</span>
              </div>
              <div class="hd-metric">
                <strong>68%</strong><span>本月完成率</span>
              </div>
            </div>
          </header>
          <Card
            semantic-role="summary"
            inspect-id="hengdong.plan-detail.progress"
            ><div class="hd-card-body">
              <h2 class="hd-card-title">本周进度</h2>
              <Progress :value="60" label="已完成 3 / 5 次" /></div
          ></Card>
          <section class="hd-section">
            <h2 class="hd-section-title">动作安排</h2>
            <DataList inspect-id="hengdong.plan-detail.exercise-list"
              ><div
                v-for="(exercise, index) in plan.exercises"
                :key="exercise.id"
                class="hd-row"
                data-pb-id="hengdong.plan-detail.exercise"
                :data-pb-key="exercise.id"
                data-pb-role="list-item"
                data-pb-token-background="color.surface"
                data-pb-token-spacing="spacing.md"
              >
                <span class="hd-exercise-index">{{ index + 1 }}</span
                ><span class="hd-row-main"
                  ><h3>{{ exercise.name }}</h3>
                  <span class="hd-caption">{{
                    exercise.prescription
                  }}</span></span
                >
              </div></DataList
            >
          </section>
          <div class="hd-actions">
            <Button
              label="编辑计划"
              bg-color="color.surface"
              border-color="color.border"
              text-color="color.on-surface"
              inspect-id="hengdong.plan-detail.edit"
              @click="
                openHengdongScreen(router, route, 'plan-editor', 'default', {
                  plan: plan.id,
                })
              "
            /><Button
              label="开始训练"
              inspect-id="hengdong.plan-detail.start"
              data-pb-action="start-session"
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
    </section>
  </HengdongShell>
</template>

<style scoped>
.hd-exercise-index {
  display: flex;
  min-width: var(--pb-sizing-touch);
  min-height: var(--pb-sizing-touch);
  align-items: center;
  justify-content: center;
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
}
</style>

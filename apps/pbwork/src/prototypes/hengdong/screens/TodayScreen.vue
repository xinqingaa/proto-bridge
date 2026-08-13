<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import HengdongRoot from "../HengdongRoot.vue";
import { openHengdongScreen, replaceVariant } from "../nav";
import { plans, records } from "../model";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const featuredPlan = plans[0]!;
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const sheetOpen = computed({
  get: () => variant.value === "quick-checkin-open",
  set: (open) =>
    void replaceVariant(router, route, open ? "quick-checkin-open" : "default"),
});

function quickCheckin() {
  sheetOpen.value = false;
  toast.value = true;
}
</script>

<template>
  <HengdongRoot active="today" screen-id="hengdong.today">
    <section
      class="hd-page"
      data-pb-id="hengdong.today.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="true"
        :load-more="false"
        inspect-id="hengdong.today.scroll-list"
      >
        <div class="hd-content">
          <header
            class="hd-hero"
            data-pb-id="hengdong.today.hero"
            data-pb-role="summary"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.xl"
            data-pb-token-spacing="spacing.lg"
          >
            <span class="hd-eyebrow">8 月 13 日 · 星期四</span>
            <h1>今天，也向自己靠近一点</h1>
            <p class="hd-muted">连续 6 天 · 本周完成 3 / 4 次</p>
            <Progress
              :value="75"
              label="本周目标 75%"
              inspect-id="hengdong.today.week-progress"
            />
          </header>

          <Card semantic-role="card" inspect-id="hengdong.today.recommendation">
            <div class="hd-card-body">
              <div class="hd-row-head">
                <div class="hd-row-main">
                  <span class="hd-eyebrow">今日推荐</span>
                  <h2 class="hd-card-title">{{ featuredPlan.name }}</h2>
                  <p class="hd-muted">{{ featuredPlan.description }}</p>
                </div>
                <Chip
                  :label="`${featuredPlan.minutes} 分钟`"
                  tone="primary"
                  inspect-id="hengdong.today.recommendation.duration"
                />
              </div>
              <div class="hd-actions">
                <Button
                  label="查看计划"
                  bg-color="color.surface"
                  border-color="color.border"
                  text-color="color.on-surface"
                  inspect-id="hengdong.today.open-plan"
                  @click="
                    openHengdongScreen(
                      router,
                      route,
                      'plan-detail',
                      'default',
                      { plan: featuredPlan.id },
                    )
                  "
                />
                <Button
                  label="开始训练"
                  inspect-id="hengdong.today.start-workout"
                  data-pb-action="start-workout"
                  @click="
                    openHengdongScreen(
                      router,
                      route,
                      'workout-session',
                      'default',
                      { plan: featuredPlan.id },
                    )
                  "
                />
              </div>
            </div>
          </Card>

          <Card semantic-role="summary" inspect-id="hengdong.today.summary">
            <div class="hd-card-body">
              <h2 class="hd-card-title">本周节奏</h2>
              <div class="hd-metrics">
                <div class="hd-metric">
                  <strong>3</strong><span>训练次数</span>
                </div>
                <div class="hd-metric">
                  <strong>66</strong><span>累计分钟</span>
                </div>
                <div class="hd-metric">
                  <strong>6</strong><span>连续天数</span>
                </div>
              </div>
              <Button
                label="快速打卡"
                bg-color="color.primary-soft"
                border-color="color.primary-soft"
                text-color="color.primary"
                inspect-id="hengdong.today.quick-checkin"
                data-pb-action="open-quick-checkin"
                @click="sheetOpen = true"
              />
            </div>
          </Card>

          <section class="hd-section">
            <h2 class="hd-section-title">最近完成</h2>
            <DataList inspect-id="hengdong.today.recent-list">
              <button
                v-for="record in records.slice(0, 2)"
                :key="record.id"
                class="hd-row hd-list-button"
                type="button"
                @click="
                  openHengdongScreen(
                    router,
                    route,
                    'record-detail',
                    'default',
                    { record: record.id },
                  )
                "
              >
                <span class="hd-row-main"
                  ><strong>{{ record.planName }}</strong
                  ><span class="hd-caption"
                    >{{ record.date }} · {{ record.minutes }} 分钟</span
                  ></span
                >
                <Chip :label="record.feeling" tone="success" />
              </button>
            </DataList>
          </section>
        </div>
      </ScrollableDataList>
      <BottomSheet
        v-model="sheetOpen"
        title="快速打卡"
        inspect-id="hengdong.today.quick-checkin-sheet"
      >
        <div class="hd-stack-actions">
          <p class="hd-muted">没有完整训练也没关系，记录一次主动活动。</p>
          <Button
            label="散步 20 分钟"
            bg-color="color.primary-soft"
            border-color="color.primary-soft"
            text-color="color.primary"
            @click="quickCheckin"
          />
          <Button
            label="拉伸 10 分钟"
            bg-color="color.primary-soft"
            border-color="color.primary-soft"
            text-color="color.primary"
            @click="quickCheckin"
          />
          <Button
            label="完成今日打卡"
            inspect-id="hengdong.today.confirm-checkin"
            @click="quickCheckin"
          />
        </div>
      </BottomSheet>
      <Toast
        v-model="toast"
        message="今日活动已记录"
        inspect-id="hengdong.today.toast"
      />
    </section>
  </HengdongRoot>
</template>

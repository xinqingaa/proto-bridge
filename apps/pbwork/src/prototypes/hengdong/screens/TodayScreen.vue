<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import HengdongRoot from "../HengdongRoot.vue";
import WeeklyActivityBars from "../components/WeeklyActivityBars.vue";
import {
  HENGDONG_TODAY,
  HENGDONG_WEEK_DATES,
  recordsInWeek,
  totalMinutes,
  type ActivityType,
  type Feeling,
} from "../model";
import {
  openHengdongScreen,
  replaceHengdongScreen,
  replaceVariant,
} from "../nav";
import { hengdongState, saveRecord } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const step = ref(0);
const activityType = ref<ActivityType>("步行");
const duration = ref("20 分钟");
const feeling = ref<Feeling>("刚好");
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const sheetOpen = computed({
  get: () => variant.value === "quick-record-open",
  set: (open) => {
    if (!open) step.value = 0;
    void replaceVariant(router, route, open ? "quick-record-open" : "default");
  },
});
const activePlan = computed(
  () =>
    hengdongState.plans.find(
      (plan) => plan.id === hengdongState.activePlanId,
    ) ?? hengdongState.plans[0]!,
);
const weekRecords = computed(() => recordsInWeek(hengdongState.records));
const todayRecords = computed(() =>
  hengdongState.records.filter((record) => record.date === HENGDONG_TODAY),
);
const hasSession = computed(() => Boolean(hengdongState.workoutSession));
const weekProgress = computed(() =>
  Math.min(
    100,
    Math.round(
      (weekRecords.value.length / hengdongState.goals.weeklySessions) * 100,
    ),
  ),
);
const weekBars = computed(() =>
  HENGDONG_WEEK_DATES.map((date, index) => ({
    id: date,
    label: ["一", "二", "三", "四", "五", "六", "日"][index]!,
    minutes: hengdongState.records
      .filter((record) => record.date === date)
      .reduce((sum, record) => sum + record.minutes, 0),
  })),
);
const recentRecords = computed(() => hengdongState.records.slice(0, 2));

function openWorkout() {
  const planId = hengdongState.workoutSession?.planId ?? activePlan.value.id;
  void openHengdongScreen(router, route, "workout-session", "default", {
    plan: planId,
  });
}

function saveQuickRecord() {
  const minutes = Number.parseInt(duration.value, 10);
  const recordNumber =
    hengdongState.records.filter(
      (record) => record.date === HENGDONG_TODAY && record.kind === "quick",
    ).length + 1;
  saveRecord({
    id: `quick-${HENGDONG_TODAY}-${recordNumber}`,
    date: HENGDONG_TODAY,
    kind: "quick",
    activityType: activityType.value,
    title: activityType.value,
    minutes,
    feeling: feeling.value,
    note: "今天也主动活动了一会儿。",
    completedExerciseIds: [],
  });
  sheetOpen.value = false;
  toast.value = true;
}

function openRecord(recordId: string) {
  void openHengdongScreen(router, route, "progress", "record-detail-open", {
    record: recordId,
  });
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
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.today.scroll-list"
      >
        <div class="hd-content hd-content-safe">
          <div class="hd-utility-row">
            <div class="hd-row-main">
              <span class="hd-overline">8 月 13 日 · 星期四</span>
              <span class="hd-caption"
                >{{ hengdongState.profile.name }}，下午好</span
              >
            </div>
            <IconButton
              ariaLabel="设置"
              icon="settings"
              variant="text"
              size="sm"
              inspect-id="hengdong.today.settings"
              @click="openHengdongScreen(router, route, 'settings-goals')"
            />
          </div>

          <header
            class="hd-lead"
            data-pb-id="hengdong.today.next-action"
            data-pb-role="summary"
            data-pb-token-color="color.on-surface"
            data-pb-token-typography="typography.display"
            data-pb-token-spacing="spacing.sm"
          >
            <span class="hd-overline">
              {{
                hasSession
                  ? "继续上次训练"
                  : todayRecords.length
                    ? "今天已经动过"
                    : "今天的下一步"
              }}
            </span>
            <h1 class="hd-display">
              {{
                hasSession
                  ? "接着完成剩下的动作"
                  : todayRecords.length
                    ? "完成比完美重要"
                    : activePlan.name
              }}
            </h1>
            <p class="hd-muted">
              <template v-if="hasSession">
                已完成
                {{
                  hengdongState.workoutSession?.completedExerciseIds.length
                }}
                / {{ activePlan.exercises.length }} 个动作，进度已保留。
              </template>
              <template v-else-if="todayRecords.length">
                今天已记录
                {{ totalMinutes(todayRecords) }} 分钟，可以安心停在这里。
              </template>
              <template v-else>
                {{ activePlan.minutes }} 分钟 ·
                {{ activePlan.exercises.length }} 个动作 ·
                {{ activePlan.level }}
              </template>
            </p>
          </header>

          <div
            class="hd-primary-action"
            data-pb-id="hengdong.today.primary-action"
            data-pb-role="section"
            data-pb-token-spacing="spacing.sm"
          >
            <Button
              :label="
                hasSession
                  ? '继续训练'
                  : todayRecords.length
                    ? '再做一次轻训练'
                    : `开始 ${activePlan.minutes} 分钟`
              "
              block
              inspect-id="hengdong.today.start-workout"
              data-pb-action="start-workout"
              @click="openWorkout"
            />
            <Button
              label="记录其他活动"
              bg-color="transparent"
              border-color="transparent"
              text-color="color.primary"
              block
              inspect-id="hengdong.today.quick-record"
              data-pb-action="open-quick-record"
              @click="sheetOpen = true"
            />
          </div>

          <Divider inspect-id="hengdong.today.divider.rhythm" />

          <section
            class="hd-section"
            data-pb-id="hengdong.today.week-summary"
            data-pb-role="summary"
            data-pb-token-spacing="spacing.md"
          >
            <div class="hd-section-heading">
              <div class="hd-row-main">
                <h2 class="hd-section-title">本周节奏</h2>
                <span class="hd-caption">
                  {{ weekRecords.length }} /
                  {{ hengdongState.goals.weeklySessions }} 次 ·
                  {{ totalMinutes(weekRecords) }} 分钟
                </span>
              </div>
              <span class="hd-overline">{{ weekProgress }}%</span>
            </div>
            <Progress
              :value="weekProgress"
              :label="
                weekRecords.length >= hengdongState.goals.weeklySessions
                  ? '本周目标已完成'
                  : `还差 ${hengdongState.goals.weeklySessions - weekRecords.length} 次`
              "
              inspect-id="hengdong.today.week-progress"
            />
            <WeeklyActivityBars
              :items="weekBars"
              inspect-id="hengdong.today.week-chart"
              aria-label="本周活动分钟"
            />
          </section>

          <Divider inspect-id="hengdong.today.divider.recent" />

          <section class="hd-section">
            <div class="hd-section-heading">
              <h2 class="hd-section-title">最近记录</h2>
              <Button
                label="查看全部"
                size="sm"
                bg-color="transparent"
                border-color="transparent"
                text-color="color.primary"
                inspect-id="hengdong.today.open-progress"
                @click="replaceHengdongScreen(router, route, 'progress')"
              />
            </div>
            <DataList
              class="hd-flat-list"
              surface="none"
              rounded="none"
              inspect-id="hengdong.today.recent-list"
            >
              <button
                v-for="record in recentRecords"
                :key="record.id"
                type="button"
                class="hd-row hd-row-action"
                data-pb-id="hengdong.today.record-row"
                :data-pb-key="record.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.md"
                @click="openRecord(record.id)"
              >
                <span class="hd-row-main">
                  <strong class="hd-row-title">{{ record.title }}</strong>
                  <span class="hd-caption"
                    >{{ record.date.slice(5).replace("-", " 月 ") }} 日 ·
                    {{ record.minutes }} 分钟</span
                  >
                </span>
                <span class="hd-caption">{{ record.feeling }}</span>
              </button>
            </DataList>
          </section>
        </div>
      </ScrollableDataList>

      <FlowSheet
        v-model="sheetOpen"
        v-model:step="step"
        title="记录其他活动"
        :step-count="3"
        :swipe="false"
        inspect-id="hengdong.today.quick-record-sheet"
      >
        <section class="hd-flow-step">
          <h3>刚刚做了什么？</h3>
          <p class="hd-muted">选择最接近的一项，不需要精确分类。</p>
          <div class="hd-choice-list">
            <button
              v-for="item in ['步行', '拉伸', '自由活动'] as ActivityType[]"
              :key="item"
              type="button"
              class="hd-choice"
              :class="{ 'is-selected': activityType === item }"
              @click="activityType = item"
            >
              <span>{{ item }}</span
              ><span>{{ activityType === item ? "已选择" : "" }}</span>
            </button>
          </div>
        </section>
        <section class="hd-flow-step">
          <h3>留下刚好的信息</h3>
          <Menu
            v-model="duration"
            label="活动时长"
            :options="['10 分钟', '15 分钟', '20 分钟', '30 分钟']"
            inspect-id="hengdong.today.quick-duration"
          />
          <RadioGroup
            v-model="feeling"
            label="完成后的体感"
            :options="['轻松', '刚好', '吃力']"
            inspect-id="hengdong.today.quick-feeling"
          />
        </section>
        <section class="hd-flow-step">
          <h3>确认这次活动</h3>
          <div class="hd-statline">
            <div class="hd-stat">
              <strong>{{ Number.parseInt(duration, 10) }}</strong
              ><span>分钟</span>
            </div>
            <div class="hd-stat">
              <strong>{{ activityType }}</strong
              ><span>活动类型</span>
            </div>
            <div class="hd-stat">
              <strong>{{ feeling }}</strong
              ><span>完成体感</span>
            </div>
          </div>
          <p class="hd-muted">保存后会立即计入今天和本周进度。</p>
        </section>
        <template #actions>
          <Button
            v-if="step > 0"
            label="上一步"
            bg-color="color.surface"
            border-color="color.border"
            text-color="color.on-surface"
            @click="step -= 1"
          />
          <Button v-if="step < 2" label="下一步" @click="step += 1" />
          <Button
            v-else
            label="保存活动"
            inspect-id="hengdong.today.save-quick-record"
            @click="saveQuickRecord"
          />
        </template>
      </FlowSheet>

      <Toast
        v-model="toast"
        message="活动已记录，本周进度已更新"
        inspect-id="hengdong.today.toast"
      />
    </section>
  </HengdongRoot>
</template>

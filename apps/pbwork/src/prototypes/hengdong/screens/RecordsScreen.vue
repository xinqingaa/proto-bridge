<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import FilterBar from "@/design-system/components/navigation/FilterBar.vue";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import HengdongRoot from "../HengdongRoot.vue";
import StreakCalendar from "../components/StreakCalendar.vue";
import WeeklyActivityBars from "../components/WeeklyActivityBars.vue";
import { calendarWeeks, weekActivity } from "../model";
import { openHengdongScreen } from "../nav";
import { getRecords } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const tab = ref("日历");
const filter = ref("全部");
const storedRecords = ref(getRecords());
const variant = computed(() => String(route.query.variant ?? "default"));
const visibleRecords = computed(() =>
  variant.value === "empty"
    ? []
    : storedRecords.value.filter(
        (record) => filter.value === "全部" || record.feeling === filter.value,
      ),
);
const tabItems = [
  { value: "日历", label: "日历" },
  { value: "训练记录", label: "训练记录" },
];
</script>

<template>
  <HengdongRoot active="records" screen-id="hengdong.records">
    <section
      class="hd-page"
      data-pb-id="hengdong.records.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="variant === 'default'"
        :load-more="false"
        inspect-id="hengdong.records.scroll-list"
      >
        <div class="hd-content">
          <div class="hd-row-head">
            <div class="hd-row-main">
              <span class="hd-eyebrow">训练记录</span>
              <h1 class="hd-card-title">看见你的稳定积累</h1>
            </div>
            <Button
              label="趋势"
              size="sm"
              bg-color="color.primary-soft"
              border-color="color.primary-soft"
              text-color="color.primary"
              inspect-id="hengdong.records.open-stats"
              data-pb-action="open-stats"
              @click="openHengdongScreen(router, route, 'stats')"
            />
          </div>
          <PrimaryTabs
            v-model="tab"
            :items="tabItems"
            :swipe="false"
            :mouse-swipe="false"
            :grow="true"
            inspect-id="hengdong.records.tabs"
          >
            <template #日历>
              <Card
                semantic-role="section"
                inspect-id="hengdong.records.calendar-card"
              >
                <div class="hd-card-body">
                  <h2 class="hd-card-title">2026 年 8 月</h2>
                  <StreakCalendar
                    :weeks="calendarWeeks"
                    inspect-id="hengdong.records.calendar"
                  />
                </div>
              </Card>
            </template>
            <template #训练记录
              ><span class="hd-caption">按感受筛选下方记录</span></template
            >
          </PrimaryTabs>
          <Card
            semantic-role="summary"
            inspect-id="hengdong.records.week-summary"
          >
            <div class="hd-card-body">
              <div class="hd-row-head">
                <h2 class="hd-card-title">本周活动</h2>
                <Chip label="3 / 4 次" tone="success" />
              </div>
              <WeeklyActivityBars
                :items="weekActivity"
                inspect-id="hengdong.records.week-chart"
              />
            </div>
          </Card>
          <FilterBar
            v-model="filter"
            :items="['全部', '轻松', '刚好', '吃力']"
            inspect-id="hengdong.records.filters"
          />
          <EmptyState
            v-if="visibleRecords.length === 0"
            title="还没有训练记录"
            description="完成一次训练后，日期、时长和感受会出现在这里。"
            inspect-id="hengdong.records.empty"
          />
          <DataList v-else inspect-id="hengdong.records.list">
            <button
              v-for="record in visibleRecords"
              :key="record.id"
              type="button"
              class="hd-row hd-list-button"
              data-pb-id="hengdong.records.list.row"
              :data-pb-key="record.id"
              data-pb-role="list-item"
              data-pb-token-background="color.surface"
              data-pb-token-spacing="spacing.md"
              :data-pb-action="
                record.id === 'record-20260812'
                  ? 'open-primary-record'
                  : undefined
              "
              @click="
                openHengdongScreen(router, route, 'record-detail', 'default', {
                  record: record.id,
                })
              "
            >
              <span class="hd-row-main"
                ><h3>{{ record.planName }}</h3>
                <span class="hd-caption"
                  >{{ record.date }} · {{ record.minutes }} 分钟</span
                ></span
              ><Chip
                :label="record.feeling"
                :tone="record.feeling === '吃力' ? 'warning' : 'success'"
              />
            </button>
          </DataList>
        </div>
      </ScrollableDataList>
    </section>
  </HengdongRoot>
</template>

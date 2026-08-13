<script setup lang="ts">
import { ref } from "vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import HengdongShell from "../HengdongShell.vue";
import WeeklyActivityBars from "../components/WeeklyActivityBars.vue";
import { weekActivity } from "../model";
import "../hengdong.css";

const period = ref("周");
</script>

<template>
  <HengdongShell title="数据趋势" screen-id="hengdong.stats" back-to="records">
    <section
      class="hd-page"
      data-pb-id="hengdong.stats.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.stats.scroll-list"
        ><div class="hd-content">
          <div
            class="hd-period period-segment"
            data-no-swipe
            data-pb-id="hengdong.stats.period"
            data-pb-role="filter"
            data-pb-token-background="color.surface-recessed"
            data-pb-token-radius="radius.md"
            data-pb-token-spacing="spacing.xs"
          >
            <button
              v-for="item in ['周', '月']"
              :key="item"
              type="button"
              :class="{ 'is-active': period === item }"
              @click="period = item"
            >
              {{ item }}
            </button>
          </div>
          <header
            class="hd-hero"
            data-pb-id="hengdong.stats.summary"
            data-pb-role="summary"
            data-pb-token-background="color.primary-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.xl"
            data-pb-token-spacing="spacing.lg"
          >
            <span class="hd-eyebrow">{{
              period === "周" ? "8 月 10 日—16 日" : "2026 年 8 月"
            }}</span>
            <h1>
              {{ period === "周" ? "本周已完成 3 次" : "本月已完成 11 次" }}
            </h1>
            <p class="hd-muted">比上一个周期多完成 1 次，节奏正在变稳。</p>
            <Progress
              :value="period === '周' ? 75 : 69"
              :label="period === '周' ? '周目标 3 / 4' : '月目标 11 / 16'"
              inspect-id="hengdong.stats.goal-progress"
            />
          </header>
          <Card
            semantic-role="section"
            inspect-id="hengdong.stats.activity-card"
            ><div class="hd-card-body">
              <div class="hd-row-head">
                <h2 class="hd-card-title">训练分钟</h2>
                <Chip
                  :label="period === '周' ? '105 分钟' : '412 分钟'"
                  tone="primary"
                />
              </div>
              <WeeklyActivityBars
                :items="weekActivity"
                inspect-id="hengdong.stats.activity-chart"
              /></div
          ></Card>
          <Card semantic-role="summary" inspect-id="hengdong.stats.metrics"
            ><div class="hd-card-body">
              <h2 class="hd-card-title">完成质量</h2>
              <div class="hd-metrics">
                <div class="hd-metric">
                  <strong>82%</strong><span>计划完成率</span>
                </div>
                <div class="hd-metric">
                  <strong>26′</strong><span>平均时长</span>
                </div>
                <div class="hd-metric">
                  <strong>6 天</strong><span>当前连续</span>
                </div>
              </div>
            </div></Card
          >
          <section class="hd-section">
            <h2 class="hd-section-title">近期节奏</h2>
            <DataList inspect-id="hengdong.stats.insights"
              ><div class="hd-row">
                <span class="hd-row-main"
                  ><h3>更容易坚持的时段</h3>
                  <span class="hd-caption">20:00—21:00 · 完成 5 次</span></span
                ><Chip label="晚间" tone="success" />
              </div>
              <div class="hd-row">
                <span class="hd-row-main"
                  ><h3>最常完成的计划</h3>
                  <span class="hd-caption">15 分钟唤醒 · 完成 7 次</span></span
                ><Chip label="入门" tone="primary" /></div
            ></DataList>
          </section></div
      ></ScrollableDataList>
    </section>
  </HengdongShell>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowRight, Lightbulb, ReceiptText } from "lucide-vue-next";
import Chip from "@/design-system/components/basic/Chip.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import { pushStack } from "../nav";
import {
  formatMoney,
  ledgerRecords,
  spendingProfile,
  weeklyTrend,
} from "../mock";

const route = useRoute();
const router = useRouter();
const refreshing = ref(false);
const ownsVariant = computed(() => route.params.screenSlug === "ledger-home");
const variant = computed(() => {
  if (!ownsVariant.value) return "default";
  return typeof route.query.variant === "string"
    ? route.query.variant
    : "default";
});
const isStateView = computed(() =>
  ["loading", "empty", "error"].includes(variant.value),
);

const todayRecords = computed(() =>
  ledgerRecords.filter((item) => item.dayLabel === "今天"),
);
const recentRecords = computed(() => ledgerRecords.slice(0, 5));
const todayExpense = computed(() =>
  todayRecords.value
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0),
);
const weekExpense = computed(() =>
  weeklyTrend.reduce((sum, item) => sum + item.expense, 0),
);
const maxTrend = Math.max(...weeklyTrend.map((item) => item.expense), 1);

const trendPath = computed(() =>
  weeklyTrend
    .map((item, index) => {
      const x = 8 + (index / (weeklyTrend.length - 1)) * 264;
      const y = 78 - (item.expense / maxTrend) * 58;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" "),
);

const radarPoints = computed(() => {
  const center = 68;
  const radius = 50;
  return spendingProfile
    .map((item, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / spendingProfile.length;
      const scale = item.value / 100;
      return `${center + Math.cos(angle) * radius * scale},${
        center + Math.sin(angle) * radius * scale
      }`;
    })
    .join(" ");
});

function go(slug: string, nextVariant = "default") {
  void pushStack(router, route, "记账", slug, { variant: nextVariant });
}

function refreshRecords() {
  if (refreshing.value) return;
  refreshing.value = true;
  window.setTimeout(() => {
    refreshing.value = false;
  }, 650);
}
</script>

<template>
  <ScrollableDataList
    :pull-refresh="{ enabled: !isStateView, mouse: true }"
    :load-more="false"
    :drag-scroll="{ enabled: !isStateView, mouse: true, momentum: true }"
    :refreshing="refreshing"
    :has-more="false"
    inspect-id="ledger-planet.ledger-home.scroll-list"
    @refresh="refreshRecords"
  >
    <div
      class="page"
      :class="{ 'is-state': isStateView }"
      data-pb-id="ledger-planet.ledger-home"
    >
      <Spinner v-if="variant === 'loading'" label="正在加载今日账本" size="lg" />
      <div v-else-if="variant === 'error'" class="state-error" role="alert">
        <strong>今日账本加载失败</strong>
        <span>请稍后重试。</span>
      </div>
      <EmptyState
        v-else-if="variant === 'empty'"
        title="今天还没有流水"
        description="记下第一笔，开始观察本周趋势。"
        action-label="记一笔"
        @action="go('record-edit')"
      />
      <template v-else>
        <button class="summary-hit today-hero" type="button" @click="go('ledger-list', 'day')">
          <div class="today-heading">
            <div>
              <span>今天 · 7月23日</span>
              <strong>¥ {{ formatMoney(todayExpense) }}</strong>
            </div>
            <Chip label="低于日均 8%" tone="success" />
          </div>
          <div class="today-stats">
            <div><span>本日预算</span><strong>¥200</strong></div>
            <div><span>还可用</span><strong>¥{{ formatMoney(200 - todayExpense) }}</strong></div>
            <div><span>已记录</span><strong>{{ todayRecords.length }} 笔</strong></div>
          </div>
          <div class="budget-track" aria-label="今日预算已使用 63%">
            <span :style="{ width: `${Math.min((todayExpense / 200) * 100, 100)}%` }" />
          </div>
        </button>

        <section class="week-card">
          <header>
            <div><span>本周支出</span><strong>¥ {{ formatMoney(weekExpense) }}</strong></div>
            <button type="button" @click="go('analytics')">查看分析 <ArrowRight :size="15" /></button>
          </header>
          <svg class="trend" viewBox="0 0 280 92" role="img" aria-label="本周七日支出趋势">
            <defs>
              <linearGradient id="homeTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity=".24" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="`${trendPath} L272 88 L8 88 Z`" fill="url(#homeTrendFill)" />
            <path :d="trendPath" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle
              v-for="(item, index) in weeklyTrend"
              :key="item.label"
              :cx="8 + (index / (weeklyTrend.length - 1)) * 264"
              :cy="78 - (item.expense / maxTrend) * 58"
              :r="index === weeklyTrend.length - 1 ? 4.5 : 3"
              fill="currentColor"
            />
          </svg>
          <div class="trend-labels">
            <span v-for="item in weeklyTrend" :key="item.label">{{ item.label }}</span>
          </div>
        </section>

        <section class="profile-card">
          <header>
            <div>
              <span>本周消费画像</span>
              <strong>餐饮支出偏高</strong>
            </div>
            <button type="button" @click="go('analytics')">详情</button>
          </header>
          <div class="profile-content">
            <svg class="radar" viewBox="0 0 136 136" role="img" aria-label="本周五类消费雷达图">
              <polygon points="68,18 115.6,52.5 97.4,108.5 38.6,108.5 20.4,52.5" class="radar-grid" />
              <polygon points="68,35 99.4,57.8 87.4,94.7 48.6,94.7 36.6,57.8" class="radar-grid" />
              <polygon :points="radarPoints" class="radar-value" />
              <circle cx="68" cy="27" r="3" />
            </svg>
            <div class="profile-list">
              <button
                v-for="item in spendingProfile.slice(0, 3)"
                :key="item.name"
                type="button"
                @click="go('ledger-list', 'filtered')"
              >
                <span>{{ item.name }}</span><strong>{{ item.value }}</strong><em>›</em>
              </button>
            </div>
          </div>
        </section>

        <div class="insight">
          <Lightbulb :size="18" />
          <p><strong>本周洞察</strong><span>午餐支出比上周高 ¥86，周二和今天最集中。</span></p>
        </div>

        <section class="recent">
          <header>
            <div><ReceiptText :size="18" /><h2>最近流水</h2></div>
            <button type="button" @click="go('ledger-list')">查看全部</button>
          </header>
          <DataList surface="none" rounded="none">
            <button
              v-for="item in recentRecords"
              :key="item.id"
              type="button"
              class="record-row"
              @click="go('record-detail')"
            >
              <span class="category-mark" :data-cat="item.category">{{ item.category.slice(0, 1) }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.merchant || item.account }} · {{ item.date.slice(11, 16) }}</span>
              </div>
              <em :class="item.type">
                {{ item.type === "expense" ? "−" : "+" }}{{ formatMoney(item.amount) }}
              </em>
            </button>
          </DataList>
        </section>
      </template>
    </div>
  </ScrollableDataList>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--pb-spacing-md);
  min-height: 100%;
  padding: var(--pb-spacing-md) var(--pb-spacing-md) var(--pb-spacing-lg);
  align-content: start;
}
.page.is-state {
  place-content: center;
  justify-items: center;
}
.state-error,
.state-error span {
  display: grid;
  gap: var(--pb-spacing-xs);
  text-align: center;
  color: var(--pb-color-on-surface-muted);
}
.state-error strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.today-hero,
.week-card,
.profile-card {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--pb-color-primary) 22%, var(--pb-color-border));
  border-radius: var(--pb-radius-lg);
  background: color-mix(in srgb, var(--pb-color-primary) 7%, var(--pb-color-surface));
  color: inherit;
  box-shadow: var(--pb-elevation-card);
}
.today-hero {
  display: grid;
  gap: var(--pb-spacing-md);
  padding: var(--pb-spacing-md);
  text-align: left;
  cursor: pointer;
}
.today-heading,
.week-card header,
.profile-card header,
.recent header,
.recent header > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.today-heading > div,
.week-card header > div,
.profile-card header > div {
  display: grid;
  gap: var(--pb-spacing-xxs);
}
.today-heading span,
.today-stats span,
.week-card header span,
.profile-card header span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.today-heading > div > strong {
  font: var(--pb-typography-title-lg);
  letter-spacing: -.03em;
}
.today-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--pb-spacing-sm);
}
.today-stats div {
  display: grid;
  gap: var(--pb-spacing-xxs);
}
.today-stats strong {
  font: var(--pb-typography-label);
}
.budget-track {
  height: 6px;
  border-radius: var(--pb-radius-sm);
  background: var(--pb-color-surface-variant);
  overflow: hidden;
}
.budget-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--pb-color-primary);
}
.week-card,
.profile-card {
  display: grid;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  background: var(--pb-color-surface);
}
.week-card header strong,
.profile-card header strong {
  font: var(--pb-typography-subtitle);
}
.week-card header button,
.profile-card header button,
.recent header button {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-xxs);
  border: 0;
  background: transparent;
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.trend {
  width: 100%;
  height: 92px;
  color: var(--pb-color-primary);
}
.trend-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-align: center;
}
.profile-content {
  display: grid;
  grid-template-columns: 136px 1fr;
  gap: var(--pb-spacing-md);
  align-items: center;
}
.radar {
  width: 136px;
  color: var(--pb-color-primary);
}
.radar-grid {
  fill: color-mix(in srgb, var(--pb-color-primary) 2%, transparent);
  stroke: var(--pb-color-border);
}
.radar-value {
  fill: color-mix(in srgb, var(--pb-color-primary) 22%, transparent);
  stroke: var(--pb-color-primary);
  stroke-width: 2;
}
.profile-list {
  display: grid;
}
.profile-list button {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm) 0;
  border: 0;
  border-bottom: 1px solid var(--pb-color-border);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.profile-list button:last-child {
  border-bottom: 0;
}
.profile-list strong {
  color: var(--pb-color-primary);
}
.profile-list em {
  color: var(--pb-color-on-surface-muted);
  font-style: normal;
}
.insight {
  display: flex;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm-plus);
  border-left: 3px solid var(--pb-color-warning);
  background: var(--pb-color-warning-soft);
}
.insight > svg {
  flex: 0 0 auto;
  color: var(--pb-color-warning);
}
.insight p,
.insight strong,
.insight span {
  display: block;
  margin: 0;
}
.insight strong {
  font: var(--pb-typography-label);
}
.insight span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.recent {
  display: grid;
}
.recent header {
  padding: var(--pb-spacing-sm) 0 var(--pb-spacing-xs);
}
.recent h2 {
  margin: 0;
  font: var(--pb-typography-subtitle);
}
.record-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-sm);
  width: 100%;
  min-height: var(--pb-sizing-menu-item);
  padding: var(--pb-spacing-sm) 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.category-mark {
  display: grid;
  place-items: center;
  width: var(--pb-sizing-control-md);
  height: var(--pb-sizing-control-md);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
}
.record-row div strong,
.record-row div span {
  display: block;
}
.record-row div strong,
.record-row em {
  font: var(--pb-typography-subtitle);
}
.record-row div span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.record-row em {
  font-style: normal;
}
.record-row em.expense {
  color: var(--pb-color-error);
}
.record-row em.income {
  color: var(--pb-color-success);
}
</style>

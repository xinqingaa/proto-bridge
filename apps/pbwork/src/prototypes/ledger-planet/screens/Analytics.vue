<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Lightbulb, SlidersHorizontal } from "lucide-vue-next";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import DateRangeSheet from "../DateRangeSheet.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import {
  accountOptions,
  categoryBreakdown,
  categoryOptions,
  formatMoney,
  spendingProfile,
  summaryByPeriod,
  trendPoints,
  weeklyTrend,
  type LedgerRange,
} from "../mock";
import { replaceScreen } from "../nav";

const route = useRoute();
const router = useRouter();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const range = ref<LedgerRange>(
  "month",
);
const rangeLabel = ref(range.value === "week" ? "7月17日–23日" : "2026年7月");
const rangeStart = ref("2026-07-01");
const rangeEnd = ref("2026-07-31");
const type = ref<"expense" | "income">("expense");
const account = ref("全部账户");
const category = ref("全部分类");
const dateSheet = ref(variant.value === "date-sheet");
const filterSheet = ref(variant.value === "filter-sheet");
const selectedPoint = ref<number | null>(null);
const summary = computed(() =>
  range.value === "week" ? summaryByPeriod.week : summaryByPeriod.month,
);

watch(variant, (value) => {
  dateSheet.value = value === "date-sheet";
  filterSheet.value = value === "filter-sheet";
});

const chartPoints = computed(() =>
  type.value === "expense" ? trendPoints : [0, 0, 0, 4120, 0, 0, 0],
);
const trendPath = computed(() => {
  const max = Math.max(...chartPoints.value, 1);
  return chartPoints.value
    .map((point, index) => {
      const x = 10 + (index / (chartPoints.value.length - 1)) * 260;
      const y = 92 - (point / max) * 70;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
});
const radarPoints = computed(() => {
  const center = 82;
  const radius = 60;
  return spendingProfile
    .map((item, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / spendingProfile.length;
      const scale = item.value / 100;
      return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
    })
    .join(" ");
});

function applyRange(value: {
  range: LedgerRange;
  start: string;
  end: string;
  label: string;
}) {
  range.value = value.range;
  rangeStart.value = value.start;
  rangeEnd.value = value.end;
  rangeLabel.value = value.label;
}

function openRecords(query: Record<string, string> = {}) {
  void replaceScreen(router, route, "记账", "ledger-list", {
    variant: query.category ? "filtered" : query.range === "day" ? "day" : "default",
  });
}
</script>

<template>
  <LedgerPlanetShell title="图表分析" active="记账" back-to="ledger-home">
    <div class="page" data-pb-id="ledger-planet.analytics">
      <EmptyState
        v-if="variant === 'empty'"
        title="暂无分析数据"
        description="记几笔账后再来看结构、趋势与消费画像。"
      />
      <template v-else>
        <div class="filter-context" data-no-swipe>
          <button type="button" @click="dateSheet = true">
            <CalendarRange :size="18" /><span><small>时间范围</small><strong>{{ rangeLabel }}</strong></span>
          </button>
          <button type="button" @click="filterSheet = true">
            <SlidersHorizontal :size="18" /><span><small>分析范围</small><strong>{{ account }} · {{ category }}</strong></span>
          </button>
        </div>

        <section class="kpis">
          <button type="button" @click="openRecords({ type: '支出' })">
            <span>支出</span><strong>¥ {{ formatMoney(summary.expense) }}</strong><small class="good"><ArrowDownRight :size="14" />较上期 12%</small>
          </button>
          <button type="button" @click="openRecords({ type: '收入' })">
            <span>收入</span><strong>¥ {{ formatMoney(summary.income) }}</strong><small><ArrowUpRight :size="14" />工资占 100%</small>
          </button>
          <div>
            <span>结余率</span><strong>{{ Math.round(((summary.income - summary.expense) / Math.max(summary.income, 1)) * 100) }}%</strong><small>目标 30%</small>
          </div>
        </section>

        <section class="chart-card trend-card">
          <header>
            <div><span>收支趋势</span><strong>{{ type === "expense" ? "日均支出 ¥126" : "本期收入 ¥4,120" }}</strong></div>
            <div class="type-switch" data-no-swipe>
              <button type="button" :class="{ active: type === 'expense' }" @click="type = 'expense'">支出</button>
              <button type="button" :class="{ active: type === 'income' }" @click="type = 'income'">收入</button>
            </div>
          </header>
          <div v-if="selectedPoint !== null" class="point-tip">
            {{ weeklyTrend[selectedPoint]?.label }} · ¥{{ formatMoney(chartPoints[selectedPoint] ?? 0) }}
          </div>
          <svg class="trend" viewBox="0 0 280 112" role="img" aria-label="当前筛选范围收支趋势">
            <defs>
              <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity=".28" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line v-for="y in [22, 57, 92]" :key="y" x1="10" :y1="y" x2="270" :y2="y" class="grid-line" />
            <path :d="`${trendPath} L270 102 L10 102 Z`" fill="url(#analyticsTrendFill)" />
            <path :d="trendPath" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            <circle
              v-for="(point, index) in chartPoints"
              :key="index"
              :cx="10 + (index / (chartPoints.length - 1)) * 260"
              :cy="92 - (point / Math.max(...chartPoints, 1)) * 70"
              :r="selectedPoint === index ? 6 : 4"
              tabindex="0"
              @click="selectedPoint = index"
              @focus="selectedPoint = index"
            />
          </svg>
          <div class="axis-labels"><span v-for="item in weeklyTrend" :key="item.label">{{ item.label }}</span></div>
        </section>

        <section class="analysis-grid">
          <div class="chart-card category-card">
            <header><div><span>支出结构</span><strong>餐饮占比最高</strong></div></header>
            <div class="donut-wrap">
              <button class="donut" type="button" aria-label="分类占比环图，餐饮占38%" @click="openRecords({ category: '餐饮' })">
                <span><strong>38%</strong><small>餐饮</small></span>
              </button>
              <div class="legend">
                <button v-for="item in categoryBreakdown.slice(0, 4)" :key="item.name" type="button" @click="openRecords({ category: item.name })">
                  <i :style="{ opacity: Math.max(item.percent / 40, .35) }" /><span>{{ item.name }}</span><strong>{{ item.percent }}%</strong>
                </button>
              </div>
            </div>
          </div>

          <div class="chart-card radar-card">
            <header><div><span>消费画像</span><strong>餐饮与交通偏高</strong></div></header>
            <svg class="radar" viewBox="0 0 164 164" role="img" aria-label="五类消费雷达图">
              <polygon points="82,22 139.1,63.5 117.3,130.5 46.7,130.5 24.9,63.5" class="radar-grid" />
              <polygon points="82,42 120.1,69.7 105.5,114.3 58.5,114.3 43.9,69.7" class="radar-grid" />
              <polygon :points="radarPoints" class="radar-value" />
              <text x="82" y="12">餐饮</text><text x="146" y="62">交通</text><text x="121" y="151">购物</text><text x="23" y="151">住房</text><text x="1" y="62">娱乐</text>
            </svg>
          </div>
        </section>

        <section class="chart-card weekday-card">
          <header><div><span>星期分布</span><strong>周日支出最高</strong></div><Chip label="峰值 ¥164" tone="warning" /></header>
          <div class="bars">
            <button v-for="item in weeklyTrend" :key="item.label" type="button" @click="openRecords({ range: 'day' })">
              <span><i :style="{ height: `${Math.max((item.expense / 164) * 100, 12)}%` }" /></span>
              <small>{{ item.label }}</small>
            </button>
          </div>
        </section>

        <section class="insights">
          <header><Lightbulb :size="18" /><strong>值得关注</strong></header>
          <button type="button" @click="openRecords({ category: '餐饮' })">
            <span>午餐支出连续 3 天高于日均</span><strong>查看 5 笔流水 ›</strong>
          </button>
          <button type="button" @click="openRecords({ category: '交通' })">
            <span>交通支出较上周增加 18%</span><strong>查看原因 ›</strong>
          </button>
        </section>
      </template>
    </div>

    <DateRangeSheet
      v-model="dateSheet"
      :range="range"
      :start="rangeStart"
      :end="rangeEnd"
      inspect-id="ledger-planet.analytics.date-sheet"
      @apply="applyRange"
    />
    <BottomSheet
      v-model="filterSheet"
      title="筛选分析数据"
      inspect-id="ledger-planet.analytics.filter-sheet"
    >
      <div class="filter-sheet">
        <SelectField v-model="account" label="账户" :options="['全部账户', ...accountOptions]" />
        <SelectField v-model="category" label="分类" :options="['全部分类', ...categoryOptions]" />
        <p>筛选会同步更新页面中的全部指标和图表。</p>
        <Button label="查看分析" block @click="filterSheet = false" />
      </div>
    </BottomSheet>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--pb-spacing-md);
  padding: var(--pb-spacing-md);
}
.filter-context {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-sm);
}
.filter-context button {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-height: var(--pb-sizing-menu-item);
  padding: var(--pb-spacing-sm);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.filter-context svg {
  color: var(--pb-color-primary);
}
.filter-context small,
.filter-context strong {
  display: block;
}
.filter-context small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.filter-context strong {
  overflow: hidden;
  font: var(--pb-typography-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
.kpis > * {
  display: grid;
  gap: var(--pb-spacing-xxs);
  min-width: 0;
  padding: var(--pb-spacing-sm-plus);
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.kpis > * + * {
  border-left: 1px solid var(--pb-color-border);
}
.kpis span,
.kpis small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.kpis strong {
  font: var(--pb-typography-subtitle);
}
.kpis small {
  display: flex;
  align-items: center;
}
.kpis small.good {
  color: var(--pb-color-success);
}
.chart-card {
  display: grid;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  box-shadow: var(--pb-elevation-card);
}
.chart-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.chart-card header > div {
  display: grid;
  gap: var(--pb-spacing-xxs);
}
.chart-card header span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.chart-card header strong {
  font: var(--pb-typography-subtitle);
}
.type-switch {
  display: flex;
  padding: var(--pb-spacing-xxs);
  border-radius: var(--pb-radius-sm);
  background: var(--pb-color-surface-variant);
}
.type-switch button {
  border: 0;
  border-radius: var(--pb-radius-xs);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  padding: var(--pb-spacing-xs) var(--pb-spacing-sm);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.type-switch button.active {
  background: var(--pb-color-surface);
  color: var(--pb-color-primary);
}
.point-tip {
  justify-self: center;
  padding: var(--pb-spacing-xs) var(--pb-spacing-sm);
  border-radius: var(--pb-radius-sm);
  background: var(--pb-color-on-surface);
  color: var(--pb-color-surface);
  font: var(--pb-typography-caption);
}
.trend {
  width: 100%;
  color: var(--pb-color-primary);
}
.trend circle {
  fill: var(--pb-color-surface);
  stroke: currentColor;
  stroke-width: 2;
  cursor: pointer;
}
.grid-line {
  stroke: var(--pb-color-border);
  stroke-width: 1;
}
.axis-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-align: center;
}
.analysis-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-md);
}
.donut-wrap {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: var(--pb-spacing-md);
  align-items: center;
}
.donut {
  display: grid;
  place-items: center;
  width: 124px;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: conic-gradient(
    var(--pb-color-primary) 0 38%,
    var(--pb-color-info) 38% 60%,
    var(--pb-color-warning) 60% 78%,
    var(--pb-color-success) 78% 92%,
    var(--pb-color-surface-variant) 92% 100%
  );
  color: inherit;
  cursor: pointer;
}
.donut > span {
  display: grid;
  place-items: center;
  width: 72%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--pb-color-surface);
}
.donut strong,
.donut small {
  display: block;
}
.donut strong {
  font: var(--pb-typography-title);
}
.donut small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.legend {
  display: grid;
}
.legend button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-xs) 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--pb-typography-caption);
  text-align: left;
  cursor: pointer;
}
.legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pb-color-primary);
}
.radar {
  justify-self: center;
  width: min(100%, 184px);
  color: var(--pb-color-primary);
  overflow: visible;
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
.radar text {
  fill: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--pb-spacing-sm);
  height: 146px;
}
.bars button {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: var(--pb-spacing-xs);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.bars button > span {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-radius: var(--pb-radius-sm);
  background: var(--pb-color-surface-variant);
  overflow: hidden;
}
.bars i {
  display: block;
  width: 100%;
  border-radius: var(--pb-radius-sm);
  background: color-mix(in srgb, var(--pb-color-primary) 72%, transparent);
}
.bars small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.insights {
  display: grid;
  border-left: 3px solid var(--pb-color-warning);
  background: var(--pb-color-warning-soft);
}
.insights header {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm-plus);
}
.insights header svg {
  color: var(--pb-color-warning);
}
.insights button {
  display: flex;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm) var(--pb-spacing-sm-plus);
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--pb-color-warning) 20%, transparent);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.insights button strong {
  color: var(--pb-color-primary);
  white-space: nowrap;
}
.filter-sheet {
  display: grid;
  gap: var(--pb-spacing-md);
}
.filter-sheet p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
@media (max-width: 560px) {
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  .filter-context {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import PeriodSegment from "../PeriodSegment.vue";
import Card from "@/design-system/components/basic/Card.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import {
  categoryBreakdown,
  formatMoney,
  summaryByPeriod,
  trendPoints,
  type LedgerPeriod,
} from "../mock";
import { replaceScreen } from "../nav";

const route = useRoute();
const router = useRouter();
const period = ref<LedgerPeriod>("month");
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const summary = computed(() => summaryByPeriod[period.value]);

const trendPath = computed(() => {
  const max = Math.max(...trendPoints, 1);
  return trendPoints
    .map((point, index) => {
      const x = (index / (trendPoints.length - 1)) * 280;
      const y = 88 - (point / max) * 72;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
});

function openCategory(name: string) {
  void replaceScreen(router, route, "记账", "ledger-home", {
    variant: "filtered",
    query: { category: name },
  });
}
</script>

<template>
  <LedgerPlanetShell title="图表分析" active="记账" back-to="ledger-home">
    <div class="page" data-pb-id="ledger-planet.analytics">
      <EmptyState
        v-if="variant === 'empty'"
        title="暂无分析数据"
        description="记几笔账后再来看结构与趋势。"
      />
      <template v-else>
        <PeriodSegment v-model="period" />
        <Card
          title="支出结构"
          :subtitle="`本周期支出 ¥ ${formatMoney(summary.expense)}`"
        >
          <div class="bars">
            <div
              v-for="item in categoryBreakdown"
              :key="item.name"
              class="bar-row"
            >
              <div class="bar-meta">
                <span>{{ item.name }} {{ item.percent }}%</span>
                <span>¥ {{ formatMoney(item.amount) }}</span>
              </div>
              <ProgressIndicator
                :value="item.percent"
                :label="`${item.percent}%`"
              />
            </div>
          </div>
        </Card>
        <Card title="近 7 日趋势" subtitle="支出走势">
          <svg
            class="trend"
            viewBox="0 0 280 96"
            role="img"
            aria-label="近七日支出折线"
          >
            <path
              :d="trendPath"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            />
            <circle
              v-for="(point, index) in trendPoints"
              :key="index"
              :cx="(index / (trendPoints.length - 1)) * 280"
              :cy="88 - (point / Math.max(...trendPoints, 1)) * 72"
              r="3.5"
              fill="currentColor"
            />
          </svg>
        </Card>
        <Card title="分类排行" subtitle="点击带回筛选">
          <DataList surface="none" rounded="none">
            <button
              v-for="item in categoryBreakdown"
              :key="item.name"
              type="button"
              class="rank-row"
              @click="openCategory(item.name)"
            >
              <span>{{ item.name }}</span
              ><strong>¥ {{ formatMoney(item.amount) }}</strong>
            </button>
          </DataList>
        </Card>
      </template>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.bars {
  display: grid;
  gap: 12px;
}
.bar-row {
  display: grid;
  gap: 6px;
}
.bar-meta {
  display: flex;
  justify-content: space-between;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.trend {
  display: block;
  width: 100%;
  height: auto;
  color: var(--pb-color-primary);
}
.rank-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: var(--pb-typography-content);
  cursor: pointer;
}
.rank-row strong {
  font: var(--pb-typography-subtitle);
}
</style>

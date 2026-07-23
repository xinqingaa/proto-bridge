<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import RadioGroup from "@/design-system/components/basic/RadioGroup.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import PeriodSegment from "../PeriodSegment.vue";
import { pushStack } from "../nav";
import {
  categoryOptions,
  formatMoney,
  groupRecordsByDay,
  recordsForPeriod,
  summaryByPeriod,
  type LedgerPeriod,
} from "../mock";

const route = useRoute();
const router = useRouter();
const period = ref<LedgerPeriod>("month");
const typeFilter = ref("全部");
const sheetOpen = ref(false);
const sheetType = ref("全部");
const sheetCategories = ref<string[]>([]);
const sheetAccount = ref("全部");
const amountMin = ref("");
const amountMax = ref("");

const periodTitle: Record<LedgerPeriod, string> = {
  year: "本年支出",
  month: "本月支出",
  week: "本周支出",
  day: "今日支出",
};

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
const summary = computed(() => summaryByPeriod[period.value]);
const balance = computed(() => summary.value.income - summary.value.expense);

const filteredRecords = computed(() => {
  if (["loading", "empty", "error"].includes(variant.value)) return [];
  let rows = recordsForPeriod(period.value);
  if (variant.value === "filtered" || typeFilter.value === "餐饮") {
    rows = rows.filter(
      (item) => item.type === "expense" && item.category === "餐饮",
    );
  } else if (typeFilter.value === "支出") {
    rows = rows.filter((item) => item.type === "expense");
  } else if (typeFilter.value === "收入") {
    rows = rows.filter((item) => item.type === "income");
  }
  return rows;
});
const groups = computed(() => groupRecordsByDay(filteredRecords.value));
const filterActive = computed(
  () => typeFilter.value !== "全部" || variant.value === "filtered",
);

watch(
  variant,
  (value) => {
    sheetOpen.value = value === "sheet-open";
    if (value === "filtered") typeFilter.value = "餐饮";
  },
  { immediate: true },
);

function go(slug: string, nextVariant = "default") {
  void pushStack(router, route, "记账", slug, { variant: nextVariant });
}

function applyFilter() {
  if (sheetCategories.value.includes("餐饮")) typeFilter.value = "餐饮";
  else if (sheetType.value === "支出" || sheetType.value === "收入")
    typeFilter.value = sheetType.value;
  else typeFilter.value = "全部";
  sheetOpen.value = false;
  void router.replace({
    query: { ...route.query, variant: "filtered" },
  });
}

function resetFilter() {
  sheetType.value = "全部";
  sheetCategories.value = [];
  sheetAccount.value = "全部";
  amountMin.value = "";
  amountMax.value = "";
  typeFilter.value = "全部";
  sheetOpen.value = false;
  void router.replace({
    query: { ...route.query, variant: "default" },
  });
}

function toggleCategory(name: string) {
  if (sheetCategories.value.includes(name)) {
    sheetCategories.value = sheetCategories.value.filter(
      (item) => item !== name,
    );
    return;
  }
  sheetCategories.value = [...sheetCategories.value, name];
}
</script>

<template>
  <div
    class="page"
    :class="{ 'is-state': isStateView }"
    data-pb-id="ledger-planet.ledger-home"
  >
    <Spinner v-if="variant === 'loading'" label="正在加载账本" size="lg" />
    <div v-else-if="variant === 'error'" class="error" role="alert">
      <strong>账本加载失败</strong>
      <span>请稍后重试。</span>
    </div>
    <EmptyState
      v-else-if="variant === 'empty'"
      title="还没有流水"
      description="记一笔，开始你的账本星球。"
      action-label="记一笔"
      @action="go('record-edit')"
    />
    <template v-else>
      <div class="hero-orbit" aria-hidden="true" />
      <PeriodSegment v-model="period" />
      <button class="summary-hit" type="button" @click="go('analytics')">
        <div class="summary-hero" data-pb-id="ledger-planet.ledger-home.summary">
          <div class="summary-kicker">
            <span>{{ periodTitle[period] }}</span>
            <Chip :label="summary.deltaLabel" tone="secondary" />
          </div>
          <strong>¥ {{ formatMoney(summary.expense) }}</strong>
          <div class="summary-metrics">
            <div>
              <span>收入</span>
              <em>{{ formatMoney(summary.income) }}</em>
            </div>
            <div>
              <span>结余</span>
              <em :class="{ positive: balance >= 0 }">{{
                formatMoney(balance)
              }}</em>
            </div>
            <div>
              <span>笔数</span>
              <em>{{ filteredRecords.length }}</em>
            </div>
          </div>
        </div>
      </button>

      <div v-if="filterActive" class="filter-banner" data-no-swipe>
        <span>已筛：{{ typeFilter === "全部" ? "餐饮" : typeFilter }}</span>
        <button type="button" @click="resetFilter">清除</button>
      </div>

      <div class="filters" data-no-swipe>
        <button
          v-for="item in ['全部', '支出', '收入', '餐饮']"
          :key="item"
          type="button"
          class="chip-hit"
          data-no-swipe
          @click="typeFilter = item"
        >
          <Chip
            :label="item"
            :tone="typeFilter === item ? 'primary' : 'secondary'"
          />
        </button>
        <button
          type="button"
          class="chip-hit"
          data-no-swipe
          @click="sheetOpen = true"
        >
          <Chip label="筛选" tone="secondary" />
        </button>
      </div>

      <section v-for="group in groups" :key="group.dayLabel" class="day-group">
        <header>
          <span>{{ group.dayLabel }}</span>
          <span>支出 ¥ {{ formatMoney(group.total) }}</span>
        </header>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="record-row"
          @click="go('record-detail')"
        >
          <span class="cat-dot" :data-cat="item.category" aria-hidden="true" />
          <div class="record-main">
            <strong>{{ item.category }} · {{ item.title }}</strong>
            <span>{{ item.account }} · {{ item.date.slice(11, 16) }}</span>
          </div>
          <em :class="item.type">
            {{ item.type === "expense" ? "−" : "+" }}
            {{ formatMoney(item.amount) }}
          </em>
        </button>
      </section>
      <EmptyState
        v-if="groups.length === 0"
        title="没有匹配的流水"
        description="试试调整筛选条件。"
        action-label="清除筛选"
        @action="resetFilter"
      />
    </template>

    <BottomSheet
      v-model="sheetOpen"
      title="筛选"
      inspect-id="ledger-planet.ledger-home.filter-sheet"
    >
      <div class="sheet-body">
        <RadioGroup
          v-model="sheetType"
          label="类型"
          :options="['全部', '支出', '收入']"
        />
        <div class="sheet-block">
          <span class="sheet-label">分类</span>
          <div class="filters">
            <button
              v-for="name in categoryOptions.filter((item) => item !== '工资')"
              :key="name"
              type="button"
              class="chip-hit"
              @click="toggleCategory(name)"
            >
              <Chip
                :label="name"
                :tone="sheetCategories.includes(name) ? 'primary' : 'secondary'"
              />
            </button>
          </div>
        </div>
        <SelectField
          v-model="sheetAccount"
          label="账户"
          :options="['全部', '微信', '支付宝', '现金', '银行卡']"
        />
        <div class="amount-row">
          <TextField v-model="amountMin" label="最低金额" />
          <TextField v-model="amountMax" label="最高金额" />
        </div>
        <div class="sheet-actions">
          <Button label="重置" variant="outlined" @click="resetFilter" />
          <Button label="应用" @click="applyFilter" />
        </div>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  display: grid;
  gap: var(--pb-spacing-md, 12px);
  min-height: 100%;
  padding: var(--pb-spacing-md, 12px) var(--pb-spacing-md, 16px)
    var(--pb-spacing-lg, 20px);
  align-content: start;
}
.page.is-state {
  place-content: center;
  justify-items: center;
}
.hero-orbit {
  pointer-events: none;
  position: absolute;
  top: -40px;
  right: -28px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    color-mix(in srgb, var(--pb-color-primary) 28%, transparent),
    transparent 68%
  );
  opacity: 0.85;
}
.error {
  display: grid;
  gap: 6px;
  text-align: center;
}
.error strong {
  font: var(--pb-typography-subtitle);
}
.error span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.summary-hit {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.summary-hero {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: var(--pb-radius-lg);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--pb-color-primary) 14%, var(--pb-color-surface)),
      var(--pb-color-surface) 55%
    );
  overflow: hidden;
}
.summary-kicker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.summary-hero > strong {
  font: var(--pb-typography-title-lg);
  letter-spacing: -0.02em;
}
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in srgb, var(--pb-color-border) 70%, transparent);
}
.summary-metrics span {
  display: block;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.summary-metrics em {
  font: var(--pb-typography-subtitle);
  font-style: normal;
}
.summary-metrics em.positive {
  color: var(--pb-color-success);
}
.filter-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--pb-radius-md);
  background: color-mix(in srgb, var(--pb-color-primary) 10%, transparent);
  font: var(--pb-typography-caption);
}
.filter-banner button {
  border: 0;
  background: transparent;
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-hit {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.day-group {
  display: grid;
  gap: 0;
}
.day-group header {
  display: flex;
  justify-content: space-between;
  margin: 8px 0 4px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.record-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: var(--pb-sizing-touch, 44px);
  padding: 12px 4px;
  border: 0;
  border-bottom: 1px solid var(--pb-color-border);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.record-row:last-child {
  border-bottom: 0;
}
.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pb-color-primary);
}
.cat-dot[data-cat="餐饮"] {
  background: color-mix(in srgb, var(--pb-color-error) 70%, var(--pb-color-primary));
}
.cat-dot[data-cat="交通"] {
  background: var(--pb-color-info, var(--pb-color-primary));
}
.cat-dot[data-cat="购物"] {
  background: color-mix(in srgb, var(--pb-color-primary) 60%, #a78bfa);
}
.cat-dot[data-cat="工资"] {
  background: var(--pb-color-success);
}
.record-main strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.record-main span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.record-row em {
  font: var(--pb-typography-subtitle);
  font-style: normal;
}
.record-row em.expense {
  color: var(--pb-color-error);
}
.record-row em.income {
  color: var(--pb-color-success);
}
.sheet-body {
  display: grid;
  gap: 14px;
}
.sheet-block {
  display: grid;
  gap: 8px;
}
.sheet-label {
  font: var(--pb-typography-subtitle);
}
.amount-row,
.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>

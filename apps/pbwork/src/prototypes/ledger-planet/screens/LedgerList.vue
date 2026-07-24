<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CalendarRange, ChevronLeft, ChevronRight, RotateCcw } from "lucide-vue-next";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import DateRangeSheet from "../DateRangeSheet.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import RadioGroup from "@/design-system/components/basic/RadioGroup.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import FilterBar from "@/design-system/components/complex/FilterBar.vue";
import SearchBar from "@/design-system/components/complex/SearchBar.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import { pushStack } from "../nav";
import {
  accountOptions,
  categoryOptions,
  formatMoney,
  groupRecordsByDay,
  ledgerRecords,
  type LedgerRange,
} from "../mock";

const route = useRoute();
const router = useRouter();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const range = ref<LedgerRange>(
  variant.value === "day" ? "day" : variant.value === "week" ? "week" : "month",
);
const rangeLabel = ref(
  range.value === "day"
    ? "今天"
    : range.value === "week"
      ? "7月17日–23日"
      : "2026年7月",
);
const rangeStart = ref("2026-07-01");
const rangeEnd = ref("2026-07-31");
const search = ref("");
const type = ref(
  ["全部", "支出", "收入"].includes(String(route.query.type))
    ? String(route.query.type)
    : "全部",
);
const category = ref(
  variant.value === "filtered" ? "餐饮" : "全部",
);
const account = ref("全部");
const amountMin = ref("");
const amountMax = ref("");
const timeSheet = ref(variant.value === "date-sheet");
const filterSheet = ref(variant.value === "filter-sheet");
const refreshing = ref(false);
const loadingMore = ref(false);
const visibleLimit = ref(8);
const isStateView = computed(() =>
  ["loading", "empty", "error"].includes(variant.value),
);

watch(variant, (value) => {
  timeSheet.value = value === "date-sheet";
  filterSheet.value = value === "filter-sheet";
});

const filteredRecords = computed(() => {
  if (isStateView.value) return [];
  let rows =
    range.value === "day"
      ? ledgerRecords.filter((item) => item.dayLabel === "今天")
      : range.value === "week"
        ? ledgerRecords.filter((item) =>
            ["今天", "昨天", "7月15日", "7月14日", "7月13日"].includes(item.dayLabel),
          )
        : ledgerRecords;
  if (type.value !== "全部") {
    rows = rows.filter((item) =>
      type.value === "支出" ? item.type === "expense" : item.type === "income",
    );
  }
  if (category.value !== "全部") {
    rows = rows.filter((item) => item.category === category.value);
  }
  if (account.value !== "全部") {
    rows = rows.filter((item) => item.account === account.value);
  }
  const keyword = search.value.trim().toLowerCase();
  if (keyword) {
    rows = rows.filter((item) =>
      [item.title, item.category, item.merchant, item.note, ...(item.tags ?? [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }
  if (amountMin.value) rows = rows.filter((item) => item.amount >= Number(amountMin.value));
  if (amountMax.value) rows = rows.filter((item) => item.amount <= Number(amountMax.value));
  return rows;
});

const visibleRecords = computed(() =>
  filteredRecords.value.slice(0, visibleLimit.value),
);
const groups = computed(() => groupRecordsByDay(visibleRecords.value));
const hasMore = computed(() => visibleLimit.value < filteredRecords.value.length);
const expense = computed(() =>
  filteredRecords.value
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0),
);
const income = computed(() =>
  filteredRecords.value
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0),
);
const activeFilterCount = computed(
  () =>
    Number(category.value !== "全部") +
    Number(account.value !== "全部") +
    Number(Boolean(amountMin.value)) +
    Number(Boolean(amountMax.value)),
);

function goDetail(id: string) {
  void pushStack(router, route, "记账", "record-detail");
}

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
  visibleLimit.value = 8;
  if (variant.value !== "default") {
    void router.replace({ query: { ...route.query, variant: "default" } });
  }
}

function resetFilters() {
  category.value = "全部";
  account.value = "全部";
  amountMin.value = "";
  amountMax.value = "";
}

function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  window.setTimeout(() => {
    visibleLimit.value = 8;
    refreshing.value = false;
  }, 650);
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  window.setTimeout(() => {
    visibleLimit.value += 4;
    loadingMore.value = false;
  }, 450);
}
</script>

<template>
  <LedgerPlanetShell title="全部流水" active="记账" back-to="ledger-home">
    <ScrollableDataList
      :pull-refresh="{ enabled: !isStateView, mouse: true }"
      :load-more="!isStateView"
      :drag-scroll="{ enabled: !isStateView, mouse: true, momentum: true }"
      :refreshing="refreshing"
      :loading-more="loadingMore"
      :has-more="hasMore"
      inspect-id="ledger-planet.ledger-list.scroll-list"
      @refresh="refresh"
      @load-more="loadMore"
    >
      <div class="page" data-pb-id="ledger-planet.ledger-list">
        <Spinner v-if="variant === 'loading'" label="正在加载流水" size="lg" />
        <div v-else-if="variant === 'error'" class="error" role="alert">
          <strong>流水加载失败</strong><span>请检查后重试。</span>
        </div>
        <EmptyState
          v-else-if="variant === 'empty'"
          title="这个时间段还没有流水"
          description="更换时间范围，或新增一笔记录。"
        />
        <template v-else>
          <div class="range-nav" data-no-swipe>
            <button type="button" aria-label="上一个周期"><ChevronLeft :size="19" /></button>
            <button class="range-main" type="button" @click="timeSheet = true">
              <CalendarRange :size="18" />
              <span><strong>{{ rangeLabel }}</strong><small>点击切换日 / 周 / 月 / 年</small></span>
            </button>
            <button type="button" aria-label="下一个周期"><ChevronRight :size="19" /></button>
          </div>

          <section class="result-summary">
            <div><span>支出</span><strong>¥ {{ formatMoney(expense) }}</strong></div>
            <div><span>收入</span><strong>¥ {{ formatMoney(income) }}</strong></div>
            <div><span>结余</span><strong>¥ {{ formatMoney(income - expense) }}</strong></div>
          </section>

          <SearchBar
            v-model="search"
            placeholder="搜索商户、分类、标签或备注"
            inspect-id="ledger-planet.ledger-list.search"
          />
          <FilterBar
            v-model="type"
            :items="['全部', '支出', '收入']"
            inspect-id="ledger-planet.ledger-list.filters"
            @filter="filterSheet = true"
          />

          <div v-if="activeFilterCount > 0 || category !== '全部'" class="active-filters" data-no-swipe>
            <Chip v-if="category !== '全部'" :label="category" tone="primary" />
            <Chip v-if="account !== '全部'" :label="account" tone="secondary" />
            <Chip v-if="amountMin || amountMax" label="金额范围" tone="secondary" />
            <button type="button" @click="resetFilters"><RotateCcw :size="14" />清除</button>
          </div>

          <section v-for="group in groups" :key="group.dayLabel" class="day-group">
            <header>
              <strong>{{ group.dayLabel }}</strong>
              <span>支出 ¥ {{ formatMoney(group.total) }}</span>
            </header>
            <DataList surface="none" rounded="none">
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="record-row"
                @click="goDetail(item.id)"
              >
                <span class="category-mark">{{ item.category.slice(0, 1) }}</span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.merchant || item.account }} · {{ item.account }} · {{ item.date.slice(11, 16) }}</span>
                  <small v-if="item.tags?.length">{{ item.tags.join(" · ") }}</small>
                </div>
                <em :class="item.type">
                  {{ item.type === "expense" ? "−" : "+" }}{{ formatMoney(item.amount) }}
                </em>
              </button>
            </DataList>
          </section>
          <EmptyState
            v-if="groups.length === 0"
            title="没有匹配的流水"
            description="试试调整搜索词、时间或筛选条件。"
            action-label="重置筛选"
            @action="resetFilters"
          />
        </template>
      </div>
    </ScrollableDataList>

    <DateRangeSheet
      v-model="timeSheet"
      :range="range"
      :start="rangeStart"
      :end="rangeEnd"
      inspect-id="ledger-planet.ledger-list.date-sheet"
      @apply="applyRange"
    />
    <BottomSheet
      v-model="filterSheet"
      title="筛选流水"
      inspect-id="ledger-planet.ledger-list.filter-sheet"
    >
      <div class="sheet-form">
        <RadioGroup v-model="type" label="收支类型" :options="['全部', '支出', '收入']" />
        <SelectField v-model="category" label="分类" :options="['全部', ...categoryOptions]" />
        <SelectField v-model="account" label="账户" :options="['全部', ...accountOptions]" />
        <div class="amount-row">
          <TextField v-model="amountMin" label="最低金额" />
          <TextField v-model="amountMax" label="最高金额" />
        </div>
        <div class="sheet-actions">
          <Button label="重置" variant="outlined" @click="resetFilters" />
          <Button label="查看结果" @click="filterSheet = false" />
        </div>
      </div>
    </BottomSheet>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--pb-spacing-md);
  min-height: 100%;
  padding: var(--pb-spacing-md);
  align-content: start;
}
.range-nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-xs);
}
.range-nav > button {
  min-height: var(--pb-sizing-touch);
  border: 0;
  border-radius: var(--pb-radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.range-nav > button:not(.range-main) {
  display: grid;
  place-items: center;
  width: var(--pb-sizing-touch);
}
.range-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-sm);
  background: var(--pb-color-surface-variant) !important;
}
.range-main span,
.range-main strong,
.range-main small {
  display: block;
}
.range-main strong {
  font: var(--pb-typography-subtitle);
}
.range-main small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.range-main svg {
  color: var(--pb-color-primary);
}
.result-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: var(--pb-spacing-sm-plus);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
.result-summary div {
  display: grid;
  gap: var(--pb-spacing-xxs);
}
.result-summary div + div {
  padding-left: var(--pb-spacing-sm);
  border-left: 1px solid var(--pb-color-border);
}
.result-summary span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.result-summary strong {
  font: var(--pb-typography-subtitle);
}
.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
.active-filters button {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-xxs);
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.day-group {
  display: grid;
}
.day-group > header {
  display: flex;
  justify-content: space-between;
  padding: var(--pb-spacing-sm) 0 var(--pb-spacing-xs);
}
.day-group > header strong {
  font: var(--pb-typography-subtitle);
}
.day-group > header span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.record-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-sm);
  width: 100%;
  min-height: calc(var(--pb-sizing-menu-item) + var(--pb-spacing-md));
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
.record-row div span,
.record-row div small {
  display: block;
}
.record-row div strong,
.record-row em {
  font: var(--pb-typography-subtitle);
}
.record-row div span,
.record-row div small {
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
.sheet-form {
  display: grid;
  gap: var(--pb-spacing-md);
}
.amount-row,
.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-sm);
}
.error {
  display: grid;
  gap: var(--pb-spacing-xs);
  place-content: center;
  min-height: 50vh;
  text-align: center;
}
.error span {
  color: var(--pb-color-on-surface-muted);
}
</style>

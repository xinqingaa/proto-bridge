<template>
  <main class="phone-page holding-page">
    <section class="page-shell">
      <header class="app-bar">
        <button class="icon-button" :aria-label="prefs.t('nav.back')" @click="router.push('/')">‹</button>
        <div class="app-bar-title">
          <strong>{{ prefs.t('holding.title') }}</strong>
          <span>{{ prefs.t('holding.subtitle') }}</span>
        </div>
        <button class="icon-button" aria-label="Refresh holdings" @click="store.refreshPage">↻</button>
      </header>

      <section class="panel summary-card">
        <div>
          <p class="summary-label">{{ prefs.t('holding.marketValue') }}</p>
          <strong>{{ store.holdingSummary.marketValue }}</strong>
        </div>
        <div>
          <p class="summary-label">{{ prefs.t('holding.todayPnl') }}</p>
          <strong class="positive">{{ store.holdingSummary.dayPnl }}</strong>
          <span class="rate">{{ store.holdingSummary.dayPnlRate }}</span>
        </div>
        <div>
          <p class="summary-label">{{ prefs.t('holding.risk') }}</p>
          <strong>{{ riskLevelText }}</strong>
        </div>
      </section>

      <section class="filter-row" aria-label="Holding filters">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-chip"
          :class="{ active: store.holdingFilter === filter.value }"
          @click="store.setHoldingFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </section>

      <section class="panel holding-list">
        <div class="list-header">
          <h2>{{ prefs.t('holding.positions') }}</h2>
          <span>{{ store.filteredHoldings.length }} {{ prefs.t('holding.items') }}</span>
        </div>

        <div v-if="store.loading" class="loading-state">{{ prefs.t('holding.loading') }}</div>
        <div v-else-if="store.filteredHoldings.length === 0" class="empty-state">{{ prefs.t('holding.empty') }}</div>
        <article v-for="item in store.filteredHoldings" v-else :key="item.symbol" class="holding-row">
          <div class="symbol-block">
            <strong>{{ item.symbol }}</strong>
            <span>{{ item.name }}</span>
          </div>
          <div class="amount-block">
            <strong>{{ item.amount }}</strong>
            <span>{{ item.shares }} {{ prefs.t('holding.shares') }}</span>
          </div>
          <div class="pnl-block" :class="item.tone">
            <strong>{{ item.pnl }}</strong>
            <span>{{ item.pnlRate }}</span>
          </div>
        </article>
      </section>

      <footer class="bottom-actions">
        <button class="text-button" @click="router.push('/prototype/asset/pnl-analysis?tab=overview')">
          {{ prefs.t('holding.analysis') }}
        </button>
        <button class="primary-button">{{ prefs.t('holding.rebalance') }}</button>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { computed, onMounted } from 'vue';
import { useAssetPrototypeStore } from '../../../stores/assetPrototype.js';
import { usePreferenceStore } from '../../../stores/preferences.js';

const route = useRoute();
const router = useRouter();
const store = useAssetPrototypeStore();
const prefs = usePreferenceStore();
const filters = computed(() => [
  { label: prefs.t('filter.all'), value: 'All' },
  { label: prefs.t('sector.semiconductor'), value: 'Semiconductor' },
  { label: prefs.t('sector.consumer'), value: 'Consumer Electronics' },
  { label: prefs.t('sector.ev'), value: 'EV' },
]);
const riskLevelText = computed(() => prefs.locale === 'zh-CN' ? '平衡' : store.holdingSummary.riskLevel);

onMounted(() => {
  if (route.query.sector) {
    store.setHoldingFilter(String(route.query.sector));
  }
});
</script>

<style scoped>
.summary-card {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.78fr;
  gap: 12px;
  padding: 16px;
}

.summary-card strong {
  display: block;
  margin-top: 4px;
  font-size: 19px;
}

.summary-label {
  margin: 0;
  color: var(--pb-muted);
  font-size: 12px;
}

.rate {
  display: block;
  margin-top: 3px;
  color: var(--pb-positive);
  font-size: 12px;
  font-weight: 700;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin: 16px 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-chip {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  background: var(--pb-surface);
  color: var(--pb-muted);
  font-size: 13px;
  font-weight: 700;
}

.filter-chip.active {
  border-color: var(--pb-accent);
  background: var(--pb-accent-soft);
  color: var(--pb-accent);
}

.holding-list {
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--pb-border);
}

.list-header h2 {
  margin: 0;
  font-size: 17px;
}

.list-header span {
  color: var(--pb-muted);
  font-size: 12px;
}

.holding-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.8fr;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pb-border);
}

.holding-row:last-child {
  border-bottom: 0;
}

.symbol-block,
.amount-block,
.pnl-block {
  min-width: 0;
}

.symbol-block strong,
.amount-block strong,
.pnl-block strong {
  display: block;
  font-size: 15px;
}

.symbol-block span,
.amount-block span,
.pnl-block span {
  display: block;
  margin-top: 3px;
  color: var(--pb-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnl-block {
  text-align: right;
}

.pnl-block.positive strong,
.pnl-block.positive span {
  color: var(--pb-positive);
}

.pnl-block.negative strong,
.pnl-block.negative span {
  color: var(--pb-negative);
}

.loading-state,
.empty-state {
  padding: 32px 16px;
  color: var(--pb-muted);
  text-align: center;
}

.bottom-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
</style>

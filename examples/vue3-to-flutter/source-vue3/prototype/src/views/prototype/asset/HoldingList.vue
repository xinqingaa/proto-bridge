<template>
  <main class="phone-page holding-page">
    <section class="page-shell">
      <header class="top-bar holding-header">
        <div>
          <p class="eyebrow">Asset Center</p>
          <h1 class="page-title">Portfolio Holdings</h1>
        </div>
        <button class="icon-button" aria-label="Refresh holdings" @click="store.refreshPage">↻</button>
      </header>

      <section class="panel summary-card">
        <div>
          <p class="summary-label">Market value</p>
          <strong>{{ store.holdingSummary.marketValue }}</strong>
        </div>
        <div>
          <p class="summary-label">Today P&L</p>
          <strong class="positive">{{ store.holdingSummary.dayPnl }}</strong>
          <span class="rate">{{ store.holdingSummary.dayPnlRate }}</span>
        </div>
        <div>
          <p class="summary-label">Risk</p>
          <strong>{{ store.holdingSummary.riskLevel }}</strong>
        </div>
      </section>

      <section class="filter-row" aria-label="Holding filters">
        <button
          v-for="filter in filters"
          :key="filter"
          class="filter-chip"
          :class="{ active: store.holdingFilter === filter }"
          @click="store.setHoldingFilter(filter)"
        >
          {{ filter }}
        </button>
      </section>

      <section class="panel holding-list">
        <div class="list-header">
          <h2>Positions</h2>
          <span>{{ store.filteredHoldings.length }} items</span>
        </div>

        <div v-if="store.loading" class="loading-state">Refreshing positions...</div>
        <div v-else-if="store.filteredHoldings.length === 0" class="empty-state">No holdings match current filter</div>
        <article v-for="item in store.filteredHoldings" v-else :key="item.symbol" class="holding-row">
          <div class="symbol-block">
            <strong>{{ item.symbol }}</strong>
            <span>{{ item.name }}</span>
          </div>
          <div class="amount-block">
            <strong>{{ item.amount }}</strong>
            <span>{{ item.shares }} shares</span>
          </div>
          <div class="pnl-block" :class="item.tone">
            <strong>{{ item.pnl }}</strong>
            <span>{{ item.pnlRate }}</span>
          </div>
        </article>
      </section>

      <footer class="bottom-actions">
        <button class="text-button" @click="store.pushPage('/prototype/asset/pnl-analysis', { source: 'holding-list' })">
          View analysis
        </button>
        <button class="primary-button">Rebalance</button>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { onMounted } from 'vue';
import { useAssetPrototypeStore } from '../../../stores/assetPrototype.js';

const route = useRoute();
const store = useAssetPrototypeStore();
const filters = ['All', 'Semiconductor', 'Consumer Electronics', 'EV'];

onMounted(() => {
  if (route.query.sector) {
    store.setHoldingFilter(String(route.query.sector));
  }
});
</script>

<style scoped>
.holding-page {
  background:
    linear-gradient(180deg, rgba(23, 107, 135, 0.12), rgba(238, 243, 248, 0) 240px),
    var(--pb-bg);
}

.holding-header {
  align-items: flex-start;
}

.summary-card {
  display: grid;
  grid-template-columns: 1.35fr 1fr 0.8fr;
  gap: 12px;
  padding: 16px;
}

.summary-card strong {
  display: block;
  margin-top: 2px;
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
  border-color: var(--pb-primary);
  background: var(--pb-primary-soft);
  color: var(--pb-primary);
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

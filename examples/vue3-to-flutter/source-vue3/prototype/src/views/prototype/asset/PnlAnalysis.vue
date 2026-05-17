<template>
  <main class="phone-page pnl-page">
    <section class="page-shell">
      <header class="top-bar">
        <div>
          <p class="eyebrow">Asset Center</p>
          <h1 class="page-title">P&L Analysis</h1>
        </div>
        <button class="icon-button" aria-label="Open filters" @click="store.openFilterSheet">⌘</button>
      </header>

      <section class="tab-bar" aria-label="Analysis tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-button"
          :class="{ active: store.activePnlTab === tab.value }"
          @click="store.setPnlTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </section>

      <section class="metrics-grid">
        <article v-for="metric in store.pnlMetrics" :key="metric.label" class="panel metric-card">
          <span>{{ metric.label }}</span>
          <strong :class="metric.tone">{{ metric.value }}</strong>
          <small :class="metric.tone">{{ metric.delta }}</small>
        </article>
      </section>

      <section class="panel trend-panel">
        <div class="section-heading">
          <div>
            <h2>Return Trend</h2>
            <p>8 sessions, current tab: {{ store.activePnlTab }}</p>
          </div>
          <button class="text-button" @click="store.refreshPage">Refresh</button>
        </div>
        <div class="trend-chart" aria-label="P&L trend chart">
          <span
            v-for="(point, index) in store.trendPoints"
            :key="index"
            class="trend-bar"
            :style="{ height: `${point}%` }"
          />
        </div>
      </section>

      <section class="panel record-panel">
        <div class="section-heading">
          <div>
            <h2>Trade Records</h2>
            <p>Risk filter: {{ store.riskFilter }}</p>
          </div>
          <button class="text-button" @click="store.openFilterSheet">Filter</button>
        </div>

        <div v-if="store.loading" class="loading-state">Syncing latest trades...</div>
        <div v-else-if="store.filteredRecords.length === 0" class="empty-state">No records for this risk level</div>
        <article
          v-for="record in store.filteredRecords"
          v-else
          :key="record.id"
          class="record-row"
          @click="store.openRecord(record)"
        >
          <div>
            <strong>{{ record.symbol }}</strong>
            <span>{{ record.action }} · {{ record.time }}</span>
          </div>
          <div class="record-value">
            <strong :class="{ negative: record.amount.startsWith('-'), positive: !record.amount.startsWith('-') }">
              {{ record.amount }}
            </strong>
            <span>{{ record.risk }}</span>
          </div>
        </article>
      </section>
    </section>

    <section v-if="store.filterSheetOpen" class="sheet-backdrop" @click.self="store.closeFilterSheet">
      <div class="filter-sheet panel">
        <div class="section-heading">
          <h2>Filter by risk</h2>
          <button class="icon-button" aria-label="Close filters" @click="store.closeFilterSheet">×</button>
        </div>
        <button
          v-for="risk in riskOptions"
          :key="risk"
          class="sheet-option"
          :class="{ active: store.riskFilter === risk }"
          @click="store.setRiskFilter(risk)"
        >
          {{ risk }}
        </button>
      </div>
    </section>

    <section v-if="store.selectedRecord" class="sheet-backdrop" @click.self="store.closeRecord">
      <div class="detail-sheet panel">
        <div class="section-heading">
          <div>
            <h2>{{ store.selectedRecord.symbol }} detail</h2>
            <p>{{ store.selectedRecord.action }} at {{ store.selectedRecord.time }}</p>
          </div>
          <button class="icon-button" aria-label="Close detail" @click="store.closeRecord">×</button>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>Amount</dt>
            <dd>{{ store.selectedRecord.amount }}</dd>
          </div>
          <div>
            <dt>Risk</dt>
            <dd>{{ store.selectedRecord.risk }}</dd>
          </div>
        </dl>
        <button class="primary-button" @click="store.pushPage('/prototype/asset/holding-list', { symbol: store.selectedRecord.symbol })">
          Open holding
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { onMounted, watch } from 'vue';
import { useAssetPrototypeStore } from '../../../stores/assetPrototype.js';

const route = useRoute();
const store = useAssetPrototypeStore();

const tabs = [
  { label: 'Overview', value: 'overview' },
  { label: 'Realized', value: 'realized' },
  { label: 'Risk', value: 'risk' },
];
const riskOptions = ['All', 'Low', 'Medium', 'High'];

onMounted(() => {
  if (route.query.tab) {
    store.setPnlTab(String(route.query.tab));
  }
});

watch(() => store.activePnlTab, (tab) => {
  if (tab === 'risk') {
    store.setRiskFilter('High');
  }
});
</script>

<style scoped>
.pnl-page {
  background:
    linear-gradient(180deg, rgba(22, 133, 91, 0.12), rgba(238, 243, 248, 0) 260px),
    var(--pb-bg);
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 14px;
  padding: 4px;
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
}

.tab-button {
  min-height: 34px;
  border-radius: 7px;
  background: transparent;
  color: var(--pb-muted);
  font-size: 13px;
  font-weight: 800;
}

.tab-button.active {
  background: var(--pb-primary);
  color: #ffffff;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.metric-card {
  padding: 14px;
}

.metric-card span {
  display: block;
  color: var(--pb-muted);
  font-size: 12px;
}

.metric-card strong {
  display: block;
  margin-top: 8px;
  font-size: 21px;
}

.metric-card small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 800;
}

.trend-panel,
.record-panel {
  margin-top: 12px;
  padding: 16px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h2 {
  margin: 0;
  font-size: 17px;
}

.section-heading p {
  margin: 3px 0 0;
  color: var(--pb-muted);
  font-size: 12px;
}

.trend-chart {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  align-items: end;
  gap: 8px;
  height: 132px;
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--pb-surface-soft);
}

.trend-bar {
  min-height: 18px;
  border-radius: 6px 6px 3px 3px;
  background: linear-gradient(180deg, #176b87, #48a6a7);
}

.record-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--pb-border);
  cursor: pointer;
}

.record-row:last-child {
  border-bottom: 0;
}

.record-row strong,
.record-row span {
  display: block;
}

.record-row span,
.record-value span {
  margin-top: 4px;
  color: var(--pb-muted);
  font-size: 12px;
}

.record-value {
  text-align: right;
}

.loading-state,
.empty-state {
  padding: 26px 0;
  color: var(--pb-muted);
  text-align: center;
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 14px;
  background: rgba(20, 30, 42, 0.42);
}

.filter-sheet,
.detail-sheet {
  width: min(100%, 398px);
  padding: 16px;
}

.sheet-option {
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  background: var(--pb-surface);
  color: var(--pb-text);
  font-weight: 800;
  text-align: left;
  padding: 0 14px;
}

.sheet-option.active {
  border-color: var(--pb-primary);
  background: var(--pb-primary-soft);
  color: var(--pb-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}

.detail-grid div {
  padding: 12px;
  border-radius: 8px;
  background: var(--pb-surface-soft);
}

.detail-grid dt {
  color: var(--pb-muted);
  font-size: 12px;
}

.detail-grid dd {
  margin: 5px 0 0;
  font-weight: 800;
}
</style>

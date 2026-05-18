<template>
  <main class="phone-page pnl-page">
    <section class="page-shell">
      <header class="app-bar">
        <button class="icon-button" :aria-label="prefs.t('nav.back')" @click="router.push('/')">‹</button>
        <div class="app-bar-title">
          <strong>{{ prefs.t('pnl.title') }}</strong>
          <span>{{ prefs.t('nav.asset') }}</span>
        </div>
        <button class="icon-button" :aria-label="prefs.t('pnl.filter')" @click="store.openFilterSheet">⌘</button>
      </header>

      <section class="tab-bar" aria-label="Analysis tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-button"
          :class="{ active: store.activePnlTab === tab.value }"
          @click="store.setPnlTab(tab.value)"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.hint }}</small>
        </button>
      </section>

      <section v-if="store.activePnlTab === 'overview'" class="tab-content overview-content">
        <section class="metrics-grid">
          <article v-for="metric in localizedMetrics" :key="metric.label" class="panel metric-card">
            <span>{{ metric.label }}</span>
            <strong :class="metric.tone">{{ metric.value }}</strong>
            <small :class="metric.tone">{{ metric.delta }}</small>
          </article>
        </section>

        <section class="panel trend-panel">
          <div class="section-heading">
            <div>
              <h2>{{ prefs.t('pnl.trend') }}</h2>
              <p>{{ prefs.t('pnl.trendHint') }}</p>
            </div>
            <button class="text-button" @click="store.refreshPage">{{ prefs.t('pnl.refresh') }}</button>
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

        <RecordPanel
          :title="prefs.t('pnl.records')"
          :subtitle="`${prefs.t('pnl.riskFilter')}: ${riskLabel(store.riskFilter)}`"
          :records="store.filteredRecords"
          :loading="store.loading"
          @filter="store.openFilterSheet"
          @open="store.openRecord"
        />
      </section>

      <section v-else-if="store.activePnlTab === 'realized'" class="tab-content realized-content">
        <section class="panel realized-summary">
          <div class="section-heading">
            <div>
              <h2>{{ prefs.t('pnl.realizedTitle') }}</h2>
              <p>{{ prefs.t('pnl.cashflow') }}</p>
            </div>
            <strong class="positive">+$7,418</strong>
          </div>
          <div class="breakdown-list">
            <div v-for="item in realizedBreakdown" :key="item.label">
              <span>{{ item.label }}</span>
              <strong :class="item.tone">{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <section class="panel fee-panel">
          <div>
            <span>{{ prefs.t('pnl.fees') }}</span>
            <strong>-$184.22</strong>
          </div>
          <div>
            <span>{{ prefs.t('pnl.cashflow') }}</span>
            <strong>+$12,600</strong>
          </div>
        </section>

        <RecordPanel
          :title="prefs.t('pnl.records')"
          subtitle="+4 realized trades"
          :records="realizedRecords"
          :loading="false"
          @filter="store.openFilterSheet"
          @open="store.openRecord"
        />
      </section>

      <section v-else class="tab-content risk-content">
        <section class="panel risk-budget">
          <div>
            <span>{{ prefs.t('pnl.riskBudget') }}</span>
            <strong>63%</strong>
            <small>-5 pts</small>
          </div>
          <div class="risk-meter">
            <span style="width: 63%" />
          </div>
        </section>

        <section class="panel exposure-panel">
          <div class="section-heading">
            <div>
              <h2>{{ prefs.t('pnl.riskTitle') }}</h2>
              <p>{{ prefs.t('pnl.alerts') }}</p>
            </div>
          </div>
          <div class="exposure-list">
            <div v-for="item in exposureItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <RecordPanel
          :title="prefs.t('pnl.records')"
          :subtitle="`${prefs.t('pnl.riskFilter')}: ${riskLabel(store.riskFilter)}`"
          :records="store.filteredRecords"
          :loading="store.loading"
          @filter="store.openFilterSheet"
          @open="store.openRecord"
        />
      </section>
    </section>

    <section v-if="store.filterSheetOpen" class="sheet-backdrop" @click.self="store.closeFilterSheet">
      <div class="filter-sheet panel">
        <div class="section-heading">
          <h2>{{ prefs.t('pnl.riskFilter') }}</h2>
          <button class="icon-button" :aria-label="prefs.t('pnl.close')" @click="store.closeFilterSheet">×</button>
        </div>
        <button
          v-for="risk in riskOptions"
          :key="risk.value"
          class="sheet-option"
          :class="{ active: store.riskFilter === risk.value }"
          @click="store.setRiskFilter(risk.value)"
        >
          {{ risk.label }}
        </button>
      </div>
    </section>

    <section v-if="store.selectedRecord" class="sheet-backdrop" @click.self="store.closeRecord">
      <div class="detail-sheet panel">
        <div class="section-heading">
          <div>
            <h2>{{ store.selectedRecord.symbol }} detail</h2>
            <p>{{ actionLabel(store.selectedRecord.action) }} · {{ store.selectedRecord.time }}</p>
          </div>
          <button class="icon-button" :aria-label="prefs.t('pnl.close')" @click="store.closeRecord">×</button>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>Amount</dt>
            <dd>{{ store.selectedRecord.amount }}</dd>
          </div>
          <div>
            <dt>{{ prefs.t('holding.risk') }}</dt>
            <dd>{{ riskLabel(store.selectedRecord.risk) }}</dd>
          </div>
        </dl>
        <button class="primary-button" @click="router.push('/prototype/asset/holding-list')">
          {{ prefs.t('pnl.openHolding') }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { computed, defineComponent, h, onMounted, watch } from 'vue';
import { useAssetPrototypeStore } from '../../../stores/assetPrototype.js';
import { usePreferenceStore } from '../../../stores/preferences.js';

const route = useRoute();
const router = useRouter();
const store = useAssetPrototypeStore();
const prefs = usePreferenceStore();

const tabs = computed(() => [
  { label: prefs.t('pnl.tab.overview'), value: 'overview', hint: '+12.8%' },
  { label: prefs.t('pnl.tab.realized'), value: 'realized', hint: '+$7.4k' },
  { label: prefs.t('pnl.tab.risk'), value: 'risk', hint: '63%' },
]);

const riskOptions = computed(() => [
  { label: prefs.t('risk.all'), value: 'All' },
  { label: prefs.t('risk.low'), value: 'Low' },
  { label: prefs.t('risk.medium'), value: 'Medium' },
  { label: prefs.t('risk.high'), value: 'High' },
]);

const metricLabels = computed(() => ({
  'Total P&L': prefs.t('pnl.total'),
  Realized: prefs.t('pnl.realized'),
  Unrealized: prefs.t('pnl.unrealized'),
  'Risk Budget': prefs.t('pnl.riskBudget'),
}));

const localizedMetrics = computed(() =>
  store.pnlMetrics.map((metric) => ({
    ...metric,
    label: metricLabels.value[metric.label] ?? metric.label,
  })),
);

const realizedBreakdown = computed(() => [
  { label: 'NVDA', value: '+$2,180.00', tone: 'positive' },
  { label: 'AAPL', value: '+$620.40', tone: 'positive' },
  { label: 'MSFT', value: '+$780.90', tone: 'positive' },
  { label: 'Fees', value: '-$184.22', tone: 'negative' },
]);

const realizedRecords = computed(() => store.pnlRecords.filter((record) => !record.amount.startsWith('-')));

const exposureItems = computed(() => [
  { label: prefs.t('sector.semiconductor'), value: '38%' },
  { label: prefs.t('sector.consumer'), value: '26%' },
  { label: prefs.t('sector.ev'), value: '14%' },
]);

function riskLabel(value) {
  return {
    All: prefs.t('risk.all'),
    Low: prefs.t('risk.low'),
    Medium: prefs.t('risk.medium'),
    High: prefs.t('risk.high'),
  }[value] ?? value;
}

function actionLabel(value) {
  if (prefs.locale === 'en-US') return value;
  return {
    'Take Profit': '止盈',
    'Covered Call': '备兑开仓',
    'Stop Loss': '止损',
    'Add Position': '加仓',
  }[value] ?? value;
}

const RecordPanel = defineComponent({
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    records: { type: Array, required: true },
    loading: { type: Boolean, required: true },
  },
  emits: ['filter', 'open'],
  setup(props, { emit }) {
    return () => h('section', { class: 'panel record-panel' }, [
      h('div', { class: 'section-heading' }, [
        h('div', [h('h2', props.title), h('p', props.subtitle)]),
        h('button', { class: 'text-button', onClick: () => emit('filter') }, prefs.t('pnl.filter')),
      ]),
      props.loading
        ? h('div', { class: 'loading-state' }, prefs.t('pnl.loading'))
        : props.records.length === 0
          ? h('div', { class: 'empty-state' }, prefs.t('pnl.empty'))
          : props.records.map((record) => h('article', {
            key: record.id,
            class: 'record-row',
            onClick: () => emit('open', record),
          }, [
            h('div', [h('strong', record.symbol), h('span', `${actionLabel(record.action)} · ${record.time}`)]),
            h('div', { class: 'record-value' }, [
              h('strong', { class: { negative: record.amount.startsWith('-'), positive: !record.amount.startsWith('-') } }, record.amount),
              h('span', riskLabel(record.risk)),
            ]),
          ])),
    ]);
  },
});

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
.tab-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.tab-button {
  display: grid;
  gap: 3px;
  min-height: 58px;
  padding: 9px 8px;
  border: 1px solid var(--pb-border);
  border-radius: 8px;
  background: var(--pb-surface);
  color: var(--pb-muted);
  font-weight: 800;
}

.tab-button small {
  color: var(--pb-muted);
  font-size: 11px;
}

.tab-button.active {
  border-color: var(--pb-accent);
  background: var(--pb-accent-soft);
  color: var(--pb-text);
}

.tab-button.active small {
  color: var(--pb-accent);
}

.tab-content {
  display: grid;
  gap: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
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
.record-panel,
.realized-summary,
.fee-panel,
.risk-budget,
.exposure-panel {
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
  background: linear-gradient(180deg, var(--pb-accent), color-mix(in srgb, var(--pb-accent) 38%, var(--pb-primary)));
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

.breakdown-list,
.exposure-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.breakdown-list div,
.exposure-list div,
.fee-panel {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.breakdown-list div,
.exposure-list div {
  padding: 12px;
  border-radius: 8px;
  background: var(--pb-surface-soft);
}

.fee-panel {
  grid-template-columns: 1fr 1fr;
}

.fee-panel span,
.risk-budget span,
.breakdown-list span,
.exposure-list span {
  display: block;
  color: var(--pb-muted);
  font-size: 12px;
}

.fee-panel strong,
.risk-budget strong,
.breakdown-list strong,
.exposure-list strong {
  display: block;
  margin-top: 4px;
}

.risk-meter {
  height: 9px;
  margin-top: 14px;
  border-radius: 999px;
  background: var(--pb-surface-soft);
  overflow: hidden;
}

.risk-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--pb-accent);
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
  background: rgba(16, 16, 14, 0.55);
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
  border-color: var(--pb-accent);
  background: var(--pb-accent-soft);
  color: var(--pb-accent);
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

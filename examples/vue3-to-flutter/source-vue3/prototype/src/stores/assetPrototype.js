import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { holdingSummary, holdings, pnlMetrics, pnlRecords, trendPoints } from '../data/assetPages.js';

export const useAssetPrototypeStore = defineStore('assetPrototype', () => {
  const holdingFilter = ref('All');
  const activePnlTab = ref('overview');
  const riskFilter = ref('All');
  const loading = ref(false);
  const selectedRecord = ref(null);
  const filterSheetOpen = ref(false);

  const filteredHoldings = computed(() => {
    if (holdingFilter.value === 'All') return holdings;
    return holdings.filter((item) => item.sector === holdingFilter.value);
  });

  const filteredRecords = computed(() => {
    if (riskFilter.value === 'All') return pnlRecords;
    return pnlRecords.filter((item) => item.risk === riskFilter.value);
  });

  function setHoldingFilter(value) {
    holdingFilter.value = value;
  }

  function setPnlTab(value) {
    activePnlTab.value = value;
  }

  function setRiskFilter(value) {
    riskFilter.value = value;
    filterSheetOpen.value = false;
  }

  function refreshPage() {
    loading.value = true;
    window.setTimeout(() => {
      loading.value = false;
    }, 420);
  }

  function openRecord(record) {
    selectedRecord.value = record;
  }

  function closeRecord() {
    selectedRecord.value = null;
  }

  function openFilterSheet() {
    filterSheetOpen.value = true;
  }

  function closeFilterSheet() {
    filterSheetOpen.value = false;
  }

  function pushPage(target, params = {}) {
    console.info('prototype navigation', target, params);
  }

  return {
    holdingSummary,
    holdings,
    pnlMetrics,
    pnlRecords,
    trendPoints,
    holdingFilter,
    activePnlTab,
    riskFilter,
    loading,
    selectedRecord,
    filterSheetOpen,
    filteredHoldings,
    filteredRecords,
    setHoldingFilter,
    setPnlTab,
    setRiskFilter,
    refreshPage,
    openRecord,
    closeRecord,
    openFilterSheet,
    closeFilterSheet,
    pushPage,
  };
});

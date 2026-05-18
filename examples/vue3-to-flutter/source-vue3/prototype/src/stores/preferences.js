import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const messages = {
  'zh-CN': {
    'app.brand': '资产中心',
    'app.subtitle': 'Vue3 原型到 Flutter 客户端实现上下文',
    'app.theme.light': '亮色',
    'app.theme.dark': '暗色',
    'app.locale.zh': '中文',
    'app.locale.en': 'EN',
    'home.title': '资产总览',
    'home.desc': '查看长期组合的市值、收益和风险分布，进入持仓与盈亏页面处理日常资产管理。',
    'home.assetValue': '资产总览',
    'home.todayPnl': '今日收益',
    'home.simple': '持仓',
    'home.simple.desc': '查看组合明细、行业筛选、单日收益和再平衡入口。',
    'home.complex': '分析',
    'home.complex.desc': '拆解收益趋势、已实现交易、风险预算和交易记录。',
    'home.open': '进入',
    'nav.back': '返回',
    'nav.asset': '资产中心',
    'holding.title': '持仓列表',
    'holding.subtitle': '长期组合实时快照',
    'holding.marketValue': '市值',
    'holding.todayPnl': '今日收益',
    'holding.risk': '风险',
    'holding.positions': '持仓明细',
    'holding.items': '项',
    'holding.loading': '正在刷新持仓...',
    'holding.empty': '当前筛选下暂无持仓',
    'holding.analysis': '查看分析',
    'holding.rebalance': '再平衡',
    'holding.shares': '股',
    'filter.all': '全部',
    'sector.semiconductor': '半导体',
    'sector.consumer': '消费电子',
    'sector.ev': '新能源车',
    'pnl.title': '盈亏分析',
    'pnl.filter': '筛选',
    'pnl.refresh': '刷新',
    'pnl.tab.overview': '总览',
    'pnl.tab.realized': '已实现',
    'pnl.tab.risk': '风险',
    'pnl.total': '总收益',
    'pnl.realized': '已实现',
    'pnl.unrealized': '未实现',
    'pnl.riskBudget': '风险预算',
    'pnl.trend': '收益趋势',
    'pnl.trendHint': '近 8 个交易时段',
    'pnl.records': '交易记录',
    'pnl.riskFilter': '风险筛选',
    'pnl.loading': '正在同步交易...',
    'pnl.empty': '当前风险等级暂无记录',
    'pnl.realizedTitle': '已实现收益拆解',
    'pnl.fees': '费用与税费',
    'pnl.cashflow': '现金流动作',
    'pnl.riskTitle': '风险暴露',
    'pnl.alerts': '风险提示',
    'pnl.close': '关闭',
    'pnl.openHolding': '打开持仓',
    'risk.all': '全部',
    'risk.low': '低',
    'risk.medium': '中',
    'risk.high': '高',
  },
  'en-US': {
    'app.brand': 'Asset Center',
    'app.subtitle': 'Vue3 prototype to Flutter implementation context',
    'app.theme.light': 'Light',
    'app.theme.dark': 'Dark',
    'app.locale.zh': '中文',
    'app.locale.en': 'EN',
    'home.title': 'Asset Overview',
    'home.desc': 'Track portfolio value, daily return, and risk distribution before opening holdings or P&L analysis.',
    'home.assetValue': 'Asset Overview',
    'home.todayPnl': 'Today P&L',
    'home.simple': 'Holdings',
    'home.simple.desc': 'Review positions, sector filters, daily return, and rebalance entry.',
    'home.complex': 'Analysis',
    'home.complex.desc': 'Break down trends, realized trades, risk budget, and trade records.',
    'home.open': 'Open',
    'nav.back': 'Back',
    'nav.asset': 'Asset Center',
    'holding.title': 'Portfolio Holdings',
    'holding.subtitle': 'Realtime snapshot for long-term positions',
    'holding.marketValue': 'Market value',
    'holding.todayPnl': 'Today P&L',
    'holding.risk': 'Risk',
    'holding.positions': 'Positions',
    'holding.items': 'items',
    'holding.loading': 'Refreshing positions...',
    'holding.empty': 'No holdings match current filter',
    'holding.analysis': 'View analysis',
    'holding.rebalance': 'Rebalance',
    'holding.shares': 'shares',
    'filter.all': 'All',
    'sector.semiconductor': 'Semiconductor',
    'sector.consumer': 'Consumer Electronics',
    'sector.ev': 'EV',
    'pnl.title': 'P&L Analysis',
    'pnl.filter': 'Filter',
    'pnl.refresh': 'Refresh',
    'pnl.tab.overview': 'Overview',
    'pnl.tab.realized': 'Realized',
    'pnl.tab.risk': 'Risk',
    'pnl.total': 'Total P&L',
    'pnl.realized': 'Realized',
    'pnl.unrealized': 'Unrealized',
    'pnl.riskBudget': 'Risk Budget',
    'pnl.trend': 'Return Trend',
    'pnl.trendHint': 'Last 8 sessions',
    'pnl.records': 'Trade Records',
    'pnl.riskFilter': 'Risk filter',
    'pnl.loading': 'Syncing latest trades...',
    'pnl.empty': 'No records for this risk level',
    'pnl.realizedTitle': 'Realized P&L Breakdown',
    'pnl.fees': 'Fees & Taxes',
    'pnl.cashflow': 'Cashflow Actions',
    'pnl.riskTitle': 'Risk Exposure',
    'pnl.alerts': 'Risk Alerts',
    'pnl.close': 'Close',
    'pnl.openHolding': 'Open holding',
    'risk.all': 'All',
    'risk.low': 'Low',
    'risk.medium': 'Medium',
    'risk.high': 'High',
  },
};

export const usePreferenceStore = defineStore('preferences', () => {
  const locale = ref(localStorage.getItem('protoBridge.locale') || 'zh-CN');
  const theme = ref(localStorage.getItem('protoBridge.theme') || 'light');

  const isDark = computed(() => theme.value === 'dark');

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value;
  }

  function t(key) {
    return messages[locale.value]?.[key] ?? messages['zh-CN'][key] ?? key;
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  function toggleLocale() {
    locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  }

  watch(theme, (value) => {
    localStorage.setItem('protoBridge.theme', value);
    applyTheme();
  }, { immediate: true });

  watch(locale, (value) => {
    localStorage.setItem('protoBridge.locale', value);
  }, { immediate: true });

  return {
    locale,
    theme,
    isDark,
    t,
    toggleTheme,
    toggleLocale,
  };
});

export const holdingSummary = {
  marketValue: '$128,420.36',
  dayPnl: '+$2,364.20',
  dayPnlRate: '+1.87%',
  riskLevel: 'Balanced',
};

export const holdings = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    sector: 'Semiconductor',
    amount: '$42,300.00',
    shares: '120',
    pnl: '+$6,830.20',
    pnlRate: '+19.2%',
    tone: 'positive',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Electronics',
    amount: '$28,740.80',
    shares: '160',
    pnl: '+$1,420.10',
    pnlRate: '+5.2%',
    tone: 'positive',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    sector: 'EV',
    amount: '$18,620.60',
    shares: '48',
    pnl: '-$840.30',
    pnlRate: '-4.3%',
    tone: 'negative',
  },
];

export const pnlMetrics = [
  { label: 'Total P&L', value: '+$18,206', delta: '+12.8%', tone: 'positive' },
  { label: 'Realized', value: '+$7,418', delta: '+4.6%', tone: 'positive' },
  { label: 'Unrealized', value: '+$10,788', delta: '+8.2%', tone: 'positive' },
  { label: 'Risk Budget', value: '63%', delta: '-5 pts', tone: 'neutral' },
];

export const pnlRecords = [
  { id: 't-1001', symbol: 'NVDA', action: 'Take Profit', time: '09:42', amount: '+$2,180.00', risk: 'Medium' },
  { id: 't-1002', symbol: 'AAPL', action: 'Covered Call', time: '10:18', amount: '+$620.40', risk: 'Low' },
  { id: 't-1003', symbol: 'TSLA', action: 'Stop Loss', time: '11:05', amount: '-$430.20', risk: 'High' },
  { id: 't-1004', symbol: 'MSFT', action: 'Add Position', time: '13:24', amount: '+$780.90', risk: 'Medium' },
];

export const trendPoints = [22, 31, 28, 45, 43, 61, 57, 74];

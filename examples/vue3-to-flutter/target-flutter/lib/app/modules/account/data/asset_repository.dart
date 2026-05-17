import '../domain/asset_models.dart';

class AssetRepository {
  const AssetRepository();

  HoldingSummary loadSummary() {
    return const HoldingSummary(
      marketValue: r'$128,420.36',
      dayPnl: r'+$2,364.20',
      dayPnlRate: '+1.87%',
      riskLevel: 'Balanced',
    );
  }

  List<Holding> loadHoldings() {
    return const [
      Holding(
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        sector: 'Semiconductor',
        amount: r'$42,300.00',
        shares: '120',
        pnl: r'+$6,830.20',
        pnlRate: '+19.2%',
        isPositive: true,
      ),
      Holding(
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Consumer Electronics',
        amount: r'$28,740.80',
        shares: '160',
        pnl: r'+$1,420.10',
        pnlRate: '+5.2%',
        isPositive: true,
      ),
      Holding(
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        sector: 'EV',
        amount: r'$18,620.60',
        shares: '48',
        pnl: r'-$840.30',
        pnlRate: '-4.3%',
        isPositive: false,
      ),
    ];
  }

  List<PnlMetric> loadMetrics() {
    return const [
      PnlMetric(
        label: 'Total P&L',
        value: r'+$18,206',
        delta: '+12.8%',
        tone: MetricTone.positive,
      ),
      PnlMetric(
        label: 'Realized',
        value: r'+$7,418',
        delta: '+4.6%',
        tone: MetricTone.positive,
      ),
      PnlMetric(
        label: 'Unrealized',
        value: r'+$10,788',
        delta: '+8.2%',
        tone: MetricTone.positive,
      ),
      PnlMetric(
        label: 'Risk Budget',
        value: '63%',
        delta: '-5 pts',
        tone: MetricTone.neutral,
      ),
    ];
  }

  List<PnlRecord> loadRecords() {
    return const [
      PnlRecord(
        id: 't-1001',
        symbol: 'NVDA',
        action: 'Take Profit',
        time: '09:42',
        amount: r'+$2,180.00',
        risk: 'Medium',
      ),
      PnlRecord(
        id: 't-1002',
        symbol: 'AAPL',
        action: 'Covered Call',
        time: '10:18',
        amount: r'+$620.40',
        risk: 'Low',
      ),
      PnlRecord(
        id: 't-1003',
        symbol: 'TSLA',
        action: 'Stop Loss',
        time: '11:05',
        amount: r'-$430.20',
        risk: 'High',
      ),
      PnlRecord(
        id: 't-1004',
        symbol: 'MSFT',
        action: 'Add Position',
        time: '13:24',
        amount: r'+$780.90',
        risk: 'Medium',
      ),
    ];
  }

  List<double> loadTrendPoints() {
    return const [22, 31, 28, 45, 43, 61, 57, 74];
  }
}

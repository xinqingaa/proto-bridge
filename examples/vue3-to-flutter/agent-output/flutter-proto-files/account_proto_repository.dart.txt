import 'account_proto_models.dart';

class ProtoAccountRepository {
  const ProtoAccountRepository();

  ProtoHoldingSummary loadSummary() {
    return const ProtoHoldingSummary(
      marketValue: r'$128,420.36',
      dayPnl: r'+$2,364.20',
      dayPnlRate: '+1.87%',
      riskLevel: '平衡',
    );
  }

  List<ProtoHolding> loadHoldings() {
    return const [
      ProtoHolding(
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        sector: 'Semiconductor',
        amount: r'$42,300.00',
        shares: '120',
        pnl: r'+$6,830.20',
        pnlRate: '+19.2%',
        isPositive: true,
      ),
      ProtoHolding(
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Consumer Electronics',
        amount: r'$28,740.80',
        shares: '160',
        pnl: r'+$1,420.10',
        pnlRate: '+5.2%',
        isPositive: true,
      ),
      ProtoHolding(
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

  List<ProtoPnlMetric> loadMetrics() {
    return const [
      ProtoPnlMetric(
        label: '总收益',
        value: r'+$18,206',
        delta: '+12.8%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: '已实现',
        value: r'+$7,418',
        delta: '+4.6%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: '未实现',
        value: r'+$10,788',
        delta: '+8.2%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: '风险预算',
        value: '63%',
        delta: '-5 pts',
        tone: ProtoMetricTone.neutral,
      ),
    ];
  }

  List<ProtoPnlRecord> loadRecords() {
    return const [
      ProtoPnlRecord(
        id: 'trade-nvda-0942',
        symbol: 'NVDA',
        action: '止盈',
        time: '09:42',
        amount: r'+$2,180.00',
        risk: 'Medium',
      ),
      ProtoPnlRecord(
        id: 'trade-aapl-1018',
        symbol: 'AAPL',
        action: '备兑开仓',
        time: '10:18',
        amount: r'+$620.40',
        risk: 'Low',
      ),
      ProtoPnlRecord(
        id: 'trade-tsla-1105',
        symbol: 'TSLA',
        action: '止损',
        time: '11:05',
        amount: r'-$430.20',
        risk: 'High',
      ),
      ProtoPnlRecord(
        id: 'trade-msft-1324',
        symbol: 'MSFT',
        action: '加仓',
        time: '13:24',
        amount: r'+$780.90',
        risk: 'Medium',
      ),
    ];
  }

  List<double> loadTrendPoints() {
    return const [22, 31, 28, 45, 43, 61, 57, 74];
  }

  List<ProtoBreakdownItem> loadRealizedBreakdown() {
    return const [
      ProtoBreakdownItem(
        label: 'NVDA',
        value: r'+$2,180.00',
        tone: ProtoMetricTone.positive,
      ),
      ProtoBreakdownItem(
        label: 'AAPL',
        value: r'+$620.40',
        tone: ProtoMetricTone.positive,
      ),
      ProtoBreakdownItem(
        label: 'MSFT',
        value: r'+$780.90',
        tone: ProtoMetricTone.positive,
      ),
      ProtoBreakdownItem(
        label: 'Fees',
        value: r'-$184.22',
        tone: ProtoMetricTone.negative,
      ),
    ];
  }

  List<ProtoExposureItem> loadExposureItems() {
    return const [
      ProtoExposureItem(label: '半导体', value: '38%'),
      ProtoExposureItem(label: '消费电子', value: '26%'),
      ProtoExposureItem(label: '新能源车', value: '14%'),
    ];
  }
}

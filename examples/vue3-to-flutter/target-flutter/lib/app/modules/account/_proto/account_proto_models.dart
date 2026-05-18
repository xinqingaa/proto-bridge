enum ProtoMetricTone { positive, negative, neutral }

class ProtoHoldingSummary {
  const ProtoHoldingSummary({
    required this.marketValue,
    required this.dayPnl,
    required this.dayPnlRate,
    required this.riskLevel,
  });

  final String marketValue;
  final String dayPnl;
  final String dayPnlRate;
  final String riskLevel;
}

class ProtoHolding {
  const ProtoHolding({
    required this.symbol,
    required this.name,
    required this.sector,
    required this.amount,
    required this.shares,
    required this.pnl,
    required this.pnlRate,
    required this.isPositive,
  });

  final String symbol;
  final String name;
  final String sector;
  final String amount;
  final String shares;
  final String pnl;
  final String pnlRate;
  final bool isPositive;
}

class ProtoPnlMetric {
  const ProtoPnlMetric({
    required this.label,
    required this.value,
    required this.delta,
    required this.tone,
  });

  final String label;
  final String value;
  final String delta;
  final ProtoMetricTone tone;
}

class ProtoPnlRecord {
  const ProtoPnlRecord({
    required this.id,
    required this.symbol,
    required this.action,
    required this.time,
    required this.amount,
    required this.risk,
  });

  final String id;
  final String symbol;
  final String action;
  final String time;
  final String amount;
  final String risk;

  bool get isPositive => !amount.startsWith('-');
}

class ProtoBreakdownItem {
  const ProtoBreakdownItem({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final String value;
  final ProtoMetricTone tone;
}

class ProtoExposureItem {
  const ProtoExposureItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;
}

import 'package:equatable/equatable.dart';

class HoldingSummary extends Equatable {
  const HoldingSummary({
    required this.marketValue,
    required this.dayPnl,
    required this.dayPnlRate,
    required this.riskLevel,
  });

  final String marketValue;
  final String dayPnl;
  final String dayPnlRate;
  final String riskLevel;

  @override
  List<Object?> get props => [marketValue, dayPnl, dayPnlRate, riskLevel];
}

class Holding extends Equatable {
  const Holding({
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

  @override
  List<Object?> get props => [
    symbol,
    name,
    sector,
    amount,
    shares,
    pnl,
    pnlRate,
    isPositive,
  ];
}

class PnlMetric extends Equatable {
  const PnlMetric({
    required this.label,
    required this.value,
    required this.delta,
    required this.tone,
  });

  final String label;
  final String value;
  final String delta;
  final MetricTone tone;

  @override
  List<Object?> get props => [label, value, delta, tone];
}

enum MetricTone { positive, negative, neutral }

class PnlRecord extends Equatable {
  const PnlRecord({
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

  @override
  List<Object?> get props => [id, symbol, action, time, amount, risk];
}

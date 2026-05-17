import 'package:equatable/equatable.dart';

import '../domain/asset_models.dart';

class AssetState extends Equatable {
  const AssetState({
    required this.summary,
    required this.holdings,
    required this.metrics,
    required this.records,
    required this.trendPoints,
    this.holdingFilter = 'All',
    this.activePnlTab = 'overview',
    this.riskFilter = 'All',
    this.loading = false,
    this.filterSheetOpen = false,
    this.selectedRecord,
  });

  final HoldingSummary summary;
  final List<Holding> holdings;
  final List<PnlMetric> metrics;
  final List<PnlRecord> records;
  final List<double> trendPoints;
  final String holdingFilter;
  final String activePnlTab;
  final String riskFilter;
  final bool loading;
  final bool filterSheetOpen;
  final PnlRecord? selectedRecord;

  List<Holding> get filteredHoldings {
    if (holdingFilter == 'All') return holdings;
    return holdings.where((item) => item.sector == holdingFilter).toList();
  }

  List<PnlRecord> get filteredRecords {
    if (riskFilter == 'All') return records;
    return records.where((item) => item.risk == riskFilter).toList();
  }

  AssetState copyWith({
    HoldingSummary? summary,
    List<Holding>? holdings,
    List<PnlMetric>? metrics,
    List<PnlRecord>? records,
    List<double>? trendPoints,
    String? holdingFilter,
    String? activePnlTab,
    String? riskFilter,
    bool? loading,
    bool? filterSheetOpen,
    PnlRecord? selectedRecord,
    bool clearSelectedRecord = false,
  }) {
    return AssetState(
      summary: summary ?? this.summary,
      holdings: holdings ?? this.holdings,
      metrics: metrics ?? this.metrics,
      records: records ?? this.records,
      trendPoints: trendPoints ?? this.trendPoints,
      holdingFilter: holdingFilter ?? this.holdingFilter,
      activePnlTab: activePnlTab ?? this.activePnlTab,
      riskFilter: riskFilter ?? this.riskFilter,
      loading: loading ?? this.loading,
      filterSheetOpen: filterSheetOpen ?? this.filterSheetOpen,
      selectedRecord: clearSelectedRecord
          ? null
          : selectedRecord ?? this.selectedRecord,
    );
  }

  @override
  List<Object?> get props => [
    summary,
    holdings,
    metrics,
    records,
    trendPoints,
    holdingFilter,
    activePnlTab,
    riskFilter,
    loading,
    filterSheetOpen,
    selectedRecord,
  ];
}

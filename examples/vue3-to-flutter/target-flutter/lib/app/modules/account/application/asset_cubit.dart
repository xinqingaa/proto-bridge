import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/asset_repository.dart';
import '../domain/asset_models.dart';
import 'asset_state.dart';

class AssetCubit extends Cubit<AssetState> {
  AssetCubit(AssetRepository repository)
    : super(
        AssetState(
          summary: repository.loadSummary(),
          holdings: repository.loadHoldings(),
          metrics: repository.loadMetrics(),
          records: repository.loadRecords(),
          trendPoints: repository.loadTrendPoints(),
        ),
      );

  void selectHoldingFilter(String value) {
    emit(state.copyWith(holdingFilter: value));
  }

  void setPnlTab(String value) {
    emit(
      state.copyWith(
        activePnlTab: value,
        riskFilter: value == 'risk' ? 'High' : state.riskFilter,
      ),
    );
  }

  void openFilterSheet() {
    emit(state.copyWith(filterSheetOpen: true));
  }

  void closeFilterSheet() {
    emit(state.copyWith(filterSheetOpen: false));
  }

  void setRiskFilter(String value) {
    emit(state.copyWith(riskFilter: value, filterSheetOpen: false));
  }

  void openRecord(PnlRecord record) {
    emit(state.copyWith(selectedRecord: record));
  }

  void closeRecord() {
    emit(state.copyWith(clearSelectedRecord: true));
  }

  Future<void> refresh() async {
    emit(state.copyWith(loading: true));
    await Future<void>.delayed(const Duration(milliseconds: 240));
    emit(state.copyWith(loading: false));
  }
}

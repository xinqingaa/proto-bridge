import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'cold_chain_fixtures.dart';
import 'cold_chain_models.dart';

class ExceptionQueueState {
  const ExceptionQueueState({required this.variantId, this.query = ''});

  final String variantId;
  final String query;

  bool get isLoading => variantId == 'loading';
  bool get isError => variantId == 'error';
  bool get showsQueueChrome => !isLoading && !isError;

  String get tabValue => tabByVariant[variantId] ?? 'all';

  int get tabIndex {
    final index = severityTabs.indexWhere((tab) => tab.value == tabValue);
    return index < 0 ? 0 : index;
  }

  List<ColdChainException> get visible {
    if (variantId == 'empty') return const [];
    final severity = switch (tabValue) {
      'critical' => ExceptionSeverity.critical,
      'warning' => ExceptionSeverity.warning,
      'attention' => ExceptionSeverity.attention,
      _ => null,
    };
    final needle = query.trim().toLowerCase();
    return coldChainExceptions.where((item) {
      final matchesFilter = severity == null || item.severity == severity;
      final haystack =
          '${item.id} ${item.shipmentId} ${item.lane} ${item.cargo}'
              .toLowerCase();
      final matchesQuery = needle.isEmpty || haystack.contains(needle);
      return matchesFilter && matchesQuery;
    }).toList();
  }

  String get emptyTitle => query.trim().isEmpty ? '没有待处理异常' : '没有匹配的异常';

  String get emptyDescription =>
      query.trim().isEmpty ? '当前筛选范围内的运输温度全部正常。' : '可以尝试搜索其他运单、线路或异常编号。';

  ExceptionQueueState copyWith({String? variantId, String? query}) {
    return ExceptionQueueState(
      variantId: variantId ?? this.variantId,
      query: query ?? this.query,
    );
  }
}

class ExceptionQueueNotifier
    extends AutoDisposeFamilyNotifier<ExceptionQueueState, String> {
  @override
  ExceptionQueueState build(String initialVariantId) {
    return ExceptionQueueState(variantId: initialVariantId);
  }

  void selectTab(String tabValue) {
    final nextVariant = variantByTab[tabValue];
    if (nextVariant == null) return;
    state = state.copyWith(variantId: nextVariant);
  }

  void showCritical() => selectTab('critical');

  void setQuery(String query) => state = state.copyWith(query: query);

  void retry() => state = const ExceptionQueueState(variantId: 'default');

  Future<void> refresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
  }
}

final exceptionQueueProvider = NotifierProvider.autoDispose
    .family<ExceptionQueueNotifier, ExceptionQueueState, String>(
      ExceptionQueueNotifier.new,
    );

class ShipmentDetailState {
  const ShipmentDetailState({required this.args});

  final ShipmentDetailArgs args;

  String get variantId => args.variantId;
  String get shipmentId => args.shipmentId;
  bool get hasExcursion => args.hasExcursion;
  bool get sensorOffline => variantId == 'sensor-offline';
  double get currentTemperature => hasExcursion ? 10.8 : 6.1;
}

class ShipmentDetailNotifier
    extends AutoDisposeFamilyNotifier<ShipmentDetailState, ShipmentDetailArgs> {
  @override
  ShipmentDetailState build(ShipmentDetailArgs args) =>
      ShipmentDetailState(args: args);
}

final shipmentDetailProvider = NotifierProvider.autoDispose
    .family<ShipmentDetailNotifier, ShipmentDetailState, ShipmentDetailArgs>(
      ShipmentDetailNotifier.new,
    );

class ResolutionFormState {
  const ResolutionFormState({
    required this.args,
    this.cause = '',
    this.action = '',
    this.outcome = '',
    this.checkedDriver = false,
    this.checkedCooling = false,
    this.checkedCargo = false,
    this.continueMonitoring = true,
    this.notes = '',
    this.supervisor = '',
    this.validationMessage = '',
  });

  final ResolutionFormArgs args;
  final String cause;
  final String action;
  final String outcome;
  final bool checkedDriver;
  final bool checkedCooling;
  final bool checkedCargo;
  final bool continueMonitoring;
  final String notes;
  final String supervisor;
  final String validationMessage;

  bool get operationalComplete =>
      cause.isNotEmpty &&
      action.isNotEmpty &&
      outcome.isNotEmpty &&
      checkedDriver &&
      checkedCooling &&
      checkedCargo;

  bool get complete => operationalComplete && supervisor.isNotEmpty;

  ResolutionFormState copyWith({
    String? cause,
    String? action,
    String? outcome,
    bool? checkedDriver,
    bool? checkedCooling,
    bool? checkedCargo,
    bool? continueMonitoring,
    String? notes,
    String? supervisor,
    String? validationMessage,
  }) {
    return ResolutionFormState(
      args: args,
      cause: cause ?? this.cause,
      action: action ?? this.action,
      outcome: outcome ?? this.outcome,
      checkedDriver: checkedDriver ?? this.checkedDriver,
      checkedCooling: checkedCooling ?? this.checkedCooling,
      checkedCargo: checkedCargo ?? this.checkedCargo,
      continueMonitoring: continueMonitoring ?? this.continueMonitoring,
      notes: notes ?? this.notes,
      supervisor: supervisor ?? this.supervisor,
      validationMessage: validationMessage ?? this.validationMessage,
    );
  }
}

class ResolutionFormNotifier
    extends AutoDisposeFamilyNotifier<ResolutionFormState, ResolutionFormArgs> {
  @override
  ResolutionFormState build(ResolutionFormArgs args) {
    final variant = args.variantId;
    if (const {
      'ready-to-submit',
      'confirm-dialog-open',
      'submitted',
    }.contains(variant)) {
      return _ready(args, includeSupervisor: true);
    }
    if (const {
      'approval-required',
      'approval-validation-error',
    }.contains(variant)) {
      final filled = _ready(args, includeSupervisor: false);
      if (variant == 'approval-validation-error') {
        return filled.copyWith(validationMessage: '超温已持续 47 分钟，必须指定值班主管后才能提交。');
      }
      return filled;
    }
    if (variant == 'validation-error') {
      return ResolutionFormState(
        args: args,
        validationMessage: '请补全异常原因、处置动作和三项现场确认。',
      );
    }
    return ResolutionFormState(args: args);
  }

  static ResolutionFormState _ready(
    ResolutionFormArgs args, {
    required bool includeSupervisor,
  }) {
    return ResolutionFormState(
      args: args,
      cause: '制冷机组异常',
      action: '切换备用制冷',
      outcome: '温度开始回落',
      checkedDriver: true,
      checkedCooling: true,
      checkedCargo: true,
      continueMonitoring: true,
      notes: '司机已切换备用制冷，预计 15 分钟内回到 8°C 以下。',
      supervisor: includeSupervisor ? '华东值班经理 · 林岚' : '',
    );
  }

  void setCause(String? value) => state = state.copyWith(cause: value ?? '');
  void setAction(String? value) => state = state.copyWith(action: value ?? '');
  void setOutcome(String? value) =>
      state = state.copyWith(outcome: value ?? '');
  void setDriver(bool value) => state = state.copyWith(checkedDriver: value);
  void setCooling(bool value) => state = state.copyWith(checkedCooling: value);
  void setCargo(bool value) => state = state.copyWith(checkedCargo: value);
  void setMonitoring(bool value) =>
      state = state.copyWith(continueMonitoring: value);
  void setNotes(String value) => state = state.copyWith(notes: value);
  void setSupervisor(String? value) =>
      state = state.copyWith(supervisor: value ?? '');

  /// Returns the variant that should be presented after submit.
  String submit() {
    if (!state.complete) {
      if (state.operationalComplete && state.supervisor.isEmpty) {
        state = state.copyWith(validationMessage: '超温已持续 47 分钟，必须指定值班主管后才能提交。');
        return 'approval-validation-error';
      }
      state = state.copyWith(validationMessage: '请补全异常原因、处置动作和三项现场确认。');
      return 'validation-error';
    }
    state = state.copyWith(validationMessage: '');
    return 'confirm-dialog-open';
  }

  void markSubmitted() {
    state = state.copyWith(validationMessage: '');
  }
}

final resolutionFormProvider = NotifierProvider.autoDispose
    .family<ResolutionFormNotifier, ResolutionFormState, ResolutionFormArgs>(
      ResolutionFormNotifier.new,
    );

enum V6QueueMode { defaultState, criticalOnly, empty, error, loading }

extension V6QueueModeParsing on V6QueueMode {
  static V6QueueMode fromArgs(Object? args) {
    final value = args is Map ? args['variant'] : null;
    return switch (value) {
      'critical-only' => V6QueueMode.criticalOnly,
      'empty' => V6QueueMode.empty,
      'error' => V6QueueMode.error,
      'loading' => V6QueueMode.loading,
      _ => V6QueueMode.defaultState,
    };
  }
}

enum V6ShipmentMode { defaultState, activeExcursion, sensorOffline }

extension V6ShipmentModeParsing on V6ShipmentMode {
  static V6ShipmentMode fromArgs(Object? args) {
    final value = args is Map ? args['variant'] : null;
    return switch (value) {
      'active-excursion' => V6ShipmentMode.activeExcursion,
      'sensor-offline' => V6ShipmentMode.sensorOffline,
      _ => V6ShipmentMode.defaultState,
    };
  }
}

enum V6ResolutionMode {
  defaultState,
  approvalRequired,
  approvalValidationError,
  confirmDialogOpen,
  readyToSubmit,
  submitted,
  validationError,
}

extension V6ResolutionModeParsing on V6ResolutionMode {
  static V6ResolutionMode fromArgs(Object? args) {
    final value = args is Map ? args['variant'] : null;
    return switch (value) {
      'approval-required' => V6ResolutionMode.approvalRequired,
      'approval-validation-error' => V6ResolutionMode.approvalValidationError,
      'confirm-dialog-open' => V6ResolutionMode.confirmDialogOpen,
      'ready-to-submit' => V6ResolutionMode.readyToSubmit,
      'submitted' => V6ResolutionMode.submitted,
      'validation-error' => V6ResolutionMode.validationError,
      _ => V6ResolutionMode.defaultState,
    };
  }
}

enum V6ExceptionSeverity { critical, warning }

class V6ExceptionItem {
  const V6ExceptionItem({
    required this.key,
    required this.shipmentId,
    required this.route,
    required this.cargo,
    required this.temperature,
    required this.duration,
    required this.updatedAt,
    required this.severity,
  });

  final String key;
  final String shipmentId;
  final String route;
  final String cargo;
  final String temperature;
  final String duration;
  final String updatedAt;
  final V6ExceptionSeverity severity;

  String get limit => '上限 8°C';

  bool get isCritical => severity == V6ExceptionSeverity.critical;
}

const v6ExceptionItems = [
  V6ExceptionItem(
    key: 'ex-017',
    shipmentId: 'EX-017 · SH-2048',
    route: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperature: '10.8°C',
    duration: '已持续 47 分钟',
    updatedAt: '14:32',
    severity: V6ExceptionSeverity.critical,
  ),
  V6ExceptionItem(
    key: 'ex-031',
    shipmentId: 'EX-031 · SH-2196',
    route: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperature: '9.7°C',
    duration: '已持续 28 分钟',
    updatedAt: '14:26',
    severity: V6ExceptionSeverity.critical,
  ),
  V6ExceptionItem(
    key: 'ex-024',
    shipmentId: 'EX-024 · SH-2113',
    route: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    temperature: '8.9°C',
    duration: '已持续 16 分钟',
    updatedAt: '14:18',
    severity: V6ExceptionSeverity.warning,
  ),
];

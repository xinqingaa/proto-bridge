/// 冷链异常队列的固定业务 identity；与 Handoff 基线数据一一对应。
enum ColdChainExceptionSeverity { critical, warning, attention }

enum ExceptionQueueStatus { content, loading, empty, error }

enum ExceptionQueueFilter { all, critical, warning, attention }

class ColdChainException {
  const ColdChainException({
    required this.exceptionId,
    required this.shipmentId,
    required this.route,
    required this.cargo,
    required this.temperatureStatus,
    required this.updatedAt,
    required this.severity,
  });

  final String exceptionId;
  final String shipmentId;
  final String route;
  final String cargo;
  final String temperatureStatus;
  final String updatedAt;
  final ColdChainExceptionSeverity severity;

  bool matches(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) return true;
    return '$exceptionId $shipmentId $route $cargo'.toLowerCase().contains(
      normalized,
    );
  }
}

const coldChainExceptions = [
  ColdChainException(
    exceptionId: 'EX-017',
    shipmentId: 'SH-2048',
    route: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperatureStatus: '10.8°C 上限 8°C · 已持续 47 分钟',
    updatedAt: '14:32',
    severity: ColdChainExceptionSeverity.critical,
  ),
  ColdChainException(
    exceptionId: 'EX-031',
    shipmentId: 'SH-2196',
    route: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperatureStatus: '9.7°C 上限 8°C · 已持续 28 分钟',
    updatedAt: '14:26',
    severity: ColdChainExceptionSeverity.critical,
  ),
  ColdChainException(
    exceptionId: 'EX-024',
    shipmentId: 'SH-2113',
    route: '无锡新吴 → 常州武进',
    cargo: '腺岛素 · 32 箱',
    temperatureStatus: '8.4°C 上限 8°C · 已持续 12 分钟',
    updatedAt: '14:19',
    severity: ColdChainExceptionSeverity.warning,
  ),
  ColdChainException(
    exceptionId: 'EX-029',
    shipmentId: 'SH-2164',
    route: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperatureStatus: '7.8°C 上限 8°C · 已持续 6 分钟',
    updatedAt: '14:11',
    severity: ColdChainExceptionSeverity.attention,
  ),
];

class ExceptionQueueState {
  const ExceptionQueueState({
    this.status = ExceptionQueueStatus.content,
    this.filter = ExceptionQueueFilter.all,
    this.query = '',
  });

  final ExceptionQueueStatus status;
  final ExceptionQueueFilter filter;
  final String query;

  ExceptionQueueState copyWith({
    ExceptionQueueStatus? status,
    ExceptionQueueFilter? filter,
    String? query,
  }) {
    return ExceptionQueueState(
      status: status ?? this.status,
      filter: filter ?? this.filter,
      query: query ?? this.query,
    );
  }
}

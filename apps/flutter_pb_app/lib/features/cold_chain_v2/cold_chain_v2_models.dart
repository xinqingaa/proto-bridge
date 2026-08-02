enum ColdChainV2Variant { defaultView, criticalOnly, empty, error, loading }

enum ColdChainSeverity { critical, warning, watch }

class ColdChainException {
  const ColdChainException({
    required this.id,
    required this.shipmentId,
    required this.origin,
    required this.destination,
    required this.cargo,
    required this.temperature,
    required this.durationMinutes,
    required this.updatedAt,
    required this.severity,
  });

  final String id;
  final String shipmentId;
  final String origin;
  final String destination;
  final String cargo;
  final double temperature;
  final int durationMinutes;
  final String updatedAt;
  final ColdChainSeverity severity;
}

const coldChainExceptions = [
  ColdChainException(
    id: 'EX-017',
    shipmentId: 'SH-2048',
    origin: '上海虹桥',
    destination: '杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperature: 10.8,
    durationMinutes: 47,
    updatedAt: '14:32',
    severity: ColdChainSeverity.critical,
  ),
  ColdChainException(
    id: 'EX-031',
    shipmentId: 'SH-2196',
    origin: '苏州园区',
    destination: '南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperature: 9.7,
    durationMinutes: 28,
    updatedAt: '14:26',
    severity: ColdChainSeverity.critical,
  ),
  ColdChainException(
    id: 'EX-024',
    shipmentId: 'SH-2113',
    origin: '无锡新吴',
    destination: '常州武进',
    cargo: '胰岛素 · 32 箱',
    temperature: 8.4,
    durationMinutes: 12,
    updatedAt: '14:19',
    severity: ColdChainSeverity.warning,
  ),
  ColdChainException(
    id: 'EX-029',
    shipmentId: 'SH-2164',
    origin: '嘉兴南湖',
    destination: '宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperature: 7.8,
    durationMinutes: 6,
    updatedAt: '14:11',
    severity: ColdChainSeverity.watch,
  ),
];

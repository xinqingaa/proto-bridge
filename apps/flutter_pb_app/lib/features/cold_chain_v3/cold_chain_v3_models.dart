// Cold Chain Ops V3 fixtures — sourced from fixed Evidence Snapshot
// `snapshot-2026-08-03t021704542-69fdbb6b` / Handoff
// `handoff-2026-08-03t021713920-26728cf8`.

enum ColdChainV3Severity { critical, warning, watch }

enum ColdChainV3QueueVariant { loading, error, empty, defaultList, criticalOnly }

enum ColdChainV3ShipmentVariant {
  defaultDetail,
  activeExcursion,
  sensorOffline,
}

enum ColdChainV3FormVariant {
  empty,
  readyToSubmit,
  validationError,
  approvalRequired,
  approvalValidationError,
  confirmDialogOpen,
  submitted,
}

enum ColdChainV3Outcome { cooling, rising, unknown }

class ColdChainV3Exception {
  const ColdChainV3Exception({
    required this.id,
    required this.shipmentId,
    required this.severity,
    required this.origin,
    required this.destination,
    required this.cargo,
    required this.temperature,
    required this.limit,
    required this.durationMinutes,
    required this.updatedAt,
  });

  final String id;
  final String shipmentId;
  final ColdChainV3Severity severity;
  final String origin;
  final String destination;
  final String cargo;
  final double temperature;
  final double limit;
  final int durationMinutes;
  final String updatedAt;

  String get identity => '$id · $shipmentId';
  String get lane => '$origin → $destination';
  String get severityLabel => switch (severity) {
        ColdChainV3Severity.critical => '严重',
        ColdChainV3Severity.warning => '警告',
        ColdChainV3Severity.watch => '关注',
      };
}

class ColdChainV3TimelineEvent {
  const ColdChainV3TimelineEvent({
    required this.time,
    required this.title,
    required this.detail,
    required this.tone,
  });

  final String time;
  final String title;
  final String detail;
  final ColdChainV3EventTone tone;
}

enum ColdChainV3EventTone { success, info, warning, critical }

class ColdChainV3TempSample {
  const ColdChainV3TempSample({required this.label, required this.value});

  final String label;
  final double value;
}

class ColdChainV3Shipment {
  const ColdChainV3Shipment({
    required this.id,
    required this.eta,
    required this.origin,
    required this.destination,
    required this.cargo,
    required this.vehicle,
    required this.driver,
    required this.probe,
    required this.probeInterval,
    required this.tempZone,
    required this.samples,
    required this.timeline,
    required this.currentTemp,
    required this.maxTemp,
    required this.overTempMinutes,
    this.alertTitle,
    this.alertDescription,
    this.sensorOfflineTitle,
    this.sensorOfflineDescription,
  });

  final String id;
  final String eta;
  final String origin;
  final String destination;
  final String cargo;
  final String vehicle;
  final String driver;
  final String probe;
  final String probeInterval;
  final String tempZone;
  final List<ColdChainV3TempSample> samples;
  final List<ColdChainV3TimelineEvent> timeline;
  final double currentTemp;
  final double maxTemp;
  final int overTempMinutes;
  final String? alertTitle;
  final String? alertDescription;
  final String? sensorOfflineTitle;
  final String? sensorOfflineDescription;
}

/// Evidence-backed select values only (no invented catalog).
abstract final class ColdChainV3FormOptions {
  static const causes = ['制冷机组异常'];
  static const actions = ['切换备用制冷'];
  static const supervisors = ['华东值班经理 · 林岚'];
  static const outcomes = <(ColdChainV3Outcome, String)>[
    (ColdChainV3Outcome.cooling, '温度开始回落'),
    (ColdChainV3Outcome.rising, '温度仍在上升'),
    (ColdChainV3Outcome.unknown, '暂时无法确认'),
  ];
}

abstract final class ColdChainV3Fixtures {
  static const exceptions = <ColdChainV3Exception>[
    ColdChainV3Exception(
      id: 'EX-017',
      shipmentId: 'SH-2048',
      severity: ColdChainV3Severity.critical,
      origin: '上海虹桥',
      destination: '杭州临平',
      cargo: '生物制剂 · 18 箱',
      temperature: 10.8,
      limit: 8,
      durationMinutes: 47,
      updatedAt: '14:32',
    ),
    ColdChainV3Exception(
      id: 'EX-031',
      shipmentId: 'SH-2196',
      severity: ColdChainV3Severity.critical,
      origin: '苏州园区',
      destination: '南京江宁',
      cargo: '细胞样本 · 6 箱',
      temperature: 9.7,
      limit: 8,
      durationMinutes: 28,
      updatedAt: '14:26',
    ),
    ColdChainV3Exception(
      id: 'EX-024',
      shipmentId: 'SH-2113',
      severity: ColdChainV3Severity.warning,
      origin: '无锡新吴',
      destination: '常州武进',
      cargo: '胰岛素 · 32 箱',
      temperature: 8.4,
      limit: 8,
      durationMinutes: 12,
      updatedAt: '14:19',
    ),
    ColdChainV3Exception(
      id: 'EX-029',
      shipmentId: 'SH-2164',
      severity: ColdChainV3Severity.watch,
      origin: '嘉兴南湖',
      destination: '宁波北仑',
      cargo: '检测试剂 · 24 箱',
      temperature: 7.8,
      limit: 8,
      durationMinutes: 6,
      updatedAt: '14:11',
    ),
  ];

  static const chartSamples = <ColdChainV3TempSample>[
    ColdChainV3TempSample(label: '13:20', value: 5.2),
    ColdChainV3TempSample(label: '13:30', value: 5.8),
    ColdChainV3TempSample(label: '13:40', value: 6.4),
    ColdChainV3TempSample(label: '13:50', value: 7.1),
    ColdChainV3TempSample(label: '14:00', value: 8.6),
    ColdChainV3TempSample(label: '14:10', value: 9.4),
    ColdChainV3TempSample(label: '14:20', value: 10.2),
    ColdChainV3TempSample(label: '14:30', value: 10.8),
  ];

  static const timeline = <ColdChainV3TimelineEvent>[
    ColdChainV3TimelineEvent(
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
      tone: ColdChainV3EventTone.success,
    ),
    ColdChainV3TimelineEvent(
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
      tone: ColdChainV3EventTone.info,
    ),
    ColdChainV3TimelineEvent(
      time: '13:45',
      title: '温度接近上限',
      detail: '连续 5 分钟高于 7.5°C',
      tone: ColdChainV3EventTone.warning,
    ),
    ColdChainV3TimelineEvent(
      time: '14:02',
      title: '确认持续超温',
      detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
      tone: ColdChainV3EventTone.critical,
    ),
  ];

  static const shipmentDefault = ColdChainV3Shipment(
    id: 'SH-2048',
    eta: '16:20',
    origin: '上海虹桥冷库',
    destination: '杭州临平中心',
    cargo: '生物制剂 · 18 箱',
    vehicle: '沪A·7K21',
    driver: '周其明',
    probe: '探头 T-07',
    probeInterval: '2 分钟/次',
    tempZone: '2–8°C',
    samples: chartSamples,
    timeline: timeline,
    currentTemp: 6.1,
    maxTemp: 10.8,
    overTempMinutes: 47,
  );

  static const shipmentActive = ColdChainV3Shipment(
    id: 'SH-2048',
    eta: '16:20',
    origin: '上海虹桥冷库',
    destination: '杭州临平中心',
    cargo: '生物制剂 · 18 箱',
    vehicle: '沪A·7K21',
    driver: '周其明',
    probe: '探头 T-07',
    probeInterval: '2 分钟/次',
    tempZone: '2–8°C',
    samples: chartSamples,
    timeline: timeline,
    currentTemp: 10.8,
    maxTemp: 10.8,
    overTempMinutes: 47,
    alertTitle: '持续超温 47 分钟',
    alertDescription: '当前 10.8°C，已高于运输上限 2.8°C',
  );

  static const shipmentSensorOffline = ColdChainV3Shipment(
    id: 'SH-2048',
    eta: '16:20',
    origin: '上海虹桥冷库',
    destination: '杭州临平中心',
    cargo: '生物制剂 · 18 箱',
    vehicle: '沪A·7K21',
    driver: '周其明',
    probe: '探头 T-07',
    probeInterval: '2 分钟/次',
    tempZone: '2–8°C',
    samples: chartSamples,
    timeline: timeline,
    currentTemp: 6.1,
    maxTemp: 10.8,
    overTempMinutes: 47,
    sensorOfflineTitle: '探头 T-07 已离线 18 分钟',
    sensorOfflineDescription: '当前温度不可确认，请联系司机检查探头电源。',
  );

  static ColdChainV3Shipment shipmentFor(ColdChainV3ShipmentVariant variant) {
    return switch (variant) {
      ColdChainV3ShipmentVariant.defaultDetail => shipmentDefault,
      ColdChainV3ShipmentVariant.activeExcursion => shipmentActive,
      ColdChainV3ShipmentVariant.sensorOffline => shipmentSensorOffline,
    };
  }
}

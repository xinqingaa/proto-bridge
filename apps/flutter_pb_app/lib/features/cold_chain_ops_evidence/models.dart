/// Fixed business data from Handoff
/// `handoff-2026-08-06t083549353-ed70750c` / Snapshot
/// `snapshot-2026-08-06t083545838-791e7d4e`.
library;

enum ExceptionSeverity { critical, warning, watch }

class ExceptionRow {
  const ExceptionRow({
    required this.id,
    required this.shipmentId,
    required this.severity,
    required this.severityLabel,
    required this.lane,
    required this.cargo,
    required this.temperature,
    required this.limitLabel,
    required this.durationLabel,
    required this.updatedAt,
  });

  final String id;
  final String shipmentId;
  final ExceptionSeverity severity;
  final String severityLabel;
  final String lane;
  final String cargo;
  final String temperature;
  final String limitLabel;
  final String durationLabel;
  final String updatedAt;

  String get identity =>
      '${id.toUpperCase()} · $shipmentId';
}

/// Default keyed collection order: ex-017, ex-031, ex-024, ex-029.
const kExceptionRows = <ExceptionRow>[
  ExceptionRow(
    id: 'ex-017',
    shipmentId: 'SH-2048',
    severity: ExceptionSeverity.critical,
    severityLabel: '严重',
    lane: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperature: '10.8°C',
    limitLabel: '上限 8°C',
    durationLabel: '已持续 47 分钟',
    updatedAt: '14:32',
  ),
  ExceptionRow(
    id: 'ex-031',
    shipmentId: 'SH-2196',
    severity: ExceptionSeverity.critical,
    severityLabel: '严重',
    lane: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperature: '9.7°C',
    limitLabel: '上限 8°C',
    durationLabel: '已持续 28 分钟',
    updatedAt: '14:26',
  ),
  ExceptionRow(
    id: 'ex-024',
    shipmentId: 'SH-2113',
    severity: ExceptionSeverity.warning,
    severityLabel: '警告',
    lane: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    temperature: '8.4°C',
    // Compact Evidence only proved temperature text; keep limit from Screenshot
    // pattern without inventing duration/time.
    limitLabel: '上限 8°C',
    durationLabel: '',
    updatedAt: '',
  ),
  ExceptionRow(
    id: 'ex-029',
    shipmentId: 'SH-2164',
    severity: ExceptionSeverity.watch,
    severityLabel: '关注',
    lane: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperature: '7.8°C',
    limitLabel: '上限 8°C',
    durationLabel: '',
    updatedAt: '',
  ),
];

ExceptionRow exceptionById(String id) =>
    kExceptionRows.firstWhere((e) => e.id == id, orElse: () => kExceptionRows.first);

class TempSample {
  const TempSample({required this.label, required this.value});

  final String label;
  final double value;
}

class TimelineEvent {
  const TimelineEvent({
    required this.id,
    required this.time,
    required this.title,
    required this.detail,
    required this.tone,
  });

  final String id;
  final String time;
  final String title;
  final String detail;
  final TimelineTone tone;
}

enum TimelineTone { success, info, warning, error }

class ShipmentDetail {
  const ShipmentDetail({
    required this.shipmentId,
    required this.eta,
    required this.origin,
    required this.destination,
    required this.cargo,
    required this.vehicle,
    required this.device,
    required this.tempZone,
    required this.chartSubtitle,
    required this.samples,
    required this.currentTemp,
    required this.maxTemp,
    required this.overTempDuration,
    required this.events,
    required this.alertTitle,
    required this.alertDescription,
    required this.sensorOfflineTitle,
    required this.sensorOfflineDescription,
  });

  final String shipmentId;
  final String eta;
  final String origin;
  final String destination;
  final String cargo;
  final String vehicle;
  final String device;
  final String tempZone;
  final String chartSubtitle;
  final List<TempSample> samples;
  final String currentTemp;
  final String maxTemp;
  final String overTempDuration;
  final List<TimelineEvent> events;
  final String alertTitle;
  final String alertDescription;
  final String sensorOfflineTitle;
  final String sensorOfflineDescription;
}

const kShipmentSh2048 = ShipmentDetail(
  shipmentId: 'SH-2048',
  eta: '预计 16:20 到达',
  origin: '上海虹桥冷库',
  destination: '杭州临平中心',
  cargo: '生物制剂 · 18 箱',
  vehicle: '沪A·7K21 · 周其明',
  device: '探头 T-07 · 2 分钟/次',
  tempZone: '2–8°C',
  chartSubtitle: '最近 70 分钟 · 上限 8°C',
  samples: [
    TempSample(label: '13:20', value: 4.8),
    TempSample(label: '13:30', value: 5.2),
    TempSample(label: '13:40', value: 5.8),
    TempSample(label: '13:50', value: 6.4),
    TempSample(label: '14:00', value: 8.6),
    TempSample(label: '14:10', value: 9.4),
    TempSample(label: '14:20', value: 10.2),
    TempSample(label: '14:30', value: 10.8),
  ],
  currentTemp: '6.1°C',
  maxTemp: '10.8°C',
  overTempDuration: '47m',
  events: [
    TimelineEvent(
      id: 'evt-accepted',
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
      tone: TimelineTone.success,
    ),
    TimelineEvent(
      id: 'evt-departed',
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
      tone: TimelineTone.info,
    ),
    TimelineEvent(
      id: 'evt-threshold',
      time: '13:58',
      title: '温度接近上限',
      detail: '连续 5 分钟高于 7.5°C',
      tone: TimelineTone.warning,
    ),
    TimelineEvent(
      id: 'evt-excursion',
      time: '14:12',
      title: '确认持续超温',
      detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
      tone: TimelineTone.error,
    ),
  ],
  alertTitle: '持续超温 47 分钟',
  alertDescription: '当前 10.8°C，已高于运输上限 2.8°C',
  sensorOfflineTitle: '探头 T-07 已离线 18 分钟',
  sensorOfflineDescription: '当前温度不可确认，请联系司机检查探头电源。',
);

class SelectOptionData {
  const SelectOptionData({required this.value, required this.label});

  final String value;
  final String label;
}

/// Option catalogs limited to labels proven by Evidence Screenshots / selected
/// values. Full option lists were not present in baseline compact state.
const kCauseOptions = <SelectOptionData>[
  SelectOptionData(value: 'cooling-unit-fault', label: '制冷机组异常'),
];

const kActionOptions = <SelectOptionData>[
  SelectOptionData(value: 'switch-backup-cooling', label: '切换备用制冷'),
];

const kSupervisorOptions = <SelectOptionData>[
  SelectOptionData(value: 'lin-lan', label: '华东值班经理 · 林岚'),
];

const kOutcomeOptions = <SelectOptionData>[
  SelectOptionData(value: 'cooling-down', label: '温度开始回落'),
  SelectOptionData(value: 'still-rising', label: '温度仍在上升'),
  SelectOptionData(value: 'unknown', label: '暂时无法确认'),
];

class ResolutionCaseSummary {
  const ResolutionCaseSummary({
    required this.title,
    required this.detail,
  });

  final String title;
  final String detail;
}

const kResolutionSummary = ResolutionCaseSummary(
  title: 'SH-2048 · 严重超温',
  detail: '当前 10.8°C · 上限 8°C · 已持续 47 分钟',
);

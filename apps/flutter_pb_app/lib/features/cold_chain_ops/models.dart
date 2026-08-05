// Mock data for cold-chain Evidence screens (fixed Handoff snapshot).

enum ExceptionSeverity { critical, warning, watch }

class ExceptionItem {
  const ExceptionItem({
    required this.id,
    required this.shipmentId,
    required this.severity,
    required this.route,
    required this.cargo,
    required this.temperatureC,
    required this.limitC,
    required this.durationMinutes,
    required this.loggedAt,
  });

  final String id;
  final String shipmentId;
  final ExceptionSeverity severity;
  final String route;
  final String cargo;
  final double temperatureC;
  final double limitC;
  final int durationMinutes;
  final String loggedAt;

  String get codeLine => '$id · $shipmentId';

  String get severityLabel => switch (severity) {
        ExceptionSeverity.critical => '严重',
        ExceptionSeverity.warning => '警告',
        ExceptionSeverity.watch => '关注',
      };

  String get durationLine => '上限 ${limitC.toStringAsFixed(0)}°C · 已持续 $durationMinutes 分钟';
}

const kExceptionItems = <ExceptionItem>[
  ExceptionItem(
    id: 'EX-017',
    shipmentId: 'SH-2048',
    severity: ExceptionSeverity.critical,
    route: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperatureC: 10.8,
    limitC: 8,
    durationMinutes: 47,
    loggedAt: '14:32',
  ),
  ExceptionItem(
    id: 'EX-024',
    shipmentId: 'SH-2113',
    severity: ExceptionSeverity.warning,
    route: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    temperatureC: 8.4,
    limitC: 8,
    durationMinutes: 12,
    loggedAt: '14:19',
  ),
  ExceptionItem(
    id: 'EX-029',
    shipmentId: 'SH-2164',
    severity: ExceptionSeverity.watch,
    route: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperatureC: 7.8,
    limitC: 8,
    durationMinutes: 6,
    loggedAt: '14:11',
  ),
  ExceptionItem(
    id: 'EX-031',
    shipmentId: 'SH-2196',
    severity: ExceptionSeverity.critical,
    route: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperatureC: 9.7,
    limitC: 8,
    durationMinutes: 28,
    loggedAt: '14:26',
  ),
];

class TempSample {
  const TempSample({required this.label, required this.valueC});

  final String label;
  final double valueC;
}

class TimelineEvent {
  const TimelineEvent({
    required this.time,
    required this.title,
    required this.detail,
    required this.tone,
  });

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
    required this.equipment,
    required this.tempZone,
    required this.samples,
    required this.limitC,
    required this.currentC,
    required this.maxC,
    required this.overTempMinutes,
    required this.events,
  });

  final String shipmentId;
  final String eta;
  final String origin;
  final String destination;
  final String cargo;
  final String vehicle;
  final String equipment;
  final String tempZone;
  final List<TempSample> samples;
  final double limitC;
  final double currentC;
  final double maxC;
  final int overTempMinutes;
  final List<TimelineEvent> events;
}

const kShipmentSh2048Base = ShipmentDetail(
  shipmentId: 'SH-2048',
  eta: '预计 16:20 到达',
  origin: '上海虹桥冷库',
  destination: '杭州临平中心',
  cargo: '生物制剂 · 18 箱',
  vehicle: '沪A·7K21 · 周其明',
  equipment: '探头 T-07 · 2 分钟/次',
  tempZone: '2–8°C',
  samples: [
    TempSample(label: '13:20', valueC: 6.2),
    TempSample(label: '13:30', valueC: 6.8),
    TempSample(label: '13:40', valueC: 7.4),
    TempSample(label: '13:50', valueC: 7.9),
    TempSample(label: '14:00', valueC: 9.2),
    TempSample(label: '14:10', valueC: 10.0),
    TempSample(label: '14:20', valueC: 10.5),
    TempSample(label: '14:30', valueC: 10.8),
  ],
  limitC: 8,
  currentC: 6.1,
  maxC: 10.8,
  overTempMinutes: 47,
  events: [
    TimelineEvent(
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
      tone: TimelineTone.success,
    ),
    TimelineEvent(
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
      tone: TimelineTone.info,
    ),
    TimelineEvent(
      time: '13:45',
      title: '温度接近上限',
      detail: '连续 5 分钟高于 7.5°C',
      tone: TimelineTone.warning,
    ),
    TimelineEvent(
      time: '14:02',
      title: '确认持续超温',
      detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
      tone: TimelineTone.error,
    ),
  ],
);

ShipmentDetail shipmentForVariant(String variant) {
  if (variant == 'active-excursion' ||
      variant == 'action-sheet-open' ||
      variant == 'acknowledge-dialog-open') {
    return ShipmentDetail(
      shipmentId: kShipmentSh2048Base.shipmentId,
      eta: kShipmentSh2048Base.eta,
      origin: kShipmentSh2048Base.origin,
      destination: kShipmentSh2048Base.destination,
      cargo: kShipmentSh2048Base.cargo,
      vehicle: kShipmentSh2048Base.vehicle,
      equipment: kShipmentSh2048Base.equipment,
      tempZone: kShipmentSh2048Base.tempZone,
      samples: kShipmentSh2048Base.samples,
      limitC: kShipmentSh2048Base.limitC,
      currentC: 10.8,
      maxC: 10.8,
      overTempMinutes: 47,
      events: kShipmentSh2048Base.events,
    );
  }
  return kShipmentSh2048Base;
}

const kCauseOptions = <String>[
  '制冷机组异常',
  '车门未关严',
  '探头读数异常',
  '其他',
];

const kActionOptions = <String>[
  '切换备用制冷',
  '就近停靠检修',
  '联系司机复核',
  '其他',
];

const kOutcomeOptions = <String>[
  '温度开始回落',
  '温度仍在上升',
  '暂时无法确认',
];

const kChecklistLabels = <String>[
  '已联系司机并确认车辆安全',
  '已检查主制冷与备用制冷状态',
  '货箱未开封且无可见损伤',
];

const kSupervisorOptions = <String>[
  '华东值班经理 · 林岚',
  '华东值班经理 · 赵衡',
  '调度中心 · 值班台',
];

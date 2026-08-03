import 'models.dart';

/// Fixture data from fixed Snapshot cases (instrumented-runtime visible text).

const kQueueRegion = '华东区域 · 14:35 更新';
const kQueueCriticalCount = 2;
const kQueueUnassignedCount = 2;
const kQueueLongestOverTemp = '47m';

const kExceptionItems = <ExceptionItem>[
  ExceptionItem(
    id: 'EX-017',
    shipmentId: 'SH-2048',
    severity: ExceptionSeverity.critical,
    lane: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperatureC: 10.8,
    limitC: 8,
    durationMinutes: 47,
    timeLabel: '14:32',
  ),
  ExceptionItem(
    id: 'EX-031',
    shipmentId: 'SH-2196',
    severity: ExceptionSeverity.critical,
    lane: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperatureC: 9.7,
    limitC: 8,
    durationMinutes: 28,
    timeLabel: '14:26',
  ),
  ExceptionItem(
    id: 'EX-024',
    shipmentId: 'SH-2113',
    severity: ExceptionSeverity.warning,
    lane: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    temperatureC: 8.4,
    limitC: 8,
    durationMinutes: 12,
    timeLabel: '14:19',
  ),
  ExceptionItem(
    id: 'EX-029',
    shipmentId: 'SH-2164',
    severity: ExceptionSeverity.watch,
    lane: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperatureC: 7.8,
    limitC: 8,
    durationMinutes: 6,
    timeLabel: '14:11',
  ),
];

const kCauseOptions = <String>[
  '制冷机组异常',
  '车门未关严',
  '探头读数漂移',
  '外部天气影响',
];

const kActionOptions = <String>[
  '切换备用制冷',
  '降低设定温度',
  '联系司机检查',
  '安排就近卸货',
];

const kOutcomeFalling = '温度开始回落';
const kOutcomeRising = '温度仍在上升';
const kOutcomeUnknown = '暂时无法确认';

const kOutcomeOptions = <String>[
  kOutcomeFalling,
  kOutcomeRising,
  kOutcomeUnknown,
];

const kSupervisorOptions = <String>[
  '值班主管 · 陈可',
  '值班主管 · 周岚',
  '值班主管 · 王宁',
];

const kPrimaryShipment = ShipmentDetail(
  shipmentId: 'SH-2048',
  eta: '16:20',
  origin: '上海虹桥冷库',
  destination: '杭州临平中心',
  cargo: '生物制剂 · 18 箱',
  vehicle: '沪A·7K21',
  driver: '周其明',
  probe: 'T-07',
  sampleInterval: '2 分钟/次',
  zoneLabel: '2–8°C',
  limitC: 8,
  currentC: 10.8,
  maxC: 10.8,
  overTempMinutes: 47,
  chartWindowLabel: '最近 70 分钟 · 上限 8°C',
  alertTitle: '持续超温 47 分钟',
  alertDetail: '当前 10.8°C，已高于运输上限 2.8°C',
  alertSeverity: ExceptionSeverity.critical,
  samples: [
    TempSample(label: '13:20', valueC: 4.8),
    TempSample(label: '13:30', valueC: 5.1),
    TempSample(label: '13:40', valueC: 5.6),
    TempSample(label: '13:50', valueC: 6.2),
    TempSample(label: '14:00', valueC: 8.4),
    TempSample(label: '14:10', valueC: 9.1),
    TempSample(label: '14:20', valueC: 10.2),
    TempSample(label: '14:30', valueC: 10.8),
  ],
  events: [
    TimelineEvent(
      id: 'evt-accepted',
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
    ),
    TimelineEvent(
      id: 'evt-departed',
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
    ),
    TimelineEvent(
      id: 'evt-threshold',
      time: '13:45',
      title: '温度接近上限',
      detail: '连续 5 分钟高于 7.5°C',
    ),
    TimelineEvent(
      id: 'evt-excursion',
      time: '14:02',
      title: '确认持续超温',
      detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
    ),
  ],
);

const kSensorOfflineShipment = ShipmentDetail(
  shipmentId: 'SH-2048',
  eta: '16:20',
  origin: '上海虹桥冷库',
  destination: '杭州临平中心',
  cargo: '生物制剂 · 18 箱',
  vehicle: '沪A·7K21',
  driver: '周其明',
  probe: 'T-07',
  sampleInterval: '2 分钟/次',
  zoneLabel: '2–8°C',
  limitC: 8,
  currentC: 6.1,
  maxC: 10.8,
  overTempMinutes: 47,
  chartWindowLabel: '最近 70 分钟 · 上限 8°C',
  sensorOffline: true,
  sensorOfflineTitle: '探头 T-07 已离线 18 分钟',
  sensorOfflineDetail: '当前温度不可确认，请联系司机检查探头电源。',
  samples: [
    TempSample(label: '13:20', valueC: 4.8),
    TempSample(label: '13:30', valueC: 5.1),
    TempSample(label: '13:40', valueC: 5.6),
    TempSample(label: '13:50', valueC: 6.2),
    TempSample(label: '14:00', valueC: 8.4),
    TempSample(label: '14:10', valueC: 9.1),
    TempSample(label: '14:20', valueC: 10.2),
    TempSample(label: '14:30', valueC: 10.8),
  ],
  events: [
    TimelineEvent(
      id: 'evt-accepted',
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
    ),
    TimelineEvent(
      id: 'evt-departed',
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
    ),
    TimelineEvent(
      id: 'evt-threshold',
      time: '13:45',
      title: '温度接近上限',
      detail: '连续 5 分钟高于 7.5°C',
    ),
    TimelineEvent(
      id: 'evt-excursion',
      time: '14:02',
      title: '确认持续超温',
      detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
    ),
  ],
);

const kDefaultShipment = ShipmentDetail(
  shipmentId: 'SH-2048',
  eta: '16:20',
  origin: '上海虹桥冷库',
  destination: '杭州临平中心',
  cargo: '生物制剂 · 18 箱',
  vehicle: '沪A·7K21',
  driver: '周其明',
  probe: 'T-07',
  sampleInterval: '2 分钟/次',
  zoneLabel: '2–8°C',
  limitC: 8,
  currentC: 6.4,
  maxC: 7.2,
  overTempMinutes: 0,
  chartWindowLabel: '最近 70 分钟 · 上限 8°C',
  samples: [
    TempSample(label: '13:20', valueC: 4.8),
    TempSample(label: '13:30', valueC: 5.1),
    TempSample(label: '13:40', valueC: 5.4),
    TempSample(label: '13:50', valueC: 5.8),
    TempSample(label: '14:00', valueC: 6.0),
    TempSample(label: '14:10', valueC: 6.2),
    TempSample(label: '14:20', valueC: 6.3),
    TempSample(label: '14:30', valueC: 6.4),
  ],
  events: [
    TimelineEvent(
      id: 'evt-accepted',
      time: '11:48',
      title: '冷库交接完成',
      detail: '探头 T-07 校准正常，箱温 4.6°C',
    ),
    TimelineEvent(
      id: 'evt-departed',
      time: '12:16',
      title: '车辆离开上海虹桥冷库',
      detail: '司机 周其明 · 沪A·7K21',
    ),
  ],
);

QueueVariant parseQueueVariant(Object? raw) {
  final value = raw?.toString() ?? 'default';
  return switch (value) {
    'loading' => QueueVariant.loading,
    'error' => QueueVariant.error,
    'empty' => QueueVariant.empty,
    'critical-only' || 'criticalOnly' => QueueVariant.criticalOnly,
    _ => QueueVariant.defaultQueue,
  };
}

ShipmentVariant parseShipmentVariant(Object? raw) {
  final value = raw?.toString() ?? 'active-excursion';
  return switch (value) {
    'default' => ShipmentVariant.defaultShipment,
    'sensor-offline' || 'sensorOffline' => ShipmentVariant.sensorOffline,
    'action-sheet-open' || 'actionSheetOpen' =>
      ShipmentVariant.actionSheetOpen,
    'acknowledge-dialog-open' || 'acknowledgeDialogOpen' =>
      ShipmentVariant.acknowledgeDialogOpen,
    _ => ShipmentVariant.activeExcursion,
  };
}

ResolutionVariant parseResolutionVariant(Object? raw) {
  final value = raw?.toString() ?? 'default';
  return switch (value) {
    'approval-required' || 'approvalRequired' =>
      ResolutionVariant.approvalRequired,
    'approval-validation-error' || 'approvalValidationError' =>
      ResolutionVariant.approvalValidationError,
    'validation-error' || 'validationError' =>
      ResolutionVariant.validationError,
    'ready-to-submit' || 'readyToSubmit' => ResolutionVariant.readyToSubmit,
    'confirm-dialog-open' || 'confirmDialogOpen' =>
      ResolutionVariant.confirmDialogOpen,
    'submitted' => ResolutionVariant.submitted,
    _ => ResolutionVariant.defaultForm,
  };
}

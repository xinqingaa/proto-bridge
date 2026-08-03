import 'models.dart';

const evidenceExceptions = <ExceptionItem>[
  ExceptionItem(
    exceptionId: 'EX-017',
    shipmentId: 'SH-2048',
    severity: ExceptionSeverity.critical,
    lane: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    temperature: '10.8°C',
    duration: '上限 8°C · 已持续 47 分钟',
    updatedAt: '14:32',
  ),
  ExceptionItem(
    exceptionId: 'EX-031',
    shipmentId: 'SH-2196',
    severity: ExceptionSeverity.critical,
    lane: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    temperature: '9.7°C',
    duration: '上限 8°C · 已持续 28 分钟',
    updatedAt: '14:26',
  ),
  ExceptionItem(
    exceptionId: 'EX-024',
    shipmentId: 'SH-2113',
    severity: ExceptionSeverity.warning,
    lane: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    temperature: '8.4°C',
    duration: '上限 8°C · 已持续 12 分钟',
    updatedAt: '14:19',
  ),
  ExceptionItem(
    exceptionId: 'EX-029',
    shipmentId: 'SH-2164',
    severity: ExceptionSeverity.watch,
    lane: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    temperature: '7.8°C',
    duration: '上限 8°C · 已持续 6 分钟',
    updatedAt: '14:11',
  ),
];

const evidenceTemperatures = <double>[8.4, 8.6, 8.8, 9.0, 9.4, 9.7, 10.4, 10.8];
const evidenceTemperatureTimes = <String>[
  '13:20',
  '13:30',
  '13:40',
  '13:50',
  '14:00',
  '14:10',
  '14:20',
  '14:30',
];

const evidenceTimeline = <TimelineEvent>[
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
    tone: TimelineTone.primary,
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
];

const readyResolutionDraft = ResolutionDraft(
  cause: 'cooling-unit',
  action: 'backup-cooling',
  outcome: 'falling',
  driverChecked: true,
  coolingChecked: true,
  cargoChecked: true,
  continueMonitoring: true,
  notes: '已切换备用制冷，温度开始回落。',
  supervisor: 'lin-lan',
);

const approvalRequiredDraft = ResolutionDraft(
  cause: 'cooling-unit',
  action: 'backup-cooling',
  outcome: 'falling',
  driverChecked: true,
  coolingChecked: true,
  cargoChecked: true,
  continueMonitoring: true,
  notes: '已切换备用制冷，等待主管复核。',
);

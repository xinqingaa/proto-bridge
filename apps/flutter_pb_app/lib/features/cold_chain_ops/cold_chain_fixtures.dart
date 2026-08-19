import 'cold_chain_models.dart';

const coldChainExceptions = <ColdChainException>[
  ColdChainException(
    id: 'ex-017',
    shipmentId: 'SH-2048',
    lane: '上海虹桥 → 杭州临平',
    cargo: '生物制剂 · 18 箱',
    severity: ExceptionSeverity.critical,
    status: ExceptionStatus.unassigned,
    currentTemperature: 10.8,
    upperLimit: 8,
    durationMinutes: 47,
    updatedAt: '14:32',
  ),
  ColdChainException(
    id: 'ex-031',
    shipmentId: 'SH-2196',
    lane: '苏州园区 → 南京江宁',
    cargo: '细胞样本 · 6 箱',
    severity: ExceptionSeverity.critical,
    status: ExceptionStatus.inProgress,
    currentTemperature: 9.7,
    upperLimit: 8,
    durationMinutes: 28,
    updatedAt: '14:26',
  ),
  ColdChainException(
    id: 'ex-024',
    shipmentId: 'SH-2113',
    lane: '无锡新吴 → 常州武进',
    cargo: '胰岛素 · 32 箱',
    severity: ExceptionSeverity.warning,
    status: ExceptionStatus.unassigned,
    currentTemperature: 8.4,
    upperLimit: 8,
    durationMinutes: 12,
    updatedAt: '14:19',
  ),
  ColdChainException(
    id: 'ex-029',
    shipmentId: 'SH-2164',
    lane: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂 · 24 箱',
    severity: ExceptionSeverity.attention,
    status: ExceptionStatus.inProgress,
    currentTemperature: 7.8,
    upperLimit: 8,
    durationMinutes: 6,
    updatedAt: '14:11',
  ),
];

const temperatureReadings = <TemperatureReading>[
  TemperatureReading(id: '13:20', value: 5.4),
  TemperatureReading(id: '13:30', value: 5.8),
  TemperatureReading(id: '13:40', value: 6.6),
  TemperatureReading(id: '13:50', value: 7.4),
  TemperatureReading(id: '14:00', value: 8.2),
  TemperatureReading(id: '14:10', value: 9.1),
  TemperatureReading(id: '14:20', value: 10.2),
  TemperatureReading(id: '14:30', value: 10.8),
];

const shipmentEvents = <ShipmentEvent>[
  ShipmentEvent(
    id: 'evt-accepted',
    time: '11:48',
    title: '冷库交接完成',
    detail: '探头 T-07 校准正常，箱温 4.6°C',
    tone: EventTone.success,
  ),
  ShipmentEvent(
    id: 'evt-departed',
    time: '12:16',
    title: '车辆离开上海虹桥冷库',
    detail: '司机 周其明 · 沪A·7K21',
    tone: EventTone.primary,
  ),
  ShipmentEvent(
    id: 'evt-threshold',
    time: '13:45',
    title: '温度接近上限',
    detail: '连续 5 分钟高于 7.5°C',
    tone: EventTone.warning,
  ),
  ShipmentEvent(
    id: 'evt-excursion',
    time: '14:02',
    title: '确认持续超温',
    detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
    tone: EventTone.error,
  ),
];

const resolutionCauses = ['制冷机组异常', '车门开启过久', '探头偏移', '待现场确认'];

const resolutionActions = ['切换备用制冷', '就近转入冷库', '更换运输车辆', '持续监控'];

const dutySupervisors = ['华东值班经理 · 林岚', '质量平台主管 · 陈屿'];

const outcomeOptions = ['温度开始回落', '温度仍在上升', '暂时无法确认'];

const severityTabs = <({String value, String label})>[
  (value: 'all', label: '全部'),
  (value: 'critical', label: '严重'),
  (value: 'warning', label: '警告'),
  (value: 'attention', label: '关注'),
];

const tabByVariant = <String, String>{
  'default': 'all',
  'empty': 'all',
  'critical-only': 'critical',
  'warning-only': 'warning',
  'attention-only': 'attention',
};

const variantByTab = <String, String>{
  'all': 'default',
  'critical': 'critical-only',
  'warning': 'warning-only',
  'attention': 'attention-only',
};

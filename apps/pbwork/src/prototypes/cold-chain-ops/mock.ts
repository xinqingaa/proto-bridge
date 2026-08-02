export type ColdChainException = {
  id: string;
  shipmentId: string;
  lane: string;
  cargo: string;
  severity: "严重" | "警告" | "关注";
  status: "待接手" | "处置中";
  currentTemperature: number;
  upperLimit: number;
  durationMinutes: number;
  updatedAt: string;
};

export const exceptions: ColdChainException[] = [
  {
    id: "ex-017",
    shipmentId: "SH-2048",
    lane: "上海虹桥 → 杭州临平",
    cargo: "生物制剂 · 18 箱",
    severity: "严重",
    status: "待接手",
    currentTemperature: 10.8,
    upperLimit: 8,
    durationMinutes: 47,
    updatedAt: "14:32",
  },
  {
    id: "ex-031",
    shipmentId: "SH-2196",
    lane: "苏州园区 → 南京江宁",
    cargo: "细胞样本 · 6 箱",
    severity: "严重",
    status: "处置中",
    currentTemperature: 9.7,
    upperLimit: 8,
    durationMinutes: 28,
    updatedAt: "14:26",
  },
  {
    id: "ex-024",
    shipmentId: "SH-2113",
    lane: "无锡新吴 → 常州武进",
    cargo: "胰岛素 · 32 箱",
    severity: "警告",
    status: "待接手",
    currentTemperature: 8.4,
    upperLimit: 8,
    durationMinutes: 12,
    updatedAt: "14:19",
  },
  {
    id: "ex-029",
    shipmentId: "SH-2164",
    lane: "嘉兴南湖 → 宁波北仑",
    cargo: "检测试剂 · 24 箱",
    severity: "关注",
    status: "处置中",
    currentTemperature: 7.8,
    upperLimit: 8,
    durationMinutes: 6,
    updatedAt: "14:11",
  },
];

export const temperatureReadings = [
  { id: "13:20", value: 5.4 },
  { id: "13:30", value: 5.8 },
  { id: "13:40", value: 6.6 },
  { id: "13:50", value: 7.4 },
  { id: "14:00", value: 8.2 },
  { id: "14:10", value: 9.1 },
  { id: "14:20", value: 10.2 },
  { id: "14:30", value: 10.8 },
];

export const shipmentEvents = [
  {
    id: "evt-accepted",
    time: "11:48",
    title: "冷库交接完成",
    detail: "探头 T-07 校准正常，箱温 4.6°C",
    tone: "success" as const,
  },
  {
    id: "evt-departed",
    time: "12:16",
    title: "车辆离开上海虹桥冷库",
    detail: "司机 周其明 · 沪A·7K21",
    tone: "primary" as const,
  },
  {
    id: "evt-threshold",
    time: "13:45",
    title: "温度接近上限",
    detail: "连续 5 分钟高于 7.5°C",
    tone: "warning" as const,
  },
  {
    id: "evt-excursion",
    time: "14:02",
    title: "确认持续超温",
    detail: "超过 8°C 已持续 30 分钟，自动升级为严重",
    tone: "error" as const,
  },
];

export const resolutionCauses = [
  "制冷机组异常",
  "车门开启过久",
  "探头偏移",
  "待现场确认",
];
export const resolutionActions = [
  "切换备用制冷",
  "就近转入冷库",
  "更换运输车辆",
  "持续监控",
];
export const dutySupervisors = [
  "华东值班经理 · 林岚",
  "质量平台主管 · 陈屿",
];

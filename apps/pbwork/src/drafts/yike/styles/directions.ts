import type { StyleDirectionId } from "./sample";

export type StyleDirection = {
  id: StyleDirectionId;
  label: string;
  /** Name shown in the Settings face picker. */
  faceName: string;
  thesis: string;
  signature: string;
  palette: Array<{ name: string; hex: string }>;
  type: string;
  gaps: string[];
};

const SHARED_GAPS = [
  "表盘是整套主题：切换表盘会同时切换配色、签名图形和打卡标记（字体统一为默认字体，不随表盘变化），需要原型主题包支持多套品牌主题（平台升级第 2 步）。",
  "打孔卡、计圈列表、热力图、回顾柱状图和底部面板是原型自有组件；正式制作时按 Promotion Mapping 判断哪些进入 DS 扩展。",
];

export const STYLE_DIRECTIONS: StyleDirection[] = [
  {
    id: "mechanical",
    label: "① 机械番茄钟",
    faceName: "机械",
    thesis:
      "一只拧发条的厨房计时器：表盘就是机器本身，剩余时间是一块会变小的柿子色扇面，刻度是真实的 60 分钟。",
    signature: "扇面表盘；打卡是在本周那一格打一个孔。",
    palette: [
      { name: "哑光瓷白", hex: "#E8EAE8" },
      { name: "表盘", hex: "#F5F6F4" },
      { name: "墨", hex: "#1D2220" },
      { name: "柿子", hex: "#C65A3A" },
    ],
    type: "默认系统字体（不随表盘变化）",
    gaps: [...SHARED_GAPS],
  },
  {
    id: "water",
    label: "② 水位",
    faceName: "水位",
    thesis:
      "专注像一杯慢慢喝掉的水：剩余时间是一面缓慢下降的水平面，数字一半浸在水里；暂停时水面静止。",
    signature: "半浸在水里的计时数字；打卡是往本周那一格滴一滴水。",
    palette: [
      { name: "石灰", hex: "#E3E6E0" },
      { name: "杯壁", hex: "#F1F2EE" },
      { name: "墨绿灰", hex: "#1E2925" },
      { name: "苔", hex: "#5C7A5D" },
    ],
    type: "默认系统字体（不随表盘变化）",
    gaps: [
      "水面波纹需要声明动效资产，并提供减少动效时的静止版本。",
      ...SHARED_GAPS,
    ],
  },
  {
    id: "sundial",
    label: "③ 日影",
    faceName: "日影",
    thesis:
      "时间像午后的光在纸上移动：剩余时间是一道慢慢扫过纸面的影子；打卡是在日历上盖一个印。",
    signature: "纸面日晷上的软影；打卡按钮是一枚刻着习惯首字的靛蓝印章。",
    palette: [
      { name: "暖灰纸", hex: "#E2E0DB" },
      { name: "纸面", hex: "#ECEAE5" },
      { name: "墨", hex: "#1C1B19" },
      { name: "靛蓝", hex: "#2F4A80" },
    ],
    type: "默认系统字体（不随表盘变化）",
    gaps: [
      "日晷软影依赖锥形渐变与模糊，Flutter 端需要等价实现。",
      ...SHARED_GAPS,
    ],
  },
];

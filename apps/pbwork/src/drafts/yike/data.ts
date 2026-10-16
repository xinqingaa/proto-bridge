export type DirectionNote = {
  id: "free";
  label: string;
  thesis: string;
  gaps: string[];
};

export const DIRECTION_NOTES: DirectionNote[] = [
  {
    id: "free",
    label: "A · 自由发挥：番茄表盘",
    thesis:
      "剩余时间是一块会变小的番茄色扇面，刻度是真实的 60 分钟；暂停时扇面变成斜纹。",
    gaps: [
      "颜色、字号、圆角、阴影全部是本地值，没有 PBWork Token，也没有 Evidence 标记。",
      "60 分钟扇面表盘、打孔周历、带撤销的提示条、文字分段、步进器、色板选择在 DS 中都不存在。",
      "表盘切换与“跟随系统”需要原型主题包（平台升级第 2 步）才能正式落地。",
      "Core 采集时钟写死为 2026-07-28，草稿里的“10月16日”在正式采集时会对不上。",
    ],
  },
];

export type DirectionNote = {
  id: "free" | "ds";
  label: string;
  thesis: string;
  gaps: string[];
};

export const DIRECTION_NOTES: DirectionNote[] = [
  {
    id: "free",
    label: "A · 自由发挥：番茄表盘",
    thesis:
      "剩余时间是一块会变小的番茄色扇面，刻度是真实的 60 分钟；数字用 DIN，暂停时扇面变成斜纹。",
    gaps: [
      "颜色、字号、圆角、阴影全部是本地值，没有 PBWork Token，也没有 Evidence 标记。",
      "DIN Alternate / Avenir Next / SF Mono 是 macOS 系统字体，正式使用要换成可分发字体并附许可证。",
      "60 分钟扇面表盘、打孔周历、带撤销的提示条、文字分段、步进器、色板选择在 DS 中都不存在。",
      "主题色四选一与“跟随系统”需要原型主题包（平台升级 W2）才能正式落地。",
    ],
  },
  {
    id: "ds",
    label: "B · 只用 PBWork DS 与主题",
    thesis:
      "页面骨架全部由现有 DS 组件拼成，样式只引用 --pb-* Token 与 Flex；用来看现有能力能把一刻做到什么程度。",
    gaps: [
      "主色只能是 PBWork 蓝，字体只能是 Inter；没有主题色轴，一刻没有自己的品牌感。",
      "最大数字字阶是 typography.display（40px），没有等宽数字字族，计时数字撑不起“数字是主角”。",
      "没有 RingProgress / SegmentedControl / Heatmap / MonthCalendar / MiniBars：进度环、柱图、月历在原型内用 Token 手绘；模式切换借用带滑动面板的二级 Tab。",
      "Toast 没有撤销动作，只能提示“再点一次可取消”；ConfirmDialog 没有危险色，“放弃”显示为主按钮。",
      "DS 图标集没有书、水杯、月亮，习惯图标直接用了 Lucide；正式使用要扩充 Icon 清单。",
      "Core 采集时钟写死为 2026-07-28，草稿里的“10月16日”在正式采集时会对不上。",
    ],
  },
];

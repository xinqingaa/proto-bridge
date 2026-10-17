export const platformScenarios = {
  "segmented-control": [
    {
      id: "default",
      label: "默认示例",
      description: "互斥的局部模式选择，不创建视图区或导航历史。",
      props: {
        label: "统计范围",
        items: [
          {
            id: "week",
            label: "周",
          },
          {
            id: "month",
            label: "月",
          },
          {
            id: "year",
            label: "年",
          },
        ],
        modelValue: "week",
        disabled: false,
      },
    },
    {
      id: "month",
      label: "按月",
      description:
        "只有未禁用的选项可以被选中；方向键、Home 与 End 支持跳过禁用项",
      props: {
        label: "统计范围",
        items: [
          {
            id: "week",
            label: "周",
          },
          {
            id: "month",
            label: "月",
          },
          {
            id: "year",
            label: "年",
          },
        ],
        modelValue: "month",
        disabled: false,
      },
    },
  ],
  stepper: [
    {
      id: "default",
      label: "默认示例",
      description: "有限范围内增减数值，按钮与数值输入使用同一边界。",
      props: {
        label: "每日目标",
        modelValue: 3,
        min: 0,
        max: 10,
        step: 1,
        disabled: false,
      },
    },
    {
      id: "minimum",
      label: "最小值",
      description:
        "输入和增减统一钳制 min/max，并按 step 对齐；非有限输入恢复原值",
      props: {
        label: "每日目标",
        modelValue: 0,
        min: 0,
        max: 10,
        step: 1,
        disabled: false,
      },
    },
  ],
  "duration-picker": [
    {
      id: "default",
      label: "默认示例",
      description: "小时与分钟双滚轮，值为总分钟数。",
      props: {
        label: "提醒间隔",
        modelValue: 90,
        minuteStep: 5,
        disabled: false,
      },
    },
    {
      id: "short",
      label: "短时长",
      description: "范围为 0 至 23 小时 59 分钟，分钟按 minuteStep 向下对齐",
      props: {
        label: "提醒间隔",
        modelValue: 15,
        minuteStep: 5,
        disabled: false,
      },
    },
  ],
  "ring-progress": [
    {
      id: "default",
      label: "默认示例",
      description: "确定进度环，展示完成比例与可访问数值。",
      props: {
        label: "今日目标",
        value: 68,
        max: 100,
      },
    },
    {
      id: "empty",
      label: "未开始",
      description: "比例钳制在 0 与 max 之间；max 无效时按空进度处理",
      props: {
        label: "今日目标",
        value: 0,
        max: 100,
      },
    },
  ],
  metric: [
    {
      id: "default",
      label: "默认示例",
      description: "数字、单位、说明与变化量的只读指标。",
      props: {
        label: "本周完成",
        value: 24,
        unit: "次",
        change: 12,
      },
    },
    {
      id: "decrease",
      label: "下降",
      description:
        "变化以正负文字和颜色共同表达，零为持平；省略 change 时不渲染变化",
      props: {
        label: "本周完成",
        value: 24,
        unit: "次",
        change: -8,
      },
    },
  ],
  tag: [
    {
      id: "default",
      label: "默认示例",
      description: "紧凑只读分类或状态标签，不承担选择交互。",
      props: {
        label: "进行中",
        tone: "neutral",
      },
    },
    {
      id: "success",
      label: "完成",
      description: "tone 是有限语义，不能传颜色或 Token 重绑",
      props: {
        label: "已完成",
        tone: "success",
      },
    },
  ],
  "mini-bars": [
    {
      id: "default",
      label: "默认示例",
      description: "紧凑柱形对比，零值、空集合与数值标签均可辨识。",
      props: {
        label: "近七日完成次数",
        items: [
          {
            id: "mon",
            label: "一",
            value: 3,
          },
          {
            id: "tue",
            label: "二",
            value: 5,
          },
          {
            id: "wed",
            label: "三",
            value: 0,
          },
          {
            id: "thu",
            label: "四",
            value: 4,
          },
        ],
      },
    },
    {
      id: "empty",
      label: "无数据",
      description: "按非负有限值归一，负值和非法值按零；不把零画成正值",
      props: {
        label: "近七日完成次数",
        items: [],
      },
    },
  ],
  heatmap: [
    {
      id: "default",
      label: "默认示例",
      description: "按周分列的日强度图，以日期保持稳定身份。",
      props: {
        label: "每日完成记录",
        days: [
          {
            date: "2026-07-01",
            value: 1,
          },
          {
            date: "2026-07-02",
            value: 2,
          },
          {
            date: "2026-07-03",
            value: 3,
          },
          {
            date: "2026-07-04",
            value: 4,
          },
          {
            date: "2026-07-05",
            value: 0,
          },
          {
            date: "2026-07-06",
            value: 1,
          },
          {
            date: "2026-07-07",
            value: 2,
          },
          {
            date: "2026-07-08",
            value: 3,
          },
          {
            date: "2026-07-09",
            value: 4,
          },
          {
            date: "2026-07-10",
            value: 0,
          },
          {
            date: "2026-07-11",
            value: 1,
          },
          {
            date: "2026-07-12",
            value: 2,
          },
          {
            date: "2026-07-13",
            value: 3,
          },
          {
            date: "2026-07-14",
            value: 4,
          },
          {
            date: "2026-07-15",
            value: 0,
          },
          {
            date: "2026-07-16",
            value: 1,
          },
          {
            date: "2026-07-17",
            value: 2,
          },
          {
            date: "2026-07-18",
            value: 3,
          },
          {
            date: "2026-07-19",
            value: 4,
          },
          {
            date: "2026-07-20",
            value: 0,
          },
          {
            date: "2026-07-21",
            value: 1,
          },
          {
            date: "2026-07-22",
            value: 2,
          },
          {
            date: "2026-07-23",
            value: 3,
          },
          {
            date: "2026-07-24",
            value: 4,
          },
          {
            date: "2026-07-25",
            value: 0,
          },
          {
            date: "2026-07-26",
            value: 1,
          },
          {
            date: "2026-07-27",
            value: 2,
          },
          {
            date: "2026-07-28",
            value: 3,
          },
        ],
        modelValue: "2026-07-12",
      },
    },
    {
      id: "empty",
      label: "无数据",
      description:
        "以 UTC 日期补齐中间日期并按周一到周日排列，单次最多展示 366 天",
      props: {
        label: "每日完成记录",
        days: [],
        modelValue: "2026-07-12",
      },
    },
  ],
  "month-calendar": [
    {
      id: "default",
      label: "默认示例",
      description: "按月选择日期，使用固定星期顺序与受控月份。",
      props: {
        label: "选择日期",
        month: "2026-07",
        modelValue: "2026-07-28",
        disabledDates: ["2026-07-15"],
      },
    },
    {
      id: "next-month",
      label: "八月",
      description:
        "月份和日期来自 props，不使用系统当前时间；非法月份不渲染错误日历",
      props: {
        label: "选择日期",
        month: "2026-08",
        modelValue: "2026-08-01",
        disabledDates: ["2026-07-15"],
      },
    },
  ],
  "list-cell": [
    {
      id: "default",
      label: "默认示例",
      description: "列表单元：前置图标、主副标题、尾部值与导航或开关。",
      props: {
        title: "提醒通知",
        description: "在目标时间提醒",
        value: "每天",
        icon: "bell",
        navigation: true,
        disabled: false,
      },
    },
    {
      id: "switch",
      label: "开关单元",
      description:
        "导航按钮与 Switch 是独立原生交互区域，不嵌套按钮；开关出现时不再显示导航按钮",
      props: {
        title: "提醒通知",
        description: "在目标时间提醒",
        value: "",
        icon: "bell",
        navigation: false,
        disabled: false,
        modelValue: true,
      },
    },
  ],
  "grouped-list": [
    {
      id: "default",
      label: "默认示例",
      description: "带组标题的列表组合，复用 DataList 与 ListCell。",
      props: {
        groups: [
          {
            id: "notifications",
            title: "通知",
            items: [
              {
                id: "daily",
                title: "每日提醒",
                description: "默认提醒时间",
                value: "08:00",
                navigation: true,
              },
            ],
          },
          {
            id: "privacy",
            title: "隐私",
            items: [
              {
                id: "sync",
                title: "云端同步",
                modelValue: true,
              },
            ],
          },
        ],
      },
    },
    {
      id: "empty",
      label: "无分组",
      description: "不创建滚动所有者，长列表由外层 ScrollableDataList 承担",
      props: {
        groups: [],
      },
    },
  ],
  "action-sheet": [
    {
      id: "default",
      label: "默认示例",
      description: "BottomSheet 内的动作列表组合，危险操作显式区分。",
      props: {
        title: "记录操作",
        modelValue: false,
        items: [
          {
            id: "edit",
            label: "编辑记录",
          },
          {
            id: "share",
            label: "分享记录",
          },
          {
            id: "delete",
            label: "删除记录",
            destructive: true,
          },
        ],
        cancelLabel: "取消",
      },
    },
    {
      id: "open",
      label: "打开",
      description:
        "Overlay、焦点、scrim 和关闭复用 BottomSheet；本组件 section 只拥有动作内容，shell 单独登记",
      props: {
        title: "记录操作",
        modelValue: true,
        items: [
          {
            id: "edit",
            label: "编辑记录",
          },
          {
            id: "share",
            label: "分享记录",
          },
          {
            id: "delete",
            label: "删除记录",
            destructive: true,
          },
        ],
        cancelLabel: "取消",
      },
    },
  ],
  "brand-mark": [
    {
      id: "default",
      label: "默认示例",
      description: "主题品牌图形与可替换品牌插槽，无资源时退回名称。",
      props: {
        name: "品牌",
      },
    },
    {
      id: "named",
      label: "名称",
      description: "资产按解析后的拥有包查找 URL，不按模式分支隐藏语义节点",
      props: {
        name: "专注每一刻",
      },
    },
  ],
  "launch-screen": [
    {
      id: "default",
      label: "默认示例",
      description: "启动与欢迎页的内容模式，进入行为由业务决定。",
      props: {
        title: "开始新的一天",
        description: "留一点时间给重要的事",
        actionLabel: "开始",
        busy: false,
      },
    },
    {
      id: "busy",
      label: "准备中",
      description:
        "品牌、插画、内容和 actions 提供插槽，默认动作发出 start；不写路由或定时跳转",
      props: {
        title: "开始新的一天",
        description: "留一点时间给重要的事",
        actionLabel: "开始",
        busy: true,
      },
    },
  ],
};

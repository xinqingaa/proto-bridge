export type ComponentScenario = {
  id: string;
  label: string;
  description: string;
  props?: Record<string, unknown>;
};

const scenarios: Record<string, ComponentScenario[]> = {
  button: [
    {
      id: "submit",
      label: "提交表单",
      description: "表单底部的主操作，用于提交工单。",
      props: {
        label: "提交工单",
        block: true,
        bgColor: "color.action",
        borderColor: "color.action",
        textColor: "color.on-action",
      },
    },
    {
      id: "secondary",
      label: "次要操作",
      description: "与主按钮并列时的次要操作，如保存草稿。",
      props: {
        label: "保存草稿",
        bgColor: "color.secondary-soft",
        borderColor: "color.secondary-soft",
        textColor: "color.secondary",
      },
    },
    {
      id: "primary-accent",
      label: "强调主色",
      description: "需要用蓝强调色时的按钮，区别于默认主操作。",
      props: {
        label: "查看详情",
        bgColor: "color.primary",
        borderColor: "color.primary",
        textColor: "color.on-primary",
      },
    },
    {
      id: "outlined",
      label: "描边操作",
      description: "透明底 + Token 边框的次级操作。",
      props: {
        label: "仅确认接手",
        bgColor: "transparent",
        borderColor: "color.action",
        textColor: "color.action",
      },
    },
  ],
  icon: [
    {
      id: "nav",
      label: "导航图标",
      description: "底栏或列表中的导航语义图标。",
      props: { name: "home", tone: "primary" },
    },
    {
      id: "status",
      label: "状态提示",
      description: "告警或空态中的提示图标。",
      props: { name: "alert-triangle", tone: "warning", label: "告警" },
    },
  ],
  "icon-button": [
    {
      id: "toolbar",
      label: "工具栏操作",
      description: "顶栏或工具区中的更多操作入口。",
      props: { ariaLabel: "更多操作", icon: "more" },
    },
    {
      id: "create",
      label: "快捷新建",
      description: "突出显示的主色新建入口。",
      props: { ariaLabel: "新建工单", icon: "plus", tone: "primary" },
    },
  ],
  "text-field": [
    {
      id: "contact",
      label: "联系人信息",
      description: "表单中填写联系人姓名。",
      props: { label: "联系人", modelValue: "李明" },
    },
    {
      id: "empty",
      label: "待填写字段",
      description: "尚未输入的联系电话字段。",
      props: { label: "联系电话", modelValue: "" },
    },
  ],
  select: [
    {
      id: "service",
      label: "服务类型",
      description: "创建工单时选择维修、巡检或安装。",
      props: {
        label: "服务类型",
        modelValue: "维修",
        options: ["维修", "巡检", "安装"],
      },
    },
    {
      id: "assignee",
      label: "指派人员",
      description: "指派负责人，支持清除当前选择。",
      props: {
        label: "负责人",
        modelValue: "王工",
        options: ["王工", "陈工", "赵工"],
        clearable: true,
      },
    },
  ],
  textarea: [
    {
      id: "description",
      label: "问题描述",
      description: "记录现场问题与处理要求。",
      props: {
        label: "问题描述",
        modelValue: "设备运行时出现异常噪声。",
      },
    },
    {
      id: "note",
      label: "补充备注",
      description: "可选的现场备注补充信息。",
      props: { label: "补充备注", modelValue: "" },
    },
  ],
  checkbox: [
    {
      id: "agreement",
      label: "提交确认",
      description: "提交前确认信息已核对完整。",
      props: {
        label: "我已核对以上信息",
        modelValue: true,
        selectedColor: "color.primary",
      },
    },
    {
      id: "preference",
      label: "偏好设置",
      description: "可独立勾选的业务偏好，如完成后通知。",
      props: {
        label: "完成后通知我",
        modelValue: false,
        selectedColor: "color.success",
        uncheckedBorderColor: "color.outline",
      },
    },
    {
      id: "multi",
      label: "多选一组",
      description: "多个独立 Checkbox 组合表达多选（仍是单布尔组件）。",
      props: {
        label: "短信通知",
        modelValue: true,
        selectedColor: "color.primary",
      },
    },
  ],
  "radio-group": [
    {
      id: "priority",
      label: "工单优先级",
      description: "在普通与紧急之间选择优先级。",
      props: {
        label: "优先级",
        modelValue: "普通",
        options: ["普通", "紧急"],
        color: "color.primary",
      },
    },
    {
      id: "visit",
      label: "上门时段",
      description: "选择期望的上门服务时段。",
      props: {
        label: "上门时段",
        modelValue: "上午",
        options: ["上午", "下午"],
        color: "color.action",
      },
    },
  ],
  switch: [
    {
      id: "notifications",
      label: "消息通知",
      description: "开启或关闭工单进度通知。",
      props: {
        label: "接收工单进度通知",
        modelValue: true,
        color: "color.primary",
      },
    },
    {
      id: "offline",
      label: "离线能力",
      description: "控制是否缓存离线工单。",
      props: {
        label: "缓存离线工单",
        modelValue: false,
        color: "color.success",
      },
    },
  ],
  avatar: [
    {
      id: "assignee",
      label: "负责人头像",
      description: "列表与详情中标识负责人。",
      props: { name: "李明", size: "md" },
    },
    {
      id: "profile",
      label: "个人资料",
      description: "个人中心使用的大尺寸头像。",
      props: { name: "王晓雨", size: "lg", tone: "secondary" },
    },
  ],
  badge: [
    {
      id: "unread",
      label: "未读数量",
      description: "消息入口上的未读数量提醒。",
      props: { label: "12", tone: "error" },
    },
    {
      id: "status",
      label: "状态标识",
      description: "紧凑展示业务完成状态。",
      props: { label: "已完成", tone: "success" },
    },
  ],
  chip: [
    {
      id: "status",
      label: "工单状态",
      description: "列表行中标记工单当前状态。",
      props: { label: "进行中", tone: "primary" },
    },
    {
      id: "warning",
      label: "风险提示",
      description: "突出需要留意的风险状态，如即将超时。",
      props: { label: "即将超时", tone: "warning" },
    },
  ],
  divider: [
    {
      id: "section",
      label: "内容分组",
      description: "分隔相邻设置项，理清页面结构。",
      props: { label: "" },
    },
    {
      id: "labeled",
      label: "带标题分隔",
      description: "用中间文案区分不同内容来源。",
      props: { label: "或", inset: true },
    },
  ],
  progress: [
    {
      id: "upload",
      label: "附件上传",
      description: "展示可确定百分比的附件上传进度。",
      props: { label: "正在上传附件 68%", value: 68 },
    },
    {
      id: "sync",
      label: "后台同步",
      description: "无法确定完成比例时的持续同步状态。",
      props: { label: "正在同步工单", indeterminate: true },
    },
  ],
  spinner: [
    {
      id: "inline",
      label: "行内加载",
      description: "局部内容等待返回时的行内反馈。",
      props: { label: "加载中", size: "sm" },
    },
    {
      id: "page",
      label: "页面加载",
      description: "等待工单等主要内容返回。",
      props: { label: "正在获取工单", size: "lg" },
    },
  ],
  card: [
    {
      id: "flat",
      label: "平面 surface",
      description: "默认 surface 容器；业务内容由调用方通过 slot 组织。",
      props: {
        elevated: false,
        semanticRole: "section",
      },
    },
    {
      id: "elevated",
      label: "抬升 surface",
      description: "需要与底层内容区分层级时使用的同一基础容器。",
      props: {
        elevated: true,
        semanticRole: "section",
      },
    },
  ],
  "app-bar": [
    {
      id: "detail",
      label: "详情顶栏",
      description: "工单详情页：返回上级并提供右侧更多操作。",
      props: {
        title: "工单详情",
        showBack: true,
        showAction: true,
        actionIcon: "more",
      },
    },
    {
      id: "home",
      label: "首页顶栏",
      description: "一级工作台页顶栏，无返回，可挂搜索。",
      props: {
        title: "工作台",
        showBack: false,
        showAction: true,
        actionIcon: "search",
      },
    },
  ],
  "primary-tabs": [
    {
      id: "detail",
      label: "详情分区",
      description: "工单详情中在概览、活动、数据与设置之间切换。",
      props: {
        modelValue: "overview",
        showIndicator: false,
        swipe: true,
        mouseSwipe: true,
        fill: false,
      },
    },
    {
      id: "filter",
      label: "等宽主分区",
      description: "页面主分区在紧凑宽度内均分可用空间。",
      props: {
        grow: true,
        swipe: true,
        mouseSwipe: true,
        fill: true,
      },
    },
  ],
  "secondary-tabs": [
    {
      id: "section",
      label: "分区导航",
      description: "详情页内以文本下方的小三角切换四个子分区。",
      props: {
        modelValue: "overview",
        swipe: true,
        mouseSwipe: true,
        fill: false,
      },
    },
    {
      id: "equal",
      label: "等宽二级分区",
      description: "多个子分区等宽排列，仍以小三角标出当前项。",
      props: {
        grow: true,
        swipe: true,
        mouseSwipe: true,
        fill: true,
      },
    },
  ],
  "data-list": [
    {
      id: "plain",
      label: "分隔列表",
      description: "只提供列表容器与分隔关系，行内容由业务传入。",
      props: { divided: true, surface: "default" },
    },
    {
      id: "raised",
      label: "抬升列表",
      description: "在独立信息区使用轻微抬升的列表容器。",
      props: { divided: true, surface: "raised", elevated: true },
    },
  ],
  "scrollable-data-list": [
    {
      id: "refresh-feed",
      label: "刷新与分页",
      description:
        "滚动壳提供下拉刷新与触底加载；列表外观由内部组合的 DataList 负责。",
      props: {
        pullRefresh: true,
        loadMore: true,
        dragScroll: true,
        hasMore: true,
      },
    },
    {
      id: "finite-feed",
      label: "已加载完成",
      description:
        "数据加载完成后展示稳定的结束状态；外观仍由内层 DataList 决定。",
      props: {
        pullRefresh: true,
        loadMore: true,
        dragScroll: true,
        hasMore: false,
      },
    },
  ],
  "tab-viewport": [
    {
      id: "primary-tabs",
      label: "一级内容视图",
      description: "与外部导航组合，保活内容并支持横向切换。",
      props: { swipe: true, mouseSwipe: true, keepMounted: true },
    },
    {
      id: "controlled",
      label: "仅受控切换",
      description: "关闭手势，仅响应外部导航的选中值。",
      props: { swipe: false, mouseSwipe: false, keepMounted: true },
    },
  ],
  "bottom-sheet": [
    {
      id: "filter",
      label: "筛选面板",
      description: "从底部展开，用于筛选工单条件。",
      props: { title: "筛选工单", modelValue: true },
    },
    {
      id: "actions",
      label: "操作面板",
      description: "承载一组与当前上下文相关的操作。",
      props: { title: "更多操作", modelValue: true },
    },
  ],
  "flow-sheet": [
    {
      id: "deliver",
      label: "交付分步",
      description: "确认范围、执行、结果、提示词四步示意。",
      props: { title: "交付到 Agent", modelValue: true, step: 0, stepCount: 4 },
    },
    {
      id: "mid-step",
      label: "执行中",
      description: "滑到中间步骤，展示进度页。",
      props: { title: "交付到 Agent", modelValue: true, step: 1, stepCount: 4 },
    },
  ],
  "search-bar": [
    {
      id: "orders",
      label: "搜索工单",
      description: "在列表顶部按编号或客户搜索工单。",
      props: { placeholder: "搜索工单编号或客户" },
    },
    {
      id: "filled",
      label: "已有关键词",
      description: "已输入关键词时，展示搜索与清除交互。",
      props: { modelValue: "空调", placeholder: "搜索设备" },
    },
  ],
  "filter-bar": [
    {
      id: "orders",
      label: "工单筛选",
      description: "快捷状态筛选，页面会随选择更新当前数据。",
      props: { modelValue: "进行中" },
    },
    {
      id: "compact",
      label: "全部数据",
      description: "展示不受状态限制的完整数据集合。",
      props: { modelValue: "全部" },
    },
  ],
  tabbar: [
    {
      id: "primary",
      label: "应用主导航",
      description: "外部传入三项入口，图标与文字同时呈现。",
      props: { modelValue: "home" },
    },
    {
      id: "tasks",
      label: "切到任务",
      description: "选择任务目的地，保持图标和文字同时呈现。",
      props: { modelValue: "tasks" },
    },
  ],
  dialog: [
    {
      id: "confirm",
      label: "确认操作",
      description: "对完成工单等不可逆操作做二次确认。",
      props: {
        title: "确认完成工单？",
        message: "完成后将无法继续编辑处理记录。",
        confirmLabel: "确认完成",
        modelValue: true,
      },
    },
    {
      id: "notice",
      label: "重要说明",
      description: "需要用户明确知晓的离线同步说明。",
      props: {
        title: "离线数据已更新",
        message: "3 条工单将在恢复网络后同步。",
        confirmLabel: "知道了",
        modelValue: true,
      },
    },
  ],
  snackbar: [
    {
      id: "success",
      label: "操作成功",
      description: "轻量反馈刚刚完成的保存等操作。",
      props: { message: "工单已保存", tone: "success", modelValue: true },
    },
    {
      id: "error",
      label: "操作失败",
      description: "提示失败并保留当前页面上下文。",
      props: {
        message: "保存失败，请稍后重试",
        tone: "error",
        modelValue: true,
      },
    },
  ],
  "empty-state": [
    {
      id: "no-orders",
      label: "暂无工单",
      description: "列表为空时引导用户新建工单。",
      props: {
        title: "暂无工单",
        description: "新建工单后会显示在这里。",
        actionLabel: "新建工单",
      },
    },
    {
      id: "no-results",
      label: "无搜索结果",
      description: "搜索或筛选无匹配时，引导调整条件。",
      props: {
        title: "没有找到结果",
        description: "请尝试修改关键词或筛选条件。",
        actionLabel: "清除筛选",
      },
    },
  ],
};

export function componentScenarios(componentId: string): ComponentScenario[] {
  return (
    scenarios[componentId] ?? [
      { id: "default", label: "默认场景", description: "组件的标准业务用法。" },
    ]
  );
}

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
      description: "移动端表单底部的主要提交操作。",
      props: { label: "提交工单", block: true },
    },
    {
      id: "secondary",
      label: "次要操作",
      description: "与主要操作并列时使用柔和样式。",
      props: { label: "保存草稿", variant: "tonal" },
    },
  ],
  "icon-button": [
    {
      id: "toolbar",
      label: "工具栏操作",
      description: "有背景和点击反馈的紧凑工具按钮。",
      props: { ariaLabel: "更多操作", icon: "more" },
    },
    {
      id: "create",
      label: "快捷新建",
      description: "突出显示的主色图标操作。",
      props: { ariaLabel: "新建工单", icon: "plus", tone: "primary" },
    },
  ],
  "text-field": [
    {
      id: "contact",
      label: "联系人信息",
      description: "表单中的标准单行输入。",
      props: { label: "联系人", modelValue: "李明" },
    },
    {
      id: "empty",
      label: "待填写字段",
      description: "尚未输入内容的字段。",
      props: { label: "联系电话", modelValue: "" },
    },
  ],
  select: [
    {
      id: "service",
      label: "服务类型",
      description: "从有限业务选项中选择服务类型。",
      props: {
        label: "服务类型",
        modelValue: "维修",
        options: ["维修", "巡检", "安装"],
      },
    },
    {
      id: "assignee",
      label: "指派人员",
      description: "可清除的人员选择。",
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
        rows: 4,
      },
    },
    {
      id: "note",
      label: "补充备注",
      description: "可选的多行补充信息。",
      props: { label: "补充备注", modelValue: "", rows: 3 },
    },
  ],
  checkbox: [
    {
      id: "agreement",
      label: "提交确认",
      description: "提交前确认信息真实完整。",
      props: { label: "我已核对以上信息", modelValue: true },
    },
    {
      id: "preference",
      label: "偏好设置",
      description: "可独立开启的业务偏好。",
      props: { label: "完成后通知我", modelValue: false },
    },
  ],
  "radio-group": [
    {
      id: "priority",
      label: "工单优先级",
      description: "在互斥选项中选择一个优先级。",
      props: { label: "优先级", modelValue: "普通", options: ["普通", "紧急"] },
    },
    {
      id: "visit",
      label: "上门时段",
      description: "选择期望的服务时段。",
      props: {
        label: "上门时段",
        modelValue: "上午",
        options: ["上午", "下午"],
      },
    },
  ],
  switch: [
    {
      id: "notifications",
      label: "消息通知",
      description: "即时开启或关闭通知。",
      props: { label: "接收工单进度通知", modelValue: true },
    },
    {
      id: "offline",
      label: "离线能力",
      description: "控制离线数据缓存。",
      props: { label: "缓存离线工单", modelValue: false },
    },
  ],
  avatar: [
    {
      id: "assignee",
      label: "负责人头像",
      description: "列表和详情中的人员标识。",
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
      description: "消息入口的数量提醒。",
      props: { label: "12", tone: "error" },
    },
    {
      id: "status",
      label: "状态标识",
      description: "紧凑展示业务状态。",
      props: { label: "已完成", tone: "success" },
    },
  ],
  chip: [
    {
      id: "status",
      label: "工单状态",
      description: "列表中的柔和状态标签。",
      props: { label: "进行中", tone: "primary" },
    },
    {
      id: "warning",
      label: "风险提示",
      description: "突出需要留意的状态。",
      props: { label: "即将超时", tone: "warning" },
    },
  ],
  divider: [
    {
      id: "section",
      label: "内容分组",
      description: "分隔相邻设置项。",
      props: { label: "" },
    },
    {
      id: "labeled",
      label: "带标题分隔",
      description: "区分不同来源的内容。",
      props: { label: "或", inset: true },
    },
  ],
  progress: [
    {
      id: "upload",
      label: "附件上传",
      description: "展示可确定的任务进度。",
      props: { label: "正在上传附件 68%", value: 68 },
    },
    {
      id: "sync",
      label: "后台同步",
      description: "无法确定完成比例的持续任务。",
      props: { label: "正在同步工单", indeterminate: true },
    },
  ],
  spinner: [
    {
      id: "inline",
      label: "行内加载",
      description: "局部内容加载时使用。",
      props: { label: "加载中", size: "sm" },
    },
    {
      id: "page",
      label: "页面加载",
      description: "等待主要内容返回。",
      props: { label: "正在获取工单", size: "lg" },
    },
  ],
  card: [
    {
      id: "summary",
      label: "业务摘要",
      description: "承载关键指标与摘要内容。",
      props: { title: "今日工单", subtitle: "华东服务中心", elevated: true },
    },
    {
      id: "section",
      label: "内容分区",
      description: "页面中的普通信息区块。",
      props: {
        title: "客户信息",
        subtitle: "联系人与服务地址",
        elevated: false,
      },
    },
  ],
  "app-bar": [
    {
      id: "detail",
      label: "详情顶栏",
      description: "包含返回和右侧操作的移动端详情顶栏。",
      props: { title: "工单详情", showBack: true, showAction: true },
    },
    {
      id: "home",
      label: "首页顶栏",
      description: "无返回按钮的一级页面顶栏。",
      props: { title: "工作台", showBack: false, showAction: true },
    },
  ],
  tabs: [
    {
      id: "detail",
      label: "详情分区",
      description: "在概览与动态之间滑动切换。",
      props: {
        modelValue: "overview",
        selectionStyle: "pill",
        showIndicator: false,
        mouseSwipe: true,
      },
    },
    {
      id: "filter",
      label: "分段筛选",
      description: "使用柔和底色的等宽筛选页签。",
      props: {
        selectionStyle: "underline",
        showIndicator: true,
        grow: true,
        mouseSwipe: true,
      },
    },
  ],
  "data-list": [
    {
      id: "orders",
      label: "工单列表",
      description: "状态和行尾操作同时出现的任务列表。",
      props: { showActions: true },
    },
    {
      id: "read-only",
      label: "只读列表",
      description: "无需行尾操作的浏览列表。",
      props: { showActions: false },
    },
  ],
  "bottom-sheet": [
    {
      id: "filter",
      label: "筛选面板",
      description: "从页面底部展开的移动端筛选操作。",
      props: { title: "筛选工单", modelValue: true },
    },
    {
      id: "actions",
      label: "操作面板",
      description: "承载一组上下文操作。",
      props: { title: "更多操作", modelValue: true },
    },
  ],
  "search-bar": [
    {
      id: "orders",
      label: "搜索工单",
      description: "在列表顶部按编号或客户搜索。",
      props: { placeholder: "搜索工单编号或客户" },
    },
    {
      id: "filled",
      label: "已有关键词",
      description: "展示搜索和清除交互。",
      props: { modelValue: "空调", placeholder: "搜索设备" },
    },
  ],
  "filter-bar": [
    {
      id: "orders",
      label: "工单筛选",
      description: "快速状态筛选与高级筛选入口。",
      props: { modelValue: "进行中", showFilter: true },
    },
    {
      id: "compact",
      label: "紧凑筛选",
      description: "空间有限时仅保留快捷筛选。",
      props: { showFilter: false },
    },
  ],
  "bottom-navigation": [
    {
      id: "primary",
      label: "应用主导航",
      description: "图标和文字共同呈现的四入口导航。",
      props: {
        display: "icon-label",
        showIndicator: true,
        showView: true,
        mouseSwipe: true,
      },
    },
    {
      id: "compact",
      label: "紧凑导航",
      description: "文字已经明确时仅展示图标。",
      props: {
        display: "icon",
        showIndicator: true,
        showView: true,
        mouseSwipe: true,
      },
    },
  ],
  dialog: [
    {
      id: "confirm",
      label: "确认操作",
      description: "对不可逆操作进行二次确认。",
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
      description: "需要用户明确知晓的信息。",
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
      description: "反馈刚刚完成的轻量操作。",
      props: { message: "工单已保存", tone: "success", modelValue: true },
    },
    {
      id: "error",
      label: "操作失败",
      description: "提示失败并保留当前上下文。",
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
      description: "列表无内容时给出下一步操作。",
      props: {
        title: "暂无工单",
        description: "新建工单后会显示在这里。",
        actionLabel: "新建工单",
      },
    },
    {
      id: "no-results",
      label: "无搜索结果",
      description: "搜索或筛选没有匹配结果。",
      props: {
        title: "没有找到结果",
        description: "请尝试修改关键词或筛选条件。",
        actionLabel: "清除筛选",
      },
    },
  ],
  "form-section": [
    {
      id: "customer",
      label: "客户信息",
      description: "带必填提示和右侧编辑操作的表单分组。",
      props: {
        title: "客户信息",
        description: "联系人和服务地址",
        required: true,
        actionLabel: "编辑",
      },
    },
    {
      id: "optional",
      label: "补充信息",
      description: "无强制要求的可选表单分组。",
      props: {
        title: "补充信息",
        description: "附件与现场备注",
        required: false,
        actionLabel: "",
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

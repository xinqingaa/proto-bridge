export type LedgerPeriod = "year" | "month" | "week" | "day";

export type LedgerRecord = {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  type: "expense" | "income";
  date: string;
  note: string;
  dayLabel: string;
  merchant?: string;
  tags?: string[];
  project?: string;
  reimbursable?: boolean;
  recurring?: boolean;
  source?: "手动记账" | "账单导入";
};

export type LedgerRange = "day" | "week" | "month" | "year" | "custom";

export const periodTabs = [
  { value: "year", label: "年" },
  { value: "month", label: "月" },
  { value: "week", label: "周" },
  { value: "day", label: "日" },
];

export const categoryOptions = [
  "餐饮",
  "交通",
  "购物",
  "住房",
  "娱乐",
  "工资",
  "其他",
];

export const accountOptions = ["微信", "支付宝", "现金", "银行卡"];
export const tagOptions = ["通勤", "工作餐", "家庭", "旅行", "可报销"];
export const projectOptions = ["日常生活", "七月旅行", "新家计划"];

export const summaryByPeriod: Record<
  LedgerPeriod,
  { expense: number; income: number; deltaLabel: string }
> = {
  year: { expense: 28640.2, income: 96000, deltaLabel: "较去年 −4%" },
  month: { expense: 3280.5, income: 4120, deltaLabel: "较上月 −12%" },
  week: { expense: 862.4, income: 0, deltaLabel: "较上周 +3%" },
  day: { expense: 126, income: 0, deltaLabel: "较昨日 −8%" },
};

export const ledgerRecords: LedgerRecord[] = [
  {
    id: "r1",
    title: "午餐",
    category: "餐饮",
    account: "微信",
    amount: 42,
    type: "expense",
    date: "2026-07-22 12:30",
    note: "公司附近面馆",
    dayLabel: "今天",
    merchant: "一碗面",
    tags: ["工作餐"],
    project: "日常生活",
    reimbursable: false,
    source: "手动记账",
  },
  {
    id: "r2",
    title: "地铁",
    category: "交通",
    account: "零钱",
    amount: 8,
    type: "expense",
    date: "2026-07-22 08:40",
    note: "通勤",
    dayLabel: "今天",
    merchant: "上海地铁",
    tags: ["通勤"],
    project: "日常生活",
    reimbursable: false,
    recurring: true,
    source: "账单导入",
  },
  {
    id: "r3",
    title: "日用品",
    category: "购物",
    account: "支付宝",
    amount: 128,
    type: "expense",
    date: "2026-07-21 19:10",
    note: "超市采购",
    dayLabel: "昨天",
    merchant: "盒马鲜生",
    tags: ["家庭"],
    project: "日常生活",
    source: "账单导入",
  },
  {
    id: "r4",
    title: "咖啡",
    category: "餐饮",
    account: "微信",
    amount: 32,
    type: "expense",
    date: "2026-07-21 10:05",
    note: "",
    dayLabel: "昨天",
    merchant: "Manner Coffee",
    tags: ["工作餐"],
    source: "手动记账",
  },
  {
    id: "r5",
    title: "工资",
    category: "工资",
    account: "银行卡",
    amount: 4120,
    type: "income",
    date: "2026-07-15 09:00",
    note: "月薪入账",
    dayLabel: "7月15日",
    merchant: "星云科技",
    tags: [],
    project: "日常生活",
    recurring: true,
    source: "账单导入",
  },
  {
    id: "r6",
    title: "水电费",
    category: "住房",
    account: "支付宝",
    amount: 186.5,
    type: "expense",
    date: "2026-07-14 16:20",
    note: "七月账单",
    dayLabel: "7月14日",
    merchant: "城市生活缴费",
    tags: ["家庭"],
    project: "新家计划",
    recurring: true,
    source: "手动记账",
  },
  {
    id: "r7",
    title: "电影票",
    category: "娱乐",
    account: "微信",
    amount: 76,
    type: "expense",
    date: "2026-07-13 20:30",
    note: "周末观影",
    dayLabel: "7月13日",
    merchant: "百丽宫影城",
    tags: ["家庭"],
    source: "账单导入",
  },
  {
    id: "r8",
    title: "打车",
    category: "交通",
    account: "支付宝",
    amount: 28,
    type: "expense",
    date: "2026-07-12 22:15",
    note: "",
    dayLabel: "7月12日",
    merchant: "滴滴出行",
    tags: ["通勤", "可报销"],
    reimbursable: true,
    source: "账单导入",
  },
  {
    id: "r9",
    title: "早餐",
    category: "餐饮",
    account: "现金",
    amount: 18,
    type: "expense",
    date: "2026-07-12 07:50",
    note: "",
    dayLabel: "7月12日",
    merchant: "社区早餐店",
    tags: ["工作餐"],
    source: "手动记账",
  },
  {
    id: "r10",
    title: "会员续费",
    category: "娱乐",
    account: "微信",
    amount: 15,
    type: "expense",
    date: "2026-07-11 11:00",
    note: "音乐会员",
    dayLabel: "7月11日",
    merchant: "音乐会员",
    tags: [],
    recurring: true,
    source: "账单导入",
  },
];

/** Distinct mock slices so period segment switching is visibly different. */
export function recordsForPeriod(period: LedgerPeriod): LedgerRecord[] {
  if (period === "day") {
    return ledgerRecords.filter((item) => item.dayLabel === "今天");
  }
  if (period === "week") {
    return ledgerRecords.filter((item) =>
      ["今天", "昨天", "7月15日", "7月14日", "7月13日"].includes(item.dayLabel),
    );
  }
  return ledgerRecords;
}

export const categoryBreakdown = [
  { name: "餐饮", percent: 38, amount: 1246 },
  { name: "交通", percent: 22, amount: 722 },
  { name: "购物", percent: 18, amount: 590 },
  { name: "住房", percent: 14, amount: 459 },
  { name: "娱乐", percent: 8, amount: 263 },
];

export const trendPoints = [42, 68, 55, 90, 72, 110, 86];
export const weeklyTrend = [
  { label: "周四", expense: 86, income: 0 },
  { label: "周五", expense: 132, income: 0 },
  { label: "周六", expense: 98, income: 0 },
  { label: "周日", expense: 164, income: 0 },
  { label: "周一", expense: 108, income: 4120 },
  { label: "周二", expense: 124, income: 0 },
  { label: "今天", expense: 126, income: 0 },
];

export const spendingProfile = [
  { name: "餐饮", value: 82 },
  { name: "交通", value: 56 },
  { name: "购物", value: 44 },
  { name: "住房", value: 34 },
  { name: "娱乐", value: 28 },
];

export type BenefitTask = {
  id: string;
  title: string;
  subtitle: string;
  status: "todo" | "done";
  progress: number;
  target: number;
  cycle: string;
  reward: string;
  rewardState: "locked" | "claimable" | "claimed";
  action: string;
};

export const tasks: BenefitTask[] = [
  {
    id: "t1",
    title: "记一笔",
    subtitle: "今日完成 1 笔记账",
    status: "todo",
    progress: 0,
    target: 1,
    cycle: "每日",
    reward: "3 星币",
    rewardState: "locked",
    action: "record-edit",
  },
  {
    id: "t2",
    title: "查看本周图表",
    subtitle: "打开图表分析页",
    status: "done",
    progress: 1,
    target: 1,
    cycle: "每周",
    reward: "5 星币",
    rewardState: "claimable",
    action: "analytics",
  },
  {
    id: "t3",
    title: "连续记账 3 天",
    subtitle: "成长任务",
    status: "todo",
    progress: 1,
    target: 3,
    cycle: "成长",
    reward: "¥3 体验券",
    rewardState: "locked",
    action: "record-edit",
  },
];

export const activities = [
  {
    id: "a1",
    title: "夏日记账挑战",
    subtitle: "连续记账 7 天赢消费券",
    progress: 4,
    target: 7,
    status: "进行中",
    startsAt: "2026-07-18",
    endsAt: "2026-08-31",
    participants: 1248,
    reward: "最高 ¥20 券包",
  },
  {
    id: "a2",
    title: "新人权益周",
    subtitle: "完成资料填写领体验券",
    progress: 1,
    target: 1,
    status: "进行中",
    startsAt: "2026-07-20",
    endsAt: "2026-07-31",
    participants: 682,
    reward: "¥5 新人券",
  },
];

export const coupons = [
  {
    id: "c1",
    title: "¥10 无门槛券",
    subtitle: "有效期至 2026-08-31",
    status: "unused" as const,
    threshold: "无门槛",
    scope: "全部模拟商户",
    source: "夏日记账挑战",
    expiresAt: "2026-08-31",
  },
  {
    id: "c2",
    title: "满 50 减 5",
    subtitle: "即将过期 · 2026-07-25",
    status: "unused" as const,
    threshold: "满 ¥50 可用",
    scope: "餐饮与购物",
    source: "连续记账任务",
    expiresAt: "2026-07-25",
  },
  {
    id: "c3",
    title: "¥3 体验券",
    subtitle: "已使用 · 2026-07-10",
    status: "used" as const,
    threshold: "无门槛",
    scope: "全部模拟商户",
    source: "新人权益周",
    expiresAt: "2026-07-31",
  },
  {
    id: "c4",
    title: "满 100 减 15",
    subtitle: "已过期 · 2026-06-30",
    status: "expired" as const,
    threshold: "满 ¥100 可用",
    scope: "购物",
    source: "五月记账挑战",
    expiresAt: "2026-06-30",
  },
];

export const walletEntries = [
  {
    id: "w1",
    kind: "topup" as const,
    title: "模拟充值",
    subtitle: "今天 09:12",
    amount: 500,
  },
  {
    id: "w2",
    kind: "sync" as const,
    title: "记账同步 · 午餐",
    subtitle: "今天 12:30",
    amount: -42,
  },
  {
    id: "w3",
    kind: "sync" as const,
    title: "记账同步 · 地铁",
    subtitle: "今天 08:40",
    amount: -8,
  },
  {
    id: "w4",
    kind: "topup" as const,
    title: "模拟充值",
    subtitle: "昨天 18:00",
    amount: 200,
  },
];

export const helpTopics = [
  { id: "h1", title: "如何记一笔", subtitle: "AppBar 加号与保存流程" },
  { id: "h2", title: "如何看图表", subtitle: "结构与趋势说明" },
  { id: "h3", title: "券如何使用", subtitle: "券包与去使用说明" },
];

export function formatMoney(value: number) {
  const abs = Math.abs(value).toLocaleString("zh-CN", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return abs;
}

export function groupRecordsByDay(records: LedgerRecord[]) {
  const groups: Array<{ dayLabel: string; total: number; items: LedgerRecord[] }> =
    [];
  for (const record of records) {
    let group = groups.find((item) => item.dayLabel === record.dayLabel);
    if (!group) {
      group = { dayLabel: record.dayLabel, total: 0, items: [] };
      groups.push(group);
    }
    group.items.push(record);
    if (record.type === "expense") group.total += record.amount;
  }
  return groups;
}

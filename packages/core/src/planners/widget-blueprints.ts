import type { FlutterImplementationPlan, FlutterWidgetPlan, PrototypePageAnalysis } from '../types/index.js';
import type { ClassifiedPagePattern, PagePattern } from './page-pattern-classifier.js';
import { widgetName } from './naming-strategy.js';

export type WidgetBlueprintItem = {
  role: string;
  nameHint: string;
  parent: 'page' | 'body';
  stateAccess: FlutterWidgetPlan['stateAccess'];
  buildHint: string;
  required?: boolean | undefined;
  when?: (source: PrototypePageAnalysis) => boolean;
};

export function instantiateWidgetBlueprint(
  pageName: string,
  source: PrototypePageAnalysis,
  complexity: FlutterImplementationPlan['complexity'],
  classified: ClassifiedPagePattern,
): FlutterWidgetPlan[] {
  const pageWidget = `${pageName}Page`;
  const bodyWidget = `${pageName}Body`;
  const plans: FlutterWidgetPlan[] = [
    {
      name: pageWidget,
      role: 'route/page composition',
      buildHint: source.sfc?.fixedBottom ? '建议使用 Scaffold/Stack 编排主内容和固定底部操作区。' : '建议只负责页面级布局和子 Widget 编排。',
      stateAccess: complexity === 'simple' ? 'none' : 'controller',
    },
    {
      name: bodyWidget,
      parent: pageWidget,
      role: 'content composition',
      buildHint: source.sfc?.layout.some((item) => item.kind === 'sticky') ? '建议使用 CustomScrollView/Sliver 或 ScrollController 组合吸顶区块。' : '按内容顺序组合私有 Widget。',
      stateAccess: complexity === 'simple' ? 'props' : 'controller-slice',
    },
  ];

  const blueprint = blueprintFor(classified.pattern);
  for (const item of blueprint) {
    if (item.when && !item.when(source)) continue;
    plans.push({
      name: widgetName(pageName, item.nameHint),
      parent: item.parent === 'page' ? pageWidget : bodyWidget,
      role: item.role,
      buildHint: item.buildHint,
      stateAccess: item.stateAccess,
    });
  }

  if (plans.length <= 2) {
    plans.push(...genericContentWidgets(pageName, source));
  }

  return dedupeBy(plans, (plan) => plan.name).slice(0, 24);
}

function blueprintFor(pattern: PagePattern): WidgetBlueprintItem[] {
  const commonHeader: WidgetBlueprintItem = {
    role: 'header',
    nameHint: 'Header',
    parent: 'page',
    stateAccess: 'props',
    buildHint: '优先复用 CommonAppBar 或现有 header pattern。',
    when: hasHeaderLike,
  };

  const blueprints: Record<PagePattern, WidgetBlueprintItem[]> = {
    'quote-detail': [
      commonHeader,
      { role: 'summary', nameHint: 'QuoteSummary', parent: 'body', stateAccess: 'props', buildHint: '展示核心行情、涨跌幅、关键指标和收藏/更多入口状态。' },
      { role: 'tabs', nameHint: 'PrimaryTabs', parent: 'body', stateAccess: 'props', buildHint: '展示一级页签和选中态，通过回调通知父级切换。', when: hasTabs },
      { role: 'section-tabs', nameHint: 'SectionTabs', parent: 'body', stateAccess: 'props', buildHint: '展示内容区锚点页签，通过回调触发滚动定位。', when: hasSectionTabs },
      { role: 'chart', nameHint: 'ChartPanel', parent: 'body', stateAccess: 'props', buildHint: '消费 chart adapter 输出，不在 build 内计算指标。', when: hasChartData },
      { role: 'list', nameHint: 'DataSections', parent: 'body', stateAccess: 'props', buildHint: '展示持仓、历史、指标等数据区块；根据数据量选择 Column/ListView。' },
      { role: 'bottom-actions', nameHint: 'BottomTradeBar', parent: 'page', stateAccess: 'props', buildHint: '用 SafeArea + Row/Buttons 实现，确认 disabled/loading 状态。', when: hasBottomActions },
    ],
    'trade-ticket': [
      commonHeader,
      { role: 'summary', nameHint: 'TradeSummary', parent: 'body', stateAccess: 'props', buildHint: '展示交易标的、价格、账户或可用额度摘要。' },
      { role: 'form-section', nameHint: 'OrderForm', parent: 'body', stateAccess: 'props', buildHint: '承载价格、数量、订单类型等输入项和校验提示。' },
      { role: 'bottom-actions', nameHint: 'SubmitBar', parent: 'page', stateAccess: 'props', buildHint: '承载提交/预览/确认按钮，适配 SafeArea 和 loading/disabled 状态。' },
    ],
    form: [
      commonHeader,
      { role: 'form-section', nameHint: 'Form', parent: 'body', stateAccess: 'props', buildHint: '按字段组组织输入项、校验信息和错误提示。' },
      { role: 'bottom-actions', nameHint: 'SubmitBar', parent: 'page', stateAccess: 'props', buildHint: '承载主提交按钮，确认 disabled/loading 状态。', when: hasBottomActions },
    ],
    list: [
      commonHeader,
      { role: 'filter-bar', nameHint: 'FilterBar', parent: 'body', stateAccess: 'props', buildHint: '展示筛选、排序或时间范围入口。', when: hasFilterLike },
      { role: 'data-list', nameHint: 'List', parent: 'body', stateAccess: 'props', buildHint: '展示列表主体，确认分页、空态、加载态和错误态。' },
    ],
    'record-list': [
      commonHeader,
      { role: 'filter-bar', nameHint: 'FilterBar', parent: 'body', stateAccess: 'props', buildHint: '展示记录筛选条件和时间范围。', when: hasFilterLike },
      { role: 'data-list', nameHint: 'RecordList', parent: 'body', stateAccess: 'props', buildHint: '展示记录列表，确认分页、空态和详情跳转。' },
    ],
    portfolio: [
      commonHeader,
      { role: 'summary', nameHint: 'AssetSummary', parent: 'body', stateAccess: 'props', buildHint: '展示资产、收益、账户摘要等关键指标。' },
      { role: 'data-list', nameHint: 'PositionList', parent: 'body', stateAccess: 'props', buildHint: '展示持仓或资产明细，确认空态和刷新策略。' },
    ],
    settings: [
      commonHeader,
      { role: 'data-list', nameHint: 'SettingsGroupList', parent: 'body', stateAccess: 'props', buildHint: '按分组展示设置项、开关、跳转入口和危险操作。' },
    ],
    auth: [
      { role: 'header', nameHint: 'Header', parent: 'page', stateAccess: 'props', buildHint: '展示认证流程标题、返回和帮助入口。' },
      { role: 'form-section', nameHint: 'AuthForm', parent: 'body', stateAccess: 'props', buildHint: '展示账号、验证码、密码或安全输入项。' },
      { role: 'bottom-actions', nameHint: 'SubmitBar', parent: 'page', stateAccess: 'props', buildHint: '承载继续、登录或验证按钮。' },
    ],
    onboarding: [
      { role: 'section', nameHint: 'StepContent', parent: 'body', stateAccess: 'props', buildHint: '展示当前步骤内容、说明和插图。' },
      { role: 'bottom-actions', nameHint: 'StepActions', parent: 'page', stateAccess: 'props', buildHint: '承载下一步、返回和跳过操作。' },
    ],
    wizard: [
      commonHeader,
      { role: 'section', nameHint: 'StepIndicator', parent: 'body', stateAccess: 'props', buildHint: '展示步骤进度和当前状态。' },
      { role: 'section', nameHint: 'StepContent', parent: 'body', stateAccess: 'props', buildHint: '展示当前步骤的主要内容。' },
      { role: 'bottom-actions', nameHint: 'StepActions', parent: 'page', stateAccess: 'props', buildHint: '承载上一步/下一步/提交操作。' },
    ],
    article: [
      commonHeader,
      { role: 'section', nameHint: 'Content', parent: 'body', stateAccess: 'props', buildHint: '展示标题、正文、说明文字和辅助信息。' },
    ],
    detail: [
      commonHeader,
      { role: 'summary', nameHint: 'Summary', parent: 'body', stateAccess: 'props', buildHint: '展示页面核心摘要信息。', when: hasSummaryLike },
      { role: 'section', nameHint: 'ContentSections', parent: 'body', stateAccess: 'props', buildHint: '展示详情内容区块，按字段组或卡片组织。' },
      { role: 'bottom-actions', nameHint: 'BottomActions', parent: 'page', stateAccess: 'props', buildHint: '承载页面主操作。', when: hasBottomActions },
    ],
    dashboard: [
      commonHeader,
      { role: 'summary', nameHint: 'SummaryCards', parent: 'body', stateAccess: 'props', buildHint: '展示多个核心指标卡片。' },
      { role: 'section', nameHint: 'DashboardSections', parent: 'body', stateAccess: 'props', buildHint: '展示图表、列表和快捷入口等组合区块。' },
    ],
    'empty-state': [
      commonHeader,
      { role: 'empty-state', nameHint: 'EmptyState', parent: 'body', stateAccess: 'props', buildHint: '展示空态插图、说明和主操作。' },
    ],
    unknown: [
      commonHeader,
      { role: 'section', nameHint: 'Content', parent: 'body', stateAccess: 'props', buildHint: '展示页面主要内容，按卡片或字段组拆分。' },
      { role: 'bottom-actions', nameHint: 'BottomActions', parent: 'page', stateAccess: 'props', buildHint: '承载页面主操作。', when: hasBottomActions },
    ],
  };

  return blueprints[pattern] ?? blueprints.unknown;
}

function genericContentWidgets(pageName: string, source: PrototypePageAnalysis): FlutterWidgetPlan[] {
  return [
    {
      name: `${pageName}Content`,
      parent: `${pageName}Body`,
      role: 'content-section',
      buildHint: source.sfc?.state.some((state) => state.category === 'mock-data')
        ? '通过 UI model 展示页面主要内容。'
        : '展示页面主要内容，按卡片或信息行拆成私有方法。',
      stateAccess: 'props',
    },
  ];
}

function hasHeaderLike(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.components.some((component) => component.role === 'header')) || true;
}

function hasTabs(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.components.some((component) => component.role === 'tabs'));
}

function hasSectionTabs(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.components.some((component) => component.role === 'section-tabs'));
}

function hasChartData(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.components.some((component) => component.role === 'chart')) || Boolean(source.sfc?.state.some((state) => state.category === 'chart-data'));
}

function hasBottomActions(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.fixedBottom) || Boolean(source.sfc?.components.some((component) => component.role === 'bottom-actions'));
}

function hasFilterLike(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.state.some((state) => /filter|search|sort|tab|period|active/i.test(state.name)));
}

function hasSummaryLike(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.components.some((component) => component.role === 'summary'));
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

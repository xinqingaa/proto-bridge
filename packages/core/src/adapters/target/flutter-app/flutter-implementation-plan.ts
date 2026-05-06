import type {
  FlutterContextAnalysis,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterStateStrategy,
  FlutterWidgetContract,
  FlutterWidgetPlan,
  PrototypePageAnalysis,
  WidgetRecommendation,
} from '../../../types/index.js';
import { classifyPagePattern } from '../../../planners/page-pattern-classifier.js';
import { instantiateWidgetBlueprint } from '../../../planners/widget-blueprints.js';
import { toPascalCase, toSnakeCase } from '../../../planners/naming-strategy.js';

type BuildFlutterImplementationPlanInput = {
  source: PrototypePageAnalysis;
  target: FlutterContextAnalysis;
  widgets: WidgetRecommendation[];
};

export function buildFlutterImplementationPlan(input: BuildFlutterImplementationPlanInput): FlutterImplementationPlan {
  const complexity = inferPlanComplexity(input.source);
  const pageName = toPascalCase(input.source.screenId ?? input.source.name ?? input.source.label ?? 'MigratedPage');
  const moduleName = input.target.suggestedModule ?? input.source.module ?? 'feature';
  const baseDir = `lib/app/modules/${moduleName}/${toSnakeCase(pageName)}`;
  const classifiedPattern = classifyPagePattern(input.source);
  const widgetTree = buildWidgetTree(pageName, input.source, complexity, classifiedPattern);
  const fileTree = buildFileTree(baseDir, pageName, input.source, complexity, widgetTree);
  const stateStrategy = buildStateStrategy(input.source, complexity);
  const controllerBoundaries = buildControllerBoundaries(pageName, input.source, complexity);
  const widgetContracts = buildWidgetContracts(pageName, input.source, widgetTree, complexity);

  return {
    complexity,
    summary: buildSummary(complexity, input.source, classifiedPattern.pattern, classifiedPattern.confidence),
    fileTree,
    widgetTree,
    stateStrategy,
    controllerBoundaries,
    widgetContracts,
    doNotTranslate: buildDoNotTranslate(input.source, complexity),
    checklist: buildChecklist(input.source, complexity),
  };
}

function inferPlanComplexity(source: PrototypePageAnalysis): FlutterImplementationPlan['complexity'] {
  const sfc = source.sfc;
  const score =
    (sfc?.components.length ?? 0) +
    Math.ceil((sfc?.state.length ?? 0) / 4) +
    (sfc?.routes.length ?? 0) * 2 +
    (sfc?.lifecycle.length ?? 0) * 2 +
    (sfc?.fixedBottom ? 3 : 0) +
    (sfc?.layout.some((item) => ['fixed', 'sticky', 'scroll'].includes(item.kind)) ? 4 : 0) +
    (sfc?.styleTokens.length ? 2 : 0) +
    (sfc?.assets.length ? 2 : 0);
  if (score >= 26) return 'complex';
  if (score >= 10) return 'moderate';
  return 'simple';
}

function buildSummary(
  complexity: FlutterImplementationPlan['complexity'],
  source: PrototypePageAnalysis,
  pattern: string,
  confidence: string,
): string {
  if (complexity === 'simple') {
    return `该页面适合用一个页面 Widget + 少量私有子 Widget 实现；识别页面模式为 ${pattern}（${confidence}），状态管理可以保持轻量，重点对齐 UI、文案和 token。`;
  }
  if (complexity === 'moderate') {
    return `该页面建议拆成父页面、Controller 和若干子 Widget；识别页面模式为 ${pattern}（${confidence}），Controller 负责页面级 UI 状态，子 Widget 通过输入契约接收数据和回调。`;
  }
  const hasChart = source.sfc?.components.some((component) => component.role === 'chart') ?? false;
  const chartNote = hasChart ? '图表/指标计算应单独放入 adapter 或 service，避免在 Widget build 中复算。' : '';
  return `该页面属于复杂页面，识别页面模式为 ${pattern}（${confidence}）；应使用父页面编排 + 多个子 Widget + Controller/adapter 分层实现；状态管理建议应服务于 Flutter 架构边界，避免把来源页面的临时状态逐项搬进 GetX。${chartNote}`;
}

function buildFileTree(
  baseDir: string,
  pageName: string,
  source: PrototypePageAnalysis,
  complexity: FlutterImplementationPlan['complexity'],
  widgetTree: FlutterWidgetPlan[],
): FlutterPlannedFile[] {
  const files: FlutterPlannedFile[] = [
    {
      path: `${baseDir}/${toSnakeCase(pageName)}_page.dart`,
      responsibility: '父页面入口，绑定 route、Controller、Scaffold/SafeArea，并编排子 Widget。',
      notes: '父页面不直接承载复杂业务计算。',
    },
  ];

  if (complexity !== 'simple') {
    files.push({
      path: `${baseDir}/${toSnakeCase(pageName)}_controller.dart`,
      responsibility: '管理页面级 UI 状态、路由参数、滚动控制和事件分发。',
      notes: '按 UI 状态、业务数据、派生数据重新归类，不要把来源页面临时状态逐项搬迁。',
    });
    files.push({
      path: `${baseDir}/${toSnakeCase(pageName)}_binding.dart`,
      responsibility: '注册 Controller 及必要 service/repository 依赖。',
    });
  }

  for (const widget of widgetTree.filter((item) => item.parent).slice(0, complexity === 'complex' ? 12 : 6)) {
    files.push({
      path: `${baseDir}/widgets/${toSnakeCase(widget.name)}.dart`,
      responsibility: widget.buildHint,
      notes: widget.role,
    });
  }

  if (source.sfc?.state.some((state) => state.category === 'chart-data')) {
    files.push({
      path: `${baseDir}/adapters/${toSnakeCase(pageName)}_chart_adapter.dart`,
      responsibility: '承载图表数据转换、指标计算和 path/series 构造，避免 Widget build 中重复计算。',
    });
  }

  if (source.sfc?.state.some((state) => state.category === 'mock-data')) {
    files.push({
      path: `${baseDir}/models/${toSnakeCase(pageName)}_ui_model.dart`,
      responsibility: '定义 UI 所需字段模型；真实数据源待业务接口确认后替换 mock。',
    });
  }

  return dedupeBy(files, (file) => file.path);
}

function buildWidgetTree(
  pageName: string,
  source: PrototypePageAnalysis,
  complexity: FlutterImplementationPlan['complexity'],
  classifiedPattern: ReturnType<typeof classifyPagePattern>,
): FlutterWidgetPlan[] {
  return instantiateWidgetBlueprint(pageName, source, complexity, classifiedPattern);
}

function buildStateStrategy(
  source: PrototypePageAnalysis,
  complexity: FlutterImplementationPlan['complexity'],
): FlutterStateStrategy[] {
  const sfc = source.sfc;
  const strategies: FlutterStateStrategy[] = [];

  const uiStates = sfc?.state.filter((state) => state.category === 'ui-state').map((state) => state.name) ?? [];
  if (uiStates.length > 0) {
    strategies.push({
      concern: '页面级 UI 状态',
      owner: complexity === 'simple' ? 'widget-local' : 'controller',
      recommendation: complexity === 'simple'
        ? '简单交互可放局部 StatefulWidget；若页面已有 BaseGetView，则统一放 Controller。'
        : `建议放入页面 Controller，按 tab/展开/选择态分组管理：${uiStates.slice(0, 12).join(', ')}。`,
      evidence: uiStates.slice(0, 16).join(', '),
    });
  }

  const mockData = sfc?.state.filter((state) => state.category === 'mock-data').map((state) => state.name) ?? [];
  if (mockData.length > 0) {
    strategies.push({
      concern: '业务数据与 mock 数据',
      owner: 'repository',
      recommendation: '不要把临时 mock 数组直接写入 Widget；先定义 UI model，再由接口/repository/fixture 填充。',
      evidence: mockData.slice(0, 16).join(', '),
    });
  }

  const chartData = sfc?.state.filter((state) => state.category === 'chart-data').map((state) => state.name) ?? [];
  if (chartData.length > 0) {
    strategies.push({
      concern: '图表与派生计算',
      owner: 'model-adapter',
      recommendation: 'K 线、指标、path、series 等计算放入 adapter/service，可缓存结果；Widget 只消费绘制模型。',
      evidence: chartData.slice(0, 20).join(', '),
    });
  }

  if ((sfc?.routes.length ?? 0) > 0) {
    strategies.push({
      concern: '路由与参数',
      owner: 'controller',
      recommendation: 'Controller 统一读取 route 参数并暴露页面初始状态；子 Widget 只通过 callback 触发导航。',
      evidence: sfc?.routes.map((route) => route.evidence).join(' | ') ?? '',
    });
  }

  if ((sfc?.lifecycle.length ?? 0) > 0) {
    strategies.push({
      concern: '生命周期与副作用',
      owner: 'controller',
      recommendation: 'ScrollController/listener/watch 副作用必须有明确注册和释放位置，优先 onReady/onClose 或 StatefulWidget dispose。',
      evidence: sfc?.lifecycle.map((item) => item.evidence).join(' | ') ?? '',
    });
  }

  return strategies;
}

function buildControllerBoundaries(
  pageName: string,
  source: PrototypePageAnalysis,
  complexity: FlutterImplementationPlan['complexity'],): FlutterImplementationPlan['controllerBoundaries'] {
  if (complexity === 'simple') {
    return [
      {
        name: `${pageName}Controller（可选）`,
        responsibility: '简单页面可不建 Controller；如项目规范要求 BaseGetView，则只承载初始化和轻量状态。',
        owns: ['页面初始化', '必要路由参数'],
        avoids: ['静态 UI 布局', '硬编码 mock 数据', '子 Widget 内部展示细节'],
      },
    ];
  }

  const owns = ['页面级 UI 状态', '路由参数读取', '事件分发'];
  if (source.sfc?.lifecycle.length) owns.push('滚动/监听生命周期');
  if (source.sfc?.routes.length) owns.push('导航行为');
  return [
    {
      name: `${pageName}Controller`,
      responsibility: '页面 orchestration controller；负责状态组合、生命周期和事件分发，不负责绘制细节。',
      owns,
      avoids: ['逐层照搬来源页面结构', '在 build 中做重计算', '让所有子 Widget 直接读整个 Controller'],
    },
    {
      name: `${pageName}Data/Chart Adapter`,
      responsibility: '将接口或 mock 数据整理成 UI/图表绘制模型。',
      owns: ['mock 到 model 的转换', '派生数据和图表 series 计算', '缓存策略'],
      avoids: ['直接依赖 BuildContext', '触发导航', '持有 Widget 状态'],
    },
  ];
}

function buildWidgetContracts(
  pageName: string,
  source: PrototypePageAnalysis,
  widgetTree: FlutterWidgetPlan[],
  complexity: FlutterImplementationPlan['complexity'],
): FlutterWidgetContract[] {
  return widgetTree
    .filter((widget) => widget.parent)
    .slice(0, complexity === 'complex' ? 18 : 8)
    .map((widget) => {
      const lower = widget.name.toLowerCase();
      const callbacks: string[] = [];
      if (/tab/.test(lower)) callbacks.push('onTabChanged');
      if (/bottom|trade/.test(lower)) callbacks.push('onBuy', 'onSell', 'onOptions');
      if (/header|appbar/.test(lower)) callbacks.push('onBack', 'onMore');
      if (/list|holding/.test(lower)) callbacks.push('onItemTap');
      if (/chart/.test(lower)) callbacks.push('onPeriodChanged', 'onIndicatorChanged');

      return {
        widget: widget.name,
        inputs: inferWidgetInputs(widget, source),
        callbacks,
        shouldReadController: false,
        notes: '默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。',
      };
    });
}

function buildDoNotTranslate(source: PrototypePageAnalysis, complexity: FlutterImplementationPlan['complexity']): string[] {
  const rules = [
    '不要把来源页面结构逐层翻译成 Flutter Widget；按业务区块和 Flutter 布局模型重组。',
    '不要把临时 mock 数据直接写在 Widget build 中；先确认接口/model/fixture 边界。',
    '不要让每个子 Widget 都直接依赖整个 Controller；优先 props + callbacks。',
  ];
  if (complexity === 'complex') {
    rules.push('不要把来源页面的临时状态一对一迁移为 Rx；先按 UI 状态、业务数据、派生数据、生命周期副作用分类。');
  }
  if (source.sfc?.state.some((state) => state.category === 'chart-data')) {
    rules.push('不要逐行翻译矢量路径或 K 线指标计算；图表数据和绘制策略需要单独设计 adapter 或 CustomPainter。');
  }
  if (source.sfc?.layout.some((layout) => ['fixed', 'sticky', 'scroll'].includes(layout.kind))) {
    rules.push('不要忽略 fixed/sticky/scroll/safe-area；先确定 Scaffold、Stack、ScrollController/Sliver 的组合。');
  }
  return rules;
}

function buildChecklist(source: PrototypePageAnalysis, complexity: FlutterImplementationPlan['complexity']): FlutterImplementationPlan['checklist'] {
  const checklist: FlutterImplementationPlan['checklist'] = [
    { priority: 'P0', item: '确认目标 Flutter route、Binding、Controller 文件位置符合 YouFi 模块规范。' },
    { priority: 'P0', item: '确认 UI 首屏结构、颜色、字号、间距和 i18n 文案与原型一致。' },
  ];
  if (source.sfc?.fixedBottom) checklist.push({ priority: 'P0', item: '确认底部操作栏不遮挡滚动内容，并适配 SafeArea。' });
  if (source.sfc?.routes.length) checklist.push({ priority: 'P0', item: '确认所有跳转目标和参数映射到 Flutter routes。' });
  if (source.sfc?.lifecycle.length) checklist.push({ priority: 'P0', item: '确认 ScrollController/listener/watch 在 dispose/onClose 中释放。' });
  if (source.sfc?.layout.some((item) => item.kind === 'sticky')) checklist.push({ priority: 'P1', item: '确认吸顶 Header/Tab 的滚动行为和层级遮挡。' });
  if (source.sfc?.state.some((state) => state.category === 'chart-data')) checklist.push({ priority: 'P1', item: '确认图表实现方案、性能和数据缓存策略。' });
  if (source.sfc?.assets.length) checklist.push({ priority: 'P1', item: '确认图片、SVG、icon、暗色模式资源是否复用现有 assets。' });
  if (complexity === 'complex') checklist.push({ priority: 'P2', item: '为核心子 Widget 保留可独立调试入口或最小 fixture。' });
  return checklist;
}

function inferWidgetInputs(widget: FlutterWidgetPlan, source: PrototypePageAnalysis): string[] {
  const lower = widget.name.toLowerCase();
  const inputs: string[] = [];
  if (/header|info|price|quote/.test(lower)) inputs.push('quote/ui summary model');
  if (/tab/.test(lower)) inputs.push('tabs', 'activeKey');
  if (/chart/.test(lower)) inputs.push('chartViewModel', 'selectedPeriod', 'selectedIndicator');
  if (/list|holding|profile|history|metric/.test(lower)) inputs.push('items / section model');
  if (/bottom|trade/.test(lower)) inputs.push('trade action availability', 'quote symbol');
  if (inputs.length === 0 && source.sfc?.state.some((state) => state.category === 'mock-data')) inputs.push('section data model');
  return dedupe(inputs);
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
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

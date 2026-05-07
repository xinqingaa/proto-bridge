import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  FlutterControllerBoundary,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterStateStrategy,
  FlutterWidgetContract,
  FlutterWidgetPlan,
  MigrationContext,
  PrototypePageAnalysis,
  VueLifecycleHint,
  VueStateHint,
  VueStyleTokenHint,
} from '../../../types/index.js';
import { classifyPagePattern } from './planners/page-pattern-classifier.js';
import { getKnownTokenMaps } from './token-mapper.js';

type DesignToken = {
  name: string;
  rawValue: string;
  value: string;
  target?: string | undefined;
};

type TypographyMixin = {
  name: string;
  declarations: Record<string, string>;
  styleText: string;
  target?: string | undefined;
};

type CssBlock = {
  selector: string;
  body: string;
  declarations: Record<string, string>;
  includes: string[];
};

export function renderFlutterMigrationSpec(context: MigrationContext): string {
  const source = context.source;
  const plan = context.recommendations.implementationPlan;
  const title = source.label ?? source.title ?? source.screenId ?? source.name ?? '未命名页面';
  const classifiedPattern = classifyPagePattern(source);
  const fileTree = formatPlannedFileTree(plan.fileTree);
  const styleScss = readSourceStyleScss(source);
  const colorTokens = parseDesignColorTokens(styleScss);
  const typographyMixins = parseTypographyMixins(styleScss);
  const lines: string[] = [];

  lines.push(`# ${title} Flutter 迁移说明书`);
  lines.push('');
  lines.push('## 页面元信息');
  lines.push(`- 目标路由来源：${source.route ?? '待确认'}`);
  lines.push(`- screenId：${source.screenId ?? '待确认'}`);
  lines.push(`- 推荐 Flutter 模块：${context.target.suggestedModule ?? '待确认'}`);
  lines.push(`- 推荐实现形态：${context.recommendations.implementationShape}`);
  lines.push(`- 需求状态：${source.status ?? '待确认'}`);
  lines.push(`- 维护角色：${source.owner ?? '待确认'}`);
  lines.push('');

  lines.push('## 一、迁移结论');
  lines.push(`- 页面复杂度：${inferComplexity(context)}`);
  lines.push(`- Flutter 实现复杂度：${complexityLabel(plan.complexity)}`);
  lines.push(`- 页面模式：${pagePatternLabel(classifiedPattern.pattern)}`);
  lines.push(`- 模式识别置信度：${confidenceLabel(classifiedPattern.confidence)}`);
  lines.push(`- 建议是否直接实现：${context.recommendations.risks.length <= 2 ? '可以进入实现' : '先确认风险后实现'}`);
  lines.push(`- 主要风险：${formatRiskSummary(context.recommendations.risks)}`);
  lines.push(`- 实现规划：${plan.summary}`);
  lines.push('');

  lines.push('## 二、Flutter 实现规划');
  lines.push('### 目标文件拆分');
  lines.push('```text');
  lines.push(fileTree.tree);
  lines.push('```');
  lines.push('');
  lines.push(markdownTable(['文件', '职责', '备注'], plan.fileTree.map((file) => [
    shortenPlannedPath(file.path, fileTree.rootDir),
    file.responsibility,
    localizeWidgetRole(file.notes ?? ''),
  ])));
  lines.push('');

  lines.push('### Widget 组合');
  lines.push(markdownTable(
    ['Widget', '所属/父级', '职责', '输入数据', '交互回调', '状态访问建议'],
    widgetCompositionRows(plan.widgetTree, plan.widgetContracts),
  ));
  lines.push('');

  lines.push('### 状态管理与数据边界建议');
  lines.push(markdownTable(['关注点', '建议 owner', '建议'], plan.stateStrategy.map((strategy) => [
    strategy.concern,
    ownerLabel(strategy.owner),
    localizeStrategyRecommendation(strategy),
  ])));
  lines.push('');
  lines.push(...controllerBoundaryNotes(plan.controllerBoundaries));
  lines.push('');

  lines.push('### 禁止直译项');
  for (const item of plan.doNotTranslate) {
    lines.push(`- ${item}`);
  }
  lines.push('');

  lines.push('## 三、状态与交互建议');
  if (source.sfc?.state.length) {
    lines.push('### 状态模型摘要');
    lines.push(markdownTable(['分类', '涉及状态/能力', 'Flutter 建议'], stateSummaryRows(source.sfc.state)));
    lines.push('');
  }
  if (source.sfc?.lifecycle.length) {
    lines.push('### 生命周期与副作用');
    lines.push(markdownTable(['副作用类型', '目标', 'Flutter 建议'], lifecycleRows(source.sfc.lifecycle)));
    lines.push('');
  }
  lines.push('### 交互事件');
  lines.push(markdownTable(['交互类型', '涉及目标', 'Flutter 建议'], compactInteractionRows(context)));
  lines.push('');

  lines.push('## 四、路由与布局');
  lines.push('### 路由与参数');
  lines.push(markdownTable(['原型 route/query', 'Flutter GetX 建议'], [
    [
      source.route ?? '待确认',
      context.target.routesFiles.length > 0
        ? `在 ${context.target.routesFiles.join(', ')} 中补充或复用路由`
        : '确认 YouFi 路由文件位置后接入',
    ],
  ]));
  if (source.sfc?.routes.length) {
    lines.push('');
    lines.push('### 页面路由行为');
    lines.push(markdownTable(['行为', '目标/参数', 'Flutter 迁移建议'], source.sfc.routes.map((route) => [
      routeActionLabel(route.action),
      [route.target, route.params].filter(Boolean).join(' / ') || '待确认',
      route.migrationHint,
    ])));
  }
  lines.push('');

  if (source.sfc?.layout.length) {
    lines.push('### 布局模型');
    lines.push(markdownTable(['布局特征', 'Flutter 迁移建议'], compactLayoutRows(context)));
    lines.push('');
  }

  lines.push('## 五、CSS 样式到 Flutter 主题映射');
  lines.push('### 颜色');
  lines.push(markdownTable(
    ['使用位置', '变量名', 'Flutter 主题', '色值'],
    colorUsageRows(source.sfc?.styleTokens ?? [], colorTokens),
  ));
  lines.push('');
  lines.push('### 字体');
  lines.push(markdownTable(
    ['使用位置', '变量名 / mixin', 'Flutter 文本主题', '原始样式'],
    typographyUsageRows(source.sfc?.styleBlocks ?? [], typographyMixins),
  ));
  lines.push('');

  lines.push('## 六、文案与 i18n');
  lines.push(i18nTable(context.source.i18n));
  lines.push('');

  lines.push('## 七、资源迁移');
  lines.push(assetTable(context));
  lines.push('');

  lines.push('## 八、可复用 Flutter 组件');
  lines.push(markdownTable(['场景', '推荐组件'], context.target.reusableWidgets.map((widget) => ['通用能力', widget])));
  lines.push('');

  lines.push('## 九、人工确认项');
  for (const question of context.recommendations.manualQuestions) {
    lines.push(`- [ ] ${question}`);
  }
  for (const checklist of plan.checklist) {
    lines.push(`- [ ] ${checklist.priority}：${checklist.item}`);
  }
  lines.push('');

  lines.push('## 十、AI 实现提示词');
  lines.push('```text');
  lines.push(`请基于本文档在 YouFi Flutter App 中实现 ${title} 页面。`);
  lines.push(`目标模块优先放在 lib/app/modules/${context.target.suggestedModule ?? '<待确认模块>'}。`);
  lines.push('实现时优先复用本文档列出的 common widgets、themeService.colors、themeService.textStyles 和现有翻译体系。');
  lines.push('请按目标文件拆分、Widget 组合、状态建议、路由布局、CSS 样式映射、i18n 和资源几个部分实现；不要逐层照搬来源页面结构。');
  lines.push('```');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function inferComplexity(context: MigrationContext): string {
  const source = context.source.sourceCode ?? '';
  const interactionCount = context.source.sfc?.interactions.length ?? (source.match(/@click|v-model|ref\(|reactive\(|computed\(/g) ?? []).length;
  const semanticWeight =
    (context.source.sfc?.state.length ?? 0) +
    (context.source.sfc?.routes.length ?? 0) +
    (context.source.sfc?.lifecycle.length ?? 0) +
    (context.source.sfc?.layout.filter((item) => ['fixed', 'sticky', 'scroll'].includes(item.kind)).length ?? 0);
  if (interactionCount > 8 || context.recommendations.widgetBreakdown.length >= 8 || semanticWeight > 20) return '高';
  if (interactionCount > 2 || context.recommendations.widgetBreakdown.length >= 4 || semanticWeight > 8) return '中';
  return '低';
}

function complexityLabel(complexity: FlutterImplementationPlan['complexity']): string {
  if (complexity === 'simple') return '简单';
  if (complexity === 'moderate') return '中等';
  return '复杂';
}

function pagePatternLabel(pattern: string): string {
  const labels: Record<string, string> = {
    detail: '详情页',
    dashboard: '数据看板',
    list: '列表页',
    form: '表单页',
    'trade-ticket': '交易下单页',
    'quote-detail': '行情详情页',
    portfolio: '资产/持仓页',
    'record-list': '记录列表页',
    settings: '设置页',
    auth: '认证页',
    onboarding: '引导页',
    wizard: '步骤流程页',
    article: '内容详情页',
    'empty-state': '空状态页',
    unknown: '通用页面',
  };
  return labels[pattern] ?? pattern;
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  if (confidence === 'low') return '低';
  return confidence;
}

function formatRiskSummary(risks: string[]): string {
  const translated = risks.map(translateRisk).filter(Boolean);
  if (translated.length === 0) return '暂无明显阻塞';
  return translated.slice(0, 2).join('；');
}

function translateRisk(risk: string): string {
  const notes = risk.match(/^Notes file not found for (.+)$/);
  if (notes?.[1]) return `未找到 ${notes[1]} 的 notes 说明，业务意图、接口线索或验收口径需要人工补齐`;
  if (/Runtime capture skipped/i.test(risk)) return '本次未启用运行时截图/DOM capture，首屏布局、底部栏和计算样式仍需人工校对';
  const tokenCount = risk.match(/^(\d+) style token\(s\) were not mapped/i);
  if (tokenCount?.[1]) return `存在 ${tokenCount[1]} 个样式 token 未映射到 Flutter 语义主题`;
  return risk;
}

function formatPlannedFileTree(files: FlutterPlannedFile[]): { rootDir: string; tree: string } {
  const rootDir = commonDirectory(files.map((file) => file.path));
  const root: TreeNode = { name: '', children: new Map(), isFile: false };

  for (const file of files) {
    const relative = shortenPlannedPath(file.path, rootDir);
    const parts = relative.split('/').filter(Boolean);
    let current = root;
    for (const [index, part] of parts.entries()) {
      const isFile = index === parts.length - 1;
      const child = current.children.get(part) ?? { name: part, children: new Map(), isFile };
      child.isFile = child.isFile || isFile;
      current.children.set(part, child);
      current = child;
    }
  }

  return {
    rootDir,
    tree: [`${rootDir}/`, ...renderTreeChildren(root, '')].join('\n'),
  };
}

function commonDirectory(paths: string[]): string {
  if (paths.length === 0) return '.';
  const dirs = paths.map((item) => path.posix.dirname(item).split('/'));
  const first = dirs[0] ?? [];
  const common: string[] = [];
  for (const [index, part] of first.entries()) {
    if (dirs.every((dir) => dir[index] === part)) common.push(part);
    else break;
  }
  return common.join('/') || '.';
}

function shortenPlannedPath(filePath: string, rootDir: string): string {
  if (rootDir === '.') return filePath;
  return filePath.startsWith(`${rootDir}/`) ? filePath.slice(rootDir.length + 1) : filePath;
}

function renderTreeChildren(node: TreeNode, prefix: string): string[] {
  const children = [...node.children.values()].sort((left, right) => {
    if (left.isFile !== right.isFile) return left.isFile ? 1 : -1;
    return left.name.localeCompare(right.name);
  });
  const lines: string[] = [];
  for (const [index, child] of children.entries()) {
    const isLast = index === children.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const label = child.isFile && child.children.size === 0 ? child.name : `${child.name}/`;
    lines.push(`${prefix}${connector}${label}`);
    if (child.children.size > 0) {
      lines.push(...renderTreeChildren(child, `${prefix}${isLast ? '    ' : '│   '}`));
    }
  }
  return lines;
}

function widgetCompositionRows(
  widgets: FlutterWidgetPlan[],
  contracts: FlutterWidgetContract[],
): string[][] {
  const contractByWidget = new Map(contracts.map((contract) => [contract.widget, contract]));
  return widgets.map((widget) => {
    const contract = contractByWidget.get(widget.name);
    return [
      widget.name,
      widget.parent ?? '无，路由页面入口',
      `${localizeWidgetRole(widget.role)}；${widget.buildHint}`,
      formatInputs(contract?.inputs ?? []),
      formatCallbacks(contract?.callbacks ?? []),
      stateAccessLabel(widget.stateAccess),
    ];
  });
}

function localizeWidgetRole(role: string): string {
  const labels: Record<string, string> = {
    'route/page composition': '路由页面入口',
    'content composition': '内容组合层',
    header: '顶部导航/标题区',
    summary: '核心摘要区',
    tabs: '一级页签',
    'section-tabs': '内容锚点页签',
    chart: '图表区',
    list: '数据列表/区块',
    'data-list': '数据列表',
    'content-section': '内容区块',
    section: '内容区块',
    'form-section': '表单区块',
    'filter-bar': '筛选栏',
    'bottom-actions': '底部操作区',
    modal: '弹窗/底部弹层',
    'empty-state': '空状态',
  };
  return labels[role] ?? role;
}

function formatInputs(inputs: string[]): string {
  if (inputs.length === 0) return '无 / 待确认';
  return inputs.map(localizeInput).join('、');
}

function localizeInput(input: string): string {
  const labels: Record<string, string> = {
    'quote/ui summary model': '行情/页面摘要模型',
    tabs: '页签列表',
    activeKey: '当前选中 key',
    chartViewModel: '图表展示模型',
    selectedPeriod: '当前周期',
    selectedIndicator: '当前指标',
    'items / section model': '列表或区块模型',
    'trade action availability': '交易按钮可用状态',
    'quote symbol': '标的代码',
    'section data model': '业务区块数据模型',
  };
  return labels[input] ?? input;
}

function formatCallbacks(callbacks: string[]): string {
  if (callbacks.length === 0) return '无';
  return callbacks.map((callback) => callbackLabel(callback)).join('、');
}

function callbackLabel(callback: string): string {
  const labels: Record<string, string> = {
    onBack: '返回',
    onMore: '更多',
    onTabChanged: '切换页签',
    onBuy: '买入',
    onSell: '卖出',
    onOptions: '期权入口',
    onItemTap: '点击列表项',
    onPeriodChanged: '切换周期',
    onIndicatorChanged: '切换指标',
  };
  return labels[callback] ? `${callback}（${labels[callback]}）` : callback;
}

function stateAccessLabel(access: FlutterWidgetPlan['stateAccess']): string {
  if (access === 'none') return '不直接访问状态';
  if (access === 'props') return '通过构造参数接收数据';
  if (access === 'controller') return '页面入口读取 Controller';
  return '组合层只订阅必要 Controller 状态';
}

function ownerLabel(owner: FlutterStateStrategy['owner']): string {
  const labels: Record<FlutterStateStrategy['owner'], string> = {
    controller: 'Controller',
    service: 'Service',
    repository: 'Repository / UI model',
    'widget-local': '局部 StatefulWidget',
    'model-adapter': 'Model / Adapter',
    manual: '人工确认',
  };
  return labels[owner];
}

function localizeStrategyRecommendation(strategy: FlutterStateStrategy): string {
  return strategy.recommendation
    .replace(/route 参数/g, '路由参数')
    .replace(/path、series 等/g, '绘制路径和序列数据等')
    .replace(/path、series/g, '绘制路径和序列数据')
    .replace(/adapter/g, '数据适配层')
    .replace(/service/g, 'Service')
    .replace(/props/g, '构造参数')
    .replace(/callback/g, '回调')
    .replace(/读取\s+路由参数/g, '读取路由参数')
    .replace(/通过\s*回调\s+/g, '通过回调');
}

function controllerBoundaryNotes(boundaries: FlutterControllerBoundary[]): string[] {
  if (boundaries.length === 0) return [];
  return [
    '边界补充：',
    ...boundaries.map((boundary) =>
      `- ${localizeBoundaryName(boundary.name)}：${localizeBoundaryText(boundary.responsibility)} 负责 ${boundary.owns.map(localizeBoundaryText).join('、')}；避免 ${boundary.avoids.map(localizeBoundaryText).join('、')}。`,
    ),
  ];
}

function localizeBoundaryName(name: string): string {
  return name.replace('Data/Chart Adapter', ' 数据/图表适配层');
}

function localizeBoundaryText(text: string): string {
  return text
    .replace(/orchestration controller/g, '编排层 Controller')
    .replace(/mock 到 model/g, 'mock 数据到 UI model')
    .replace(/series 计算/g, '序列数据计算')
    .replace(/series/g, '序列数据')
    .replace(/页面 编排层/g, '页面编排层')
    .replace(/图表 序列数据计算/g, '图表序列数据计算');
}

function stateSummaryRows(states: VueStateHint[]): string[][] {
  const order: VueStateHint['category'][] = [
    'ui-state',
    'mock-data',
    'chart-data',
    'derived-data',
    'navigation',
    'handler',
    'lifecycle',
    'unknown',
  ];
  const grouped = new Map<VueStateHint['category'], VueStateHint[]>();
  for (const state of states) {
    grouped.set(state.category, [...(grouped.get(state.category) ?? []), state]);
  }

  return order
    .flatMap((category) => {
      const items = grouped.get(category) ?? [];
      if (items.length === 0) return [];
      return [[
        stateCategoryLabel(category),
        compactNameList(items.map((item) => item.name)),
        stateCategoryAdvice(category),
      ]];
    });
}

function stateCategoryLabel(category: VueStateHint['category']): string {
  const labels: Record<VueStateHint['category'], string> = {
    'ui-state': '页面 UI 状态',
    'mock-data': '业务数据 / mock 数据',
    'derived-data': '派生数据',
    navigation: '路由与导航',
    lifecycle: '生命周期',
    'chart-data': '图表与指标数据',
    handler: '交互方法',
    unknown: '待确认',
  };
  return labels[category];
}

function stateCategoryAdvice(category: VueStateHint['category']): string {
  const advice: Record<VueStateHint['category'], string> = {
    'ui-state': '放在页面 Controller；只影响单个私有 Widget 的轻量状态可局部管理。',
    'mock-data': '先收敛成 UI model，由 Repository、接口或 fixture 填充，不要写进 Widget build。',
    'derived-data': '用 Controller getter 或数据适配层输出；重计算内容需要缓存策略。',
    navigation: '由 Controller 统一读取路由参数并封装跳转/滚动方法。',
    lifecycle: '放入 Controller.onInit/onClose；依赖首帧布局时再使用 onReady/首帧回调。',
    'chart-data': '放入图表数据适配层或 painter 输入模型，Widget 只消费绘制结果。',
    handler: '实现为 Controller 方法，再通过 Widget 回调触发。',
    unknown: '需要人工确认它属于业务数据、UI 状态还是临时实现细节。',
  };
  return advice[category];
}

function compactNameList(names: string[], max = 10): string {
  const unique = [...new Set(names)];
  const shown = unique.slice(0, max).join(', ');
  return unique.length > max ? `${shown} 等 ${unique.length} 项` : shown;
}

function lifecycleRows(items: VueLifecycleHint[]): string[][] {
  const rows = items.map((item) => [
    lifecycleLabel(item.hook),
    item.target ?? '待确认',
    lifecycleMigrationAdvice(item),
  ]);
  return dedupeRows(rows).slice(0, 8);
}

function lifecycleLabel(hook: string): string {
  if (hook === 'onMounted') return '页面初始化';
  if (hook === 'onBeforeUnmount') return '页面销毁清理';
  if (hook === 'event-listener') return '事件监听';
  if (hook === 'watch') return '状态监听';
  return '副作用';
}

function lifecycleMigrationAdvice(item: VueLifecycleHint): string {
  if (item.hook === 'onMounted') {
    return '优先放在 Controller.onInit；如果依赖首帧尺寸、滚动定位或 BuildContext，再放 onReady/WidgetsBinding.addPostFrameCallback。';
  }
  if (item.hook === 'onBeforeUnmount') return '放在 Controller.onClose，释放 ScrollController、listener、timer 等资源。';
  if (item.hook === 'event-listener') return 'Flutter 侧用 ScrollController/listener 等等价机制，并在 onClose/dispose 中移除。';
  if (item.hook === 'watch') return '迁移为 ever/worker、Rx 监听，或在明确的 setter/Controller 方法中触发副作用。';
  return item.migrationHint;
}

function compactInteractionRows(context: MigrationContext): string[][] {
  const interactions = context.source.sfc?.interactions ?? [];
  if (interactions.length === 0) {
    return [['待确认', '待确认', '根据业务需求补充 callback、表单状态或导航行为。']];
  }

  const grouped = new Map<string, { label: string; targets: Set<string>; suggestion: string }>();
  for (const interaction of interactions) {
    const label = interactionLabel(interaction.kind);
    const suggestion = suggestInteractionMigration(interaction.kind);
    const key = `${label}:${suggestion}`;
    const group = grouped.get(key) ?? { label, targets: new Set<string>(), suggestion };
    group.targets.add(interactionTargetLabel(interaction.target ?? ''));
    grouped.set(key, group);
  }

  return [...grouped.values()].slice(0, 10).map((group) => [
    group.label,
    compactNameList([...group.targets].filter(Boolean), 8) || '待确认',
    group.suggestion,
  ]);
}

function routeActionLabel(action: string): string {
  if (action === 'navigate') return '页面跳转';
  if (action === 'back') return '返回上一页';
  if (action === 'read-query') return '读取路由参数';
  return '路由行为';
}

function compactLayoutRows(context: MigrationContext): string[][] {
  const grouped = new Map<string, string[]>();
  for (const item of context.source.sfc?.layout ?? []) {
    const label = layoutKindLabel(item.kind);
    const values = grouped.get(label) ?? [];
    values.push(item.migrationHint);
    grouped.set(label, values);
  }
  return [...grouped.entries()].map(([kind, hints]) => [kind, [...new Set(hints)].slice(0, 3).join('<br>')]);
}

function layoutKindLabel(kind: string): string {
  if (kind === 'fixed') return '固定区域';
  if (kind === 'sticky') return '吸顶区域';
  if (kind === 'scroll') return '滚动容器';
  if (kind === 'safe-area') return '安全区适配';
  if (kind === 'z-index') return '层级遮挡';
  if (kind === 'absolute') return '叠层定位';
  if (kind === 'flex') return '弹性布局';
  if (kind === 'grid') return '网格布局';
  if (kind === 'spacing') return '间距系统';
  return '布局约束';
}

function interactionLabel(kind: string): string {
  if (kind === 'click') return '点击事件';
  if (kind === 'model') return '表单输入';
  if (kind === 'conditional') return '条件展示';
  if (kind === 'loop') return '列表渲染';
  if (kind === 'state') return '状态字段';
  if (kind === 'computed') return '派生状态';
  if (kind === 'watch') return '状态监听';
  return '交互';
}

function interactionTargetLabel(target: string): string {
  if (!target) return '待确认';
  if (/pushPage|toNamed|Navigator|route/i.test(target)) return '页面跳转';
  if (/history\.back|Get\.back|goBack|back/i.test(target)) return '返回上一页';
  if (/handleTrade|buy|sell/i.test(target)) return '交易操作';
  if (/option/i.test(target)) return '期权入口';
  if (/favorite/i.test(target)) return '收藏状态';
  const assignment = target.match(/^([a-zA-Z_$][\w$]*)\s*=/)?.[1];
  if (assignment) return assignment;
  const call = target.match(/^([a-zA-Z_$][\w$]*)\s*\(/)?.[1];
  if (call) return call;
  return sanitizeImplementationText(target);
}

function suggestInteractionMigration(kind: string): string {
  if (kind === 'click') return '迁移为 Controller 方法或 Widget 回调，并确认路由、弹窗和埋点。';
  if (kind === 'model') return '迁移为 TextEditingController、Rx 字段或表单状态。';
  if (kind === 'conditional') return '迁移为 Obx/Visibility/条件渲染，确认默认状态。';
  if (kind === 'loop') return '迁移为 ListView/Column map，确认数据模型和空态。';
  if (kind === 'state') return '作为状态线索参考，最终按状态模型摘要归类。';
  if (kind === 'computed') return '迁移为 Controller getter、数据适配层输出或派生状态。';
  if (kind === 'watch') return '迁移为状态监听、生命周期或 worker。';
  return '根据 Flutter 页面结构和业务需求补充。';
}

function readSourceStyleScss(source: PrototypePageAnalysis): string {
  const stylePath = path.join(source.prototypeRoot, 'prototype/src/style.scss');
  if (!existsSync(stylePath)) return '';
  return readFileSync(stylePath, 'utf8');
}

function parseDesignColorTokens(styleText: string): Map<string, DesignToken> {
  const known = getKnownTokenMaps().colors;
  const tokens = new Map<string, DesignToken>();
  const source = firstCssBlockBody(styleText, ':root') ?? styleText;
  const regex = /(--[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*([^*]+?)\s*\*\/)?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const name = match[1] ?? '';
    const rawValue = (match[2] ?? '').trim();
    if (!name.startsWith('--color-')) continue;
    tokens.set(name, {
      name,
      rawValue,
      value: '',
      target: known[name] ?? targetFromComment(match[3]),
    });
  }

  for (const token of tokens.values()) {
    token.value = resolveDesignTokenValue(token.rawValue, tokens);
  }

  return tokens;
}

function firstCssBlockBody(styleText: string, selector: string): string | undefined {
  const start = styleText.indexOf(selector);
  if (start < 0) return undefined;
  const open = styleText.indexOf('{', start);
  if (open < 0) return undefined;
  const close = styleText.indexOf('}', open + 1);
  if (close < 0) return undefined;
  return styleText.slice(open + 1, close);
}

function targetFromComment(comment: string | undefined): string | undefined {
  if (!comment) return undefined;
  const match = comment.match(/\b(color[A-Z][A-Za-z0-9]*)\b/);
  return match?.[1] ? `themeService.colors.${match[1]}` : undefined;
}

function resolveDesignTokenValue(value: string, tokens: Map<string, DesignToken>, seen = new Set<string>()): string {
  const varMatch = value.match(/var\(\s*(--[\w-]+)/);
  if (varMatch?.[1] && !seen.has(varMatch[1])) {
    seen.add(varMatch[1]);
    const referenced = tokens.get(varMatch[1]);
    if (referenced) return resolveDesignTokenValue(referenced.rawValue, tokens, seen);
  }
  return normalizeColorValue(value);
}

function colorUsageRows(styleTokens: VueStyleTokenHint[], designTokens: Map<string, DesignToken>): string[][] {
  const valueIndex = buildColorValueIndex(designTokens);
  const rows = styleTokens
    .filter((token) => isColorUsageToken(token))
    .map((token) => {
      const cssVariable = token.token.startsWith('--color-') ? token.token : '';
      const colorValue = colorValueFor(token, designTokens);
      return [
        usageLabel(token.selector, token.property),
        cssVariable,
        flutterThemeForColor(token, designTokens, valueIndex),
        colorValue,
      ];
    });

  return limitRows(dedupeRows(rows), 90);
}

function isColorUsageToken(token: VueStyleTokenHint): boolean {
  if (token.property.startsWith('--')) return false;
  if (/radius|shadow/i.test(token.property)) return false;
  if (token.token.startsWith('--') && !token.token.startsWith('--color-')) return false;
  return /(color|background|border|fill|stroke)/i.test(token.property);
}

function colorValueFor(token: VueStyleTokenHint, designTokens: Map<string, DesignToken>): string {
  if (token.token.startsWith('--')) {
    const designValue = designTokens.get(token.token)?.value;
    return normalizeColorValue(designValue || token.fallback || '');
  }
  return normalizeColorValue(token.token);
}

function flutterThemeForColor(
  token: VueStyleTokenHint,
  designTokens: Map<string, DesignToken>,
  valueIndex: Map<string, string | undefined>,
): string {
  if (token.token.startsWith('--color-')) return designTokens.get(token.token)?.target ?? '';
  const value = normalizeColorValue(token.token);
  return valueIndex.get(value) ?? '';
}

function buildColorValueIndex(designTokens: Map<string, DesignToken>): Map<string, string | undefined> {
  const grouped = new Map<string, Set<string>>();
  for (const token of designTokens.values()) {
    if (!token.value || !token.target) continue;
    const targets = grouped.get(token.value) ?? new Set<string>();
    targets.add(token.target);
    grouped.set(token.value, targets);
  }

  const index = new Map<string, string | undefined>();
  for (const [value, targets] of grouped.entries()) {
    index.set(value, targets.size === 1 ? [...targets][0] : undefined);
  }
  return index;
}

function parseTypographyMixins(styleText: string): Map<string, TypographyMixin> {
  const known = getKnownTokenMaps().typography;
  const mixins = new Map<string, TypographyMixin>();
  const regex = /@mixin\s+([\w-]+)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(styleText))) {
    const name = match[1] ?? '';
    const declarations = parseDeclarations(match[2] ?? '');
    const styleTextValue = typographyStyleText(declarations);
    if (!styleTextValue) continue;
    mixins.set(name, {
      name,
      declarations,
      styleText: styleTextValue,
      target: known[`@include ${name}`] ?? known[name],
    });
  }
  return mixins;
}

function typographyUsageRows(styleBlocks: string[], mixins: Map<string, TypographyMixin>): string[][] {
  const blocks = parseCssBlocks(styleBlocks.join('\n'));
  const rows = blocks
    .flatMap((block) => typographyRowsForBlock(block, mixins));
  return limitRows(dedupeRows(rows), 80);
}

function typographyRowsForBlock(block: CssBlock, mixins: Map<string, TypographyMixin>): string[][] {
  const rows: string[][] = [];
  for (const include of block.includes) {
    const mixin = mixins.get(include);
    rows.push([
      usageLabel(block.selector, 'font'),
      `@mixin ${include}`,
      mixin?.target ?? '',
      mixin?.styleText ?? typographyStyleText(block.declarations),
    ]);
  }

  const directStyle = typographyStyleText(block.declarations);
  if (directStyle && hasTypographySignal(block.declarations)) {
    const matchedMixin = findMatchingTypographyMixin(block.declarations, mixins);
    rows.push([
      usageLabel(block.selector, 'font'),
      matchedMixin ? `匹配 @mixin ${matchedMixin.name}` : '',
      matchedMixin?.target ?? '',
      directStyle,
    ]);
  }

  return rows;
}

function hasTypographySignal(declarations: Record<string, string>): boolean {
  return Boolean(declarations['font-size'] || declarations['font-weight'] || declarations['font-family']);
}

function findMatchingTypographyMixin(
  declarations: Record<string, string>,
  mixins: Map<string, TypographyMixin>,
): TypographyMixin | undefined {
  const fontSize = normalizeCssSize(declarations['font-size']);
  const fontWeight = normalizeFontWeight(declarations['font-weight']) ?? (fontSize ? '400' : undefined);
  const lineHeight = normalizeCssSize(declarations['line-height']);
  if (!fontSize || !fontWeight) return undefined;

  for (const mixin of mixins.values()) {
    const mixinSize = normalizeCssSize(mixin.declarations['font-size']);
    const mixinWeight = normalizeFontWeight(mixin.declarations['font-weight']);
    const mixinLineHeight = normalizeCssSize(mixin.declarations['line-height']);
    const lineHeightMatches = !lineHeight || !mixinLineHeight || lineHeight === mixinLineHeight;
    if (fontSize === mixinSize && fontWeight === mixinWeight && lineHeightMatches) return mixin;
  }
  return undefined;
}

function parseCssBlocks(styleText: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  const text = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const regex = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const selector = compactCode(match[1]);
    const body = match[2] ?? '';
    if (!selector || selector.includes('from') || selector.includes('to')) continue;
    blocks.push({
      selector,
      body,
      declarations: parseDeclarations(body),
      includes: [...body.matchAll(/@include\s+([\w-]+)/g)].map((include) => include[1] ?? '').filter(Boolean),
    });
  }
  return blocks;
}

function parseDeclarations(body: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const [rawProperty, ...rawValueParts] = declaration.split(':');
    const property = rawProperty?.trim();
    const value = rawValueParts.join(':').trim();
    if (!property || !value || property.startsWith('@')) continue;
    declarations[property] = value;
  }
  return declarations;
}

function typographyStyleText(declarations: Record<string, string>): string {
  const parts = ['font-size', 'font-weight', 'line-height', 'font-family']
    .flatMap((property) => {
      const value = declarations[property];
      return value ? [`${property}: ${value}`] : [];
    });
  return parts.join('; ');
}

function normalizeCssSize(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const numeric = value.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? value.match(/^(\d+(?:\.\d+)?)$/)?.[1];
  return numeric ? `${Number(numeric)}px` : value.trim();
}

function normalizeFontWeight(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'bold') return '700';
  if (normalized === 'normal') return '400';
  return normalized;
}

function usageLabel(selector: string, property: string): string {
  return `${selector} 的 ${propertyLabel(property)}`;
}

function propertyLabel(property: string): string {
  if (property === 'font') return '字体';
  if (property === 'color') return '文字颜色';
  if (property === 'background' || property === 'background-color') return '背景';
  if (property === 'border' || property.startsWith('border-')) return '边框';
  if (property === 'fill') return 'SVG 填充';
  if (property === 'stroke') return 'SVG 描边';
  return property;
}

function normalizeColorValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hex = trimmed.match(/#(?:[0-9a-f]{3,8})\b/i)?.[0];
  if (hex) return normalizeHex(hex);
  const rgba = trimmed.match(/rgba?\([^\)]+\)/i)?.[0];
  if (rgba) return rgba.replace(/\s+/g, '');
  return trimmed;
}

function normalizeHex(value: string): string {
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return `#${hex.split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  if (hex.length === 4) {
    return `#${hex.slice(0, 3).split('').map((char) => `${char}${char}`).join('')}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return `#${hex}`.toUpperCase();
}

function assetTable(context: MigrationContext): string {
  const assets = context.source.sfc?.assets ?? [];
  if (assets.length === 0) {
    return markdownTable(['资源', 'Flutter 建议路径', '迁移建议'], [
      [
        '待确认资源清单',
        context.target.assetDirectories.join(', ') || 'assets/images',
        '如存在 dark_images 等价资源则同步补齐',
      ],
    ]);
  }

  return markdownTable(['类型', '资源线索', 'Flutter 建议路径', '迁移建议'], assets.map((asset) => [
    asset.kind,
    asset.source ? sanitizeImplementationText(asset.source) : asset.kind === 'inline-svg' ? '内联矢量图' : '图标/图片资源',
    context.target.assetDirectories.join(', ') || 'assets/images',
    sanitizeImplementationText(asset.migrationHint),
  ]));
}

function sanitizeImplementationText(value: string): string {
  return value
    .replace(/Vue\s*/gi, '')
    .replace(/DOM/gi, '页面结构')
    .replace(/@click=\"([^\"]+)\"/g, '$1')
    .replace(/v-if=\"([^\"]+)\"/g, '$1')
    .replace(/v-for=\"([^\"]+)\"/g, '$1')
    .replace(/v-model=\"([^\"]+)\"/g, '$1')
    .replace(/class=\"[^\"]+\"/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\b(ref|reactive|computed|watch)\b/g, (match) => {
      if (match === 'ref' || match === 'reactive') return 'state';
      if (match === 'computed') return 'derived state';
      return 'state listener';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function i18nTable(i18n: Record<string, unknown> | undefined): string {
  if (!i18n) return '未找到 i18n JSON。';

  const locales = ['zh_CN', 'zh_HK', 'en_US'];
  const localeMaps = Object.fromEntries(
    locales.map((locale) => [locale, isRecord(i18n[locale]) ? (i18n[locale] as Record<string, unknown>) : {}]),
  ) as Record<string, Record<string, unknown>>;
  const keys = [
    ...new Set(locales.flatMap((locale) => Object.keys(localeMaps[locale] ?? {}))),
  ].slice(0, 120);

  if (keys.length === 0) return 'i18n JSON 未识别出 zh_CN / zh_HK / en_US 文案。';

  return markdownTable(
    ['key', 'zh_CN', 'zh_HK', 'en_US', 'Flutter 建议'],
    keys.map((key) => [
      key,
      stringifyCell(localeMaps.zh_CN?.[key]),
      stringifyCell(localeMaps.zh_HK?.[key]),
      stringifyCell(localeMaps.en_US?.[key]),
      `'${key}'.tr`,
    ]),
  );
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escapedRows = rows.length > 0 ? rows : [headers.map(() => '')];
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...escapedRows.map((row) => `| ${headers.map((_, index) => escapeCell(row[index] ?? '')).join(' | ')} |`),
  ].join('\n');
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function stringifyCell(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compactCode(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function dedupeRows(rows: string[][]): string[][] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function limitRows(rows: string[][], max: number): string[][] {
  if (rows.length <= max) return rows;
  return [
    ...rows.slice(0, max),
    [`其余 ${rows.length - max} 条样式`, '', '', '已省略重复或低优先级细节，必要时查看 migration-context.json'],
  ];
}

type TreeNode = {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
};

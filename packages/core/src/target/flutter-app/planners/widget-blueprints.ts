import type { FlutterImplementationPlan, FlutterWidgetPlan, PrototypePageAnalysis } from '../../../types/index.js';
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

  for (const item of sourceBackedBlueprint(source)) {
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

function sourceBackedBlueprint(source: PrototypePageAnalysis): WidgetBlueprintItem[] {
  const items: WidgetBlueprintItem[] = [];
  const sections = source.sfc?.sections ?? [];
  const components = source.sfc?.components ?? [];
  const hasSectionKind = (kind: string) => sections.some((section) => section.kind === kind);
  const hasComponentRole = (role: string) => components.some((component) => component.role === role);
  const add = (item: WidgetBlueprintItem): void => {
    items.push(item);
  };

  if (hasSectionKind('app-bar') || hasComponentRole('header')) {
    add({
      role: 'header',
      nameHint: 'Header',
      parent: 'page',
      stateAccess: 'props',
      buildHint: '由 source/runtime header 证据驱动；优先复用目标工程扫描到的 app-bar/header pattern。',
    });
  }

  if (hasSectionKind('tab-bar') || hasComponentRole('tabs') || hasComponentRole('section-tabs')) {
    add({
      role: 'tab-bar',
      nameHint: 'TabBar',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime tab 证据驱动；只实现可见页签、选中态和已解析交互。',
    });
  }

  if (hasFilterLike(source)) {
    add({
      role: 'filter-bar',
      nameHint: 'FilterBar',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime filter/sort 证据驱动；只实现可见筛选、排序或搜索控件。',
    });
  }

  if (hasSectionKind('list') || hasComponentRole('list')) {
    add({
      role: 'data-list',
      nameHint: 'List',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime list 证据驱动；按可见列表项、空态、刷新或分页证据实现。',
    });
  }

  if (hasSectionKind('chart') || hasComponentRole('chart')) {
    add({
      role: 'chart',
      nameHint: 'ChartSection',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime 可见 chart 证据驱动；没有可见证据时不得生成图表 UI。',
    });
  }

  if (hasFormLike(source) && !isOverlayOnlyForm(source)) {
    add({
      role: 'form-section',
      nameHint: 'Form',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime 表单或 v-model 证据驱动；只实现可见字段和校验提示。',
    });
  }

  if (hasContentSection(source)) {
    add({
      role: 'content-section',
      nameHint: 'ContentSection',
      parent: 'body',
      stateAccess: 'props',
      buildHint: '由 source/runtime 内容区块证据驱动；按可见文本、控件和布局组织。',
    });
  }

  if (source.sfc?.fixedBottom || hasSectionKind('bottom-bar') || hasComponentRole('bottom-actions')) {
    add({
      role: 'bottom-actions',
      nameHint: 'BottomActions',
      parent: 'page',
      stateAccess: 'props',
      buildHint: '由 source/runtime fixed bottom 或 bottom action 证据驱动；适配 SafeArea 和可见按钮状态。',
    });
  }

  if (hasSectionKind('modal') || hasComponentRole('modal')) {
    add({
      role: 'overlay-shell',
      nameHint: 'OverlayShell',
      parent: 'page',
      stateAccess: 'props',
      buildHint: '由 source modal/sheet 证据驱动；默认只规划 UI shell，业务副作用待确认。',
    });
  }

  return dedupeBy(items, (item) => `${item.role}:${item.nameHint}`);
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

function hasFilterLike(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.state.some((state) => /filter|search|sort|active/i.test(state.name)))
    || Boolean(source.sfc?.interactions.some((interaction) => /filter|search|sort/i.test(`${interaction.target ?? ''} ${interaction.evidence}`)));
}

function hasFormLike(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.interactions.some((interaction) => interaction.kind === 'model'))
    || Boolean(source.sfc?.state.some((state) => /input|form|field|amount|quantity|qty|price/i.test(state.name)));
}

function isOverlayOnlyForm(source: PrototypePageAnalysis): boolean {
  const modelTargets = source.sfc?.interactions
    .filter((interaction) => interaction.kind === 'model')
    .map((interaction) => interaction.target ?? interaction.evidence) ?? [];
  if (!modelTargets.length) return false;
  const hasModalEvidence = Boolean(source.sfc?.sections.some((section) => section.kind === 'modal'))
    || Boolean(source.sfc?.components.some((component) => component.role === 'modal'));
  return hasModalEvidence && modelTargets.every((target) => /sheet|modal|popup|dialog|rules|warn|success/i.test(target));
}

function hasContentSection(source: PrototypePageAnalysis): boolean {
  return Boolean(source.sfc?.sections.some((section) => section.kind === 'section' || section.kind === 'unknown'))
    || Boolean(source.sfc?.components.some((component) => component.role === 'content-section' || component.role === 'summary' || component.role === 'unknown'));
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

import type {
  CaptureResult,
  FlutterContextAnalysis,
  ImplementationShape,
  MigrationRecommendations,
  PrototypePageAnalysis,
  TokenMapResult,
  WidgetRecommendation,
} from '../../../types/index.js';
import { buildFlutterImplementationPlan } from './migration-planner.js';
import { toPascalCase } from '../planners/naming-strategy.js';

export type BuildFlutterRecommendationsInput = {
  source: PrototypePageAnalysis;
  tokenMap: TokenMapResult;
  target: FlutterContextAnalysis;
  capture?: CaptureResult | undefined;
  captureSkipped: boolean;
};

export function buildFlutterRecommendations(input: BuildFlutterRecommendationsInput): MigrationRecommendations {
  const implementationShape = inferImplementationShape(input.source);
  const widgetBreakdown = buildWidgetBreakdown(input.source, implementationShape);
  const risks = [
    ...input.source.warnings,
    ...input.target.warnings,
    ...(input.capture?.warnings ?? []),
    ...(input.captureSkipped
      ? ['Runtime capture skipped; layout and computed style still need manual review.']
      : []),
    ...(input.tokenMap.unresolved.length > 0
      ? [`${input.tokenMap.unresolved.length} style token(s) were not mapped to semantic Flutter tokens.`]
      : []),
  ];

  const manualQuestions = [
    '确认静态 mock 数据对应真实接口、Controller 字段或本地状态。',
    '确认页面路由参数、返回行为和埋点是否与当前 target conventions 一致。',
    '确认来源资源是否已有 Flutter 侧等价图片或 SVG，可复用时避免重复迁移。',
  ];

  if (!input.capture?.screenshotPath) {
    manualQuestions.push('补一次运行时截图，校对首屏布局、底部栏和弹层位置。');
  }

  return {
    implementationShape,
    widgetBreakdown,
    implementationPlan: buildFlutterImplementationPlan({
      source: input.source,
      target: input.target,
      widgets: widgetBreakdown,
    }),
    risks: dedupe(risks),
    manualQuestions,
  };
}

function inferImplementationShape(source: PrototypePageAnalysis): ImplementationShape {
  const code = source.sourceCode ?? '';
  const hasInteractiveState =
    (source.sfc?.interactions.some((interaction) =>
      ['click', 'model', 'state', 'computed', 'watch'].includes(interaction.kind),
    ) ?? false) || /\b(ref|reactive|computed)\s*\(/.test(code) || /(@click|v-model|watch\s*\()/.test(code);
  if (hasInteractiveState) return 'StatefulWidget';
  return 'StatelessWidget';
}

function buildWidgetBreakdown(
  source: PrototypePageAnalysis,
  implementationShape: ImplementationShape,
): WidgetRecommendation[] {
  const pageName = toPascalCase(source.screenId ?? source.name ?? source.label ?? 'MigratedPage');
  const widgets: WidgetRecommendation[] = [
    {
      name: `${pageName}Page`,
      type: 'page',
      responsibility: '承载页面路由、Controller 绑定、主题和整体 Scaffold。',
      suggestedFlutterWidget: implementationShape,
    },
    {
      name: `${pageName}AppBar`,
      type: 'section',
      responsibility: '迁移顶部导航标题、返回按钮和右侧动作入口。',
      suggestedFlutterWidget: 'CommonAppBar',
    },
    {
      name: `${pageName}Body`,
      type: 'section',
      responsibility: '承载主滚动区内容，按业务块继续拆成私有 Widget。',
    },
  ];

  for (const section of source.sfc?.sections ?? []) {
    if (section.kind === 'unknown') continue;
    if (section.kind === 'app-bar') continue;
    if (section.kind === 'bottom-bar') continue;
    widgets.push({
      name: `${pageName}${section.name}`,
      type: section.kind === 'modal' ? 'dialog' : 'section',
      responsibility: describeSection(section.kind, section.title),
      notes: section.evidence,
    });
  }

  if (source.sfc?.fixedBottom) {
    widgets.push({
      name: `${pageName}BottomBar`,
      type: 'section',
      responsibility: '承载固定底部操作按钮、金额汇总或提交确认入口。',
      suggestedFlutterWidget: 'CommonButton',
    });
  }

  if (source.sfc?.sections.some((section) => section.kind === 'modal')) {
    widgets.push({
      name: `${pageName}Sheet`,
      type: 'sheet',
      responsibility: '承载原型里的底部弹层、确认弹窗或二次选择交互。',
      suggestedFlutterWidget: 'Pop.sheet / YouFiPop',
    });
  }

  return widgets;
}

function describeSection(kind: string, title: string | undefined): string {
  const label = title ? `“${title}”` : '该';
  if (kind === 'tab-bar') return `迁移${label}页签切换、选中态和对应内容联动。`;
  if (kind === 'list') return `迁移${label}列表/数据行，确认数据来源、空态和点击行为。`;
  if (kind === 'chart') return `迁移${label}图表区域，确认 Flutter 侧图表组件或自绘方案。`;
  if (kind === 'modal') return `迁移${label}弹层内容、打开关闭状态和确认动作。`;
  return `迁移${label}内容区，按标题、字段和值映射到 Flutter 私有 Widget。`;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

import type {
  CaptureResult,
  FlutterContextAnalysis,
  GenerateMigrationSpecInput,
  ImplementationShape,
  MigrationContext,
  MigrationRecommendations,
  PrototypePageAnalysis,
  TokenMapResult,
  WidgetRecommendation,
} from '../types/index.js';
import { analyzeFlutterContext } from '../analyzers/flutter-context.js';
import { analyzePrototypePage } from '../analyzers/prototype-page.js';
import { capturePrototypePage } from '../capture/playwright-capture.js';
import { mapTokens } from '../tokens/token-mapper.js';

export async function createMigrationContext(input: GenerateMigrationSpecInput): Promise<MigrationContext> {
  if (input.target && input.target !== 'flutter') {
    throw new Error(`Unsupported target: ${input.target}. Phase 1 only supports flutter.`);
  }

  const source = await analyzePrototypePage({
    prototypeRoot: input.prototypeRoot,
    route: input.route,
    vue: input.vue,
  });

  const capture = await maybeCapture(input);
  const tokenMap = mapTokens({
    sourceCode: source.sourceCode,
    target: 'flutter',
  });
  const target = await analyzeFlutterContext({
    flutterRoot: input.flutterRoot,
    prototypeModule: source.module,
    screenId: source.screenId,
    route: source.route,
  });

  return {
    source,
    capture,
    tokenMap,
    target,
    recommendations: buildRecommendations(source, tokenMap, target, capture, input),
  };
}

function buildRecommendations(
  source: PrototypePageAnalysis,
  tokenMap: TokenMapResult,
  target: FlutterContextAnalysis,
  capture: CaptureResult | undefined,
  input: GenerateMigrationSpecInput,
): MigrationRecommendations {
  const implementationShape = inferImplementationShape(source);
  const widgetBreakdown = buildWidgetBreakdown(source, implementationShape);
  const risks = [
    ...source.warnings,
    ...target.warnings,
    ...(capture?.warnings ?? []),
    ...(input.noCapture || !input.prototypeUrl
      ? ['Runtime capture skipped; layout and computed style still need manual review.']
      : []),
    ...(tokenMap.unresolved.length > 0
      ? [`${tokenMap.unresolved.length} style token(s) were not mapped to semantic Flutter tokens.`]
      : []),
  ];

  const manualQuestions = [
    '确认原型中的静态 mock 数据对应真实接口、Controller 字段或本地状态。',
    '确认页面路由参数、返回行为和埋点是否与 YouFi 现有模块一致。',
    '确认原型资源是否已有 Flutter 侧等价图片或 SVG，可复用时避免重复迁移。',
  ];

  if (!capture?.screenshotPath) {
    manualQuestions.push('补一次运行时截图，校对首屏布局、底部栏和弹层位置。');
  }

  return {
    implementationShape,
    widgetBreakdown,
    risks: dedupe(risks),
    manualQuestions,
  };
}

async function maybeCapture(input: GenerateMigrationSpecInput): Promise<CaptureResult | undefined> {
  if (input.noCapture || !input.prototypeUrl) return undefined;

  try {
    return await capturePrototypePage({
      url: input.prototypeUrl,
      outDir: input.outDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      warnings: [`Playwright capture failed: ${message}`],
    };
  }
}

function inferImplementationShape(source: PrototypePageAnalysis): ImplementationShape {
  const code = source.sourceCode ?? '';
  const hasInteractiveState =
    (source.sfc?.interactions.some((interaction) =>
      ['click', 'model', 'state', 'computed', 'watch'].includes(interaction.kind),
    ) ?? false) || /\b(ref|reactive|computed)\s*\(/.test(code) || /(@click|v-model|watch\s*\()/.test(code);
  if (hasInteractiveState) return 'BaseGetView';
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

function toPascalCase(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9]+/g, ' ');
  const result = normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
  return result || 'Migrated';
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

import { defaultAdapterRegistry } from '../../adapters/registry.js';
import type {
  CaptureResult,
  MigrationContext,
  PrototypePageAnalysis,
  FlutterContextAnalysis,
  SourceAwareReviewProjection,
} from '../../types/index.js';
import { classifyPagePattern } from '../../target/flutter-app/planners/page-pattern-classifier.js';

const DEFAULT_TARGET_ADAPTER = 'flutter-app';

export function renderSourceAwareBrief(input: {
  source: PrototypePageAnalysis;
  target: FlutterContextAnalysis;
  capture?: CaptureResult | undefined;
  targetAdapter?: string | undefined;
}): { context: MigrationContext; markdown: string; review: SourceAwareReviewProjection } {
  const targetAdapter = defaultAdapterRegistry.getTarget(input.targetAdapter ?? DEFAULT_TARGET_ADAPTER);
  const tokenMap = targetAdapter.mapTokens({
    sourceCode: input.source.sourceCode,
  });
  const recommendations = targetAdapter.buildRecommendations({
    source: input.source,
    tokenMap,
    target: input.target,
    capture: input.capture,
    captureSkipped: !input.capture,
  });
  const context: MigrationContext = {
    source: input.source,
    capture: input.capture,
    tokenMap,
    target: input.target,
    recommendations,
  };
  return {
    context,
    markdown: targetAdapter.renderMigrationSpec(context),
    review: buildSourceAwareReview(context),
  };
}

function buildSourceAwareReview(context: MigrationContext): SourceAwareReviewProjection {
  const source = context.source;
  const plan = context.recommendations.implementationPlan;
  const title = source.label ?? source.title ?? source.screenId ?? source.name ?? '未命名页面';
  const classified = classifyPagePattern(source);
  return {
    title,
    parityChecklist: buildParityChecklist(context),
    metadata: {
      route: source.route,
      screenId: source.screenId,
      sourceModule: source.module,
      targetModule: context.target.suggestedModule,
      implementationShape: context.recommendations.implementationShape,
      status: source.status,
      owner: source.owner,
    },
    summary: [
      `Source route: ${source.route ?? '待确认'}`,
      `Screen id: ${source.screenId ?? '待确认'}`,
      `Source module: ${source.module ?? '待确认'}`,
      `Target module: ${context.target.suggestedModule ?? '待确认'}`,
      `Semantic sections: ${source.sfc?.sections.length ?? 0}`,
      `Semantic components: ${source.sfc?.components.length ?? 0}`,
      `State hints: ${source.sfc?.state.length ?? 0}`,
      `Interaction hints: ${source.sfc?.interactions.length ?? 0}`,
    ],
    implementation: {
      complexity: plan.complexity,
      shape: context.recommendations.implementationShape,
      targetModule: context.target.suggestedModule,
      pattern: classified.pattern,
      patternConfidence: classified.confidence,
      directImplementation: context.recommendations.risks.length <= 2 ? '可以进入实现' : '先确认风险后实现',
      summary: plan.summary,
      risks: context.recommendations.risks,
    },
    files: plan.fileTree,
    widgets: plan.widgetTree,
    widgetContracts: plan.widgetContracts,
    controllerBoundaries: plan.controllerBoundaries,
    stateStrategy: plan.stateStrategy,
    doNotTranslate: plan.doNotTranslate,
    routes: (source.sfc?.routes ?? []).map((route) => ({
      action: route.action,
      target: route.target,
      params: route.params,
      migrationHint: route.migrationHint,
    })),
    lifecycle: (source.sfc?.lifecycle ?? []).map((item) => ({
      hook: item.hook,
      target: item.target,
      migrationHint: item.migrationHint,
    })),
    layout: (source.sfc?.layout ?? []).map((item) => ({
      selector: item.selector,
      kind: item.kind,
      migrationHint: item.migrationHint,
    })),
    interactions: (source.sfc?.interactions ?? []).map((interaction) => ({
      kind: interaction.kind,
      target: interaction.target,
      migrationHint: interaction.evidence,
    })),
    styleTokens: (source.sfc?.styleTokens ?? []).map((token) => ({
      selector: token.selector,
      property: token.property,
      token: token.token,
      fallback: token.fallback,
    })),
    i18n: source.i18n ?? {},
    assets: (source.sfc?.assets ?? []).map((asset) => ({
      kind: asset.kind,
      source: asset.source,
      migrationHint: asset.migrationHint,
    })),
    reusable: {
      widgets: context.target.reusableWidgets,
      routesFiles: context.target.routesFiles,
      translationFiles: context.target.translationFiles,
      assetDirectories: context.target.assetDirectories,
      similarFiles: context.target.similarFiles,
    },
    manualQuestions: [
      ...context.recommendations.manualQuestions,
      ...plan.checklist.map((item) => `${item.priority}: ${item.item}`),
    ],
  };
}

function buildParityChecklist(context: MigrationContext): SourceAwareReviewProjection['parityChecklist'] {
  const source = context.source;
  const plan = context.recommendations.implementationPlan;
  return [
    {
      section: '页面元信息',
      status: source.route || source.screenId || context.target.suggestedModule ? 'covered' : 'partial',
      evidence: ['source.route', 'source.screenId', 'target.suggestedModule'],
    },
    {
      section: '迁移结论',
      status: plan.summary && context.recommendations.risks ? 'covered' : 'partial',
      evidence: ['implementationPlan.summary', 'recommendations.risks'],
    },
    {
      section: 'Flutter 实现规划',
      status: plan.fileTree.length && plan.widgetTree.length && plan.widgetContracts.length ? 'covered' : 'partial',
      evidence: ['fileTree', 'widgetTree', 'widgetContracts'],
    },
    {
      section: '状态与交互建议',
      status: plan.stateStrategy.length || (source.sfc?.interactions.length ?? 0) ? 'covered' : 'partial',
      evidence: ['stateStrategy', 'source.sfc.interactions'],
    },
    {
      section: '路由与布局',
      status: source.route || (source.sfc?.layout.length ?? 0) ? 'covered' : 'partial',
      evidence: ['source.route', 'source.sfc.routes', 'source.sfc.layout'],
    },
    {
      section: '样式、i18n 和资源',
      status: (source.sfc?.styleTokens.length ?? 0) || source.i18n || (source.sfc?.assets.length ?? 0) ? 'covered' : 'partial',
      evidence: ['source.sfc.styleTokens', 'source.i18n', 'source.sfc.assets'],
    },
    {
      section: '可复用组件',
      status: context.target.reusableWidgets.length ? 'covered' : 'partial',
      evidence: ['target.reusableWidgets', 'target.routesFiles', 'target.assetDirectories'],
    },
    {
      section: '人工确认项',
      status: context.recommendations.manualQuestions.length || plan.checklist.length ? 'covered' : 'partial',
      evidence: ['manualQuestions', 'checklist'],
    },
  ];
}

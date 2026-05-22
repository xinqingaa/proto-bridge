import path from 'node:path';
import type {
  ComponentMapping,
  FlutterComponentRef,
  FlutterComponentRole,
  FlutterControllerBoundary,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterStateStrategy,
  FlutterTargetConventionProfile,
  FlutterWidgetContract,
  FlutterWidgetPlan,
  InteractionPlan,
  PageCanonical,
  PageSnapshotNode,
  SnapshotNodeRole,
  ThemeMapping,
  ThemeMappingGroups,
  UiNodeAudit,
  UiNodeAuditChild,
  UiNodeAuditControl,
  UiNodeAuditInstance,
  UiNodeAuditInstanceDelta,
  UiNodeAuditLayoutConflict,
  UiNodeAuditKind,
  UiNodeAuditNoiseLevel,
  UiNodeAuditPriority,
  UiNodeAuditStyle,
  UiTargetComponentCandidate,
  UiActionMapping,
  UiBuildPlan,
  UiDynamicTextHint,
  UiImplementationContract,
  UiImplementationIndex,
  UiInteractionTarget,
  UiOverlayPlan,
  UiPlanLayoutConflict,
  UiSourceSemantics,
  UiVisualPlan,
  VueSemanticComponent,
  VueInteractionHint,
  VueTemplateSection,
  SourceAwareReviewProjection,
  MappingConfidence,
} from '../../../types/index.js';
import { getFlutterTargetConventions } from '../conventions.js';
import { findFlutterTargetExamples } from '../examples.js';
import { resolveFlutterColorTarget, resolveFlutterTypographyMixinTarget, resolveFlutterTypographyTarget } from '../theme-mapping.js';
import { toPascalCase, toSnakeCase } from './migration-planner.js';

export type BuildFlutterUiReconstructionPlanInput = {
  evidence: PageCanonical;
  targetRoot: string;
  targetModule?: string | undefined;
  sourceAwareImplementationPlan?: FlutterImplementationPlan | undefined;
  sourceReview?: SourceAwareReviewProjection | undefined;
};

export async function buildFlutterUiReconstructionPlan(
  input: BuildFlutterUiReconstructionPlanInput,
): Promise<UiBuildPlan> {
  const targetRoot = path.resolve(input.targetRoot);
  const roles = rolesForEvidence(input.evidence);
  const initialConventions = await getFlutterTargetConventions({
    flutterRoot: targetRoot,
    module: input.targetModule,
    roles,
  });
  const moduleName = input.targetModule ?? inferModule(input.evidence, initialConventions.existingModules) ?? 'feature';
  const conventions = initialConventions.module === moduleName
    ? initialConventions
    : await getFlutterTargetConventions({
      flutterRoot: targetRoot,
      module: moduleName,
      roles,
    });
  const examples = await findFlutterTargetExamples({
    flutterRoot: targetRoot,
    module: moduleName,
    pattern: inferPattern(input.evidence),
    roles,
    screenId: input.evidence.page.route,
    limit: 8,
  });
  const pageName = inferPageName(input.evidence);
  const baseDir = `lib/app/modules/${moduleName}/${toSnakeCase(pageName)}`;
  const runtimeWidgetTree = buildRuntimeWidgetTree(pageName, input.evidence);
  const componentMappings = buildComponentMappings(input.evidence, conventions.components);
  const visualPlan = buildVisualPlan(input.evidence, {
    components: conventions.components,
    componentMappings,
  });
  const fallbackPlan = buildFallbackImplementationPlan(baseDir, pageName, runtimeWidgetTree);
  const implementationContract = buildImplementationContract({
    evidence: input.evidence,
    sourceAwarePlan: input.sourceAwareImplementationPlan,
    sourceReview: input.sourceReview,
    fallbackPlan,
    targetConventions: conventions.targetConventions,
    targetComponents: conventions.components,
    visualPlan,
  });
  const nodeAuditHints = buildNodeAuditValidationHints(visualPlan.nodeAudits);
  const themeMappings = buildThemeMappings(input.evidence, conventions.targetConventions);

  return {
    id: createPlanId(input.evidence.id),
    pageId: input.evidence.id,
    target: {
      root: targetRoot,
      module: moduleName,
      existingModules: conventions.existingModules,
      routesFiles: conventions.routesFiles,
      translationFiles: conventions.translationFiles,
      assetDirectories: conventions.assetDirectories,
      reusableComponents: conventions.components,
      similarExamples: examples,
      warnings: conventions.warnings,
    },
    targetConventions: conventions.targetConventions,
    implementationContract,
    visualPlan,
    page: {
      title: input.evidence.page.title,
      route: input.evidence.page.route,
      summary: buildSummary(input.evidence),
      viewport: input.evidence.viewport ?? { width: 0, height: 0 },
    },
    fileTree: implementationContract.fileTree,
    widgetTree: implementationContract.widgetTree,
    componentMappings,
    themeMappings,
    themeMappingGroups: buildThemeMappingGroups(themeMappings),
    i18nPlan: buildI18nPlan(input.evidence),
    assetPlan: buildAssetPlan(input.evidence),
    interactionPlan: buildInteractionPlan(input.evidence),
    businessQuestions: buildBusinessQuestions(input.evidence),
    risks: buildRisks(input.evidence),
    validationHints: [
      'Compare the generated Flutter screen against the source screenshot before adding business behavior.',
      'Before implementing repeated cards, list items, tabs, filters, buttons, chips, appbar actions, or bottom actions, read visualPlan.nodeAudits and preserve its row order, visible fields, padding, radius, and control evidence.',
      'Do not add display fields that are absent from the representative nodeAudits unless sourceSemantics or user confirmation explicitly requires them.',
      'For count labels beside section headers, derive the value from the backing UI model/list length when available instead of hard-coding a translation key with a fixed number.',
      'Treat typography, CSS colors, spacing, and layout as P0 visual fidelity items; prefer exact evidence matches before approximate fallback.',
      'Use node-level themeMappings first; when a theme token is resolved exactly, do not replace it with a larger or heavier nearby token.',
      'If a typography themeMapping has lockToken=true, use the target textStyles token directly and do not override fontSize, height, fontWeight, or fontFamily unless the plan explicitly lists a source override.',
      'Check spacing, radius, border, and shadow values against reusable target widgets before introducing local constants.',
      'When a nodeAudit control provides padding and borderRadius evidence, prefer padding-driven Flutter layout over fixed height unless the target component API requires a fixed extent.',
      'Keep business data, API fields, permission checks, risk controls, and tracking as TODOs unless confirmed by target examples.',
      'Prefer similar module examples and common widgets over one-to-one DOM translation.',
      ...nodeAuditHints,
      ...buildContractValidationHints(implementationContract),
    ],
  };
}

function buildContractValidationHints(contract: UiImplementationContract): string[] {
  const hints: string[] = [];
  if (contract.widgetContracts.some((contractItem) => contractItem.callbacks.some((callback) => /^on(History|Rules|Back|Navigate|Exercise|Dne)/.test(callback)))) {
    hints.push('Widget callbacks include source-bound actions; do not replace them with generic onMore/onTap names or hide visible app-bar/header actions.');
  }
  if (contract.conflicts.length) {
    hints.push('Resolve implementationContract.conflicts before coding affected layout containers; these are source-structure versus runtime-layout decisions, not ordinary visual hints.');
  }
  if (contract.overlayPlan.some((overlay) => overlay.uiShellRequired)) {
    hints.push('Implement overlay UI shells listed in implementationContract.overlayPlan even when businessBehaviorRequired=false; keep API submission and real business side effects as TODO.');
  }
  return hints;
}

function rolesForEvidence(evidence: PageCanonical): FlutterComponentRole[] {
  const roles = new Set<FlutterComponentRole>(['page-base', 'theme', 'i18n']);
  if (evidence.nodes.some((node) => node.role === 'app-bar')) roles.add('app-bar');
  if (evidence.nodes.some((node) => node.role === 'button')) roles.add('button');
  if (evidence.nodes.some((node) => node.role === 'image' || node.role === 'icon')) roles.add('image');
  if (evidence.nodes.some((node) => node.role === 'modal')) roles.add('sheet');
  if (evidence.sections.some((section) => section.role === 'list')) roles.add('refresh');
  for (const section of sourceSections(evidence)) {
    const role = sourceSectionRole(section);
    if (role === 'app-bar') roles.add('app-bar');
    if (role === 'button') roles.add('button');
    if (role === 'image' || role === 'icon') roles.add('image');
    if (role === 'modal') roles.add('sheet');
    if (role === 'list') roles.add('refresh');
  }
  for (const component of sourceComponents(evidence)) {
    const role = sourceComponentRole(component);
    if (role === 'app-bar') roles.add('app-bar');
    if (role === 'button') roles.add('button');
    if (role === 'image' || role === 'icon') roles.add('image');
    if (role === 'modal') roles.add('sheet');
    if (role === 'list') roles.add('refresh');
  }
  return [...roles];
}

function inferModule(evidence: PageCanonical, existingModules: string[]): string | undefined {
  const sourceModule = evidence.sourceFacts?.analysis.module;
  if (sourceModule && existingModules.includes(sourceModule)) return sourceModule;
  const targetModule = evidence.targetFacts?.analysis.suggestedModule;
  if (targetModule && existingModules.includes(targetModule)) return targetModule;
  const route = evidence.page.route ?? evidence.source.route ?? evidence.source.url ?? '';
  const segments = route.split(/[/?#&.=_-]+/).filter((item) => item.length >= 3);
  for (const segment of segments) {
    if (existingModules.includes(segment)) return segment;
  }
  const lowered = route.toLowerCase();
  if (lowered.includes('stock') && existingModules.includes('order')) return 'order';
  if (lowered.includes('option') && existingModules.includes('option')) return 'option';
  if ((lowered.includes('asset') || lowered.includes('account')) && existingModules.includes('account')) return 'account';
  if (lowered.includes('auth') && existingModules.includes('auth')) return 'auth';
  return existingModules[0];
}

function inferPattern(evidence: PageCanonical): string {
  const source = evidence.sourceFacts?.analysis;
  const components = source?.sfc?.components ?? [];
  if (components.some((component) => component.role === 'chart')) return 'dashboard';
  if (components.some((component) => component.role === 'list')) return 'list';
  if (source?.sfc?.interactions.some((interaction) => interaction.kind === 'model')) return 'form';
  if (evidence.sections.some((section) => section.role === 'list')) return 'list';
  if (evidence.nodes.some((node) => node.role === 'input')) return 'form';
  if (evidence.sections.length >= 6) return 'dashboard';
  return 'detail';
}

function inferPageName(evidence: PageCanonical): string {
  const source = evidence.sourceFacts?.analysis;
  const route = evidence.page.route ?? source?.route ?? evidence.source.url ?? evidence.page.title ?? 'SnapshotPage';
  const lastSegment = route.split(/[/?#]/)[0]?.split('/').filter(Boolean).at(-1);
  return toPascalCase(source?.screenId ?? source?.name ?? lastSegment ?? evidence.page.title ?? 'SnapshotPage');
}

function buildSummary(evidence: PageCanonical): string {
  const sectionCount = evidence.sections.length;
  const textCount = evidence.text.length;
  const assetCount = evidence.assets.length;
  const source = evidence.sourceFacts?.analysis;
  const sourceSummary = source?.sfc
    ? `source facts 包含 ${source.sfc.sections.length} 个语义区块、${source.sfc.components.length} 个语义组件、${source.sfc.interactions.length} 个交互线索和 ${source.sfc.state.length} 个状态线索。`
    : '';
  const capabilityHints = [
    evidence.capabilities.runtimeMetadata ? 'runtime metadata' : '',
    evidence.capabilities.pageList ? 'page list' : '',
    evidence.capabilities.tabTraversal ? 'tab traversal' : '',
    evidence.capabilities.needsOcr ? 'ocr fallback' : '',
  ].filter(Boolean);
  return `该计划来自统一 PageCanonical，聚焦可见 UI 还原；识别到 ${sectionCount} 个视觉区块、${textCount} 条文案线索和 ${assetCount} 个资源线索。${sourceSummary}${capabilityHints.length > 0 ? `增强能力包括 ${capabilityHints.join('、')}。` : ''}业务接口、权限、风控和埋点不在本计划中做确定性推断。`;
}

function buildRuntimeFileTree(baseDir: string, pageName: string, widgetTree: FlutterWidgetPlan[]): FlutterPlannedFile[] {
  const pageSnake = toSnakeCase(pageName);
  const files: FlutterPlannedFile[] = [
    {
      path: `${baseDir}/${pageSnake}_page.dart`,
      responsibility: '页面入口，按目标工程页面模式、Scaffold/SafeArea 和可见区块编排 UI。',
      notes: '只实现可见 UI；业务数据和接口接入保留 TODO。',
    },
    {
      path: `${baseDir}/${pageSnake}_controller.dart`,
      responsibility: '承载轻量 UI 状态，例如 tab、选中项、展开态和点击事件占位；具体状态表达以 targetConventions 为准。',
      notes: '不得在 Phase 1 中伪造接口字段、权限或交易规则。',
    },
    {
      path: `${baseDir}/${pageSnake}_binding.dart`,
      responsibility: '注册页面状态/依赖边界，保持与目标模块内相似页面一致。',
    },
  ];

  for (const widget of widgetTree.filter((item) => item.parent).slice(0, 10)) {
    files.push({
      path: `${baseDir}/widgets/${toSnakeCase(widget.name)}.dart`,
      responsibility: widget.buildHint,
      notes: widget.role,
    });
  }

  return dedupeBy(files, (file) => file.path);
}

function buildRuntimeWidgetTree(pageName: string, evidence: PageCanonical): FlutterWidgetPlan[] {
  const rootName = `${pageName}Page`;
  const widgets: FlutterWidgetPlan[] = [
    {
      name: rootName,
      role: 'page',
      buildHint: '使用目标工程页面模式承载整体结构，按 visualPlan.sections 编排可见 UI。',
      stateAccess: 'controller',
    },
  ];

  for (const section of evidence.sections.slice(0, 12)) {
    const nameHint = section.title ? toPascalCase(section.title).slice(0, 40) : toPascalCase(section.role);
    widgets.push({
      name: `${pageName}${nameHint || toPascalCase(section.role)}`,
      parent: rootName,
      role: section.role,
      buildHint: buildSectionHint(section, evidence),
      stateAccess: section.role === 'tab-bar' || section.role === 'bottom-bar' ? 'controller-slice' : 'props',
    });
  }

  if (widgets.length === 1) {
    for (const section of sourceSections(evidence).slice(0, 16)) {
      const role = sourceSectionRole(section);
      const nameHint = section.title ?? section.name ?? role;
      widgets.push({
        name: `${pageName}${toPascalCase(nameHint).slice(0, 40)}`,
        parent: rootName,
        role,
        buildHint: sourceSectionHint(section),
        stateAccess: role === 'tab-bar' || role === 'bottom-bar' ? 'controller-slice' : 'props',
      });
    }
  }

  return dedupeBy(widgets, (widget) => widget.name);
}

function buildFallbackImplementationPlan(
  baseDir: string,
  pageName: string,
  runtimeWidgetTree: FlutterWidgetPlan[],
): Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'> {
  return {
    fileTree: buildRuntimeFileTree(baseDir, pageName, runtimeWidgetTree),
    widgetTree: runtimeWidgetTree,
    stateStrategy: [],
    controllerBoundaries: [],
    widgetContracts: runtimeWidgetTree
      .filter((widget) => widget.parent)
      .map((widget) => ({
        widget: widget.name,
        inputs: ['visible layout/content props'],
        callbacks: [],
        shouldReadController: widget.stateAccess === 'controller',
        notes: 'Fallback contract generated from visual evidence because source-aware implementation plan was unavailable.',
      })),
  };
}

function buildImplementationContract(input: {
  evidence: PageCanonical;
  sourceAwarePlan?: FlutterImplementationPlan | undefined;
  sourceReview?: SourceAwareReviewProjection | undefined;
  fallbackPlan: Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'>;
  targetConventions: FlutterTargetConventionProfile;
  targetComponents: FlutterComponentRef[];
  visualPlan: UiVisualPlan;
}): UiImplementationContract {
  const logical = input.sourceAwarePlan ?? input.fallbackPlan;
  const contractWarnings = normalizeContractWarnings(input.targetConventions);
  const stateBinding = stateBindingFor(input.targetConventions);
  const sourceSemantics = enhanceSourceSemanticsWithVisualActions(
    buildSourceSemantics(input.sourceReview, logical),
    input.visualPlan,
  );
  const conflicts = buildPlanLayoutConflicts(input.evidence, input.visualPlan);
  const overlayPlan = buildOverlayPlan(input.evidence, input.targetComponents);
  const implementationIndex = buildImplementationIndex(input.visualPlan, conflicts, overlayPlan);
  return {
    logicalPlanSource: input.sourceAwarePlan
      ? 'source-aware implementation plan normalized by target conventions'
      : 'visual evidence fallback normalized by target conventions; source-aware implementation plan unavailable',
    sourceSemantics,
    fileTree: normalizeFileTree(logical.fileTree, input.targetConventions),
    widgetTree: logical.widgetTree.map((widget) => normalizeWidget(widget, input.targetConventions)),
    stateStrategy: (logical.stateStrategy ?? []).map((strategy) => normalizeStateStrategy(strategy, input.targetConventions)),
    controllerBoundaries: (logical.controllerBoundaries ?? []).map((boundary) => normalizeControllerBoundary(boundary, input.targetConventions)),
    widgetContracts: normalizeWidgetContractsWithEvidence({
      contracts: logical.widgetContracts ?? [],
      targetConventions: input.targetConventions,
      visualPlan: input.visualPlan,
      sourceSemantics,
    }),
    implementationIndex,
    conflicts,
    overlayPlan,
    targetBindings: {
      pageBase: {
        patternRef: 'targetConventions.architectureProfile.state/routing',
        pattern: input.targetConventions.architectureProfile.state.pattern,
      },
      state: {
        patternRef: stateBinding.patternRef,
        pattern: stateBinding.pattern,
        scope: stateBinding.scope,
      },
      routing: {
        patternRef: input.targetConventions.architectureProfile.routing.registration?.pattern !== 'unknown'
          ? 'targetConventions.architectureProfile.routing.registration'
          : 'targetConventions.architectureProfile.routing',
        pattern: input.targetConventions.architectureProfile.routing.registration?.pattern !== 'unknown'
          ? input.targetConventions.architectureProfile.routing.registration?.pattern
          : input.targetConventions.architectureProfile.routing.pattern,
      },
      i18n: {
        patternRef: 'targetConventions.architectureProfile.i18n.lookup',
        pattern: input.targetConventions.architectureProfile.i18n.lookup?.pattern ?? input.targetConventions.architectureProfile.i18n.pattern,
      },
      theme: {
        patternRef: 'targetConventions.architectureProfile.theme',
        patterns: input.targetConventions.architectureProfile.theme.patterns,
      },
      fileOrganization: {
        patternRef: 'targetConventions.architectureProfile.fileOrganization',
        pattern: input.targetConventions.architectureProfile.fileOrganization.pattern,
      },
    },
    rules: [
      'Do not introduce a new state/routing/i18n/theme framework unless target conventions or user config explicitly support it.',
      'Use source-aware widget contracts for decomposition.',
      'Use visualPlan for visible layout and styling evidence.',
      'Do not create implementation widgets, files, inputs, or callbacks from fixed business page templates; contracts must be backed by source structure, runtime evidence, or target conventions.',
      'For app-bar/header actions, bind each visible action to source interactions before naming callbacks or choosing icons.',
      'When source structure and runtime layout disagree, treat implementationContract.conflicts as a required decision before coding the container layout.',
      'When implementationContract.overlayPlan marks uiShellRequired=true, implement the overlay shell even if business behavior remains TODO.',
      'If target conventions are unknown, report warnings instead of guessing.',
    ],
    contractWarnings,
    manualQuestions: [
      ...contractWarnings.map((warning) => `Confirm target convention: ${warning}`),
      ...conflicts.filter((conflict) => conflict.requiresDecision).map((conflict) =>
        `Resolve ${conflict.type} for ${conflict.sourceNodeId}: ${conflict.decisionOptions.join(' / ')}`,
      ),
    ],
  };
}

function buildImplementationIndex(
  visualPlan: UiVisualPlan,
  conflicts: UiPlanLayoutConflict[],
  overlayPlan: UiOverlayPlan[],
): UiImplementationIndex {
  const appBarNodes = visualPlan.nodeAudits
    .filter((audit) => audit.kind === 'app-bar' || audit.kind === 'appbar-action')
    .map((audit) => audit.sourceNodeId);
  const repeatedItemNodes = visualPlan.nodeAudits
    .filter((audit) => audit.kind === 'card' || audit.kind === 'list-item')
    .flatMap((audit) => audit.repeatedGroup?.instanceNodeIds ?? [audit.sourceNodeId]);
  const repeatedGroups = visualPlan.nodeAudits
    .filter((audit) => audit.repeatedGroup)
    .map((audit) => ({
      groupId: audit.repeatedGroup?.groupId ?? audit.sourceNodeId,
      representativeNodeId: audit.repeatedGroup?.representativeNodeId ?? audit.sourceNodeId,
      instanceNodeIds: audit.repeatedGroup?.instanceNodeIds ?? [audit.sourceNodeId],
    }));
  const mainScreenNodes = dedupe([
    ...appBarNodes,
    ...visualPlan.nodeAudits
      .filter((audit) => ['section', 'filter', 'sort-control', 'list', 'card', 'list-item', 'button', 'chip', 'tab', 'bottom-action'].includes(audit.kind))
      .map((audit) => audit.sourceNodeId),
  ]);
  const layoutConflictNodes = dedupe(conflicts.map((conflict) => conflict.sourceNodeId));
  const overlayRefs = overlayPlan.map((overlay) => overlay.id);
  const sourceOnlyDeferred = overlayPlan
    .filter((overlay) => overlay.visualEvidence === 'source-only')
    .map((overlay) => overlay.id);
  const highRiskFirst = [
    ...conflicts.filter((conflict) => conflict.requiresDecision).map((conflict) => ({
      ref: conflict.sourceNodeId,
      reason: `${conflict.type}: resolve source/runtime layout decision before coding.`,
    })),
    ...visualPlan.nodeAudits
      .filter((audit) => audit.actionMappings.length > 0)
      .map((audit) => ({
        ref: audit.sourceNodeId,
        reason: 'Visible controls have source-bound action mappings; preserve callback semantics and visual order.',
      })),
    ...overlayPlan
      .filter((overlay) => overlay.uiShellRequired)
      .map((overlay) => ({
        ref: overlay.id,
        reason: 'Source-only overlay UI shell is required even when business behavior remains TODO.',
      })),
  ];
  const phaseHintCandidates: UiImplementationIndex['phaseHints'] = [
    {
      phase: 'pre-implementation-decision',
      refs: layoutConflictNodes,
      guidance: 'Resolve source/runtime layout conflicts before coding affected containers.',
    },
    {
      phase: 'main-screen',
      refs: mainScreenNodes,
      guidance: 'Implement app bar, section/filter structure, repeated cards/list items, and visible controls first.',
    },
    {
      phase: 'deferred-overlay-ui-shell',
      refs: overlayRefs,
      guidance: 'Overlay evidence is retained and UI shells are required, but source-only visual fidelity may be implemented after the main screen pass.',
    },
  ];
  const phaseHints: UiImplementationIndex['phaseHints'] = phaseHintCandidates.filter((hint) => hint.refs.length > 0);
  return {
    mainScreenNodes,
    repeatedItemNodes: dedupe(repeatedItemNodes),
    repeatedGroups,
    appBarNodes,
    layoutConflictNodes,
    overlayRefs,
    sourceOnlyDeferred,
    highRiskFirst: dedupeBy(highRiskFirst, (item) => item.ref),
    phaseHints,
  };
}

function buildSourceSemantics(
  sourceReview: SourceAwareReviewProjection | undefined,
  logical: Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'>,
): UiSourceSemantics | undefined {
  if (!sourceReview) {
    return {
      summary: [],
      businessSections: logical.widgetTree.map((widget) => ({
        name: widget.name,
        role: widget.role,
        ...(widget.parent ? { parent: widget.parent } : {}),
        responsibility: normalizeSourceSemanticsLanguage(widget.buildHint),
        inputs: (logical.widgetContracts.find((contract) => contract.widget === widget.name)?.inputs ?? []).map(normalizeSourceSemanticsLanguage),
        callbacks: (logical.widgetContracts.find((contract) => contract.widget === widget.name)?.callbacks ?? []).map(normalizeSourceSemanticsLanguage),
      })),
      stateIntent: logical.stateStrategy.map((strategy) => ({
        concern: normalizeSourceSemanticsLanguage(strategy.concern),
        owner: normalizeSourceSemanticsLanguage(strategy.owner),
        recommendation: normalizeSourceSemanticsLanguage(strategy.recommendation),
        ...(strategy.evidence ? { evidence: normalizeSourceSemanticsLanguage(strategy.evidence) } : {}),
      })),
      routeIntent: [],
      lifecycleIntent: [],
      interactionIntent: [],
      layoutIntent: [],
      styleIntent: [],
      assetIntent: [],
      doNotTranslate: [],
    };
  }

  return {
    summary: sourceReview.summary.map(normalizeSourceSemanticsLanguage),
    businessSections: sourceReview.widgets.map((widget) => {
      const contract = sourceReview.widgetContracts.find((item) => item.widget === widget.name);
      return {
        name: widget.name,
        role: widget.role,
        ...(widget.parent ? { parent: widget.parent } : {}),
        responsibility: normalizeSourceSemanticsLanguage(widget.buildHint),
        inputs: (contract?.inputs ?? []).map(normalizeSourceSemanticsLanguage),
        callbacks: (contract?.callbacks ?? []).map(normalizeSourceSemanticsLanguage),
      };
    }),
    stateIntent: sourceReview.stateStrategy.map((strategy) => ({
      concern: normalizeSourceSemanticsLanguage(strategy.concern),
      owner: normalizeSourceSemanticsLanguage(strategy.owner),
      recommendation: normalizeSourceSemanticsLanguage(strategy.recommendation),
      ...(strategy.evidence ? { evidence: normalizeSourceSemanticsLanguage(strategy.evidence) } : {}),
    })),
    routeIntent: sourceReview.routes.map((route) => ({
      action: route.action,
      ...(route.target ? { target: normalizeSourceSemanticsLanguage(route.target) } : {}),
      ...(route.params ? { params: normalizeSourceSemanticsLanguage(route.params) } : {}),
      ...(route.migrationHint ? { evidence: normalizeSourceSemanticsLanguage(route.migrationHint) } : {}),
    })),
    lifecycleIntent: sourceReview.lifecycle.map((item) => ({
      hook: item.hook,
      ...(item.target ? { target: normalizeSourceSemanticsLanguage(item.target) } : {}),
      ...(item.migrationHint ? { evidence: normalizeSourceSemanticsLanguage(item.migrationHint) } : {}),
    })),
    interactionIntent: sourceReview.interactions.map((interaction) => ({
      kind: interaction.kind,
      ...(interaction.target ? { target: normalizeSourceSemanticsLanguage(interaction.target) } : {}),
      ...(interaction.migrationHint ? { evidence: normalizeSourceSemanticsLanguage(interaction.migrationHint) } : {}),
    })),
    layoutIntent: sourceReview.layout.map((layout) => ({
      selector: layout.selector,
      kind: layout.kind,
      ...(layout.migrationHint ? { evidence: normalizeSourceSemanticsLanguage(layout.migrationHint) } : {}),
    })),
    styleIntent: sourceReview.styleTokens.map((token) => ({
      selector: token.selector,
      property: token.property,
      token: token.token,
      ...(token.fallback ? { fallback: token.fallback } : {}),
      ...(token.kind ? { kind: token.kind } : {}),
    })),
    assetIntent: sourceReview.assets.map((asset) => ({
      kind: asset.kind,
      ...(asset.source ? { source: asset.source } : {}),
      ...(asset.migrationHint ? { evidence: normalizeSourceSemanticsLanguage(asset.migrationHint) } : {}),
    })),
    doNotTranslate: sourceReview.doNotTranslate.map(normalizeSourceSemanticsLanguage),
  };
}

function buildPlanLayoutConflicts(
  evidence: PageCanonical,
  visualPlan: Pick<UiVisualPlan, 'nodeAudits'>,
): UiPlanLayoutConflict[] {
  return visualPlan.nodeAudits
    .filter((audit) => audit.layoutConflicts.some((conflict) => conflict.kind === 'row-flex-multiple-y-bands'))
    .flatMap((audit) => {
      const sourceIntent = sourceLayoutIntentForAudit(evidence, audit);
      if (!sourceIntent) return [];
      const conflict = audit.layoutConflicts.find((item) => item.kind === 'row-flex-multiple-y-bands');
      if (!conflict) return [];
      return [{
        type: 'source-structure-vs-runtime-layout' as const,
        sourceNodeId: audit.sourceNodeId,
        sourceStructure: sourceIntent.structure,
        runtimeObservation: `${conflict.message} flexWrap=${audit.containerStyle.flexWrap ?? 'unknown'}; observedBands=${conflict.observedBands.length}.`,
        sourceIntentLayout: sourceIntent.intent,
        risk: 'Implementation may incorrectly split one semantic source container into independent Flutter rows, or may ignore a runtime wrap that was actually intended.',
        requiresDecision: true,
        decisionOptions: [
          'preserve runtime visual multi-band layout',
          'preserve source sibling structure in one semantic header/container row and resolve width/overflow constraints',
        ],
        evidence: dedupe([
          ...sourceIntent.evidence,
          conflict.message,
          conflict.manualConfirmation,
        ]),
        severity: 'warning' as const,
      }];
    });
}

function sourceLayoutIntentForAudit(
  evidence: PageCanonical,
  audit: UiNodeAudit,
): { structure: string; intent: string; evidence: string[] } | undefined {
  const node = evidence.nodes.find((item) => item.id === audit.sourceNodeId);
  if (!node) return undefined;
  const directLabels = audit.directChildren.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role).filter(Boolean);
  const sourceHeader = sourceSections(evidence).find((section) =>
    section.kind === 'app-bar'
    && /header|nav|filter|section/i.test(`${section.name} ${section.selector ?? ''} ${section.evidence}`)
  );
  const template = evidence.sourceFacts?.analysis.sfc?.template ?? '';
  const hasSectionHeader = /\.ee-section__header|class=["'][^"']*section__header|class=["'][^"']*header/.test(template);
  const hasFilters = /\.ee-filters|class=["'][^"']*filters/.test(template);
  const isRowFlexWrap = audit.containerStyle.display === 'flex'
    && audit.containerStyle.flexDirection === 'row'
    && audit.containerStyle.flexWrap === 'wrap';
  if (!isRowFlexWrap || (!sourceHeader && !hasSectionHeader)) return undefined;
  const structure = directLabels.length
    ? `direct children are source siblings: ${directLabels.join(' / ')}`
    : 'source header container has sibling children';
  return {
    structure: hasFilters
      ? `${structure}; source template includes title/count/filter siblings in a header container.`
      : structure,
    intent: 'single semantic header/container with sibling children; runtime may wrap into multiple visual bands depending on width.',
    evidence: [
      sourceHeader?.evidence ?? 'source template contains a header-like container',
      hasFilters ? 'source template contains filters inside the header container' : '',
      `runtime node ${audit.sourceNodeId} is row flex with flexWrap=${audit.containerStyle.flexWrap ?? 'unknown'}`,
    ].filter(Boolean),
  };
}

function buildOverlayPlan(
  evidence: PageCanonical,
  targetComponents: FlutterComponentRef[],
): UiOverlayPlan[] {
  const source = evidence.sourceFacts?.analysis.sfc;
  if (!source) return [];
  const template = source.template ?? '';
  const sheetComponent = bestComponentForRole('modal', targetComponents);
  const overlays: UiOverlayPlan[] = [];
  const modalStates = source.state.filter((state) =>
    state.category === 'ui-state'
    && /show|visible|open/i.test(state.name)
    && /sheet|modal|rules|warn|success|popup/i.test(state.name)
  );
  const sourceModalSections = source.sections.filter((section) =>
    section.kind === 'modal' && isStandaloneOverlaySource(section.name, section.selector, section.evidence),
  );
  const sourceModalComponents = source.components.filter((component) =>
    component.role === 'modal' && isStandaloneOverlaySource(component.name, component.selector, component.evidence),
  );
  const bottomSheetModels = [...template.matchAll(/<([A-Za-z][\w-]*(?:Sheet|Modal|Popup|Dialog)[\w-]*)\b[^>]*(?:v-model|:model-value)\s*=\s*"([^"]+)"/g)]
    .map((match) => ({
      component: match[1] ?? 'Overlay',
      state: match[2] ?? undefined,
      evidence: match[0] ?? '',
    }));
  for (const model of bottomSheetModels) {
    overlays.push(createOverlayPlan({
      id: overlayId(model.state ?? model.component),
      sourceComponent: model.component,
      sourceState: model.state,
      targetComponent: sheetComponent?.symbol,
      trigger: triggerForOverlayState(model.state, source.interactions),
      evidence: [model.evidence],
      visualEvidence: hasRuntimeModalEvidence(evidence) ? 'runtime' : 'source-only',
    }));
  }
  for (const state of modalStates) {
    if (overlays.some((overlay) => overlay.sourceState === state.name)) continue;
    overlays.push(createOverlayPlan({
      id: overlayId(state.name),
      sourceComponent: inferOverlaySourceComponent(state.name, sourceModalSections, sourceModalComponents),
      sourceState: state.name,
      targetComponent: sheetComponent?.symbol,
      trigger: triggerForOverlayState(state.name, source.interactions),
      evidence: [state.evidence, state.migrationHint],
      visualEvidence: hasRuntimeModalEvidence(evidence) ? 'runtime' : 'source-only',
    }));
  }
  for (const section of sourceModalSections) {
    const id = overlayId(section.name);
    if (overlays.some((overlay) => overlay.id === id)) continue;
    overlays.push(createOverlayPlan({
      id,
      sourceComponent: section.name,
      targetComponent: sheetComponent?.symbol,
      evidence: [section.evidence],
      visualEvidence: hasRuntimeModalEvidence(evidence) ? 'runtime' : 'source-only',
    }));
  }
  return dedupeBy(overlays, (overlay) => `${overlay.id}:${overlay.sourceState ?? overlay.sourceComponent}`).slice(0, 12);
}

function createOverlayPlan(input: {
  id: string;
  sourceComponent: string;
  sourceState?: string | undefined;
  targetComponent?: string | undefined;
  trigger?: string | undefined;
  evidence: string[];
  visualEvidence: UiOverlayPlan['visualEvidence'];
}): UiOverlayPlan {
  return {
    id: input.id,
    ...(input.trigger ? { trigger: input.trigger } : {}),
    sourceComponent: input.sourceComponent,
    ...(input.sourceState ? { sourceState: input.sourceState } : {}),
    visualEvidence: input.visualEvidence,
    ...(input.targetComponent ? { targetComponent: input.targetComponent } : {}),
    uiShellRequired: true,
    businessBehaviorRequired: false,
    implementationLevel: 'ui-shell',
    visualFidelityRisk: input.visualEvidence === 'runtime' ? 'medium' : 'high',
    evidence: dedupe(input.evidence),
  };
}

function isStandaloneOverlaySource(name: string, selector: string | undefined, evidence: string | undefined): boolean {
  const normalized = toSnakeCase(name).replace(/_/g, '-');
  const source = `${selector ?? ''} ${evidence ?? ''}`;
  if (/__/.test(source)) return false;
  if (/^sheet-[^-]+/.test(normalized)) return false;
  return /^(bottom-)?sheet$|modal$|popup$|dialog$|rules-modal$|warning-modal$|success-modal$/i.test(normalized);
}

function overlayId(value: string): string {
  return toSnakeCase(value.replace(/^show/, '')).replace(/_/g, '-').replace(/^-+|-+$/g, '') || 'overlay';
}

function triggerForOverlayState(
  state: string | undefined,
  interactions: VueInteractionHint[],
): string | undefined {
  if (!state) return undefined;
  const lowered = state.toLowerCase();
  const direct = interactions.find((interaction) =>
    interaction.kind === 'click'
    && interaction.target
    && interaction.target.toLowerCase().includes(lowered)
  );
  if (direct?.target) return direct.target;
  if (/submitsheet|sheet/.test(lowered)) {
    const sheetTriggers = interactions
      .filter((interaction) => /open.*sheet/i.test(interaction.target ?? ''))
      .map((interaction) => interaction.target)
      .filter((target): target is string => Boolean(target));
    return dedupe(sheetTriggers).join(' | ') || undefined;
  }
  if (/rules/.test(lowered)) {
    return interactions.find((interaction) => /rules/i.test(interaction.target ?? ''))?.target;
  }
  if (/success/.test(lowered)) {
    return interactions.find((interaction) => /success/i.test(interaction.target ?? ''))?.target;
  }
  if (/otm|warn/.test(lowered)) {
    return interactions.find((interaction) => /otm|warn/i.test(interaction.target ?? ''))?.target;
  }
  return undefined;
}

function inferOverlaySourceComponent(
  stateName: string,
  sections: VueTemplateSection[],
  components: VueSemanticComponent[],
): string {
  const lowered = stateName.toLowerCase();
  const source = [...sections.map((section) => section.name), ...components.map((component) => component.name)]
    .find((name) => lowered.includes(name.toLowerCase()) || name.toLowerCase().includes(lowered.replace(/^show/, '')));
  if (source) return source;
  if (/sheet/.test(lowered)) return 'BottomSheet';
  if (/rules/.test(lowered)) return 'RulesModal';
  if (/success/.test(lowered)) return 'SuccessModal';
  if (/otm|warn/.test(lowered)) return 'WarningModal';
  return 'Modal';
}

function hasRuntimeModalEvidence(evidence: PageCanonical): boolean {
  const byId = new Map(evidence.nodes.map((node) => [node.id, node]));
  return evidence.nodes.some((node) =>
    node.role === 'modal'
    && node.bbox.width > 0
    && node.bbox.height > 0
    && collectDescendants(node, byId).some((child) =>
      child.id !== node.id && (Boolean(child.text?.trim()) || Boolean(child.assetRefs?.length)),
    ),
  );
}

function normalizeSourceSemanticsLanguage(value: string): string {
  return value
    .replace(/\bBaseGetView\b/g, 'target page pattern')
    .replace(/\bBaseGetPullView\b/g, 'target pull/refresh page pattern')
    .replace(/\bGetX\b/g, 'target state pattern')
    .replace(/\bGetxController\b/g, 'target state owner')
    .replace(/\bGet\.find\b/g, 'target dependency lookup')
    .replace(/\bGet\.toNamed\/AppRoutes\b/g, 'target routing API')
    .replace(/\bGet\.toNamed\b/g, 'target routing API')
    .replace(/\bGet\.parameters\/Get\.arguments\b/g, 'target route settings/arguments')
    .replace(/\bGet\.parameters\b/g, 'target route parameters')
    .replace(/\bGet\.arguments\b/g, 'target route arguments')
    .replace(/\bObx\b/g, 'target reactive builder')
    .replace(/\bGetBuilder\b/g, 'target reactive builder')
    .replace(/\bRx\b/g, 'target state primitive')
    .replace(/\bever\/worker\b/g, 'target state listener')
    .replace(/\bController\.onInit\/onClose\b/g, 'target lifecycle boundary')
    .replace(/\bController\.onInit\b/g, 'target initialization boundary')
    .replace(/\bController\.onReady\b/g, 'target ready/first-frame boundary')
    .replace(/\bController\.onClose\b/g, 'target dispose boundary')
    .replace(/\bonReady\b/g, 'target ready/first-frame boundary')
    .replace(/\bonClose\b/g, 'target dispose boundary')
    .replace(/\bController\b/g, 'state boundary')
    .replace(/\bcontroller\b/g, 'state boundary');
}

function normalizeFile(file: FlutterPlannedFile, targetConventions: FlutterTargetConventionProfile): FlutterPlannedFile {
  return {
    ...file,
    path: normalizeFilePath(file.path, targetConventions),
    responsibility: normalizeTargetLanguage(file.responsibility, targetConventions),
    ...(file.notes ? { notes: normalizeTargetLanguage(file.notes, targetConventions) } : {}),
  };
}

function normalizeFileTree(
  files: FlutterPlannedFile[],
  targetConventions: FlutterTargetConventionProfile,
): FlutterPlannedFile[] {
  const stateBinding = stateBindingFor(targetConventions);
  return files
    .filter((file) => {
      if (stateBinding.scope === 'page') return true;
      if (/_controller\.dart$|_binding\.dart$/.test(file.path)) return false;
      return true;
    })
    .map((file) => normalizeFile(file, targetConventions));
}

function normalizeFilePath(filePath: string, targetConventions: FlutterTargetConventionProfile): string {
  const fileOrganization = targetConventions.architectureProfile.fileOrganization.pattern;
  if (fileOrganization === 'module_views_controllers_bindings') {
    return normalizeModuleMvcFilePath(filePath);
  }
  if (fileOrganization !== 'module_proto_bucket') return filePath;
  const match = filePath.match(/^lib\/app\/modules\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match?.[1] || !match[2] || !match[3]) return filePath;
  return `lib/app/modules/${match[1]}/_proto/${match[2]}/${match[3]}`;
}

function normalizeModuleMvcFilePath(filePath: string): string {
  const match = filePath.match(/^lib\/app\/modules\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match?.[1] || !match[2] || !match[3]) return filePath;
  const [, moduleName, featureName, rest] = match;
  if (!moduleName || !featureName || !rest) return filePath;
  const base = `lib/app/modules/${moduleName}`;
  const featurePrefix = `${featureName}_`;
  if (/_controller\.dart$/.test(rest)) return `${base}/controllers/${featurePrefix}controller.dart`;
  if (/_binding\.dart$/.test(rest)) return `${base}/bindings/${featurePrefix}binding.dart`;
  if (/^widgets\//.test(rest)) return `${base}/widget/${rest.slice('widgets/'.length)}`;
  if (/_page\.dart$|_view\.dart$/.test(rest)) return `${base}/views/${rest.replace(/_page\.dart$/, '_view.dart')}`;
  return filePath;
}

function normalizeWidget(widget: FlutterWidgetPlan, targetConventions: FlutterTargetConventionProfile): FlutterWidgetPlan {
  return {
    ...widget,
    stateAccess: normalizeStateAccess(widget.stateAccess, targetConventions),
    buildHint: normalizeTargetLanguage(widget.buildHint, targetConventions),
  };
}

function normalizeStateAccess(
  stateAccess: FlutterWidgetPlan['stateAccess'],
  targetConventions: FlutterTargetConventionProfile,
): FlutterWidgetPlan['stateAccess'] {
  const stateBinding = stateBindingFor(targetConventions);
  if (stateBinding.scope === 'page') return stateAccess;
  if (stateAccess === 'controller') return 'state-owner';
  if (stateAccess === 'controller-slice') return 'state-slice';
  return stateAccess;
}

function normalizeStateStrategy(
  strategy: FlutterStateStrategy,
  targetConventions: FlutterTargetConventionProfile,
): FlutterStateStrategy {
  const stateBinding = stateBindingFor(targetConventions);
  const owner = strategy.owner === 'controller' && stateBinding.scope !== 'page'
    ? 'state-boundary'
    : strategy.owner;
  return {
    ...strategy,
    owner,
    recommendation: normalizeTargetLanguage(strategy.recommendation, targetConventions),
  };
}

function normalizeControllerBoundary(
  boundary: FlutterControllerBoundary,
  targetConventions: FlutterTargetConventionProfile,
): FlutterControllerBoundary {
  const stateBinding = stateBindingFor(targetConventions);
  const abstractName = stateBinding.scope === 'page' ? boundary.name : boundary.name.replace(/Controller/g, 'StateBoundary');
  return {
    ...boundary,
    name: normalizeTargetLanguage(abstractName, targetConventions),
    responsibility: normalizeTargetLanguage(boundary.responsibility, targetConventions),
    owns: boundary.owns.map((item) => normalizeTargetLanguage(item, targetConventions)),
    avoids: boundary.avoids.map((item) => normalizeTargetLanguage(item, targetConventions)),
  };
}

function normalizeWidgetContract(
  contract: FlutterWidgetContract,
  targetConventions: FlutterTargetConventionProfile,
): FlutterWidgetContract {
  return {
    ...contract,
    notes: normalizeTargetLanguage(contract.notes, targetConventions),
  };
}

function normalizeWidgetContractsWithEvidence(input: {
  contracts: FlutterWidgetContract[];
  targetConventions: FlutterTargetConventionProfile;
  visualPlan: UiVisualPlan;
  sourceSemantics?: UiSourceSemantics | undefined;
}): FlutterWidgetContract[] {
  const actionCallbacks = appBarActionCallbacks(input.visualPlan);
  const normalized = input.contracts.map((contract) => {
    const isHeader = /header|appbar|app-bar/i.test(contract.widget);
    const callbacks = isHeader && actionCallbacks.length
      ? mergeCallbacksReplacingGenericMore(contract.callbacks, actionCallbacks)
      : contract.callbacks;
    return normalizeWidgetContract({ ...contract, callbacks }, input.targetConventions);
  });
  if (normalized.length === 0) return normalized;
  if (!actionCallbacks.length) return normalized;
  const hasHeader = normalized.some((contract) => /header|appbar|app-bar/i.test(contract.widget));
  if (hasHeader) return normalized;
  const pageContract = normalized[0];
  if (!pageContract) return normalized;
  return [
    {
      ...pageContract,
      callbacks: mergeCallbacksReplacingGenericMore(pageContract.callbacks, actionCallbacks),
    },
    ...normalized.slice(1),
  ];
}

function enhanceSourceSemanticsWithVisualActions(
  sourceSemantics: UiSourceSemantics | undefined,
  visualPlan: UiVisualPlan,
): UiSourceSemantics | undefined {
  if (!sourceSemantics) return sourceSemantics;
  const actionCallbacks = appBarActionCallbacks(visualPlan);
  if (!actionCallbacks.length) return sourceSemantics;
  return {
    ...sourceSemantics,
    businessSections: sourceSemantics.businessSections.map((section) => {
      if (!/header|appbar|app-bar/i.test(`${section.name} ${section.role}`)) return section;
      return {
        ...section,
        callbacks: mergeCallbacksReplacingGenericMore(section.callbacks, actionCallbacks),
      };
    }),
  };
}

function appBarActionCallbacks(visualPlan: UiVisualPlan): string[] {
  return visualPlan.nodeAudits
    .filter((audit) => audit.kind === 'app-bar' || audit.kind === 'appbar-action')
    .flatMap((audit) => audit.actionMappings.map((mapping) => mapping.suggestedCallback).filter((callback): callback is string => Boolean(callback)));
}

function mergeCallbacksReplacingGenericMore(callbacks: string[], actionCallbacks: string[]): string[] {
  const meaningfulExisting = callbacks.filter((callback) => !/^onMore$/i.test(callback));
  return dedupe([...meaningfulExisting, ...actionCallbacks]).slice(0, 12);
}

function normalizeTargetLanguage(value: string, targetConventions: FlutterTargetConventionProfile): string {
  const stateBinding = stateBindingFor(targetConventions);
  const statePattern = stateBinding.scope === 'page' ? stateBinding.pattern : 'unknown';
  const routingPattern = targetConventions.architectureProfile.routing.navigation?.pattern
    ?? targetConventions.architectureProfile.routing.pattern;
  let result = value;
  if (statePattern !== 'getx') {
    result = result
      .replace(/\bBaseGetView\b/g, 'target page pattern')
      .replace(/\bBaseGetPullView\b/g, 'target pull/refresh page pattern')
      .replace(/\bGetX\b/g, 'target state pattern')
      .replace(/\bGetxController\b/g, 'target state owner')
      .replace(/\bGet\.find\b/g, 'target dependency lookup')
      .replace(/\bObx\b/g, 'target reactive builder')
      .replace(/\bGetBuilder\b/g, 'target reactive builder')
      .replace(/\bRx\b/g, 'target state primitive')
      .replace(/\bever\/worker\b/g, 'target state listener')
      .replace(/\bController\.onInit\/onClose\b/g, 'target lifecycle boundary')
      .replace(/\bController\.onInit\b/g, 'target initialization boundary')
      .replace(/\bController\.onReady\b/g, 'target ready/first-frame boundary')
      .replace(/\bController\.onClose\b/g, 'target dispose boundary')
      .replace(/\bonReady\b/g, 'target ready/first-frame boundary')
      .replace(/\bonClose\b/g, 'target dispose boundary')
      .replace(/\bController\b/g, 'state boundary')
      .replace(/\bcontroller\b/g, 'state boundary');
  }
  if (routingPattern !== 'getx') {
    result = result
      .replace(/\bGet\.toNamed\/AppRoutes\b/g, 'target routing API')
      .replace(/\bGet\.toNamed\b/g, 'target routing API')
      .replace(/\bGet\.parameters\/Get\.arguments\b/g, 'target route settings/arguments')
      .replace(/\bGet\.parameters\b/g, 'target route parameters')
      .replace(/\bGet\.arguments\b/g, 'target route arguments');
  }
  return result;
}

function stateBindingFor(targetConventions: FlutterTargetConventionProfile): {
  patternRef: string;
  pattern: string;
  scope: 'page' | 'global' | 'package' | 'unknown';
} {
  const state = targetConventions.architectureProfile.state;
  if (state.page?.pattern && state.page.pattern !== 'unknown') {
    return {
      patternRef: 'targetConventions.architectureProfile.state.page',
      pattern: state.page.pattern,
      scope: 'page',
    };
  }
  if (state.global?.pattern && state.global.pattern !== 'unknown') {
    return {
      patternRef: 'targetConventions.architectureProfile.state.global',
      pattern: state.global.pattern,
      scope: 'global',
    };
  }
  if (state.package?.pattern && state.package.pattern !== 'unknown') {
    return {
      patternRef: 'targetConventions.architectureProfile.state.package',
      pattern: state.package.pattern,
      scope: 'package',
    };
  }
  return {
    patternRef: 'targetConventions.architectureProfile.state',
    pattern: state.pattern,
    scope: 'unknown',
  };
}

function normalizeContractWarnings(targetConventions: FlutterTargetConventionProfile): string[] {
  const warnings = [...targetConventions.unresolved];
  const profile = targetConventions.architectureProfile;
  if (profile.state.pattern === 'unknown') warnings.push('state pattern is unknown; keep state recommendations abstract.');
  if (profile.state.page?.pattern === 'unknown' && profile.state.global?.pattern !== 'unknown') {
    warnings.push(`only global/app-level ${profile.state.global?.pattern} state evidence was detected; page-level state expression remains unresolved.`);
    warnings.push('page-level state-boundary registration files from the source-aware draft were omitted until target page state conventions are confirmed.');
  }
  if (profile.routing.pattern === 'unknown') warnings.push('routing pattern is unknown; keep navigation recommendations abstract.');
  if (profile.routing.navigation?.pattern === 'unknown') warnings.push('navigation call pattern is unknown; keep route action recommendations abstract.');
  if (profile.i18n.pattern === 'unknown') warnings.push('i18n pattern is unknown; do not invent translation API.');
  if (profile.theme.patterns.length === 0) warnings.push('theme pattern is unknown; use visualPlan/themeMappings evidence and ask for confirmation.');
  return dedupe(warnings);
}

function buildVisualPlan(evidence: PageCanonical, targetContext: {
  components: FlutterComponentRef[];
  componentMappings: ComponentMapping[];
}): UiVisualPlan {
  const nodeAuditResult = buildNodeAudits(evidence, targetContext);
  const dynamicTextHints = buildDynamicTextHints(evidence);
  const layoutConflicts = buildPlanLayoutConflicts(evidence, { nodeAudits: nodeAuditResult.audits } as UiVisualPlan);
  return {
    viewport: evidence.viewport ?? { width: 0, height: 0 },
    sections: evidence.sections.slice(0, 80).map((section) => ({
      id: section.id,
      role: section.role,
      ...(section.title ? { title: section.title } : {}),
      bbox: section.bbox,
      nodeIds: section.nodeIds,
      evidence: section.evidence,
      buildHint: buildSectionHint(section, evidence),
    })),
    nodeAudits: nodeAuditResult.audits,
    nodeAuditSummary: {
      generated: nodeAuditResult.audits.length,
      suppressed: nodeAuditResult.suppressed,
    },
    dynamicTextHints,
    layoutConflicts,
    layoutEvidence: evidence.sections.slice(0, 80).map((section) => {
      const title = section.title ? ` ${section.title}` : '';
      return `${section.role}${title}: bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}; nodes=${section.nodeIds.length}`;
    }),
    screenshotRefs: evidence.screenshots.map((screenshot) => screenshot.path),
  };
}

function buildNodeAudits(evidence: PageCanonical, targetContext: {
  components: FlutterComponentRef[];
  componentMappings: ComponentMapping[];
}): {
  audits: UiNodeAudit[];
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const byId = new Map(evidence.nodes.map((node) => [node.id, node]));
  const actionTargetByNodeId = buildActionTargetBindings(evidence, byId);
  const selected = selectNodeAuditCandidates(evidence, byId);
  const audits = selected.candidates
    .map((candidate) => buildNodeAudit(candidate.node, byId, candidate.coverageReason, candidate.displayInReview, actionTargetByNodeId))
    .filter((audit): audit is UiNodeAudit => Boolean(audit))
    .map((audit) => enrichNodeAuditWithTargetComponents(audit, byId, evidence, targetContext));
  const compressed = compressRepeatedNodeAudits(audits);
  return {
    audits: compressed.audits,
    suppressed: dedupeBy([...compressed.suppressed, ...selected.suppressed], (item) => item.nodeId),
  };
}

function selectNodeAuditCandidates(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): {
  candidates: Array<{ node: PageSnapshotNode; coverageReason: string; displayInReview?: boolean | undefined }>;
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const suppressed: Array<{ nodeId: string; reason: string }> = [];
  const sectionRoots = evidence.sections.flatMap((section) => {
    const nodeId = section.nodeIds[0];
    const node = nodeId ? byId.get(nodeId) : undefined;
    if (!node) return [];
    const decision = shouldIncludeSectionRoot(section, node, byId, evidence);
    if (!decision.include) {
      if (decision.reason) suppressed.push({ nodeId: node.id, reason: decision.reason });
      return [];
    }
    return [{ node, coverageReason: decision.reason ?? `representative ${section.role} section` }];
  });
  const directCandidates = evidence.nodes.filter((node) =>
    ['card', 'list-item', 'button', 'tab-bar', 'app-bar', 'bottom-bar', 'modal'].includes(node.role),
  ).flatMap((node) => {
    if (node.role === 'bottom-bar' && hasAncestorRole(node, byId, ['card', 'list-item'])) {
      suppressed.push({ nodeId: node.id, reason: 'bottom action row is covered by parent card/list-item nodeAudit controls.' });
      return [];
    }
    if ((node.role === 'button' || isLikelyChip(node)) && hasAncestorRole(node, byId, ['card', 'list-item'])) {
      suppressed.push({ nodeId: node.id, reason: 'control is covered by a parent card/list-item nodeAudit.' });
      return [];
    }
    if (isMisleadingWrapper(node, byId, evidence)) {
      suppressed.push({ nodeId: node.id, reason: 'wrapper is covered by more specific child nodeAudits.' });
      return [];
    }
    return [{ node, coverageReason: coverageReasonForNode(node) }];
  });
  const selected = dedupeBy([...sectionRoots, ...directCandidates], (candidate) => candidate.node.id)
    .filter((candidate) => shouldAuditNode(candidate.node))
    .sort((left, right) => priorityForAuditRole(left.node.role) - priorityForAuditRole(right.node.role)
      || left.node.bbox.y - right.node.bbox.y
      || left.node.bbox.x - right.node.bbox.x);
  const perKind = new Map<UiNodeAuditKind, number>();
  const result: Array<{ node: PageSnapshotNode; coverageReason: string; displayInReview?: boolean | undefined }> = [];
  for (const candidate of selected) {
    const kind = auditKindForNode(candidate.node);
    const count = perKind.get(kind) ?? 0;
    const limit = auditLimitForKind(kind);
    if (count >= limit) {
      if (kind === 'card' || kind === 'list-item') {
        suppressed.push({ nodeId: candidate.node.id, reason: `additional ${kind} audit retained in plan but omitted from review after representative coverage.` });
        result.push({
          ...candidate,
          coverageReason: `additional ${kind} audit retained in plan for full-fidelity repeated item evidence`,
          displayInReview: false,
        });
        continue;
      }
      suppressed.push({ nodeId: candidate.node.id, reason: `additional ${kind} audit omitted after representative coverage.` });
      continue;
    }
    perKind.set(kind, count + 1);
    result.push(candidate);
  }
  return { candidates: result, suppressed: dedupeBy(suppressed, (item) => item.nodeId) };
}

function shouldAuditNode(node: PageSnapshotNode): boolean {
  if (node.bbox.width <= 0 || node.bbox.height <= 0) return false;
  if (node.role === 'unknown' || node.role === 'text' || node.role === 'icon' || node.role === 'image') return false;
  if (node.role === 'section' && node.children.length === 0) return false;
  return node.children.length > 0 || Boolean(node.text?.trim()) || Boolean(node.assetRefs?.length);
}

function compressRepeatedNodeAudits(audits: UiNodeAudit[]): {
  audits: UiNodeAudit[];
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const groups = new Map<string, UiNodeAudit[]>();
  for (const audit of audits) {
    if (audit.kind !== 'card' && audit.kind !== 'list-item') continue;
    const key = repeatedAuditGroupKey(audit);
    const current = groups.get(key) ?? [];
    current.push(audit);
    groups.set(key, current);
  }
  const compressedIds = new Set<string>();
  const suppressed: Array<{ nodeId: string; reason: string }> = [];
  const representatives = new Map<string, UiNodeAudit>();
  let groupIndex = 1;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
    const representative = sorted[0];
    if (!representative) continue;
    const groupId = `${representative.kind}-group-${groupIndex}`;
    groupIndex += 1;
    const instances = sorted.map((audit) => buildRepeatedAuditInstance(audit, representative));
    const instanceNodeIds = sorted.map((audit) => audit.sourceNodeId);
    for (const audit of sorted.slice(1)) {
      compressedIds.add(audit.sourceNodeId);
      suppressed.push({
        nodeId: audit.sourceNodeId,
        reason: `covered by repeated node audit group ${groupId}; instance deltas are stored on representative ${representative.sourceNodeId}.`,
      });
    }
    representatives.set(representative.sourceNodeId, {
      ...representative,
      displayInReview: true,
      coverageReason: `${representative.coverageReason}; representative for repeated group ${groupId}.`,
      repeatedGroup: {
        groupId,
        mode: 'representative',
        instanceCount: sorted.length,
        representativeNodeId: representative.sourceNodeId,
        instanceNodeIds,
        commonSignature: repeatedAuditCommonSignature(representative),
      },
      instances,
    });
  }
  return {
    audits: audits
      .filter((audit) => !compressedIds.has(audit.sourceNodeId))
      .map((audit) => representatives.get(audit.sourceNodeId) ?? audit),
    suppressed,
  };
}

function repeatedAuditGroupKey(audit: UiNodeAudit): string {
  return [
    audit.kind,
    audit.rows.length,
    ...audit.rows.map((row) => row.children.map((child) => childStructureSignature(child)).join(',')),
    `controls:${audit.controls.map((control) => `${control.kind}:${semanticTextClass(control.text)}`).join(',')}`,
    `container:${styleSignature(audit.containerStyle, ['display', 'flexDirection', 'alignItems', 'justifyContent'])}`,
    `size:${Math.round(audit.bbox.width / 8) * 8}x${Math.round(audit.bbox.height / 8) * 8}`,
  ].join('|');
}

function childStructureSignature(child: UiNodeAuditChild): string {
  return [
    child.role,
    semanticTextClass(child.text),
  ].join(':');
}

function childRoleSignature(child: UiNodeAuditChild): string {
  return [
    child.role,
    semanticTextClass(child.text),
    styleSignature(child.style, ['fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'border', 'height']),
  ].join(':');
}

function styleSignature(style: UiNodeAuditStyle, fields: Array<keyof UiNodeAuditStyle>): string {
  return fields.map((field) => `${field}=${style[field] ?? ''}`).join(';');
}

function repeatedAuditCommonSignature(audit: UiNodeAudit): NonNullable<UiNodeAudit['repeatedGroup']>['commonSignature'] {
  return {
    kind: audit.kind,
    rowCount: audit.rows.length,
    rowRoleSignature: audit.rows.map((row) => row.children.map((child) => childRoleSignature(child)).join(' | ')),
    controlSignature: audit.controls.map((control) => `${control.kind}:${styleSignature(control.style, ['fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'height'])}`),
    styleSignature: Object.fromEntries(
      (['display', 'flexDirection', 'alignItems', 'justifyContent', 'padding', 'borderRadius', 'border', 'boxShadow'] as Array<keyof UiNodeAuditStyle>)
        .map((field) => [field, audit.containerStyle[field] ?? '']),
    ),
  };
}

function buildRepeatedAuditInstance(audit: UiNodeAudit, base: UiNodeAudit): UiNodeAuditInstance {
  const rowText = audit.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role));
  const baseRowText = base.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role));
  const fieldValues = repeatedAuditFieldValues(audit);
  const baseFieldValues = repeatedAuditFieldValues(base);
  const textDeltas = Object.entries(fieldValues)
    .filter(([field, value]) => baseFieldValues[field] !== value)
    .map(([field, value]) => ({
      field,
      base: baseFieldValues[field],
      actual: value,
      risk: deltaRiskForField(field, baseFieldValues[field], value),
    }));
  return {
    nodeId: audit.sourceNodeId,
    bbox: audit.bbox,
    rowText,
    fieldValues,
    semanticHints: Object.fromEntries(Object.keys(fieldValues).map((field) => [field, semanticHintForField(field, fieldValues[field] ?? '')])),
    textDeltas,
    styleDeltas: styleDeltasForAudit(audit, base),
    controlDeltas: controlDeltasForAudit(audit, base),
    stateDeltas: stateDeltasForValues(fieldValues, baseFieldValues),
    layoutDeltas: layoutDeltasForAudit(audit, base, baseRowText, rowText),
    missingEvidence: missingEvidenceForInstance(audit, base),
  };
}

function repeatedAuditFieldValues(audit: UiNodeAudit): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of audit.rows) {
    row.children.forEach((child, index) => {
      const key = `row${row.index}_col${index + 1}`;
      values[key] = child.text ?? child.assetRefs?.join(',') ?? child.role;
    });
  }
  return values;
}

function semanticTextClass(text: string | undefined): string {
  if (!text) return 'non-text';
  if (/^\$?\d+(?:\.\d+)?%?$/.test(text) || /^\$/.test(text)) return 'numeric';
  if (/^(ITM|OTM|ATM)$/i.test(text)) return 'status';
  if (/^\d+D$/i.test(text)) return 'time-badge';
  if (/^(Held|Qty|Quantity|Shares)\s+\d+/i.test(text)) return 'quantity';
  if (/^[A-Z]{1,6}$/.test(text)) return 'symbol-like';
  if (/\d{4}-\d{2}-\d{2}/.test(text)) return 'contract-like';
  return 'text';
}

function semanticHintForField(field: string, value: string): string {
  const cls = semanticTextClass(value);
  if (cls !== 'text' && cls !== 'non-text') return cls;
  if (/row1_col1/.test(field)) return 'primary-text';
  if (/row3_col/.test(field)) return 'action-or-quantity';
  return cls;
}

function deltaRiskForField(field: string, base: string | undefined, actual: string): string | undefined {
  if (/ITM|OTM|ATM/i.test(`${base ?? ''} ${actual}`)) return 'Do not hard-code one status text or style for all repeated items.';
  if (/\dD/i.test(`${base ?? ''} ${actual}`)) return 'Do not hard-code one time badge value for all repeated items.';
  if (/Held|Qty|Quantity|Shares/i.test(`${base ?? ''} ${actual}`)) return 'Quantity-like text should be data-driven per repeated item.';
  if (/^\$/.test(base ?? '') || /^\$/.test(actual)) return 'Price/value text should be data-driven per repeated item.';
  return undefined;
}

function styleDeltasForAudit(audit: UiNodeAudit, base: UiNodeAudit): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  const fields: Array<keyof UiNodeAuditStyle> = ['fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height'];
  audit.rows.forEach((row, rowIndex) => {
    const baseRow = base.rows[rowIndex];
    row.children.forEach((child, childIndex) => {
      const baseChild = baseRow?.children[childIndex];
      if (!baseChild) return;
      for (const field of fields) {
        const actual = child.style[field];
        const expected = baseChild.style[field];
        if (actual !== expected) {
          deltas.push({
            field: `row${row.index}_col${childIndex + 1}.${field}`,
            base: expected,
            actual,
            risk: 'Style differs from representative; implement as data-driven style variant or keep separate widget style.',
          });
        }
      }
    });
  });
  return deltas.slice(0, 40);
}

function controlDeltasForAudit(audit: UiNodeAudit, base: UiNodeAudit): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  const max = Math.max(audit.controls.length, base.controls.length);
  for (let index = 0; index < max; index += 1) {
    const control = audit.controls[index];
    const baseControl = base.controls[index];
    if (!control || !baseControl) {
      deltas.push({
        field: `control${index + 1}`,
        base: baseControl ? baseControl.kind : undefined,
        actual: control ? control.kind : undefined,
        risk: 'Control presence differs across repeated items; verify before sharing one widget implementation.',
      });
      continue;
    }
    const controlText = control.text ?? control.assetRefs?.join(',') ?? control.kind;
    const baseText = baseControl.text ?? baseControl.assetRefs?.join(',') ?? baseControl.kind;
    if (controlText !== baseText) {
      deltas.push({ field: `control${index + 1}.text`, base: baseText, actual: controlText });
    }
    const styleDelta = styleSignature(control.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height'])
      !== styleSignature(baseControl.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']);
    if (styleDelta) {
      deltas.push({
        field: `control${index + 1}.style`,
        base: styleSignature(baseControl.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']),
        actual: styleSignature(control.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']),
        risk: 'Control style differs across repeated items; implement an explicit variant if shared.',
      });
    }
  }
  return deltas.slice(0, 24);
}

function stateDeltasForValues(values: Record<string, string>, baseValues: Record<string, string>): UiNodeAuditInstanceDelta[] {
  return Object.entries(values)
    .filter(([field, value]) => semanticTextClass(value) !== semanticTextClass(baseValues[field]))
    .map(([field, value]) => ({
      field,
      base: baseValues[field],
      actual: value,
      risk: 'Semantic text class differs from representative; verify state-specific rendering.',
    }));
}

function layoutDeltasForAudit(
  audit: UiNodeAudit,
  base: UiNodeAudit,
  baseRowText: string[][],
  rowText: string[][],
): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  if (Math.abs(audit.bbox.width - base.bbox.width) > 2) {
    deltas.push({ field: 'bbox.width', base: String(base.bbox.width), actual: String(audit.bbox.width) });
  }
  if (Math.abs(audit.bbox.height - base.bbox.height) > 2) {
    deltas.push({ field: 'bbox.height', base: String(base.bbox.height), actual: String(audit.bbox.height) });
  }
  if (rowText.length !== baseRowText.length) {
    deltas.push({ field: 'rowCount', base: String(baseRowText.length), actual: String(rowText.length), risk: 'Row count differs; this instance may need a separate layout.' });
  }
  return deltas;
}

function missingEvidenceForInstance(audit: UiNodeAudit, base: UiNodeAudit): string[] {
  const missing: string[] = [];
  if (audit.rows.length < base.rows.length) missing.push('fewer rows than representative');
  if (audit.controls.length < base.controls.length) missing.push('fewer controls than representative');
  return missing;
}

function shouldIncludeSectionRoot(
  section: PageCanonical['sections'][number],
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
): { include: boolean; reason?: string | undefined } {
  if (isMisleadingWrapper(node, byId, evidence)) {
    return { include: false, reason: 'large wrapper is covered by more specific child nodeAudits.' };
  }
  if (section.role === 'bottom-bar' && hasAncestorRole(node, byId, ['card', 'list-item'])) {
    return { include: false, reason: 'bottom action row is covered by parent card/list-item nodeAudit controls.' };
  }
  if (section.role === 'list') {
    return hasDescendantRole(node, byId, ['card', 'list-item'])
      ? { include: false, reason: 'list wrapper is covered by child card/list-item nodeAudits.' }
      : { include: true, reason: 'list section has no child card/list-item audit candidate.' };
  }
  if (['app-bar', 'tab-bar', 'bottom-bar', 'modal', 'card', 'list-item'].includes(section.role)) {
    return { include: true, reason: `representative ${section.role} section` };
  }
  if (section.role === 'section') {
    const text = node.text ?? section.title ?? '';
    const focusedText = /sort|filter|排序|筛选|history|record|help|positions|持仓|可行权|行权|到期|value|expiration/i.test(text);
    const compact = section.bbox.height <= 180 && section.nodeIds.length <= 28;
    const hasDisplayEvidence = collectDescendants(node, byId).some((child) => isAuditVisibleChild(child) || isAuditControl(child));
    if ((focusedText || compact) && hasDisplayEvidence) {
      return { include: true, reason: focusedText ? 'focused header/sort/filter/action section' : 'compact semantic section with visible evidence' };
    }
  }
  if (node.role === 'unknown') {
    const compact = node.bbox.height <= 160 && node.children.length <= 20;
    const hasSpecificChildren = hasDescendantRole(node, byId, ['card', 'list-item', 'button', 'tab-bar', 'app-bar', 'bottom-bar', 'modal']);
    if (compact && !hasSpecificChildren) return { include: true, reason: 'compact unknown section with independent visible evidence' };
    return { include: false, reason: 'unknown wrapper is covered by specific child nodeAudits or has no independent evidence.' };
  }
  return { include: false };
}

function isMisleadingWrapper(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
): boolean {
  const viewport = evidence.viewport;
  const viewportArea = viewport ? viewport.width * viewport.height : 0;
  const nodeArea = node.bbox.width * node.bbox.height;
  const coversViewport = Boolean(viewportArea && nodeArea >= viewportArea * 0.72);
  const largeMultiSection = node.bbox.height >= 360 && hasDescendantRole(node, byId, ['card', 'list-item', 'app-bar', 'tab-bar', 'bottom-bar', 'modal']);
  const wrapperRole = node.role === 'unknown' || node.role === 'section' || (node.role === 'bottom-bar' && coversViewport);
  return wrapperRole && (coversViewport || largeMultiSection);
}

function hasAncestorRole(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  roles: SnapshotNodeRole[],
): boolean {
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return false;
    if (roles.includes(parent.role)) return true;
    parentId = parent.parentId;
  }
  return false;
}

function hasDescendantRole(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  roles: SnapshotNodeRole[],
): boolean {
  return collectDescendants(node, byId).some((child) => child.id !== node.id && roles.includes(child.role));
}

function auditLimitForKind(kind: UiNodeAuditKind): number {
  if (kind === 'card' || kind === 'list-item') return 4;
  if (kind === 'button' || kind === 'chip') return 4;
  if (kind === 'section') return 6;
  return 3;
}

function coverageReasonForNode(node: PageSnapshotNode): string {
  const kind = auditKindForNode(node);
  if (kind === 'card' || kind === 'list-item') return 'representative repeated item';
  if (kind === 'button' || kind === 'chip') return 'standalone control evidence';
  if (kind === 'appbar-action') return 'page app bar action evidence';
  if (kind === 'bottom-action') return 'bottom action evidence';
  if (kind === 'tab') return 'tab/filter control evidence';
  return `representative ${kind} evidence`;
}

function priorityForAuditRole(role: SnapshotNodeRole): number {
  const priority: Partial<Record<SnapshotNodeRole, number>> = {
    card: 1,
    'list-item': 2,
    'tab-bar': 3,
    'bottom-bar': 4,
    'app-bar': 5,
    button: 6,
    modal: 7,
    section: 8,
  };
  return priority[role] ?? 99;
}

function buildNodeAudit(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  coverageReason: string,
  displayInReviewOverride?: boolean | undefined,
  actionTargetByNodeId: Map<string, UiInteractionTarget> = new Map(),
): UiNodeAudit | undefined {
  const descendants = collectDescendants(node, byId).filter((item) => item.id !== node.id);
  const visibleChildren = descendants
    .filter((item) => isAuditVisibleChild(item))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
  const controls = descendants
    .filter((item) => isAuditControl(item))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x)
    .slice(0, 12)
    .map((item) => toAuditControl(item, actionTargetByNodeId));
  const kind = auditKindForNode(node);
  const directChildren = node.children
    .map((childId) => byId.get(childId))
    .filter((item): item is PageSnapshotNode => Boolean(item))
    .filter((item) => isAuditVisibleChild(item) || hasDescendantVisibleEvidence(item, byId))
    .map((item) => toAuditChild(item));
  const rows = groupAuditRows(visibleChildren.map((item) => toAuditChild(item))).slice(0, 12);
  const layoutConflicts = detectLayoutConflicts(node, directChildren, rows);
  const absenceHints = buildAbsenceHints(node, visibleChildren);
  const implementationHints = buildNodeAuditImplementationHints(node, controls, layoutConflicts);
  const actionMappings = buildActionMappingsForAudit(node, kind, controls);
  const priority = priorityForAudit(node, kind, rows, controls, absenceHints);
  const noiseLevel = noiseLevelForAudit(node, kind);
  return {
    id: `audit-${kind}-${node.id}`,
    kind,
    priority,
    noiseLevel,
    displayInReview: displayInReviewOverride ?? shouldDisplayAuditInReview(priority, noiseLevel),
    coverageReason,
    sourceNodeId: node.id,
    role: node.role,
    ...(node.text ? { title: node.text.slice(0, 80) } : {}),
    implementationSummary: buildAuditImplementationSummary({
      node,
      kind,
      rows,
      controls,
      absenceHints,
      implementationHints,
      layoutConflicts,
    }),
    bbox: node.bbox,
    containerStyle: pickAuditStyle(node, { includeBox: true }),
    rows,
    directChildren,
    layoutConflicts,
    controls,
    actionMappings,
    assetRefs: dedupe([
      ...(node.assetRefs ?? []),
      ...descendants.flatMap((item) => item.assetRefs ?? []),
    ]).slice(0, 24),
    absenceHints,
    implementationHints,
  };
}

function enrichNodeAuditWithTargetComponents(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  targetContext: {
    components: FlutterComponentRef[];
    componentMappings: ComponentMapping[];
  },
): UiNodeAudit {
  const semanticRole = semanticRoleForAudit(audit, byId, evidence, targetContext.componentMappings);
  if (!semanticRole) return audit;

  const candidates = targetComponentCandidatesForAudit(audit, semanticRole, targetContext);
  if (candidates.length === 0) return audit;

  const preferred = candidates.some((candidate) => candidate.recommendation === 'prefer-target-component');
  const nextKind = semanticRole === 'app-bar' && (audit.kind === 'section' || audit.kind === 'appbar-action')
    ? 'app-bar'
    : audit.kind;
  const targetWidgetHint = preferred
    ? `${candidates[0]?.symbol ?? semanticRole} candidate`
    : audit.implementationSummary.targetWidgetHint;
  const layoutSummary = preferred
    ? targetComponentLayoutSummary(audit, semanticRole, candidates[0])
    : audit.implementationSummary.layoutSummary;
  const componentHints = candidates
    .slice(0, 2)
    .map((candidate) => targetComponentMustPreserve(candidate));

  return {
    ...audit,
    kind: nextKind,
    priority: preferred ? promoteAuditPriority(audit.priority, nextKind) : audit.priority,
    coverageReason: preferred
      ? `${audit.coverageReason}; target ${semanticRole} component candidate detected.`
      : audit.coverageReason,
    implementationSummary: {
      ...audit.implementationSummary,
      targetWidgetHint,
      layoutSummary,
      mustPreserve: dedupe([
        ...componentHints,
        ...audit.implementationSummary.mustPreserve,
      ]).slice(0, 10),
      riskLevel: preferred ? 'high' : audit.implementationSummary.riskLevel,
    },
    implementationHints: dedupe([
      ...candidates.flatMap((candidate) => [
        candidate.recommendation === 'prefer-target-component'
          ? `Prefer target ${candidate.role} component ${candidate.symbol}; use row and style evidence as fit checks before falling back to a local Widget.`
          : '',
        ...candidate.fitChecks.map((check) => `Fit check for ${candidate.symbol}: ${check}`),
        ...candidate.risks,
      ]),
      ...audit.implementationHints,
    ].filter(Boolean)).slice(0, 16),
    actionMappings: audit.actionMappings.map((mapping) => ({
      ...mapping,
      role: actionRoleForAudit(nextKind, audit.controls.find((control) => control.nodeId === mapping.nodeId) ?? {
        ...mapping,
        kind: 'unknown',
        role: audit.role,
        bbox: audit.bbox,
        style: audit.containerStyle,
      } as UiNodeAuditControl),
    })),
    targetComponentCandidates: candidates,
  };
}

function semanticRoleForAudit(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  componentMappings: ComponentMapping[],
): FlutterComponentRole | undefined {
  if (isLikelyAppBarAudit(audit, byId, evidence, componentMappings)) return 'app-bar';
  const mappedRole = componentMappedRoleForAudit(audit, componentMappings);
  if (mappedRole) return mappedRole;
  if (audit.kind === 'app-bar' || audit.kind === 'appbar-action' || audit.role === 'app-bar') return 'app-bar';
  if (audit.kind === 'button') return 'button';
  if (audit.kind === 'bottom-action') return 'button';
  if (audit.role === 'image' || audit.role === 'icon') return 'image';
  if (audit.role === 'modal') return 'sheet';
  if (audit.role === 'list') return 'refresh';
  return undefined;
}

function componentMappedRoleForAudit(
  audit: UiNodeAudit,
  componentMappings: ComponentMapping[],
): FlutterComponentRole | undefined {
  const runtimeMapping = componentMappings.find((mapping) =>
    mapping.targetSymbol
    && mapping.nodeIds.includes(audit.sourceNodeId)
    && componentRoleForSnapshotRole(mapping.sourceRole),
  );
  if (runtimeMapping) return componentRoleForSnapshotRole(runtimeMapping.sourceRole);

  const sourceMappings = componentMappings.filter((mapping) =>
    mapping.targetSymbol
    && mapping.nodeIds.some((nodeId) => nodeId.startsWith('source:'))
    && componentRoleForSnapshotRole(mapping.sourceRole)
  );
  if (
    isHeaderSizedAudit(audit)
    && sourceMappings.some((mapping) => componentRoleForSnapshotRole(mapping.sourceRole) === 'app-bar')
  ) {
    return 'app-bar';
  }
  return undefined;
}

function componentRoleForSnapshotRole(role: SnapshotNodeRole): FlutterComponentRole | undefined {
  if (role === 'app-bar') return 'app-bar';
  if (role === 'button' || role === 'bottom-bar') return 'button';
  if (role === 'image' || role === 'icon') return 'image';
  if (role === 'modal') return 'sheet';
  if (role === 'list') return 'refresh';
  return undefined;
}

function isLikelyAppBarAudit(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  componentMappings: ComponentMapping[],
): boolean {
  if (!isHeaderSizedAudit(audit)) return false;
  const viewportWidth = evidence.viewport?.width ?? audit.bbox.width;
  const fullWidth = viewportWidth <= 0 || audit.bbox.width >= viewportWidth * 0.88;
  const style = audit.containerStyle;
  const flexHeader = style.display === 'flex' && style.alignItems === 'center';
  const hasTitle = audit.rows.some((row) => row.children.some((child) => Boolean(child.text?.trim())));
  const hasIcon = audit.rows.some((row) => row.children.some((child) => child.role === 'icon' || Boolean(child.assetRefs?.length)));
  const sourceHeaderMapped = componentMappings.some((mapping) =>
    mapping.targetSymbol
    && mapping.sourceRole === 'app-bar'
    && mapping.nodeIds.some((nodeId) => nodeId.startsWith('source:')),
  );
  const node = byId.get(audit.sourceNodeId);
  const nearTopSection = node?.role === 'section' && audit.bbox.y <= 8;
  return fullWidth && flexHeader && hasTitle && (hasIcon || sourceHeaderMapped) && (nearTopSection || sourceHeaderMapped);
}

function isHeaderSizedAudit(audit: UiNodeAudit): boolean {
  return audit.bbox.y <= 8 && audit.bbox.height >= 40 && audit.bbox.height <= 88;
}

function targetComponentCandidatesForAudit(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  targetContext: {
    components: FlutterComponentRef[];
    componentMappings: ComponentMapping[];
  },
): UiTargetComponentCandidate[] {
  const components = targetContext.components.filter((component) => component.role === role);
  if (components.length === 0) return [];
  const mapped = targetContext.componentMappings.filter((mapping) =>
    mapping.targetSymbol
    && componentRoleForSnapshotRole(mapping.sourceRole) === role,
  );
  return components
    .map((component) => {
      const sourceMappingNodeIds = mapped
        .filter((mapping) => mapping.targetSymbol === component.symbol)
        .flatMap((mapping) => mapping.nodeIds);
      const recommendation = sourceMappingNodeIds.length > 0 || audit.role === snapshotRoleForComponentRole(role)
        ? 'prefer-target-component'
        : 'manual-check';
      return {
        symbol: component.symbol,
        role: component.role,
        confidence: component.confidence,
        recommendation,
        evidence: dedupe([
          component.reason,
          ...component.usageSnippets.slice(0, 3),
          ...sourceMappingNodeIds.map((nodeId) => `component mapping evidence: ${nodeId}`),
        ]),
        ...(component.importPath ? { importPath: component.importPath } : {}),
        ...(component.propsHints.length ? { propsHints: component.propsHints } : {}),
        ...(sourceMappingNodeIds.length ? { sourceMappingNodeIds: dedupe(sourceMappingNodeIds).slice(0, 8) } : {}),
        fitChecks: componentFitChecks(audit, role),
        risks: componentFitRisks(audit, role, component),
      } satisfies UiTargetComponentCandidate;
    })
    .sort((left, right) => recommendationRank(left.recommendation) - recommendationRank(right.recommendation)
      || confidenceRank(right.confidence) - confidenceRank(left.confidence)
      || left.symbol.localeCompare(right.symbol))
    .slice(0, 4);
}

function snapshotRoleForComponentRole(role: FlutterComponentRole): SnapshotNodeRole | undefined {
  if (role === 'app-bar') return 'app-bar';
  if (role === 'button') return 'button';
  if (role === 'image') return 'image';
  if (role === 'sheet') return 'modal';
  if (role === 'refresh') return 'list';
  return undefined;
}

function recommendationRank(value: UiTargetComponentCandidate['recommendation']): number {
  if (value === 'prefer-target-component') return 0;
  if (value === 'manual-check') return 1;
  return 2;
}

function confidenceRank(value: MappingConfidence): number {
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  return 1;
}

function componentFitChecks(audit: UiNodeAudit, role: FlutterComponentRole): string[] {
  const checks: string[] = [];
  if (role === 'app-bar') {
    checks.push(`height/preferredSize should match ${roundCssNumber(audit.bbox.height)}px.`);
    const leading = firstRowChildren(audit).find((child) => child.role === 'icon' || Boolean(child.assetRefs?.length));
    const title = firstRowChildren(audit).find((child) => child.text?.trim());
    const actions = firstRowChildren(audit).filter((child) =>
      (child.role === 'icon' || Boolean(child.assetRefs?.length)) && child.nodeId !== leading?.nodeId,
    );
    if (leading) checks.push(`leading slot should preserve ${auditChildLabel(leading)} at bbox ${bboxText(leading.bbox)}.`);
    if (title) checks.push(`title slot should preserve ${auditChildLabel(title)} at bbox ${bboxText(title.bbox)}.`);
    if (actions.length) checks.push(`actions should preserve ${actions.map(auditChildLabel).join(' -> ')} and their visual order.`);
    checks.push('titleSpacing/centerTitle/backgroundColor should be checked against source bbox and style evidence.');
  } else if (role === 'button') {
    checks.push(`button height should match ${roundCssNumber(audit.bbox.height)}px when this audit is a standalone control.`);
    if (audit.controls.length) checks.push(`control padding/radius should preserve ${audit.controls.map((control) => control.padding || control.borderRadius).filter(Boolean).join(', ')}.`);
  } else if (role === 'image') {
    if (audit.assetRefs.length) checks.push(`asset source/order should preserve ${audit.assetRefs.join(' -> ')}.`);
  } else if (role === 'sheet') {
    checks.push(`sheet container should match bbox ${bboxText(audit.bbox)} and visible controls.`);
  } else if (role === 'refresh') {
    checks.push('refresh/list component should wrap the repeated list without inventing fields absent from nodeAudits.');
  }
  return dedupe(checks).slice(0, 8);
}

function componentFitRisks(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  component: FlutterComponentRef,
): string[] {
  const risks: string[] = [];
  if (role === 'app-bar') {
    risks.push(`Use a local header only if ${component.symbol} cannot expose height/preferredSize, leading, title, actions, or title spacing needed by this audit.`);
  }
  if (component.propsHints.length === 0) {
    risks.push(`${component.symbol} props were not inferred from target examples; inspect similar target usage before custom implementation.`);
  }
  if (audit.kind === 'section' && role !== 'app-bar') {
    risks.push('Runtime role is generic section; target component recommendation depends on source/target semantic mapping.');
  }
  return dedupe(risks).slice(0, 6);
}

function targetComponentLayoutSummary(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  candidate: UiTargetComponentCandidate | undefined,
): string {
  if (!candidate) return audit.implementationSummary.layoutSummary;
  const fitChecks = candidate.fitChecks.length ? ` Fit checks: ${candidate.fitChecks.join(' ')}` : '';
  return `Prefer target ${role} component ${candidate.symbol}; keep node visual evidence as adaptation checks.${fitChecks}`;
}

function targetComponentMustPreserve(candidate: UiTargetComponentCandidate): string {
  return candidate.recommendation === 'prefer-target-component'
    ? `优先复用目标 ${candidate.role} 组件 ${candidate.symbol}；若关键槽位或尺寸无法匹配，再回退本地 Widget。`
    : `检查目标 ${candidate.role} 组件 ${candidate.symbol} 是否适配本节点，再决定是否复用。`;
}

function promoteAuditPriority(priority: UiNodeAuditPriority, kind: UiNodeAuditKind): UiNodeAuditPriority {
  if (kind === 'app-bar') return 'p0';
  return priority === 'p2' ? 'p1' : priority;
}

function firstRowChildren(audit: UiNodeAudit): UiNodeAuditChild[] {
  return audit.rows[0]?.children ?? [];
}

function auditChildLabel(child: UiNodeAuditChild): string {
  return child.text?.trim() || child.assetRefs?.join(',') || child.nodeId;
}

function bboxText(bbox: { x: number; y: number; width: number; height: number }): string {
  return `${roundCssNumber(bbox.x)},${roundCssNumber(bbox.y)},${roundCssNumber(bbox.width)},${roundCssNumber(bbox.height)}`;
}

function collectDescendants(root: PageSnapshotNode, byId: Map<string, PageSnapshotNode>): PageSnapshotNode[] {
  const result: PageSnapshotNode[] = [];
  const stack = [root];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    result.push(node);
    for (const childId of node.children) {
      const child = byId.get(childId);
      if (child) stack.push(child);
    }
  }
  return result;
}

function isAuditVisibleChild(node: PageSnapshotNode): boolean {
  const hasText = Boolean(node.text?.trim());
  const hasAsset = Boolean(node.assetRefs?.length);
  const semanticRole = ['button', 'icon', 'image', 'input'].includes(node.role);
  if (!hasText && !hasAsset && !semanticRole) return false;
  if (node.bbox.width <= 0 || node.bbox.height <= 0) return false;
  return true;
}

function isAuditControl(node: PageSnapshotNode): boolean {
  if (node.role === 'button' || node.role === 'input' || node.role === 'icon' || node.role === 'image') return true;
  return isLikelyChip(node);
}

function hasDescendantVisibleEvidence(node: PageSnapshotNode, byId: Map<string, PageSnapshotNode>): boolean {
  return collectDescendants(node, byId).some((child) => child.id !== node.id && isAuditVisibleChild(child));
}

function isLikelyChip(node: PageSnapshotNode): boolean {
  const style = node.computedStyle;
  const text = node.text?.trim();
  if (!text || text.length > 24) return false;
  const radius = parseCssNumber(style?.borderRadius);
  const height = node.bbox.height;
  const hasPillRadius = radius >= 8 || radius >= height / 2 - 2;
  const hasBackground = Boolean(style?.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent');
  return hasPillRadius && hasBackground && height <= 36;
}

function buildActionTargetBindings(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): Map<string, UiInteractionTarget> {
  const result = new Map<string, UiInteractionTarget>();
  const sourceClicks = extractSourceClickTargets(evidence);
  const runtimeClickNodes = canonicalRuntimeClickNodes(evidence, byId);
  const pairCount = Math.min(sourceClicks.length, runtimeClickNodes.length);
  for (let index = 0; index < pairCount; index += 1) {
    const runtime = runtimeClickNodes[index];
    const source = sourceClicks[index];
    if (!runtime || !source) continue;
    result.set(runtime.id, {
      kind: 'click',
      target: source.target,
      evidence: source.evidence,
      confidence: source.confidence,
    });
  }

  for (const interaction of evidence.interactions) {
    if (result.has(interaction.nodeId)) continue;
    const node = byId.get(interaction.nodeId);
    if (!node || isNestedClickableDuplicate(node, evidence, byId)) continue;
    result.set(interaction.nodeId, {
      kind: interaction.kind,
      ...(interaction.label ? { target: interaction.label } : {}),
      evidence: interaction.evidence.join(' | '),
      confidence: interaction.label ? 'medium' : 'low',
    });
  }

  return result;
}

function extractSourceClickTargets(evidence: PageCanonical): Array<{
  target: string;
  evidence: string;
  confidence: MappingConfidence;
}> {
  const template = evidence.sourceFacts?.analysis.sfc?.template ?? '';
  const matches = [...template.matchAll(/@click(?:\.[\w-]+)*\s*=\s*"([^"]+)"/g)]
    .map((match) => match[1]?.trim())
    .filter((target): target is string => Boolean(target));
  const fromTemplate = matches.map((target) => ({
    target,
    evidence: `@click="${target}"`,
    confidence: 'high' as const,
  }));
  if (fromTemplate.length) return fromTemplate;
  return (evidence.sourceFacts?.analysis.sfc?.interactions ?? [])
    .filter((interaction) => interaction.kind === 'click' && interaction.target)
    .map((interaction) => ({
      target: interaction.target as string,
      evidence: interaction.evidence,
      confidence: 'medium' as const,
    }));
}

function canonicalRuntimeClickNodes(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): PageSnapshotNode[] {
  return evidence.interactions
    .filter((interaction) => interaction.kind === 'tap')
    .map((interaction) => byId.get(interaction.nodeId))
    .filter((node): node is PageSnapshotNode => Boolean(node))
    .filter((node) => !isNestedClickableDuplicate(node, evidence, byId))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
}

function isNestedClickableDuplicate(
  node: PageSnapshotNode,
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): boolean {
  if (!node.parentId) return false;
  const interactionNodeIds = new Set(evidence.interactions.map((interaction) => interaction.nodeId));
  let parentId: string | undefined = node.parentId;
  while (parentId) {
    if (interactionNodeIds.has(parentId)) return true;
    const parent = byId.get(parentId);
    parentId = parent?.parentId;
  }
  return false;
}

function semanticNameForInteraction(target: string): string | undefined {
  const normalized = target.toLowerCase();
  const routeMatch = target.match(/['"]([^'"]+)['"]/);
  const route = routeMatch?.[1]?.toLowerCase() ?? '';
  if (/\bhistory\b|历史|record/.test(normalized) || /history|record/.test(route)) return 'history';
  if (/rules?|showrules|提示|规则|help/.test(normalized) || /rules?|help/.test(route)) return 'rules';
  if (/all-features|feature|back|返回/.test(normalized) || /all-features|feature/.test(route)) return 'back';
  if (/dnesheet|dne|do\s*not\s*exercise/.test(normalized)) return 'dne';
  if (/exercisesheet|exercise/.test(normalized)) return 'exercise';
  if (/pricesort|value|sortprice/.test(normalized)) return 'sortValue';
  if (/expsort|expiration|sortexp/.test(normalized)) return 'sortExpiration';
  if (/adjustqty|qty|quantity/.test(normalized)) return 'adjustQuantity';
  if (/setmax|max/.test(normalized)) return 'max';
  const functionName = target.match(/^([A-Za-z_$][\w$]*)/)?.[1];
  return functionName;
}

function suggestedCallbackForSemanticName(semanticName: string): string {
  return `on${toPascalCase(semanticName)}`;
}

function toAuditChild(node: PageSnapshotNode): UiNodeAuditChild {
  return {
    nodeId: node.id,
    role: node.role,
    ...(node.text?.trim() ? { text: node.text.trim() } : {}),
    ...(node.assetRefs?.length ? { assetRefs: node.assetRefs } : {}),
    bbox: node.bbox,
    style: pickAuditStyle(node, { includeText: true }),
  };
}

function toAuditControl(node: PageSnapshotNode, actionTargetByNodeId: Map<string, UiInteractionTarget> = new Map()): UiNodeAuditControl {
  const style = node.computedStyle;
  const interactionTarget = actionTargetByNodeId.get(node.id);
  const semanticName = interactionTarget?.target ? semanticNameForInteraction(interactionTarget.target) : undefined;
  const suggestedCallback = semanticName ? suggestedCallbackForSemanticName(semanticName) : undefined;
  return {
    ...toAuditChild(node),
    kind: node.role === 'button'
      ? 'button'
      : isLikelyChip(node)
        ? 'chip'
        : node.role === 'icon'
          ? 'icon'
          : node.role === 'image'
            ? 'image'
            : 'unknown',
    ...(style?.padding ? { padding: style.padding } : {}),
    height: `${roundCssNumber(node.bbox.height)}px`,
    ...(style?.borderRadius ? { borderRadius: style.borderRadius } : {}),
    ...(interactionTarget ? { interactionTarget } : {}),
    ...(semanticName ? { semanticName } : {}),
    ...(suggestedCallback ? { suggestedCallback } : {}),
  };
}

function buildActionMappingsForAudit(
  node: PageSnapshotNode,
  kind: UiNodeAuditKind,
  controls: UiNodeAuditControl[],
): UiActionMapping[] {
  return controls
    .filter((control) => control.interactionTarget)
    .map((control) => ({
      nodeId: control.nodeId,
      ...(control.assetRefs?.[0] ? { assetRef: control.assetRefs[0] } : {}),
      role: actionRoleForAudit(kind, control),
      ...(control.semanticName ? { semanticName: control.semanticName } : {}),
      ...(control.interactionTarget?.target ? { sourceInteraction: control.interactionTarget.target } : {}),
      ...(control.interactionTarget?.evidence ? { interactionEvidence: control.interactionTarget.evidence } : {}),
      ...(control.suggestedCallback ? { suggestedCallback: control.suggestedCallback } : {}),
      confidence: control.interactionTarget?.confidence ?? 'low',
      reason: control.interactionTarget?.target
        ? `Visible control ${control.nodeId} is bound to source interaction ${control.interactionTarget.target}.`
        : `Visible control ${control.nodeId} has runtime interaction evidence but no resolved source target.`,
    }));
}

function actionRoleForAudit(kind: UiNodeAuditKind, control: UiNodeAuditControl): UiNodeAuditKind {
  if (kind === 'app-bar' || kind === 'appbar-action') return 'appbar-action';
  if (kind === 'bottom-action') return 'bottom-action';
  if (kind === 'filter' || kind === 'sort-control') return 'sort-control';
  if (control.kind === 'chip') return 'chip';
  if (control.kind === 'button') return 'button';
  return kind;
}

function groupAuditRows(children: UiNodeAuditChild[]): UiNodeAudit['rows'] {
  const rows: UiNodeAudit['rows'] = [];
  for (const child of children) {
    const centerY = child.bbox.y + child.bbox.height / 2;
    const existing = rows.find((row) => centerY >= row.yRange.min - 4 && centerY <= row.yRange.max + 4);
    if (existing) {
      existing.children.push(child);
      existing.yRange.min = Math.min(existing.yRange.min, child.bbox.y);
      existing.yRange.max = Math.max(existing.yRange.max, child.bbox.y + child.bbox.height);
      continue;
    }
    rows.push({
      index: rows.length + 1,
      yRange: { min: child.bbox.y, max: child.bbox.y + child.bbox.height },
      children: [child],
    });
  }
  return rows
    .map((row, index) => ({
      ...row,
      index: index + 1,
      yRange: {
        min: roundCssNumber(row.yRange.min),
        max: roundCssNumber(row.yRange.max),
      },
      children: row.children.sort((left, right) => left.bbox.x - right.bbox.x),
    }))
    .sort((left, right) => left.yRange.min - right.yRange.min);
}

function detectLayoutConflicts(
  node: PageSnapshotNode,
  directChildren: UiNodeAuditChild[],
  rows: UiNodeAudit['rows'],
): UiNodeAuditLayoutConflict[] {
  const style = node.computedStyle;
  if (style?.display !== 'flex' || style.flexDirection !== 'row') return [];
  if (directChildren.length < 2 || rows.length < 2) return [];
  const directRows = groupAuditRows(directChildren);
  if (directRows.length < 2) return [];
  return [{
    kind: 'row-flex-multiple-y-bands',
    severity: 'warning',
    message: `Parent is row flex (${style.alignItems ? `alignItems=${style.alignItems}` : 'alignItems unknown'}) but direct children occupy ${directRows.length} visual bands.`,
    parentStyle: pickAuditStyle(node, { includeBox: true }),
    directChildren: directChildren.slice(0, 12),
    observedBands: directRows.slice(0, 6),
    manualConfirmation: 'Confirm whether this source section is intentionally wrapped into multiple visual bands or should be implemented as one row with overflow/width/text constraints fixed.',
  }];
}

function auditKindForNode(node: PageSnapshotNode): UiNodeAuditKind {
  if (node.role === 'card') return 'card';
  if (node.role === 'list-item') return 'list-item';
  if (node.role === 'button') return 'button';
  if (node.role === 'tab-bar') return 'tab';
  if (node.role === 'bottom-bar') return 'bottom-action';
  if (node.role === 'app-bar') return 'appbar-action';
  if (node.role === 'section') return inferSectionAuditKind(node);
  if (isLikelyChip(node)) return 'chip';
  return 'unknown';
}

function priorityForAudit(
  node: PageSnapshotNode,
  kind: UiNodeAuditKind,
  rows: UiNodeAudit['rows'],
  controls: UiNodeAuditControl[],
  absenceHints: string[],
): UiNodeAuditPriority {
  if (kind === 'card' || kind === 'list-item') return 'p0';
  if (kind === 'sort-control' || kind === 'filter' || kind === 'app-bar' || kind === 'appbar-action' || kind === 'bottom-action' || kind === 'tab') return 'p0';
  if (controls.length > 0 && (controls.some((control) => control.padding || control.borderRadius) || kind === 'button')) return 'p1';
  if (absenceHints.length > 1) return 'p1';
  if (rows.length >= 2 || node.assetRefs?.length) return 'p1';
  return 'p2';
}

function noiseLevelForAudit(node: PageSnapshotNode, kind: UiNodeAuditKind): UiNodeAuditNoiseLevel {
  if (kind === 'unknown') return 'high';
  if ((kind === 'section' || kind === 'bottom-action') && node.bbox.height >= 300) return 'medium';
  if (kind === 'button' || kind === 'chip') return 'medium';
  return 'low';
}

function shouldDisplayAuditInReview(priority: UiNodeAuditPriority, noiseLevel: UiNodeAuditNoiseLevel): boolean {
  if (noiseLevel === 'high') return false;
  if (priority === 'p0') return true;
  return priority === 'p1' && noiseLevel === 'low';
}

function buildAuditImplementationSummary(input: {
  node: PageSnapshotNode;
  kind: UiNodeAuditKind;
  rows: UiNodeAudit['rows'];
  controls: UiNodeAuditControl[];
  absenceHints: string[];
  implementationHints: string[];
  layoutConflicts: UiNodeAuditLayoutConflict[];
}): UiNodeAudit['implementationSummary'] {
  const rowSummaries = input.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role).join(' -> '));
  const mustPreserve = [
    ...rowSummaries.map((summary, index) => `第 ${index + 1} 行：${summary}`),
    ...input.implementationHints,
  ].filter(Boolean).slice(0, 10);
  const doNotInvent = input.absenceHints
    .filter((hint) => /do not|No available|不存在|不要|absent/i.test(hint))
    .slice(0, 6);
  const controlSummary = input.controls
    .map((control) => [
      control.text ?? control.assetRefs?.join(',') ?? control.nodeId,
      control.padding ? `padding ${control.padding}` : '',
      control.height ? `height ${control.height}` : '',
      control.borderRadius ? `radius ${control.borderRadius}` : '',
    ].filter(Boolean).join(', '))
    .slice(0, 8);
  const layoutSummary = input.layoutConflicts.length
    ? layoutSummaryWithConflicts(input.kind, input.rows, input.layoutConflicts)
    : layoutSummaryForAudit(input.kind, input.rows);
  return {
    targetWidgetHint: targetWidgetHintForAudit(input.kind),
    layoutSummary,
    mustPreserve,
    doNotInvent,
    controlSummary,
    riskLevel: input.layoutConflicts.some((conflict) => conflict.severity === 'warning' || conflict.severity === 'error')
      ? 'high'
      : input.kind === 'card' || input.kind === 'list-item' || input.kind === 'sort-control' || input.kind === 'filter'
      ? 'high'
      : input.controls.length > 0
        ? 'medium'
        : 'low',
  };
}

function targetWidgetHintForAudit(kind: UiNodeAuditKind): string | undefined {
  const hints: Partial<Record<UiNodeAuditKind, string>> = {
    card: '重复项卡片 Widget',
    'app-bar': 'AppBar / 目标导航栏组件',
    list: '列表 / 刷新列表组件',
    'list-item': '重复列表项 Widget',
    button: '独立操作按钮',
    chip: '状态标签 / pill',
    'sort-control': '排序/筛选头部控件',
    filter: '筛选控件组',
    'appbar-action': 'AppBar 操作按钮',
    'bottom-action': '底部操作区',
    tab: 'Tab/筛选选择器',
    section: '语义区块 Widget',
  };
  return hints[kind];
}

function layoutSummaryForAudit(kind: UiNodeAuditKind, rows: UiNodeAudit['rows']): string {
  if (rows.length === 0) return `${kind} 视觉证据，无直接文本行。`;
  if ((kind === 'card' || kind === 'list-item') && rows.length === 3) {
    return '3 行卡片：主信息行 / 价格或主值行 / 数量与操作行。';
  }
  if (kind === 'app-bar') return `${rows.length} 行 AppBar/header 结构。`;
  if (kind === 'appbar-action') return `${rows.length} 行 AppBar 结构。`;
  if (kind === 'sort-control' || kind === 'filter') return `${rows.length} 行排序/筛选控件结构。`;
  return `${rows.length} 行 ${kind} 结构。`;
}

function layoutSummaryWithConflicts(
  kind: UiNodeAuditKind,
  rows: UiNodeAudit['rows'],
  conflicts: UiNodeAuditLayoutConflict[],
): string {
  const flexBandConflict = conflicts.find((conflict) => conflict.kind === 'row-flex-multiple-y-bands');
  if (flexBandConflict) {
    return `parent row flex; observed children occupy ${flexBandConflict.observedBands.length} visual bands. Do not treat this as a confirmed ${rows.length}-row ${kind} layout until flex-wrap/overflow/width/text constraints are confirmed.`;
  }
  return layoutSummaryForAudit(kind, rows);
}

function inferSectionAuditKind(node: PageSnapshotNode): UiNodeAuditKind {
  const text = node.text?.toLowerCase() ?? '';
  if (text.includes('sort')) return 'sort-control';
  if (text.includes('filter')) return 'filter';
  return 'section';
}

function pickAuditStyle(node: PageSnapshotNode, options: { includeBox?: boolean; includeText?: boolean }): UiNodeAuditStyle {
  const style = node.computedStyle ?? {};
  return {
    ...(style.display ? { display: style.display } : {}),
    ...(style.flexDirection ? { flexDirection: style.flexDirection } : {}),
    ...(style.flexWrap ? { flexWrap: style.flexWrap } : {}),
    ...(style.alignItems ? { alignItems: style.alignItems } : {}),
    ...(style.justifyContent ? { justifyContent: style.justifyContent } : {}),
    ...(style.gap ? { gap: style.gap } : {}),
    ...(style.padding ? { padding: style.padding } : {}),
    ...(style.margin ? { margin: style.margin } : {}),
    ...(options.includeBox ? { width: `${roundCssNumber(node.bbox.width)}px`, height: `${roundCssNumber(node.bbox.height)}px` } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
    ...(options.includeText && style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(options.includeText && style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(options.includeText && style.lineHeight ? { lineHeight: style.lineHeight } : {}),
    ...(style.borderRadius ? { borderRadius: style.borderRadius } : {}),
    ...(style.border ? { border: style.border } : {}),
    ...(style.boxShadow ? { boxShadow: style.boxShadow } : {}),
    ...(style.overflow ? { overflow: style.overflow } : {}),
    ...(style.whiteSpace ? { whiteSpace: style.whiteSpace } : {}),
    ...(style.minWidth ? { minWidth: style.minWidth } : {}),
    ...(style.maxWidth ? { maxWidth: style.maxWidth } : {}),
  };
}

function buildAbsenceHints(node: PageSnapshotNode, visibleChildren: PageSnapshotNode[]): string[] {
  const hints = [
    'Representative node rows list the visible display fields; do not add extra sibling fields unless sourceSemantics or user confirmation requires them.',
  ];
  const text = visibleChildren.map((child) => child.text ?? '').join(' ').toLowerCase();
  const quantityLike = /\bheld\b|\bposition\b|\bquantity\b|\bshares\b|\bqty\b|持股|持仓|可行权/.test(text);
  if ((node.role === 'card' || node.role === 'list-item') && quantityLike && !/\bavail(?:able)?\b|可用/.test(text)) {
    hints.push('No available quantity field is visible in this representative card/list item.');
  }
  return hints;
}

function buildNodeAuditImplementationHints(
  node: PageSnapshotNode,
  controls: UiNodeAuditControl[],
  layoutConflicts: UiNodeAuditLayoutConflict[],
): string[] {
  const hints = [
    'Restore row order and visible text/icon order from rows before applying target component abstractions.',
  ];
  for (const conflict of layoutConflicts) {
    hints.push(`${conflict.message} ${conflict.manualConfirmation}`);
  }
  if (controls.some((control) => control.padding || control.borderRadius)) {
    hints.push('Controls include padding/radius evidence; prefer padding-driven layout over fixed height when target APIs allow it.');
  }
  if (node.role === 'card' || node.role === 'list-item') {
    hints.push('Use this representative item as the contract for repeated item widgets.');
  }
  return hints;
}

function buildNodeAuditValidationHints(audits: UiNodeAudit[]): string[] {
  if (audits.length === 0) return [];
  const hints = [`visualPlan.nodeAudits contains ${audits.length} representative node audit(s) for repeated or high-risk UI units.`];
  if (audits.some((audit) => audit.controls.some((control) => control.kind === 'button' || control.kind === 'chip'))) {
    hints.push('Review visualPlan.nodeAudits[*].controls before implementing buttons or chips; preserve padding, radius, and text order where present.');
  }
  if (audits.some((audit) => audit.kind === 'card' || audit.kind === 'list-item')) {
    hints.push('Review visualPlan.nodeAudits card/list rows before writing repeated item widgets; absenceHints identify fields that should not be invented.');
  }
  if (audits.some((audit) => audit.targetComponentCandidates?.some((candidate) => candidate.recommendation === 'prefer-target-component'))) {
    hints.push('When visualPlan.nodeAudits includes targetComponentCandidates with prefer-target-component, try the detected target component first and use rows/controls/bbox as fit checks before falling back to a local Widget.');
  }
  if (audits.some((audit) => audit.layoutConflicts.some((conflict) => conflict.kind === 'row-flex-multiple-y-bands'))) {
    hints.push('When a nodeAudit reports row-flex-multiple-y-bands, preserve directChildren structure and confirm whether the visual bands are intentional wrap before implementing as multiple Flutter rows.');
  }
  return hints;
}

function parseCssNumber(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function roundCssNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildComponentMappings(evidence: PageCanonical, components: FlutterComponentRef[]): ComponentMapping[] {
  const roles = new Map<SnapshotNodeRole, string[]>();
  const byId = new Map(evidence.nodes.map((node) => [node.id, node]));
  const hasSourceAppBar = sourceComponents(evidence).some((component) => sourceComponentRole(component) === 'app-bar');
  for (const node of evidence.nodes) {
    const role = componentMappingRoleForNode(node, byId, evidence, hasSourceAppBar);
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role)?.push(node.id);
  }

  const runtimeMappings = [...roles.entries()]
    .filter(([role]) => role !== 'unknown' && role !== 'text')
    .map(([role, nodeIds]) => {
      const component = bestComponentForRole(role, components);
      return {
        sourceRole: role,
        nodeIds: nodeIds.slice(0, 20),
        ...(component ? { targetSymbol: component.symbol } : {}),
        confidence: component?.confidence ?? 'low',
        reason: component
          ? `Evidence role ${role} can likely use ${component.symbol}.`
          : `No clear target component was detected for evidence role ${role}; implement with local Widget and target theme.`,
      };
    });

  const sourceMappings = sourceComponents(evidence)
    .map((component) => {
      const role = sourceComponentRole(component);
      const targetComponent = bestComponentForRole(role, components);
      return {
        sourceRole: role,
        nodeIds: [`source:${component.name}`],
        ...(targetComponent ? { targetSymbol: targetComponent.symbol } : {}),
        confidence: targetComponent?.confidence ?? 'medium',
        reason: targetComponent
          ? `Source component ${component.name} (${component.role}) can likely use ${targetComponent.symbol}.`
          : `Source component ${component.name} (${component.role}) should become a local widget unless target examples show a reusable component.`,
      } satisfies ComponentMapping;
    });

  return dedupeBy([...runtimeMappings, ...sourceMappings], (mapping) => `${mapping.sourceRole}:${mapping.nodeIds.join(',')}`);
}

function componentMappingRoleForNode(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  hasSourceAppBar: boolean,
): SnapshotNodeRole {
  if (node.role === 'section' && hasSourceAppBar && isLikelyTopAppBarNode(node, byId, evidence)) return 'app-bar';
  return node.role;
}

function isLikelyTopAppBarNode(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
): boolean {
  const viewportWidth = evidence.viewport?.width ?? node.bbox.width;
  const fullWidth = viewportWidth <= 0 || node.bbox.width >= viewportWidth * 0.88;
  const style = node.computedStyle;
  if (!fullWidth || node.bbox.y > 8 || node.bbox.height < 40 || node.bbox.height > 88) return false;
  if (style?.display !== 'flex' || style.alignItems !== 'center') return false;
  const descendants = collectDescendants(node, byId).filter((item) => item.id !== node.id);
  const hasTitle = descendants.some((item) => item.text?.trim());
  const hasIcon = descendants.some((item) => item.role === 'icon' || Boolean(item.assetRefs?.length));
  return hasTitle && hasIcon;
}

function bestComponentForRole(role: SnapshotNodeRole, components: FlutterComponentRef[]): FlutterComponentRef | undefined {
  const preferred: Partial<Record<SnapshotNodeRole, FlutterComponentRole[]>> = {
    'app-bar': ['app-bar'],
    button: ['button'],
    image: ['image'],
    icon: ['image'],
    modal: ['sheet'],
    list: ['refresh'],
    'bottom-bar': ['button'],
  };
  const targetRoles = preferred[role] ?? [];
  return components.find((component) => targetRoles.includes(component.role));
}

function buildThemeMappings(evidence: PageCanonical, targetConventions: FlutterTargetConventionProfile): ThemeMapping[] {
  const themeFamily = themeFallbackFamilies(targetConventions);
  const runtimeMappings = (evidence.tokens ?? []).slice(0, 80).map((token) => {
    const resolution = token.kind === 'typography'
      ? resolveFlutterTypographyTarget({ value: token.value })
      : token.kind === 'color'
        ? resolveFlutterColorTarget({
          cssVar: token.cssVar,
          value: token.value,
          source: token.source,
        })
        : undefined;
    const familyTarget = token.kind === 'typography'
      ? themeFamily.typography
      : token.kind === 'color'
        ? themeFamily.color
        : undefined;
    const target = supportedThemeTarget(resolution?.target, familyTarget, targetConventions);
    const candidateTargets = supportedThemeCandidates(resolution?.candidateTargets, targetConventions);
    const matchedBy = resolution?.target && !target ? 'manual' : resolution?.matchedBy ?? 'manual';
    const source = token.cssVar ? `${token.source} (${token.cssVar})` : token.source;
    return {
      kind: token.kind,
      source,
      value: token.value,
      ...(token.usage.length > 0 ? { nodeIds: token.usage.slice(0, 24) } : {}),
      ...(target ? { target } : {}),
      ...(candidateTargets.length ? { candidateTargets } : {}),
      matchedBy,
      confidence: target ? (resolution?.confidence ?? 'medium') : 'low',
      reason: target
        ? `Map evidence ${token.kind} signal to the closest detected target theme token during implementation.`
        : `No target-supported theme token family is inferred for ${token.kind}; confirm manually.`,
    } satisfies ThemeMapping;
  });
  const sourceMappings = (evidence.sourceFacts?.analysis.sfc?.styleTokens ?? []).slice(0, 80).map((token) => {
    const property = token.property.toLowerCase();
    const isTypography = token.kind === 'typography' || property.includes('font');
    const isColor = token.kind === 'color' || property.includes('color');
    const typographyResolution = isTypography && token.token.startsWith('@include ')
      ? resolveFlutterTypographyMixinTarget(token.token)
      : undefined;
    const colorResolution = isColor
      ? resolveFlutterColorTarget({
        cssVar: token.token,
        value: token.fallback ?? token.token,
        source: token.selector,
      })
      : undefined;
    const rawTarget = typographyResolution?.target ?? colorResolution?.target;
    const fallbackTarget = isTypography ? themeFamily.typography : isColor ? themeFamily.color : undefined;
    const target = supportedThemeTarget(rawTarget, fallbackTarget, targetConventions);
    const candidateTargets = supportedThemeCandidates(typographyResolution?.candidateTargets ?? colorResolution?.candidateTargets, targetConventions);
    const hasExactTypographyTarget = Boolean(isTypography && rawTarget === target && typographyResolution?.confidence === 'high');
    const lockToken = Boolean(hasExactTypographyTarget);
    return {
      kind: isTypography ? 'typography' : isColor ? 'color' : undefined,
      source: `${token.selector}.${token.property}`,
      ...(token.selector ? { sourceSelector: token.selector } : {}),
      ...(isTypography && token.token.startsWith('@include ') ? { sourceMixin: token.token.replace(/^@include\s+/, '') } : {}),
      value: token.fallback ?? token.token,
      ...(target ? { target } : {}),
      ...(candidateTargets.length ? { candidateTargets } : {}),
      matchedBy: rawTarget && !target ? 'manual' : typographyResolution?.matchedBy ?? colorResolution?.matchedBy ?? 'manual',
      confidence: target ? (typographyResolution?.confidence ?? colorResolution?.confidence ?? 'medium') : 'low',
      ...(lockToken ? { lockToken: true, doNotOverride: token.doNotOverride ?? ['fontSize', 'fontWeight', 'height', 'fontFamily'] } : {}),
      reason: lockToken
        ? `Source typography token ${token.token} is an exact semantic design token; generated Flutter must use ${target} without overriding fontSize, height, fontWeight, or fontFamily.`
        : `Source style token ${token.token} preserves semantic design intent; runtime computed style should still confirm final rendered value when available.`,
    } satisfies ThemeMapping;
  });
  return dedupeBy([...runtimeMappings, ...sourceMappings], (mapping) => `${mapping.source}:${mapping.value}`);
}

function buildThemeMappingGroups(themeMappings: ThemeMapping[]): ThemeMappingGroups {
  const resolved: ThemeMapping[] = [];
  const candidates: ThemeMapping[] = [];
  const familyOnly: ThemeMapping[] = [];
  for (const mapping of themeMappings) {
    if (isFamilyOnlyThemeMapping(mapping)) {
      familyOnly.push(mapping);
      continue;
    }
    if (mapping.confidence === 'high' && (mapping.target || mapping.lockToken)) {
      resolved.push(mapping);
      continue;
    }
    candidates.push(mapping);
  }
  return { resolved, candidates, familyOnly };
}

function isFamilyOnlyThemeMapping(mapping: ThemeMapping): boolean {
  if (mapping.confidence === 'low') return true;
  if (!mapping.target) return true;
  return /\.\*$/.test(mapping.target);
}

function supportedThemeTarget(
  target: string | undefined,
  fallback: string | undefined,
  targetConventions: FlutterTargetConventionProfile,
): string | undefined {
  if (target && isThemeTargetSupported(target, targetConventions)) return target;
  return fallback;
}

function supportedThemeCandidates(
  targets: string[] | undefined,
  targetConventions: FlutterTargetConventionProfile,
): string[] {
  return (targets ?? []).filter((target) => isThemeTargetSupported(target, targetConventions));
}

function isThemeTargetSupported(target: string, targetConventions: FlutterTargetConventionProfile): boolean {
  const patterns = targetConventions.architectureProfile.theme.patterns;
  if (target.startsWith('themeService.colors')) return patterns.includes('themeService.colors');
  if (target.startsWith('themeService.textStyles')) return patterns.includes('themeService.textStyles');
  if (target.startsWith('context.pbColors')) return patterns.includes('context.pbColors');
  if (target.startsWith('context.pbTextStyles')) return patterns.includes('context.pbTextStyles');
  if (target.startsWith('Theme.of(context)')) return patterns.includes('Theme.of(context)');
  return true;
}

function themeFallbackFamilies(targetConventions: FlutterTargetConventionProfile): {
  color?: string | undefined;
  typography?: string | undefined;
} {
  const patterns = targetConventions.architectureProfile.theme.patterns;
  return {
    color: patterns.includes('context.pbColors')
      ? 'context.pbColors.*'
      : patterns.includes('themeService.colors')
        ? 'themeService.colors.*'
        : patterns.includes('Theme.of(context)')
          ? 'Theme.of(context).colorScheme.*'
          : undefined,
    typography: patterns.includes('context.pbTextStyles')
      ? 'context.pbTextStyles.*'
      : patterns.includes('themeService.textStyles')
        ? 'themeService.textStyles.*'
        : patterns.includes('Theme.of(context)')
          ? 'Theme.of(context).textTheme.*'
          : undefined,
  };
}

function buildI18nPlan(evidence: PageCanonical): UiBuildPlan['i18nPlan'] {
  const dynamicHints = buildDynamicTextHints(evidence);
  const dynamicByText = new Map(dynamicHints.map((hint) => [hint.text, hint]));
  const sourceI18nTexts = Object.values(evidence.sourceFacts?.analysis.i18n ?? {})
    .flatMap((value) => collectStrings(value))
    .filter((text) => text.length <= 120);
  const texts = dedupe([
    ...evidence.text.filter((text) => text.length <= 120),
    ...sourceI18nTexts,
  ])
    .filter((text) => text.length <= 120)
    .slice(0, 120)
    .map((text) => {
      const dynamic = dynamicByText.get(text);
      const nodeIds = evidence.nodes.filter((node) => node.text === text).map((node) => node.id).slice(0, 8);
      return {
        text,
        nodeIds,
        ...(dynamic ? { dynamic: true, dynamicKind: dynamic.kind } : suggestedKey(text)),
      };
    });
  return {
    texts,
    recommendation: 'Visible static text should use the i18n API detected in targetConventions when available; dynamic values such as counts, prices, percentages, dates, and quantities should be formatted from UI model data instead of becoming fixed translation keys.',
  };
}

function buildDynamicTextHints(evidence: PageCanonical): UiDynamicTextHint[] {
  return evidence.nodes
    .filter((node) => node.text?.trim())
    .flatMap((node) => {
      const text = node.text?.trim() ?? '';
      const kind = dynamicTextKind(text, node, evidence);
      if (!kind) return [];
      return [{
        nodeId: node.id,
        text,
        kind,
        ...relatedNodeForDynamicText(kind, node, evidence),
        recommendation: recommendationForDynamicText(kind),
      }];
    })
    .slice(0, 120);
}

function dynamicTextKind(
  text: string,
  node: PageSnapshotNode,
  evidence: PageCanonical,
): UiDynamicTextHint['kind'] | undefined {
  if (/^（\d+）$|^\(\d+\)$/.test(text) && isNearListHeading(node, evidence)) return 'list-count';
  if (/^[+-]?\$[\d,]+(?:\.\d+)?$|^[+-]?[\d,]+(?:\.\d+)?\s?(USD|HKD|CNY)$/i.test(text)) return 'money';
  if (/^[+-]?\d+(?:\.\d+)?%$/.test(text)) return 'percent';
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(text)) return 'date';
  if (/^(Held|Qty|Quantity|Shares)\s+\d+/i.test(text) || /^(持股|持仓|数量|可用)\s*\d+/.test(text)) return 'quantity';
  return undefined;
}

function isNearListHeading(node: PageSnapshotNode, evidence: PageCanonical): boolean {
  return evidence.nodes.some((candidate) => {
    if (candidate.id === node.id || !candidate.text) return false;
    const sameRow = Math.abs(candidate.bbox.y - node.bbox.y) <= 8;
    const near = Math.abs(candidate.bbox.x + candidate.bbox.width - node.bbox.x) <= 80 || Math.abs(candidate.bbox.x - node.bbox.x) <= 240;
    return sameRow && near && /positions|records|history|orders|list|持仓|记录|历史|列表|可行权|行权/i.test(candidate.text);
  });
}

function relatedNodeForDynamicText(
  kind: UiDynamicTextHint['kind'],
  node: PageSnapshotNode,
  evidence: PageCanonical,
): { relatedNodeId?: string } {
  if (kind !== 'list-count') return {};
  const related = evidence.sections.find((section) =>
    section.role === 'list'
    && section.bbox.y >= node.bbox.y
    && section.bbox.y - node.bbox.y <= 120,
  );
  return related?.nodeIds[0] ? { relatedNodeId: related.nodeIds[0] } : {};
}

function recommendationForDynamicText(kind: UiDynamicTextHint['kind']): string {
  const recommendations: Record<UiDynamicTextHint['kind'], string> = {
    'list-count': 'Derive this count from the backing list/model length instead of hard-coding it in a translation key.',
    money: 'Format this value from UI model data with the target currency/number formatter.',
    percent: 'Format this percentage from UI model data instead of treating it as static copy.',
    date: 'Format this date from UI model data with the target date formatter.',
    quantity: 'Format this quantity from UI model data; translate only the label portion.',
    'dynamic-value': 'Render this value from UI model data instead of static copy.',
  };
  return recommendations[kind];
}

function suggestedKey(text: string): { suggestedKey?: string } {
  const key = toSnakeCase(text).slice(0, 48);
  return key ? { suggestedKey: key } : {};
}

function buildAssetPlan(evidence: PageCanonical): UiBuildPlan['assetPlan'] {
  const sourceAssets = evidence.sourceFacts?.analysis.sfc?.assets ?? [];
  return {
    assets: [
      ...evidence.assets.slice(0, 80).map((asset) => ({
      source: asset.source,
      kind: asset.kind,
      nodeId: asset.nodeId,
      recommendation: asset.source
        ? 'Match this source with an existing target asset first; add a TODO if no local asset exists.'
        : 'Inline or generated visual asset detected; recreate with detected target icon/SVG/image conventions.',
      })),
      ...sourceAssets.slice(0, 80).map((asset) => ({
        source: asset.source,
        kind: sourceAssetKind(asset.kind),
        recommendation: asset.migrationHint,
      })),
    ],
    recommendation: 'Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.',
  };
}

function buildInteractionPlan(evidence: PageCanonical): InteractionPlan[] {
  const runtime = evidence.interactions.slice(0, 80).map((interaction) => ({
    kind: interaction.kind,
    label: interaction.label,
    nodeId: interaction.nodeId,
    recommendation: 'Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar target example confirms it.',
  }));
  const source = (evidence.sourceFacts?.analysis.sfc?.interactions ?? []).slice(0, 80).map((interaction, index) => ({
    kind: sourceInteractionKind(interaction.kind),
    label: interaction.target,
    nodeId: `source:interaction:${index}`,
    recommendation: interaction.evidence,
  }));
  return [...runtime, ...source];
}

function buildBusinessQuestions(evidence: PageCanonical): string[] {
  const questions = [
    '确认页面真实数据来源、接口字段和加载/空态策略。',
    '确认点击、跳转、弹层、筛选和输入行为的业务规则。',
    '确认权限、风控、埋点和异常处理是否需要在本页面接入。',
  ];
  if (evidence.interactions.length > 0) {
    questions.push(`PageCanonical 识别到 ${evidence.interactions.length} 个可交互区域，需要逐项确认业务动作。`);
  }
  const source = evidence.sourceFacts?.analysis;
  if (source?.sfc?.state.length) {
    questions.push(`Source facts 识别到 ${source.sfc.state.length} 个状态线索，需要确认哪些属于真实业务状态、哪些只是 UI 临时状态。`);
  }
  return questions;
}

function buildRisks(evidence: PageCanonical): string[] {
  const risks = [
    'PageCanonical 只能证明当前采集到的可见 UI 与增强证据，不能证明隐藏状态或业务逻辑。',
    '少量 computed style 仍可能映射到多个目标语义 token，需结合 node 上下文和截图二次确认。',
  ];
  if (evidence.assets.length > 0) risks.push('图片、SVG 或背景资源需要确认是否已有目标本地资产可复用。');
  if (evidence.sourceFacts && !evidence.runtimeFacts) risks.push('本次没有 runtime facts，bbox、computed style、当前可见状态和截图对照需要后续 capture 确认。');
  if (evidence.runtimeFacts && !evidence.sourceFacts) risks.push('本次没有 source facts，隐藏状态、业务语义和完整交互空间不能从 runtime 直接推断。');
  if ((evidence.manualConfirmations?.length ?? 0) > 0) risks.push(...(evidence.manualConfirmations ?? []).map((item) => item.question));
  if (evidence.warnings.length > 0) risks.push(...evidence.warnings);
  return risks;
}

function buildSectionHint(section: PageCanonical['sections'][number], evidence: PageCanonical): string {
  const rootNodeId = section.nodeIds[0];
  const rootNode = evidence.nodes.find((node) => node.id === rootNodeId);
  const computedStyle = rootNode?.computedStyle;
  const layoutHints = [
    computedStyle?.display && computedStyle.display !== 'block'
      ? `display=${computedStyle.display}`
      : '',
    computedStyle?.flexDirection && computedStyle.flexDirection !== 'row'
      ? `flexDirection=${computedStyle.flexDirection}`
      : '',
    computedStyle?.alignItems && computedStyle.alignItems !== 'normal'
      ? `alignItems=${computedStyle.alignItems}`
      : '',
    computedStyle?.justifyContent && computedStyle.justifyContent !== 'normal'
      ? `justifyContent=${computedStyle.justifyContent}`
      : '',
    computedStyle?.gap && computedStyle.gap !== 'normal' && computedStyle.gap !== '0px'
      ? `gap=${computedStyle.gap}`
      : '',
    computedStyle?.padding && computedStyle.padding !== '0px'
      ? `padding=${computedStyle.padding}`
      : '',
    computedStyle?.margin && computedStyle.margin !== '0px'
      ? `margin=${computedStyle.margin}`
      : '',
    section.nodeIds.length > 1 ? `descendants=${section.nodeIds.length - 1}` : '',
  ].filter(Boolean);

  return [
    `还原 ${section.role} 区块，bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}。`,
    layoutHints.length > 0 ? `布局特征：${layoutHints.join(', ')}。` : '',
  ].filter(Boolean).join(' ');
}

function sourceSections(evidence: PageCanonical): VueTemplateSection[] {
  return evidence.sourceFacts?.analysis.sfc?.sections ?? [];
}

function sourceComponents(evidence: PageCanonical): VueSemanticComponent[] {
  return evidence.sourceFacts?.analysis.sfc?.components ?? [];
}

function sourceSectionRole(section: VueTemplateSection): SnapshotNodeRole {
  const map: Record<VueTemplateSection['kind'], SnapshotNodeRole> = {
    'app-bar': 'app-bar',
    'tab-bar': 'tab-bar',
    section: 'section',
    list: 'list',
    chart: 'section',
    'bottom-bar': 'bottom-bar',
    modal: 'modal',
    unknown: 'unknown',
  };
  return map[section.kind] ?? 'section';
}

function sourceComponentRole(component: VueSemanticComponent): SnapshotNodeRole {
  const map: Record<VueSemanticComponent['role'], SnapshotNodeRole> = {
    header: 'app-bar',
    tabs: 'tab-bar',
    'section-tabs': 'tab-bar',
    summary: 'section',
    'content-section': 'section',
    list: 'list',
    chart: 'section',
    'bottom-actions': 'bottom-bar',
    modal: 'modal',
    unknown: 'unknown',
  };
  return map[component.role] ?? 'section';
}

function sourceSectionHint(section: VueTemplateSection): string {
  return [
    `根据 source semantic section 迁移 ${section.kind} 区块。`,
    section.title ? `标题/语义：${section.title}。` : '',
    section.selector ? `来源 selector：${section.selector}。` : '',
    section.evidence ? `证据：${section.evidence}` : '',
  ].filter(Boolean).join(' ');
}

function sourceInteractionKind(kind: NonNullable<PageCanonical['sourceFacts']>['analysis']['sfc'] extends infer S
  ? S extends { interactions: Array<infer I> }
    ? I extends { kind: infer K }
      ? K
      : never
    : never
  : never): InteractionPlan['kind'] {
  if (kind === 'model') return 'input';
  if (kind === 'click') return 'tap';
  return 'unknown';
}

function sourceAssetKind(kind: string): UiBuildPlan['assetPlan']['assets'][number]['kind'] {
  if (kind === 'image') return 'image';
  if (kind === 'svg' || kind === 'inline-svg') return 'svg';
  if (kind === 'icon') return 'icon';
  if (kind === 'background') return 'background';
  return 'unknown';
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStrings(item));
  }
  return [];
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function createPlanId(pageId: string): string {
  return `plan_${pageId.replace(/^evidence_/, '')}_${Date.now().toString(36)}`;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}

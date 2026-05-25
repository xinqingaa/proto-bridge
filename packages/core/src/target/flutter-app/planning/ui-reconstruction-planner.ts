import type {
  ComponentMapping,
  FlutterComponentRef,
  FlutterComponentRole,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterStateStrategy,
  FlutterTargetConventionProfile,
  FlutterWidgetContract,
  FlutterWidgetPlan,
  InteractionPlan,
  MappingConfidence,
  PageCanonical,
  PageSnapshotNode,
  SnapshotNodeRole,
  SourceAwareReviewProjection,
  ThemeMapping,
  ThemeMappingGroups,
  UiActionMapping,
  UiBuildPlan,
  UiDynamicTextHint,
  UiImplementationContract,
  UiImplementationIndex,
  UiInteractionTarget,
  UiNodeAudit,
  UiNodeAuditChild,
  UiNodeAuditControl,
  UiNodeAuditInstance,
  UiNodeAuditInstanceDelta,
  UiNodeAuditKind,
  UiNodeAuditLayoutConflict,
  UiNodeAuditNoiseLevel,
  UiNodeAuditPriority,
  UiNodeAuditStyle,
  UiOverlayPlan,
  UiPlanLayoutConflict,
  UiSourceSemantics,
  UiTargetComponentCandidate,
  UiVisualPlan,
  VueInteractionHint,
  VueSemanticComponent,
  VueTemplateSection,
} from '../../../types/index.js';
import path from 'node:path';
import { getFlutterTargetConventions } from '../conventions.js';
import { findFlutterTargetExamples } from '../examples.js';
import { restorationProfileArtifact } from '../../../profile/index.js';
import type { ResolvedRestorationProfile } from '../../../profile/index.js';
import { toPascalCase, toSnakeCase } from './migration-planner.js';
import { buildAssetPlan, buildBusinessQuestions, buildI18nPlan, buildInteractionPlan, buildRisks, buildSectionHint } from './ui-reconstruction-content.js';
import { buildImplementationContract, buildContractValidationHints } from './ui-reconstruction-contract.js';
import { createPlanId, dedupeBy, sourceComponents, sourceComponentRole, sourceSections, sourceSectionHint, sourceSectionRole } from './ui-reconstruction-shared.js';
import { buildThemeMappingGroups, buildThemeMappings } from './ui-reconstruction-theme.js';
import { buildComponentMappings, buildNodeAuditValidationHints, buildVisualPlan } from './ui-reconstruction-visual.js';

export type BuildFlutterUiReconstructionPlanInput = {
  evidence: PageCanonical;
  targetRoot: string;
  targetModule?: string | undefined;
  restorationProfile?: ResolvedRestorationProfile | undefined;
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
    restorationProfile: input.restorationProfile,
  });
  const moduleName = input.targetModule ?? inferModule(input.evidence, initialConventions.existingModules, input.restorationProfile) ?? 'feature';
  const conventions = initialConventions.module === moduleName
    ? initialConventions
    : await getFlutterTargetConventions({
      flutterRoot: targetRoot,
      module: moduleName,
      roles,
      restorationProfile: input.restorationProfile,
    });
  const examples = await findFlutterTargetExamples({
    flutterRoot: targetRoot,
    module: moduleName,
    pattern: inferPattern(input.evidence),
    roles,
    screenId: input.evidence.page.route,
    limit: 8,
    restorationProfile: input.restorationProfile,
  });
  const pageName = inferPageName(input.evidence);
  const baseDir = `lib/app/modules/${moduleName}/${toSnakeCase(pageName)}`;
  const runtimeWidgetTree = buildRuntimeWidgetTree(pageName, input.evidence);
  const componentMappings = buildComponentMappings(input.evidence, conventions.components);
  const visualPlan = buildVisualPlan(input.evidence, {
    components: conventions.components,
    componentMappings,
    restorationProfile: input.restorationProfile,
  });
  const fallbackPlan = buildFallbackImplementationPlan(baseDir, pageName, runtimeWidgetTree);
  const routeMapping = input.evidence.targetFacts?.analysis.routeMapping;
  const routeIntentMappings = input.evidence.targetFacts?.analysis.routeIntentMappings ?? [];
  const implementationContract = buildImplementationContract({
    evidence: input.evidence,
    sourceAwarePlan: input.sourceAwareImplementationPlan,
    sourceReview: input.sourceReview,
    fallbackPlan,
    targetModule: moduleName,
    routeMapping,
    routeIntentMappings,
    targetConventions: conventions.targetConventions,
    targetComponents: conventions.components,
    visualPlan,
  });
  const nodeAuditHints = buildNodeAuditValidationHints(visualPlan.nodeAudits);
  const themeMappings = buildThemeMappings(input.evidence, conventions.targetConventions, input.restorationProfile);

  return {
    id: createPlanId(input.evidence.id),
    pageId: input.evidence.id,
    ...(input.restorationProfile ? { restorationProfile: restorationProfileArtifact(input.restorationProfile) } : {}),
    ...(routeMapping ? { routeMapping } : {}),
    ...(routeIntentMappings.length ? { routeIntentMappings } : {}),
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
    i18nPlan: buildI18nPlan(input.evidence, input.restorationProfile),
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

function inferModule(
  evidence: PageCanonical,
  existingModules: string[],
  restorationProfile: ResolvedRestorationProfile | undefined,
): string | undefined {
  const sourceModule = evidence.sourceFacts?.analysis.module;
  const routeMappedModule = evidence.targetFacts?.analysis.routeMapping?.targetModule;
  if (routeMappedModule && existingModules.includes(routeMappedModule)) return routeMappedModule;
  if (sourceModule && existingModules.includes(sourceModule)) return sourceModule;
  const targetModule = evidence.targetFacts?.analysis.suggestedModule;
  if (targetModule && existingModules.includes(targetModule)) return targetModule;
  const route = evidence.page.route ?? evidence.source.route ?? evidence.source.url ?? '';
  const segments = route.split(/[/?#&.=_-]+/).filter((item) => item.length >= 3);
  for (const segment of segments) {
    if (existingModules.includes(segment)) return segment;
    const mapped = resolveModuleAlias(segment, existingModules, restorationProfile);
    if (mapped) return mapped;
  }
  return existingModules[0];
}

function resolveModuleAlias(
  candidate: string,
  existingModules: string[],
  restorationProfile: ResolvedRestorationProfile | undefined,
): string | undefined {
  const mapped = restorationProfile?.profile.moduleAliases?.[candidate.toLowerCase()];
  return mapped && existingModules.includes(mapped) ? mapped : undefined;
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

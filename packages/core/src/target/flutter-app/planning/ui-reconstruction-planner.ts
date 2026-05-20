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
  SnapshotNodeRole,
  ThemeMapping,
  UiBuildPlan,
  UiImplementationContract,
  UiVisualPlan,
  VueSemanticComponent,
  VueTemplateSection,
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
  const fallbackPlan = buildFallbackImplementationPlan(baseDir, pageName, runtimeWidgetTree);
  const implementationContract = buildImplementationContract({
    sourceAwarePlan: input.sourceAwareImplementationPlan,
    fallbackPlan,
    targetConventions: conventions.targetConventions,
  });
  const visualPlan = buildVisualPlan(input.evidence);

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
    componentMappings: buildComponentMappings(input.evidence, conventions.components),
    themeMappings: buildThemeMappings(input.evidence, conventions.targetConventions),
    i18nPlan: buildI18nPlan(input.evidence),
    assetPlan: buildAssetPlan(input.evidence),
    interactionPlan: buildInteractionPlan(input.evidence),
    businessQuestions: buildBusinessQuestions(input.evidence),
    risks: buildRisks(input.evidence),
    validationHints: [
      'Compare the generated Flutter screen against the source screenshot before adding business behavior.',
      'Treat typography, CSS colors, spacing, and layout as P0 visual fidelity items; prefer exact evidence matches before approximate fallback.',
      'Use node-level themeMappings first; when a theme token is resolved exactly, do not replace it with a larger or heavier nearby token.',
      'If a typography themeMapping has lockToken=true, use the target textStyles token directly and do not override fontSize, height, fontWeight, or fontFamily unless the plan explicitly lists a source override.',
      'Check spacing, radius, border, and shadow values against reusable target widgets before introducing local constants.',
      'Keep business data, API fields, permission checks, risk controls, and tracking as TODOs unless confirmed by target examples.',
      'Prefer similar module examples and common widgets over one-to-one DOM translation.',
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
  sourceAwarePlan?: FlutterImplementationPlan | undefined;
  fallbackPlan: Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'>;
  targetConventions: FlutterTargetConventionProfile;
}): UiImplementationContract {
  const logical = input.sourceAwarePlan ?? input.fallbackPlan;
  const contractWarnings = normalizeContractWarnings(input.targetConventions);
  const stateBinding = stateBindingFor(input.targetConventions);
  return {
    logicalPlanSource: input.sourceAwarePlan
      ? 'source-aware implementation plan normalized by target conventions'
      : 'visual evidence fallback normalized by target conventions; source-aware implementation plan unavailable',
    fileTree: normalizeFileTree(logical.fileTree, input.targetConventions),
    widgetTree: logical.widgetTree.map((widget) => normalizeWidget(widget, input.targetConventions)),
    stateStrategy: (logical.stateStrategy ?? []).map((strategy) => normalizeStateStrategy(strategy, input.targetConventions)),
    controllerBoundaries: (logical.controllerBoundaries ?? []).map((boundary) => normalizeControllerBoundary(boundary, input.targetConventions)),
    widgetContracts: (logical.widgetContracts ?? []).map((contract) => normalizeWidgetContract(contract, input.targetConventions)),
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
      'If target conventions are unknown, report warnings instead of guessing.',
    ],
    contractWarnings,
    manualQuestions: contractWarnings.map((warning) => `Confirm target convention: ${warning}`),
  };
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
    buildHint: normalizeTargetLanguage(widget.buildHint, targetConventions),
  };
}

function normalizeStateStrategy(
  strategy: FlutterStateStrategy,
  targetConventions: FlutterTargetConventionProfile,
): FlutterStateStrategy {
  return {
    ...strategy,
    recommendation: normalizeTargetLanguage(strategy.recommendation, targetConventions),
  };
}

function normalizeControllerBoundary(
  boundary: FlutterControllerBoundary,
  targetConventions: FlutterTargetConventionProfile,
): FlutterControllerBoundary {
  return {
    ...boundary,
    name: normalizeTargetLanguage(boundary.name, targetConventions),
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
      .replace(/\bGet\.find\b/g, 'target dependency lookup')
      .replace(/\bObx\b/g, 'target reactive builder')
      .replace(/\bRx\b/g, 'target state primitive')
      .replace(/\bever\/worker\b/g, 'target state listener');
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
    warnings.push('page-level controller/binding files from the source-aware draft were omitted until target page state conventions are confirmed.');
  }
  if (profile.routing.pattern === 'unknown') warnings.push('routing pattern is unknown; keep navigation recommendations abstract.');
  if (profile.routing.navigation?.pattern === 'unknown') warnings.push('navigation call pattern is unknown; keep route action recommendations abstract.');
  if (profile.i18n.pattern === 'unknown') warnings.push('i18n pattern is unknown; do not invent translation API.');
  if (profile.theme.patterns.length === 0) warnings.push('theme pattern is unknown; use visualPlan/themeMappings evidence and ask for confirmation.');
  return dedupe(warnings);
}

function buildVisualPlan(evidence: PageCanonical): UiVisualPlan {
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
    layoutEvidence: evidence.sections.slice(0, 80).map((section) => {
      const title = section.title ? ` ${section.title}` : '';
      return `${section.role}${title}: bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}; nodes=${section.nodeIds.length}`;
    }),
    screenshotRefs: evidence.screenshots.map((screenshot) => screenshot.path),
  };
}

function buildComponentMappings(evidence: PageCanonical, components: FlutterComponentRef[]): ComponentMapping[] {
  const roles = new Map<SnapshotNodeRole, string[]>();
  for (const node of evidence.nodes) {
    if (!roles.has(node.role)) roles.set(node.role, []);
    roles.get(node.role)?.push(node.id);
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
  const sourceI18nTexts = Object.values(evidence.sourceFacts?.analysis.i18n ?? {})
    .flatMap((value) => collectStrings(value))
    .filter((text) => text.length <= 120);
  const texts = dedupe([
    ...evidence.text.filter((text) => text.length <= 120),
    ...sourceI18nTexts,
  ])
    .filter((text) => text.length <= 120)
    .slice(0, 120)
    .map((text) => ({
      text,
      nodeIds: evidence.nodes.filter((node) => node.text === text).map((node) => node.id).slice(0, 8),
      ...suggestedKey(text),
    }));
  return {
    texts,
    recommendation: 'Visible text should use the i18n API detected in targetConventions when available; otherwise keep local constants with TODO for translation keys.',
  };
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

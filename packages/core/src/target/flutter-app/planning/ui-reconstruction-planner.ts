import type {
  FlutterComponentRole,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterWidgetPlan,
  PageCanonical,
  SourceAwareReviewProjection,
  UiBuildPlan,
} from '../../../types/index.js';
import path from 'node:path';
import { getFlutterTargetConventions } from '../conventions.js';
import { findFlutterTargetExamples } from '../examples.js';
import { toPascalCase, toSnakeCase } from './migration-planner.js';
import { buildAssetPlan, buildBusinessQuestions, buildI18nPlan, buildInteractionPlan, buildRisks, buildSectionHint } from './ui-reconstruction-content.js';
import { buildImplementationContract, buildContractValidationHints } from './ui-reconstruction-contract.js';
import { createPlanId, dedupeBy, sourceComponents, sourceComponentRole, sourceSections, sourceSectionHint, sourceSectionRole } from './ui-reconstruction-shared.js';
import { buildStyleFacts } from './ui-reconstruction-theme.js';
import { buildComponentMappings, buildNodeAuditValidationHints, buildVisualPlan } from './ui-reconstruction-visual.js';

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
  const moduleName = input.targetModule ?? inferModule(input.evidence, initialConventions.existingModules);
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
  const baseDir = moduleName ? `__proto_bridge__/${moduleName}/${toSnakeCase(pageName)}` : undefined;
  const runtimeWidgetTree = buildRuntimeWidgetTree(pageName, input.evidence);
  const componentMappings = buildComponentMappings(input.evidence, conventions.components);
  const visualPlan = buildVisualPlan(input.evidence, {
    components: conventions.components,
    componentMappings,
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
  const styleFacts = buildStyleFacts(input.evidence);
  const integrationGuidance = buildIntegrationGuidance({
    moduleName,
    routeMapping,
    componentMappings,
    themePatterns: conventions.targetConventions.architectureProfile.theme.patterns,
    documentationFiles: conventions.targetConventions.documentation?.files.map((file) => file.path) ?? [],
  });
  const relevantComponentSymbols = new Set([
    ...componentMappings.flatMap((mapping) => mapping.targetSymbol ? [mapping.targetSymbol] : []),
    ...componentMappings.flatMap((mapping) => mapping.candidateSymbols ?? []),
  ]);
  const relevantComponents = conventions.components
    .filter((component) => relevantComponentSymbols.has(component.symbol))
    .map((component) => ({
      ...component,
      usageSnippets: component.usageSnippets.slice(0, 1),
      propsHints: component.propsHints.slice(0, 8),
    }));
  const compactConventions = compactTargetConventions(
    conventions.targetConventions,
    relevantComponentSymbols,
    themeFamilies(conventions.targetConventions.architectureProfile.theme.patterns),
  );
  const compactVisualPlan = compactVisualPlanForArtifact(visualPlan);

  return {
    schemaVersion: 2,
    id: createPlanId(input.evidence.id),
    pageId: input.evidence.id,
    artifactAuthority: {
      pageReconstruction: {
        level: 'authoritative',
        refs: ['page', 'visualPlan', 'stylePlan.facts', 'interactionPlan', 'implementationContract.sourceSemantics'],
        rule: 'Source/runtime/screenshot-backed page facts define what must be reconstructed.',
      },
      targetIntegration: {
        level: 'advisory',
        refs: ['integrationGuidance', 'targetConventions', 'target.similarExamples', 'componentMappings'],
        rule: 'Target module, route, component, and theme choices require target evidence or implementation-agent confirmation.',
      },
    },
    integrationGuidance,
    stylePlan: {
      authority: 'source-runtime-evidence',
      policy: {
        preserveObservedValues: true,
        targetTokenSelection: 'implementation-agent',
        rule: 'Preserve source/runtime values. Resolve B-specific theme expressions during implementation without changing the observed appearance.',
      },
      facts: styleFacts,
      targetThemeGuidance: {
        status: conventions.targetConventions.architectureProfile.theme.patterns.length > 0 ? 'family-only' : 'unresolved',
        families: themeFamilies(conventions.targetConventions.architectureProfile.theme.patterns),
        evidence: conventions.targetConventions.architectureProfile.theme.examples.slice(0, 8).map((item) => `${item.file}: ${item.snippet}`),
        nextAction: 'Preserve every source/runtime style value first; the implementation agent must read target theme definitions and choose the closest semantic token without changing the observed appearance.',
      },
    },
    ...(routeMapping ? { routeMapping } : {}),
    ...(routeIntentMappings.length ? { routeIntentMappings } : {}),
    target: {
      root: targetRoot,
      module: moduleName,
      existingModules: conventions.existingModules,
      routesFiles: conventions.routesFiles,
      translationFiles: conventions.translationFiles,
      assetDirectories: conventions.assetDirectories,
      reusableComponents: relevantComponents,
      similarExamples: examples.slice(0, 3).map((example) => ({ ...example, snippets: example.snippets.slice(0, 1) })),
      warnings: conventions.warnings,
    },
    targetConventions: compactConventions,
    implementationContract,
    visualPlan: compactVisualPlan,
    page: {
      title: input.evidence.page.title,
      route: input.evidence.page.route,
      summary: buildSummary(input.evidence),
      viewport: input.evidence.viewport ?? { width: 0, height: 0 },
    },
    componentMappings,
    i18nPlan: buildI18nPlan(input.evidence),
    assetPlan: buildAssetPlan(input.evidence, conventions.assetDirectories),
    interactionPlan: buildInteractionPlan(input.evidence),
    businessQuestions: buildBusinessQuestions(input.evidence),
    risks: buildRisks(input.evidence),
    validationHints: [
      '添加业务行为前，先把生成的 Flutter 页面与来源截图对齐。',
      '实现重复卡片、列表项、Tab、筛选器、按钮、标签、AppBar 操作或底部操作前，先查看 visualPlan.nodeAudits，并保持其中的行顺序、可见字段、padding、radius 和控件证据。',
      '除非 sourceSemantics 或用户确认明确要求，不要添加代表性 nodeAudits 中不存在的展示字段。',
      'section 标题旁的数量文案应尽量从 UI model 或列表长度派生，不要写死到固定数字的翻译 key。',
      '字体、CSS 颜色、间距和布局是 P0 视觉保真项；优先使用精确证据匹配，再考虑近似 fallback。',
      'stylePlan.facts 是页面外观事实；先保持 CSS 变量、最终颜色、字体、间距、圆角与阴影，再由实现 agent 依据 B 的主题定义选择表达方式。',
      '不要因为 B token 名称相近而改变 stylePlan.facts 中的 fontSize、lineHeight、fontWeight、颜色或间距；无法证明等价时由实现 agent 保留视觉值并确认。',
      '新增本地常量前，先用目标可复用组件核对 spacing、radius、border、shadow。',
      '当 nodeAudit control 提供 padding 和 borderRadius 证据时，除非目标组件 API 要求固定尺寸，否则优先使用 padding 驱动 Flutter 布局，而不是固定高度。',
      '业务数据、API 字段、权限、风控和埋点，除非目标示例已确认，否则保留 TODO。',
      '优先参考相似模块示例和公共组件，不要逐层翻译 DOM。',
      ...nodeAuditHints,
      ...buildContractValidationHints(implementationContract),
    ],
  };
}

function buildIntegrationGuidance(input: {
  moduleName?: string | undefined;
  routeMapping?: UiBuildPlan['routeMapping'];
  componentMappings: UiBuildPlan['componentMappings'];
  themePatterns: string[];
  documentationFiles: string[];
}): UiBuildPlan['integrationGuidance'] {
  const confirmedComponents = input.componentMappings.flatMap((mapping) =>
    mapping.status === 'confirmed' && mapping.targetSymbol ? [mapping.targetSymbol] : [],
  );
  const candidateComponents = input.componentMappings.flatMap((mapping) => mapping.candidateSymbols ?? []);
  const routeSelected = input.routeMapping && !input.routeMapping.unresolved
    ? input.routeMapping.targetRouteSymbol ?? input.routeMapping.targetRoute
    : undefined;
  const routeCandidates = input.routeMapping?.candidates.map((candidate) => candidate.routeSymbol ?? candidate.route) ?? [];
  const module = input.moduleName
    ? {
        status: 'candidate' as const,
        confidence: 'medium' as const,
        selected: input.moduleName,
        candidates: [input.moduleName],
        evidence: ['The source module name exists under a detected target feature/module root.'],
        nextAction: 'Confirm the target module against B documentation or ask the user before implementation when the task did not explicitly name it.',
      }
    : unresolvedGuidance('Read B module/file-organization documentation or ask the user where this page should be implemented.');
  const route = routeSelected
    ? {
        status: 'confirmed' as const,
        confidence: input.routeMapping?.confidence ?? 'high',
        selected: routeSelected,
        candidates: routeCandidates,
        evidence: input.routeMapping?.evidence ?? [],
        nextAction: 'Verify route parameters and registration scope in B before editing the registry.',
      }
    : routeCandidates.length > 0
      ? {
          status: 'candidate' as const,
          confidence: 'low' as const,
          candidates: routeCandidates,
          evidence: input.routeMapping?.evidence ?? [],
          nextAction: 'Do not register or reuse a route from name similarity alone; read B routing conventions or ask the user for the intended entry point.',
        }
      : unresolvedGuidance('Read B routing conventions or ask the user for the intended entry point; route matching is not required for page reconstruction.');
  const components = confirmedComponents.length > 0
    ? {
        status: 'candidate' as const,
        confidence: 'medium' as const,
        candidates: dedupeBy([...confirmedComponents, ...candidateComponents], (item) => item).slice(0, 8),
        evidence: input.componentMappings.flatMap((mapping) => mapping.evidence).slice(0, 12),
        nextAction: 'Use logical component boundaries as the source of truth; verify each target component API and visual defaults in B before reuse.',
      }
    : unresolvedGuidance('Keep the logical component split and inspect B common/shared widgets during implementation.');
  const families = themeFamilies(input.themePatterns);
  const theme = families.length > 0
    ? {
        status: 'candidate' as const,
        confidence: 'low' as const,
        candidates: families,
        evidence: input.themePatterns.slice(0, 12),
        nextAction: 'Match raw style facts to B theme tokens during implementation; PB does not select exact project tokens without explicit equivalence evidence.',
      }
    : unresolvedGuidance('Preserve raw style facts and read B theme documentation before choosing tokens.');
  const items = [module, route, components, theme];
  return {
    status: items.every((item) => item.status === 'confirmed') ? 'ready' : items.every((item) => item.status === 'unresolved') ? 'unresolved' : 'partial',
    module,
    route,
    components,
    theme,
    rule: `Page reconstruction does not depend on target integration guesses.${input.documentationFiles.length ? ` Consult scanned B documentation: ${input.documentationFiles.slice(0, 4).join(', ')}.` : ' No relevant B documentation was discovered; the implementation agent should inspect B or ask the user.'}`,
  };
}

function compactVisualPlanForArtifact(visualPlan: UiBuildPlan['visualPlan']): UiBuildPlan['visualPlan'] {
  return {
    ...visualPlan,
    nodeAudits: visualPlan.nodeAudits.map((audit) => {
      const {
        directChildren: _directChildren,
        controls: _controls,
        absenceHints: _absenceHints,
        implementationHints: _implementationHints,
        ...rest
      } = audit;
      return {
        ...rest,
        ...(audit.targetComponentCandidates?.length
          ? {
              targetComponentCandidates: audit.targetComponentCandidates.slice(0, 3).map((candidate) => ({
                symbol: candidate.symbol,
                role: candidate.role,
                confidence: candidate.confidence,
                recommendation: candidate.recommendation,
                evidence: candidate.evidence.slice(0, 1),
                ...(candidate.importPath ? { importPath: candidate.importPath } : {}),
                ...(candidate.sourceMappingNodeIds?.length ? { sourceMappingNodeIds: candidate.sourceMappingNodeIds } : {}),
                fitChecks: candidate.fitChecks.slice(0, 4),
                risks: candidate.risks.slice(0, 3),
              })),
            }
          : {}),
      } as typeof audit;
    }),
  };
}

function compactTargetConventions(
  conventions: UiBuildPlan['targetConventions'],
  relevantComponentSymbols: Set<string>,
  themeFamiliesForArtifact: string[],
): UiBuildPlan['targetConventions'] {
  const profile = conventions.architectureProfile;
  const compactFacet = <T extends { evidence: string[]; examples: Array<unknown> }>(facet: T): T => ({
    ...facet,
    evidence: facet.evidence.slice(0, 4),
    examples: facet.examples.slice(0, 3),
  });
  return {
    architectureProfile: {
      state: {
        ...compactFacet(profile.state),
        ...(profile.state.package ? { package: compactFacet(profile.state.package) } : {}),
        ...(profile.state.global ? { global: compactFacet(profile.state.global) } : {}),
        ...(profile.state.page ? { page: compactFacet(profile.state.page) } : {}),
      },
      routing: {
        ...compactFacet(profile.routing),
        ...(profile.routing.registration ? { registration: compactFacet(profile.routing.registration) } : {}),
        ...(profile.routing.navigation ? { navigation: compactFacet(profile.routing.navigation) } : {}),
      },
      i18n: {
        ...compactFacet(profile.i18n),
        ...(profile.i18n.lookup ? { lookup: compactFacet(profile.i18n.lookup) } : {}),
      },
      theme: {
        ...compactFacet(profile.theme),
        patterns: themeFamiliesForArtifact,
      },
      components: {
        ...compactFacet(profile.components),
        detectedSymbols: profile.components.detectedSymbols.filter((symbol) => relevantComponentSymbols.has(symbol)),
        evidence: profile.components.evidence
          .filter((item) => [...relevantComponentSymbols].some((symbol) => item.includes(symbol)))
          .slice(0, 8),
      },
      fileOrganization: compactFacet(profile.fileOrganization),
    },
    ...(conventions.documentation
      ? {
          documentation: {
            files: conventions.documentation.files.slice(0, 12).map((file) => ({ ...file, summary: file.summary.slice(0, 1) })),
            architectureHints: conventions.documentation.architectureHints.slice(0, 12),
            conflicts: conventions.documentation.conflicts,
            warnings: conventions.documentation.warnings,
          },
        }
      : {}),
    unresolved: conventions.unresolved,
  };
}

function unresolvedGuidance(nextAction: string): UiBuildPlan['integrationGuidance']['route'] {
  return { status: 'unresolved', confidence: 'low', candidates: [], evidence: [], nextAction };
}

function themeFamilies(patterns: string[]): string[] {
  return [...new Set(patterns.flatMap((pattern) => {
    if (pattern.startsWith('Theme.of(context)')) return ['Theme.of(context)'];
    const access = pattern.match(/^(.+?\.(?:colors|textStyles|textTheme|colorScheme))(?:\.|$)/i)?.[1];
    if (access) return [access];
    if (/^[A-Z]\w*(?:Colors|Theme|FontStyles)$/.test(pattern)) return [pattern];
    return [];
  }))].slice(0, 8);
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
  }
  return undefined;
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

function buildRuntimeFileTree(baseDir: string | undefined, pageName: string, widgetTree: FlutterWidgetPlan[]): FlutterPlannedFile[] {
  if (!baseDir) return [];
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
  baseDir: string | undefined,
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

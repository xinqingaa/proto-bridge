import type {
  FlutterComponentRef,
  FlutterControllerBoundary,
  FlutterImplementationPlan,
  FlutterPlannedFile,
  FlutterRouteIntentMapping,
  FlutterRouteMapping,
  FlutterStateStrategy,
  FlutterTargetConventionProfile,
  FlutterWidgetContract,
  FlutterWidgetPlan,
  PageCanonical,
  SourceAwareReviewProjection,
  UiImplementationContract,
  UiImplementationIndex,
  UiOverlayPlan,
  UiPlanLayoutConflict,
  UiSourceSemantics,
  UiVisualPlan,
  VueInteractionHint,
  VueSemanticComponent,
  VueTemplateSection,
} from '../../../types/index.js';
import { toSnakeCase } from './migration-planner.js';
import { bestComponentForRole, buildPlanLayoutConflicts } from './ui-reconstruction-visual.js';
import { collectDescendants, dedupe, dedupeBy, sourceSections } from './ui-reconstruction-shared.js';

export function buildContractValidationHints(contract: UiImplementationContract): string[] {
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

export function buildImplementationContract(input: {
  evidence: PageCanonical;
  sourceAwarePlan?: FlutterImplementationPlan | undefined;
  sourceReview?: SourceAwareReviewProjection | undefined;
  fallbackPlan: Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'>;
  targetModule?: string | undefined;
  routeMapping?: FlutterRouteMapping | undefined;
  routeIntentMappings?: FlutterRouteIntentMapping[] | undefined;
  targetConventions: FlutterTargetConventionProfile;
  targetComponents: FlutterComponentRef[];
  visualPlan: UiVisualPlan;
}): UiImplementationContract {
  const logical = rebaseLogicalPlanModule(input.sourceAwarePlan ?? input.fallbackPlan, input.targetModule);
  const contractWarnings = normalizeContractWarnings(input.targetConventions);
  const stateBinding = stateBindingFor(input.targetConventions);
  const sourceSemantics = enhanceSourceSemanticsWithVisualActions(
    buildSourceSemantics(input.sourceReview, logical, input.targetModule, input.routeMapping, input.routeIntentMappings ?? []),
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
  targetModule?: string | undefined,
  routeMapping?: FlutterRouteMapping | undefined,
  routeIntentMappings: FlutterRouteIntentMapping[] = [],
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
    summary: normalizeSourceSummary(sourceReview.summary, targetModule),
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
      evidence: routeIntentEvidence(route.migrationHint, route.target, routeMapping, routeIntentMappings),
      ...routeIntentMappingField(route.target, routeIntentMappings),
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

function routeIntentEvidence(
  migrationHint: string | undefined,
  sourceTarget: string | undefined,
  routeMapping: FlutterRouteMapping | undefined,
  routeIntentMappings: FlutterRouteIntentMapping[] = [],
): string | undefined {
  const normalizedHint = migrationHint ? normalizeSourceSemanticsLanguage(migrationHint) : undefined;
  if (!sourceTarget || !sourceTarget.includes('/')) {
    return normalizedHint;
  }
  const intentMapping = routeIntentMappingFor(sourceTarget, routeIntentMappings);
  if (intentMapping && !intentMapping.unresolved) {
    return routeMappingEvidence(normalizedHint, intentMapping);
  }
  if (!routeMapping || routeMapping.unresolved) {
    return intentMapping?.unresolved
      ? [normalizedHint, `No target route registry entry matched source route ${sourceTarget}.`, ...intentMapping.evidence.slice(0, 2)].filter(Boolean).join(' ')
      : normalizedHint;
  }
  if (intentMapping?.unresolved) {
    return [normalizedHint, `No target route registry entry matched source route ${sourceTarget}.`, ...intentMapping.evidence.slice(0, 2)].filter(Boolean).join(' ');
  }
  const sourceLeaf = sourceTarget.split(/[/?#]/)[0]?.split('/').filter(Boolean).at(-1);
  const mappingLeaf = routeMapping.sourceRoute?.split(/[/?#]/)[0]?.split('/').filter(Boolean).at(-1);
  if (sourceLeaf && mappingLeaf && sourceLeaf !== mappingLeaf) return normalizedHint;
  return routeMappingEvidence(normalizedHint, routeMapping);
}

function routeMappingEvidence(
  normalizedHint: string | undefined,
  routeMapping: FlutterRouteMapping,
): string | undefined {
  const target = routeMapping.targetRouteSymbol ?? routeMapping.targetRoute;
  if (!target) return normalizedHint;
  return [
    normalizedHint,
    `Matched target route ${target} via target route registry (${routeMapping.confidence}).`,
    ...routeMapping.evidence.slice(0, 2),
  ].filter(Boolean).join(' ');
}

function routeIntentMappingFor(
  sourceTarget: string | undefined,
  routeIntentMappings: FlutterRouteIntentMapping[],
): FlutterRouteIntentMapping | undefined {
  if (!sourceTarget) return undefined;
  const normalizedTarget = normalizeRoute(sourceTarget);
  return routeIntentMappings.find((mapping) => normalizeRoute(mapping.sourceRoute) === normalizedTarget);
}

function routeIntentMappingField(
  sourceTarget: string | undefined,
  routeIntentMappings: FlutterRouteIntentMapping[],
): { routeMapping?: FlutterRouteIntentMapping | undefined } {
  const mapping = routeIntentMappingFor(sourceTarget, routeIntentMappings);
  return mapping ? { routeMapping: mapping } : {};
}

function normalizeRoute(value: string | undefined): string {
  if (!value) return '';
  const route = value.split('?')[0]?.split('#')[0] ?? value;
  return route.startsWith('/') ? route : `/${route}`;
}

function rebaseLogicalPlanModule<T extends Pick<FlutterImplementationPlan, 'fileTree' | 'widgetTree' | 'stateStrategy' | 'controllerBoundaries' | 'widgetContracts'>>(
  logical: T,
  targetModule: string | undefined,
): T {
  if (!targetModule) return logical;
  return {
    ...logical,
    fileTree: logical.fileTree.map((file) => ({
      ...file,
      path: rebaseModulePath(file.path, targetModule),
    })),
  };
}

function rebaseModulePath(filePath: string, targetModule: string): string {
  const match = filePath.match(/^(lib\/app\/modules\/)([^/]+)(\/[^/]+\/.+)$/);
  if (!match?.[1] || !match[3]) return filePath;
  return `${match[1]}${targetModule}${match[3]}`;
}

function normalizeSourceSummary(summary: string[], targetModule: string | undefined): string[] {
  return summary.map((item) => {
    const normalized = normalizeSourceSemanticsLanguage(item);
    if (!targetModule) return normalized;
    return normalized.replace(/^Target module:\s*.+$/i, `Target module: ${targetModule}`);
  });
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
  if (targetConventions.architectureProfile.fileOrganization.pattern === 'unknown') return [];
  const stateBinding = stateBindingFor(targetConventions);
  return files
    .filter((file) => {
      if (stateBinding.scope === 'page') return true;
      if (/_controller\.dart$|_binding\.dart$/.test(file.path)) return false;
      return true;
    })
    .flatMap((file) => {
      const normalized = normalizeFile(file, targetConventions);
      return normalized.path ? [normalized] : [];
    });
}

function normalizeFilePath(filePath: string, targetConventions: FlutterTargetConventionProfile): string {
  const fileOrganization = targetConventions.architectureProfile.fileOrganization.pattern;
  const rebased = rebaseDetectedFeatureRoot(filePath, targetConventions);
  if (!rebased) return '';
  if (fileOrganization === 'module_views_controllers_bindings') {
    return normalizeModuleMvcFilePath(rebased);
  }
  if (fileOrganization === 'feature_presentation') return normalizeFeaturePresentationFilePath(rebased, targetConventions);
  return rebased;
}

function rebaseDetectedFeatureRoot(
  filePath: string,
  targetConventions: FlutterTargetConventionProfile,
): string | undefined {
  const match = filePath.match(/^__proto_bridge__\/([^/]+)\/(.+)$/);
  if (!match?.[1] || !match[2]) return filePath;
  const moduleName = match[1];
  const example = targetConventions.architectureProfile.fileOrganization.examples
    .map((item) => item.file)
    .find((candidate) => candidate.split('/').includes(moduleName));
  if (!example) return undefined;
  const parts = example.split('/');
  const moduleIndex = parts.indexOf(moduleName);
  if (moduleIndex < 0) return undefined;
  return `${parts.slice(0, moduleIndex + 1).join('/')}/${match[2]}`;
}

function normalizeFeaturePresentationFilePath(
  filePath: string,
  targetConventions: FlutterTargetConventionProfile,
): string {
  const examples = targetConventions.architectureProfile.fileOrganization.examples.map((item) => item.file);
  const featureBase = filePath.split('/').slice(0, findFeatureBoundary(filePath)).join('/');
  const leaf = filePath.split('/').at(-1) ?? filePath;
  if (/_page\.dart$|_view\.dart$/.test(leaf)) {
    const pageDir = examples.some((item) => /\/presentation\/screens?\//.test(item)) ? 'presentation/screens' : 'presentation/pages';
    return `${featureBase}/${pageDir}/${leaf}`;
  }
  if (/_controller\.dart$|_binding\.dart$/.test(leaf)) {
    const stateDir = examples.some((item) => /\/presentation\/bloc\//.test(item))
      ? 'presentation/bloc'
      : examples.some((item) => /\/presentation\/cubit\//.test(item))
        ? 'presentation/cubit'
        : 'presentation/state';
    return `${featureBase}/${stateDir}/${leaf}`;
  }
  if (filePath.includes('/widgets/')) return `${featureBase}/presentation/widgets/${leaf}`;
  return filePath;
}

function findFeatureBoundary(filePath: string): number {
  const parts = filePath.split('/');
  const knownRoots = new Set(['features', 'modules']);
  const rootIndex = parts.findIndex((part) => knownRoots.has(part));
  if (rootIndex >= 0 && parts[rootIndex + 1]) return rootIndex + 2;
  const appModules = parts.findIndex((part, index) => part === 'modules' && parts[index - 1] === 'app');
  return appModules >= 0 ? appModules + 2 : Math.max(1, parts.length - 2);
}

function normalizeModuleMvcFilePath(filePath: string): string {
  const parts = filePath.split('/');
  const boundary = findFeatureBoundary(filePath);
  const featureName = parts[boundary];
  const rest = parts.slice(boundary + 1).join('/');
  if (!featureName || !rest) return filePath;
  const base = parts.slice(0, boundary).join('/');
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

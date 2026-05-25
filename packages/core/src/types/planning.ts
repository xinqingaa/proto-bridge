import type { ImplementationShape, MappingConfidence, WidgetRecommendationType } from './common.js';
import type { AssetEvidence, InteractionEvidence, PageCanonical, SnapshotNodeRole } from './evidence.js';
import type { FlutterComponentRef, FlutterContextAnalysis, FlutterExampleRef, FlutterTargetConventionProfile } from './target-flutter.js';

export type WidgetRecommendation = {
  name: string;
  type: WidgetRecommendationType;
  responsibility: string;
  suggestedFlutterWidget?: string | undefined;
  notes?: string | undefined;
};

export type MigrationRecommendations = {
  implementationShape: ImplementationShape;
  widgetBreakdown: WidgetRecommendation[];
  implementationPlan: FlutterImplementationPlan;
  risks: string[];
  manualQuestions: string[];
};

export type FlutterImplementationPlan = {
  complexity: 'simple' | 'moderate' | 'complex';
  summary: string;
  fileTree: FlutterPlannedFile[];
  widgetTree: FlutterWidgetPlan[];
  stateStrategy: FlutterStateStrategy[];
  controllerBoundaries: FlutterControllerBoundary[];
  widgetContracts: FlutterWidgetContract[];
  doNotTranslate: string[];
  checklist: FlutterChecklistItem[];
};

export type FlutterPlannedFile = {
  path: string;
  responsibility: string;
  notes?: string | undefined;
};

export type FlutterWidgetPlan = {
  name: string;
  parent?: string | undefined;
  role: string;
  buildHint: string;
  stateAccess: 'none' | 'props' | 'controller' | 'controller-slice' | 'state-owner' | 'state-slice';
};

export type FlutterStateStrategy = {
  concern: string;
  recommendation: string;
  owner: 'controller' | 'state-boundary' | 'service' | 'repository' | 'widget-local' | 'model-adapter' | 'manual';
  evidence: string;
};

export type FlutterControllerBoundary = {
  name: string;
  responsibility: string;
  owns: string[];
  avoids: string[];
};

export type FlutterWidgetContract = {
  widget: string;
  inputs: string[];
  callbacks: string[];
  shouldReadController: boolean;
  notes: string;
};

export type FlutterChecklistItem = {
  priority: 'P0' | 'P1' | 'P2';
  item: string;
};

export type BuildUiPlanInput = {
  page: PageCanonical;
  targetRoot: string;
  outDir: string;
  targetModule?: string | undefined;
  restorationProfile?: import('../profile/index.js').ResolvedRestorationProfile | undefined;
  sourceAwareImplementationPlan?: FlutterImplementationPlan | undefined;
  sourceReview?: SourceAwareReviewProjection | undefined;
};

export type UiVisualPlan = {
  viewport: { width: number; height: number; deviceScaleFactor?: number | undefined };
  sections: Array<{
    id: string;
    role: SnapshotNodeRole;
    title?: string | undefined;
    bbox: { x: number; y: number; width: number; height: number };
    nodeIds: string[];
    evidence: string[];
    buildHint?: string | undefined;
  }>;
  nodeAudits: UiNodeAudit[];
  nodeAuditSummary: {
    generated: number;
    suppressed: Array<{
      nodeId: string;
      reason: string;
    }>;
  };
  dynamicTextHints: UiDynamicTextHint[];
  layoutConflicts: UiPlanLayoutConflict[];
  layoutEvidence: string[];
  screenshotRefs: string[];
};

export type UiNodeAuditPriority = 'p0' | 'p1' | 'p2';
export type UiNodeAuditNoiseLevel = 'low' | 'medium' | 'high';

export type UiNodeAuditKind =
  | 'app-bar'
  | 'card'
  | 'list'
  | 'list-item'
  | 'button'
  | 'chip'
  | 'sort-control'
  | 'appbar-action'
  | 'bottom-action'
  | 'tab'
  | 'filter'
  | 'section'
  | 'unknown';

export type UiNodeAuditStyle = {
  display?: string | undefined;
  flexDirection?: string | undefined;
  flexWrap?: string | undefined;
  alignItems?: string | undefined;
  justifyContent?: string | undefined;
  gap?: string | undefined;
  padding?: string | undefined;
  margin?: string | undefined;
  width?: string | undefined;
  height?: string | undefined;
  color?: string | undefined;
  backgroundColor?: string | undefined;
  fontSize?: string | undefined;
  fontWeight?: string | undefined;
  lineHeight?: string | undefined;
  borderRadius?: string | undefined;
  border?: string | undefined;
  boxShadow?: string | undefined;
  overflow?: string | undefined;
  whiteSpace?: string | undefined;
  minWidth?: string | undefined;
  maxWidth?: string | undefined;
};

export type UiNodeAuditChild = {
  nodeId: string;
  role: SnapshotNodeRole;
  text?: string | undefined;
  assetRefs?: string[] | undefined;
  bbox: { x: number; y: number; width: number; height: number };
  style: UiNodeAuditStyle;
};

export type UiNodeAuditRow = {
  index: number;
  yRange: { min: number; max: number };
  children: UiNodeAuditChild[];
};

export type UiNodeAuditControl = UiNodeAuditChild & {
  kind: 'button' | 'chip' | 'icon' | 'image' | 'unknown';
  padding?: string | undefined;
  height?: string | undefined;
  borderRadius?: string | undefined;
  interactionTarget?: UiInteractionTarget | undefined;
  semanticName?: string | undefined;
  suggestedCallback?: string | undefined;
};

export type UiNodeAuditLayoutConflict = {
  kind: 'row-flex-multiple-y-bands';
  severity: 'info' | 'warning' | 'error';
  message: string;
  parentStyle: UiNodeAuditStyle;
  directChildren: UiNodeAuditChild[];
  observedBands: UiNodeAuditRow[];
  manualConfirmation: string;
};

export type UiNodeAudit = {
  id: string;
  kind: UiNodeAuditKind;
  priority: UiNodeAuditPriority;
  noiseLevel: UiNodeAuditNoiseLevel;
  displayInReview: boolean;
  coverageReason: string;
  sourceNodeId: string;
  role: SnapshotNodeRole;
  title?: string | undefined;
  implementationSummary: {
    targetWidgetHint?: string | undefined;
    layoutSummary: string;
    mustPreserve: string[];
    doNotInvent: string[];
    controlSummary: string[];
    riskLevel: 'high' | 'medium' | 'low';
  };
  bbox: { x: number; y: number; width: number; height: number };
  containerStyle: UiNodeAuditStyle;
  rows: UiNodeAuditRow[];
  directChildren: UiNodeAuditChild[];
  layoutConflicts: UiNodeAuditLayoutConflict[];
  controls: UiNodeAuditControl[];
  actionMappings: UiActionMapping[];
  assetRefs: string[];
  absenceHints: string[];
  implementationHints: string[];
  targetComponentCandidates?: UiTargetComponentCandidate[] | undefined;
  repeatedGroup?: UiNodeAuditRepeatedGroup | undefined;
  instances?: UiNodeAuditInstance[] | undefined;
};

export type UiNodeAuditRepeatedGroup = {
  groupId: string;
  mode: 'representative';
  instanceCount: number;
  representativeNodeId: string;
  instanceNodeIds: string[];
  commonSignature: {
    kind: UiNodeAuditKind;
    rowCount: number;
    rowRoleSignature: string[];
    controlSignature: string[];
    styleSignature: Record<string, string>;
  };
  excludedInstances?: Array<{
    nodeId: string;
    reason: string;
  }> | undefined;
};

export type UiNodeAuditInstanceDelta = {
  field: string;
  base?: string | undefined;
  actual?: string | undefined;
  risk?: string | undefined;
};

export type UiNodeAuditInstance = {
  nodeId: string;
  bbox: { x: number; y: number; width: number; height: number };
  rowText: string[][];
  fieldValues: Record<string, string>;
  semanticHints: Record<string, string>;
  textDeltas: UiNodeAuditInstanceDelta[];
  styleDeltas: UiNodeAuditInstanceDelta[];
  controlDeltas: UiNodeAuditInstanceDelta[];
  stateDeltas: UiNodeAuditInstanceDelta[];
  layoutDeltas: UiNodeAuditInstanceDelta[];
  missingEvidence: string[];
};

export type UiInteractionTarget = {
  kind: string;
  target?: string | undefined;
  evidence?: string | undefined;
  confidence: MappingConfidence;
};

export type UiActionMapping = {
  nodeId: string;
  assetRef?: string | undefined;
  role: UiNodeAuditKind;
  semanticName?: string | undefined;
  sourceInteraction?: string | undefined;
  interactionEvidence?: string | undefined;
  suggestedCallback?: string | undefined;
  confidence: MappingConfidence;
  reason: string;
};

export type UiPlanLayoutConflict = {
  type: 'source-structure-vs-runtime-layout';
  sourceNodeId: string;
  sourceStructure: string;
  runtimeObservation: string;
  sourceIntentLayout?: string | undefined;
  risk: string;
  requiresDecision: boolean;
  decisionOptions: string[];
  evidence: string[];
  severity: 'info' | 'warning' | 'error';
};

export type UiOverlayPlan = {
  id: string;
  trigger?: string | undefined;
  sourceComponent: string;
  sourceState?: string | undefined;
  visualEvidence: 'runtime' | 'source-only' | 'unknown';
  targetComponent?: string | undefined;
  uiShellRequired: boolean;
  businessBehaviorRequired: boolean;
  implementationLevel: 'ui-shell' | 'full' | 'entry-only';
  visualFidelityRisk: 'high' | 'medium' | 'low';
  evidence: string[];
};

export type UiTargetComponentCandidate = {
  symbol: string;
  role: FlutterComponentRef['role'];
  confidence: MappingConfidence;
  recommendation: 'prefer-target-component' | 'manual-check' | 'fallback-to-local-widget';
  evidence: string[];
  importPath?: string | undefined;
  propsHints?: string[] | undefined;
  sourceMappingNodeIds?: string[] | undefined;
  fitChecks: string[];
  risks: string[];
};

export type UiDynamicTextHint = {
  nodeId: string;
  text: string;
  kind: 'list-count' | 'money' | 'percent' | 'date' | 'quantity' | 'dynamic-value';
  relatedNodeId?: string | undefined;
  recommendation: string;
};

export type UiImplementationContract = {
  logicalPlanSource: string;
  sourceSemantics?: UiSourceSemantics | undefined;
  fileTree: FlutterPlannedFile[];
  widgetTree: FlutterWidgetPlan[];
  stateStrategy: FlutterStateStrategy[];
  controllerBoundaries: FlutterControllerBoundary[];
  widgetContracts: FlutterWidgetContract[];
  implementationIndex: UiImplementationIndex;
  conflicts: UiPlanLayoutConflict[];
  overlayPlan: UiOverlayPlan[];
  targetBindings: {
    pageBase: { patternRef: string; pattern?: string | undefined };
    routing: { patternRef: string; pattern?: string | undefined };
    i18n: { patternRef: string; pattern?: string | undefined };
    theme: { patternRef: string; patterns?: string[] | undefined };
    state?: { patternRef: string; pattern?: string | undefined; scope?: 'page' | 'global' | 'package' | 'unknown' | undefined } | undefined;
    fileOrganization?: { patternRef: string; pattern?: string | undefined } | undefined;
  };
  rules: string[];
  contractWarnings: string[];
  manualQuestions: string[];
};

export type UiImplementationIndex = {
  mainScreenNodes: string[];
  repeatedItemNodes: string[];
  repeatedGroups: Array<{
    groupId: string;
    representativeNodeId: string;
    instanceNodeIds: string[];
  }>;
  appBarNodes: string[];
  layoutConflictNodes: string[];
  overlayRefs: string[];
  sourceOnlyDeferred: string[];
  highRiskFirst: Array<{
    ref: string;
    reason: string;
  }>;
  phaseHints: Array<{
    phase: 'pre-implementation-decision' | 'main-screen' | 'deferred-overlay-ui-shell';
    refs: string[];
    guidance: string;
  }>;
};

export type UiSourceSemantics = {
  summary: string[];
  businessSections: Array<{
    name: string;
    role: string;
    parent?: string | undefined;
    responsibility: string;
    inputs: string[];
    callbacks: string[];
  }>;
  stateIntent: Array<{
    concern: string;
    owner: string;
    recommendation: string;
    evidence?: string | undefined;
  }>;
  routeIntent: Array<{
    action: string;
    target?: string | undefined;
    params?: string | undefined;
    evidence?: string | undefined;
  }>;
  lifecycleIntent: Array<{
    hook: string;
    target?: string | undefined;
    evidence?: string | undefined;
  }>;
  interactionIntent: Array<{
    kind: string;
    target?: string | undefined;
    evidence?: string | undefined;
  }>;
  layoutIntent: Array<{
    selector: string;
    kind: string;
    evidence?: string | undefined;
  }>;
  styleIntent: Array<{
    selector: string;
    property: string;
    token: string;
    fallback?: string | undefined;
    kind?: 'color' | 'typography' | undefined;
  }>;
  assetIntent: Array<{
    kind: string;
    source?: string | undefined;
    evidence?: string | undefined;
  }>;
  doNotTranslate: string[];
};

export type UiBuildPlan = {
  id: string;
  pageId: string;
  restorationProfile?: import('../profile/index.js').RestorationProfileArtifact | undefined;
  target: {
    root: string;
    module?: string | undefined;
    existingModules: string[];
    routesFiles: string[];
    translationFiles: string[];
    assetDirectories: string[];
    reusableComponents: FlutterComponentRef[];
    similarExamples: FlutterExampleRef[];
    warnings: string[];
  };
  page: {
    title?: string | undefined;
    route?: string | undefined;
    summary: string;
    viewport: { width: number; height: number; deviceScaleFactor?: number | undefined };
  };
  targetConventions: FlutterTargetConventionProfile;
  implementationContract: UiImplementationContract;
  visualPlan: UiVisualPlan;
  fileTree: FlutterPlannedFile[];
  widgetTree: FlutterWidgetPlan[];
  componentMappings: ComponentMapping[];
  themeMappings: ThemeMapping[];
  themeMappingGroups: ThemeMappingGroups;
  i18nPlan: I18nPlan;
  assetPlan: AssetPlan;
  interactionPlan: InteractionPlan[];
  businessQuestions: string[];
  risks: string[];
  validationHints: string[];
};

export type ComponentMapping = {
  sourceRole: SnapshotNodeRole;
  nodeIds: string[];
  targetSymbol?: string | undefined;
  confidence: MappingConfidence;
  reason: string;
};

export type ThemeMappingGroups = {
  resolved: ThemeMapping[];
  candidates: ThemeMapping[];
  familyOnly: ThemeMapping[];
};

export type ThemeMapping = {
  kind?: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'border' | undefined;
  source: string;
  value: string;
  sourceSelector?: string | undefined;
  sourceMixin?: string | undefined;
  nodeIds?: string[] | undefined;
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy?: 'css-var' | 'source-mixin' | 'exact' | 'ambiguous' | 'family' | 'manual' | undefined;
  confidence: MappingConfidence;
  lockToken?: boolean | undefined;
  doNotOverride?: string[] | undefined;
  reason: string;
};

export type I18nPlan = {
  texts: Array<{
    text: string;
    nodeIds: string[];
    suggestedKey?: string | undefined;
    dynamic?: boolean | undefined;
    dynamicKind?: UiDynamicTextHint['kind'] | undefined;
  }>;
  recommendation: string;
};

export type AssetPlan = {
  assets: Array<{
    source?: string | undefined;
    kind: AssetEvidence['kind'];
    nodeId?: string | undefined;
    recommendation: string;
  }>;
  recommendation: string;
};

export type InteractionPlan = {
  kind: InteractionEvidence['kind'];
  label?: string | undefined;
  nodeId: string;
  recommendation: string;
};

export type BuildUiPlanResult = {
  plan: UiBuildPlan;
  files: {
    uiBuildPlan: string;
  };
};

export type ExportUiReviewInput = {
  page: PageCanonical;
  plan: UiBuildPlan;
  outDir: string;
  sourceReview?: SourceAwareReviewProjection | undefined;
};

export type SourceAwareReviewProjection = {
  title: string;
  parityChecklist: Array<{
    section: string;
    status: 'covered' | 'partial' | 'missing';
    evidence: string[];
  }>;
  metadata: {
    route?: string | undefined;
    screenId?: string | undefined;
    sourceModule?: string | undefined;
    targetModule?: string | undefined;
    implementationShape: string;
    status?: string | undefined;
    owner?: string | undefined;
  };
  summary: string[];
  implementation: {
    complexity: string;
    shape: string;
    targetModule?: string | undefined;
    pattern?: string | undefined;
    patternConfidence?: string | undefined;
    directImplementation: string;
    summary: string;
    risks: string[];
  };
  files: FlutterPlannedFile[];
  widgets: FlutterWidgetPlan[];
  widgetContracts: FlutterWidgetContract[];
  controllerBoundaries: FlutterControllerBoundary[];
  stateStrategy: FlutterStateStrategy[];
  doNotTranslate: string[];
  routes: Array<{
    action: string;
    target?: string | undefined;
    params?: string | undefined;
    migrationHint: string;
  }>;
  lifecycle: Array<{
    hook: string;
    target?: string | undefined;
    migrationHint: string;
  }>;
  layout: Array<{
    selector: string;
    kind: string;
    migrationHint: string;
  }>;
  interactions: Array<{
    kind: string;
    target?: string | undefined;
    migrationHint: string;
  }>;
  styleTokens: Array<{
    selector: string;
    property: string;
    token: string;
    fallback?: string | undefined;
    kind?: 'color' | 'typography' | undefined;
    lockToken?: boolean | undefined;
    doNotOverride?: string[] | undefined;
  }>;
  i18n: Record<string, unknown>;
  assets: Array<{
    kind: string;
    source?: string | undefined;
    migrationHint: string;
  }>;
  reusable: {
    widgets: string[];
    routesFiles: string[];
    translationFiles: string[];
    assetDirectories: string[];
    similarFiles: string[];
  };
  manualQuestions: string[];
};

export type ExportUiReviewResult = {
  markdown: string;
  files: {
    uiBuildReview: string;
  };
};

export type BuildUiImplementationPlanInput = BuildUiPlanInput;
export type BuildUiImplementationPlanResult = BuildUiPlanResult;
export type ExportReviewMarkdownInput = ExportUiReviewInput;
export type ExportReviewMarkdownResult = ExportUiReviewResult;
export type UiImplementationPlan = UiBuildPlan;

export type MigrationContext = {
  source: import('./source.js').PrototypePageAnalysis;
  capture?: import('./evidence.js').CaptureResult | undefined;
  tokenMap: import('./tokens.js').TokenMapResult;
  target: FlutterContextAnalysis;
  recommendations: MigrationRecommendations;
};

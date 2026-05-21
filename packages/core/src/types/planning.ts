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
  layoutEvidence: string[];
  screenshotRefs: string[];
};

export type UiNodeAuditPriority = 'p0' | 'p1' | 'p2';
export type UiNodeAuditNoiseLevel = 'low' | 'medium' | 'high';

export type UiNodeAuditKind =
  | 'card'
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
  controls: UiNodeAuditControl[];
  assetRefs: string[];
  absenceHints: string[];
  implementationHints: string[];
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

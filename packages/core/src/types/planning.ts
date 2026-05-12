import type { ImplementationShape, MappingConfidence, WidgetRecommendationType } from './common.js';
import type { AssetEvidence, InteractionEvidence, PageCanonical, SnapshotNodeRole } from './evidence.js';
import type { FlutterComponentRef, FlutterContextAnalysis, FlutterExampleRef } from './target-flutter.js';

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
  stateAccess: 'none' | 'props' | 'controller' | 'controller-slice';
};

export type FlutterStateStrategy = {
  concern: string;
  recommendation: string;
  owner: 'controller' | 'service' | 'repository' | 'widget-local' | 'model-adapter' | 'manual';
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
  nodeIds?: string[] | undefined;
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy?: 'css-var' | 'exact' | 'ambiguous' | 'family' | 'manual' | undefined;
  confidence: MappingConfidence;
  reason: string;
};

export type I18nPlan = {
  texts: Array<{ text: string; nodeIds: string[]; suggestedKey?: string | undefined }>;
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

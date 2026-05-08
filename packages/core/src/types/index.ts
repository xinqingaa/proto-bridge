export type TargetPlatform = 'flutter';

export type PageType = 'prototype' | 'design';

export type ImplementationShape = 'StatelessWidget' | 'StatefulWidget' | 'BaseGetView';

export type WidgetRecommendationType = 'page' | 'section' | 'component' | 'sheet' | 'dialog';

export type MappingConfidence = 'high' | 'medium' | 'low';

export type ScreenConfig = {
  key?: string | undefined;
  screenId?: string | undefined;
  name?: string | undefined;
  path?: string | undefined;
  label?: string | undefined;
  title?: string | undefined;
  view?: string | undefined;
  status?: string | undefined;
  completed?: boolean | undefined;
  owner?: string | undefined;
  changelog?: Array<Record<string, unknown>> | undefined;
  notes?: string | undefined;
  notesPath?: string | undefined;
  prototypePath?: string | undefined;
  prototypeLabel?: string | undefined;
  summary?: string | undefined;
  designFocus?: string[] | undefined;
  deliverables?: string[] | undefined;
  meta?: Record<string, unknown> | undefined;
  children?: ScreenConfig[] | undefined;
  [key: string]: unknown;
};

export type ModuleConfig = {
  module?: string | undefined;
  items?: ScreenConfig[] | undefined;
  [key: string]: unknown;
};

export type ChangelogItem = {
  date?: string | undefined;
  author?: string | undefined;
  summary?: string | undefined;
};

export type AnalyzePrototypePageInput = {
  prototypeRoot: string;
  route?: string | undefined;
  vue?: string | undefined;
};

export type PrototypePageAnalysis = {
  prototypeRoot: string;
  pageType: PageType;
  route?: string | undefined;
  vuePath: string;
  vueRelativePath?: string | undefined;
  screenId?: string | undefined;
  module?: string | undefined;
  moduleLabel?: string | undefined;
  label?: string | undefined;
  title?: string | undefined;
  view?: string | undefined;
  key?: string | undefined;
  name?: string | undefined;
  status?: string | undefined;
  completed?: boolean | undefined;
  owner?: string | undefined;
  changelog: ChangelogItem[];
  sourceCode?: string | undefined;
  sfc?: VueSfcAnalysis | undefined;
  notes?: string | undefined;
  notesPath?: string | undefined;
  i18n?: Record<string, unknown> | undefined;
  i18nPath?: string | undefined;
  config?: ScreenConfig | undefined;
  warnings: string[];
};

export type VueSfcAnalysis = {
  template?: string | undefined;
  script?: string | undefined;
  styleBlocks: string[];
  sections: VueTemplateSection[];
  interactions: VueInteractionHint[];
  components: VueSemanticComponent[];
  state: VueStateHint[];
  routes: VueRouteHint[];
  lifecycle: VueLifecycleHint[];
  layout: VueLayoutHint[];
  assets: VueAssetHint[];
  styleTokens: VueStyleTokenHint[];
  fixedBottom: boolean;
};

export type VueTemplateSection = {
  name: string;
  kind: 'app-bar' | 'tab-bar' | 'section' | 'list' | 'chart' | 'bottom-bar' | 'modal' | 'unknown';
  selector?: string | undefined;
  title?: string | undefined;
  evidence: string;
};

export type VueInteractionHint = {
  kind: 'click' | 'model' | 'conditional' | 'loop' | 'state' | 'computed' | 'watch';
  target?: string | undefined;
  evidence: string;
};

export type VueSemanticComponent = {
  name: string;
  role: 'header' | 'tabs' | 'section-tabs' | 'summary' | 'content-section' | 'list' | 'chart' | 'bottom-actions' | 'modal' | 'unknown';
  selector?: string | undefined;
  title?: string | undefined;
  dataHints: string[];
  interactionHints: string[];
  tokenHints: string[];
  layoutHints: string[];
  evidence: string;
};

export type VueStateHint = {
  name: string;
  kind: 'ref' | 'reactive' | 'computed' | 'watch' | 'constant' | 'function';
  category: 'ui-state' | 'mock-data' | 'derived-data' | 'navigation' | 'lifecycle' | 'chart-data' | 'handler' | 'unknown';
  evidence: string;
  migrationHint: string;
};

export type VueRouteHint = {
  action: 'navigate' | 'back' | 'read-query';
  target?: string | undefined;
  params?: string | undefined;
  evidence: string;
  migrationHint: string;
};

export type VueLifecycleHint = {
  hook: 'onMounted' | 'onBeforeUnmount' | 'watch' | 'event-listener' | 'unknown';
  target?: string | undefined;
  evidence: string;
  migrationHint: string;
};

export type VueLayoutHint = {
  selector: string;
  kind: 'fixed' | 'sticky' | 'scroll' | 'safe-area' | 'z-index' | 'absolute' | 'flex' | 'grid' | 'overflow' | 'spacing';
  evidence: string;
  migrationHint: string;
};

export type VueAssetHint = {
  kind: 'image' | 'svg' | 'icon' | 'background' | 'inline-svg';
  source?: string | undefined;
  selector?: string | undefined;
  evidence: string;
  migrationHint: string;
};

export type VueStyleTokenHint = {
  selector: string;
  property: string;
  token: string;
  fallback?: string | undefined;
  evidence: string;
};

export type DomNodeSnapshot = {
  tag: string;
  className?: string | undefined;
  id?: string | undefined;
  text?: string | undefined;
  role?: string | undefined;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  computedStyle?: {
    display?: string | undefined;
    position?: string | undefined;
    flexDirection?: string | undefined;
    alignItems?: string | undefined;
    justifyContent?: string | undefined;
    gap?: string | undefined;
    padding?: string | undefined;
    margin?: string | undefined;
    color?: string | undefined;
    backgroundColor?: string | undefined;
    fontSize?: string | undefined;
    fontWeight?: string | undefined;
    lineHeight?: string | undefined;
    borderRadius?: string | undefined;
    overflow?: string | undefined;
  } | undefined;
  children?: DomNodeSnapshot[] | undefined;
};

export type CapturePrototypePageInput = {
  url: string;
  outDir: string;
  viewport?: { width: number; height: number } | undefined;
};

export type CaptureResult = {
  screenshotPath?: string | undefined;
  domSnapshotPath?: string | undefined;
  viewport?: { width: number; height: number } | undefined;
  domTree?: DomNodeSnapshot[] | undefined;
  warnings: string[];
};

export type SnapshotSourceKind = 'url' | 'rendered-html' | 'screenshot';

export type SnapshotNodeRole =
  | 'app-bar'
  | 'tab-bar'
  | 'section'
  | 'card'
  | 'list'
  | 'list-item'
  | 'button'
  | 'input'
  | 'image'
  | 'icon'
  | 'bottom-bar'
  | 'modal'
  | 'text'
  | 'unknown';

export type SnapshotComputedStyle = {
  display?: string | undefined;
  position?: string | undefined;
  flexDirection?: string | undefined;
  alignItems?: string | undefined;
  justifyContent?: string | undefined;
  gap?: string | undefined;
  padding?: string | undefined;
  margin?: string | undefined;
  color?: string | undefined;
  backgroundColor?: string | undefined;
  fontFamily?: string | undefined;
  fontSize?: string | undefined;
  fontWeight?: string | undefined;
  lineHeight?: string | undefined;
  borderRadius?: string | undefined;
  border?: string | undefined;
  boxShadow?: string | undefined;
  overflow?: string | undefined;
};

export type PageSnapshot = {
  id: string;
  source: {
    kind: SnapshotSourceKind;
    url?: string | undefined;
    capturedAt: string;
    viewport: { width: number; height: number; deviceScaleFactor?: number | undefined };
  };
  screenshot?: {
    path?: string | undefined;
    width: number;
    height: number;
  } | undefined;
  page: {
    title?: string | undefined;
    route?: string | undefined;
    text: string[];
  };
  cssVariables?: Record<string, string> | undefined;
  nodes: PageSnapshotNode[];
  visualSections: VisualSection[];
  tokens: VisualTokenEvidence[];
  assets: AssetEvidence[];
  interactions: InteractionEvidence[];
  ocr?: OcrResult | undefined;
  warnings: string[];
};

export type PageSnapshotNode = {
  id: string;
  parentId?: string | undefined;
  role: SnapshotNodeRole;
  tag?: string | undefined;
  text?: string | undefined;
  bbox: { x: number; y: number; width: number; height: number };
  computedStyle?: SnapshotComputedStyle | undefined;
  cssVarRefs?: string[] | undefined;
  assetRefs?: string[] | undefined;
  children: string[];
  evidence: string[];
};

export type VisualSection = {
  id: string;
  role: SnapshotNodeRole;
  title?: string | undefined;
  bbox: { x: number; y: number; width: number; height: number };
  nodeIds: string[];
  evidence: string[];
};

export type VisualTokenEvidence = {
  kind: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'border';
  source: string;
  value: string;
  cssVar?: string | undefined;
  usage: string[];
  candidateTarget?: string | undefined;
  confidence: MappingConfidence;
};

export type AssetEvidence = {
  id: string;
  kind: 'image' | 'svg' | 'background' | 'icon' | 'unknown';
  source?: string | undefined;
  nodeId?: string | undefined;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  evidence: string[];
};

export type InteractionEvidence = {
  id: string;
  kind: 'tap' | 'input' | 'link' | 'tab' | 'unknown';
  nodeId: string;
  label?: string | undefined;
  evidence: string[];
};

export type OcrTextBox = {
  text: string;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  confidence?: number | undefined;
};

export type OcrResult = {
  provider: 'none' | 'external';
  status: 'available' | 'unavailable';
  text: string[];
  boxes: OcrTextBox[];
  warnings: string[];
};

export type OcrScreenshotInput = {
  screenshotPath: string;
  outDir: string;
  externalText?: string[] | undefined;
  externalBoxes?: OcrTextBox[] | undefined;
};

export type OcrScreenshotResult = {
  ocr: OcrResult;
  files: {
    ocrResult: string;
  };
};

export type CapturePageSnapshotInput = {
  url: string;
  outDir: string;
  viewport?: { width: number; height: number; deviceScaleFactor?: number | undefined } | undefined;
  saveArtifacts?: boolean | undefined;
};

export type CapturePageSnapshotResult = {
  snapshot: PageSnapshot;
  files: {
    pageSnapshot: string;
    screenshot?: string | undefined;
  };
};

export type TokenMapping = {
  source: string;
  target?: string | undefined;
  targetPlatform: TargetPlatform;
  confidence: MappingConfidence;
  reason?: string | undefined;
};

export type TokenMapResult = {
  colors: TokenMapping[];
  typography: TokenMapping[];
  unresolved: TokenMapping[];
};

export type MapTokensInput = {
  sourceCode?: string | undefined;
  computedStyles?: Array<Record<string, string | undefined>> | undefined;
  target?: TargetPlatform | undefined;
};

export type AdapterProjectConfig = {
  adapter: string;
  root: string;
};

export type AnalyzeFlutterContextInput = {
  flutterRoot: string;
  prototypeModule?: string | undefined;
  screenId?: string | undefined;
  route?: string | undefined;
  targetModule?: string | undefined;
};

export type FlutterContextAnalysis = {
  platform: TargetPlatform;
  flutterRoot: string;
  suggestedModule?: string | undefined;
  existingModules: string[];
  reusableWidgets: string[];
  routesFiles: string[];
  translationFiles: string[];
  assetDirectories: string[];
  similarFiles: string[];
  warnings: string[];
};

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

export type FlutterComponentRole =
  | 'app-bar'
  | 'button'
  | 'image'
  | 'empty'
  | 'loading'
  | 'sheet'
  | 'toast'
  | 'page-base'
  | 'refresh'
  | 'theme'
  | 'i18n'
  | 'route'
  | 'unknown';

export type FlutterComponentRef = {
  symbol: string;
  role: FlutterComponentRole;
  path?: string | undefined;
  importPath?: string | undefined;
  usageSnippets: string[];
  propsHints: string[];
  confidence: MappingConfidence;
  reason: string;
};

export type FlutterExampleRef = {
  path: string;
  reason: string;
  matchedRoles: FlutterComponentRole[];
  matchedSymbols: string[];
  snippets: string[];
  score: number;
};

export type FlutterTargetConventions = {
  flutterRoot: string;
  module?: string | undefined;
  existingModules: string[];
  routesFiles: string[];
  translationFiles: string[];
  assetDirectories: string[];
  components: FlutterComponentRef[];
  themeUsages: string[];
  routeUsages: string[];
  i18nUsages: string[];
  warnings: string[];
};

export type AnalyzeFlutterTargetConventionsInput = {
  flutterRoot: string;
  module?: string | undefined;
  symbols?: string[] | undefined;
  roles?: FlutterComponentRole[] | undefined;
};

export type FindFlutterTargetExamplesInput = {
  flutterRoot: string;
  module?: string | undefined;
  pattern?: string | undefined;
  roles?: FlutterComponentRole[] | undefined;
  symbols?: string[] | undefined;
  screenId?: string | undefined;
  limit?: number | undefined;
};

export type BuildUiImplementationPlanInput = {
  snapshot: PageSnapshot;
  targetRoot: string;
  outDir: string;
  targetModule?: string | undefined;
};

export type UiImplementationPlan = {
  id: string;
  snapshotId: string;
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
  source: string;
  value: string;
  target?: string | undefined;
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

export type BuildUiImplementationPlanResult = {
  plan: UiImplementationPlan;
  files: {
    uiImplementationPlan: string;
  };
};

export type ExportReviewMarkdownInput = {
  snapshot: PageSnapshot;
  plan: UiImplementationPlan;
  outDir: string;
};

export type ExportReviewMarkdownResult = {
  markdown: string;
  files: {
    reviewMarkdown: string;
  };
};

export type MigrationContext = {
  source: PrototypePageAnalysis;
  capture?: CaptureResult | undefined;
  tokenMap: TokenMapResult;
  target: FlutterContextAnalysis;
  recommendations: MigrationRecommendations;
};

export type GenerateMigrationSpecInput = {
  source: AdapterProjectConfig;
  target: AdapterProjectConfig;
  route?: string | undefined;
  vue?: string | undefined;
  prototypeUrl?: string | undefined;
  outDir: string;
  capture?: boolean | undefined;
};

export type GenerateMigrationSpecResult = {
  context: MigrationContext;
  files: {
    migrationContext: string;
    migrationSpec: string;
    screenshot?: string | undefined;
    domSnapshot?: string | undefined;
  };
};

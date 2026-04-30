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
  notes?: string | undefined;
  notesPath?: string | undefined;
  i18n?: Record<string, unknown> | undefined;
  i18nPath?: string | undefined;
  config?: ScreenConfig | undefined;
  warnings: string[];
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
  risks: string[];
  manualQuestions: string[];
};

export type MigrationContext = {
  source: PrototypePageAnalysis;
  capture?: CaptureResult | undefined;
  tokenMap: TokenMapResult;
  target: FlutterContextAnalysis;
  recommendations: MigrationRecommendations;
};

export type GenerateMigrationSpecInput = {
  prototypeRoot: string;
  flutterRoot: string;
  route?: string | undefined;
  vue?: string | undefined;
  prototypeUrl?: string | undefined;
  target?: TargetPlatform | undefined;
  outDir: string;
  noCapture?: boolean | undefined;
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

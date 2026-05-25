import type { PageType } from './common.js';

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
  restorationProfile?: import('../profile/index.js').ResolvedRestorationProfile | undefined;
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
  routeRegistry: SourceRouteEntry[];
  config?: ScreenConfig | undefined;
  warnings: string[];
};

export type SourceRouteEntry = {
  route: string;
  pageType: PageType;
  module?: string | undefined;
  moduleLabel?: string | undefined;
  screenId?: string | undefined;
  view?: string | undefined;
  title?: string | undefined;
  label?: string | undefined;
  key?: string | undefined;
  sourceFile?: string | undefined;
  evidence: string[];
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
  kind?: 'color' | 'typography' | undefined;
  lockToken?: boolean | undefined;
  doNotOverride?: string[] | undefined;
  evidence: string;
};

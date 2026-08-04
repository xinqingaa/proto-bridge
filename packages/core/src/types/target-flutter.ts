import type { MappingConfidence, TargetPlatform } from './common.js';

export type FlutterArchitectureConfidence = 'high' | 'medium' | 'low';

export type FlutterArchitectureEvidence = {
  file: string;
  line?: number | undefined;
  symbol: string;
  snippet: string;
};

export type FlutterArchitectureFacet = {
  pattern: string;
  confidence: FlutterArchitectureConfidence;
  evidence: string[];
  examples: FlutterArchitectureEvidence[];
};

export type FlutterStateArchitectureFacet = FlutterArchitectureFacet & {
  package?: FlutterArchitectureFacet | undefined;
  global?: FlutterArchitectureFacet | undefined;
  page?: FlutterArchitectureFacet | undefined;
};

export type FlutterRoutingArchitectureFacet = FlutterArchitectureFacet & {
  registration?: FlutterArchitectureFacet | undefined;
  navigation?: FlutterArchitectureFacet | undefined;
};

export type FlutterI18nArchitectureFacet = FlutterArchitectureFacet & {
  lookup?: FlutterArchitectureFacet | undefined;
};

export type FlutterArchitectureThemeFacet = {
  patterns: string[];
  confidence: FlutterArchitectureConfidence;
  evidence: string[];
  examples: FlutterArchitectureEvidence[];
};

export type FlutterArchitectureComponentsFacet = {
  detectedSymbols: string[];
  confidence: FlutterArchitectureConfidence;
  evidence: string[];
  examples: FlutterArchitectureEvidence[];
};

export type FlutterArchitectureProfile = {
  state: FlutterStateArchitectureFacet;
  routing: FlutterRoutingArchitectureFacet;
  i18n: FlutterI18nArchitectureFacet;
  theme: FlutterArchitectureThemeFacet;
  components: FlutterArchitectureComponentsFacet;
  fileOrganization: FlutterArchitectureFacet;
};

export type FlutterTargetDocumentationEvidence = {
  files: Array<{
    path: string;
    size: number;
    summary: string[];
  }>;
  architectureHints: Array<{
    kind: 'state' | 'routing' | 'i18n' | 'theme' | 'component' | 'file-organization' | 'workflow' | 'unknown';
    pattern: string;
    confidence: FlutterArchitectureConfidence;
    evidence: string;
    file: string;
  }>;
  contract: {
    entrypoints: string[];
    architecture: string[];
    components: string[];
    theme: string[];
    routing: string[];
    testing: string[];
    adapter: string[];
    missing: string[];
    complete: boolean;
  };
  conflicts: string[];
  warnings: string[];
};

export type FlutterTargetConventionProfile = {
  architectureProfile: FlutterArchitectureProfile;
  documentation?: FlutterTargetDocumentationEvidence | undefined;
  unresolved: string[];
};

export type AnalyzeFlutterContextInput = {
  flutterRoot: string;
  screenId?: string | undefined;
  route?: string | undefined;
  targetModule?: string | undefined;
};

export type FlutterContextAnalysis = {
  platform: TargetPlatform;
  flutterRoot: string;
  suggestedModule?: string | undefined;
  routeRegistry: FlutterRouteEntry[];
  routeMapping?: FlutterRouteMapping | undefined;
  existingModules: string[];
  reusableWidgets: string[];
  routesFiles: string[];
  translationFiles: string[];
  assetDirectories: string[];
  similarFiles: string[];
  targetConventions?: FlutterTargetConventionProfile | undefined;
  warnings: string[];
};

export type FlutterRouteEntry = {
  route: string;
  routeSymbol?: string | undefined;
  routeApiPattern: 'getx' | 'material_on_generate_route' | 'go_router' | 'navigator_routes' | 'unknown';
  pageWidget?: string | undefined;
  binding?: string | undefined;
  file: string;
  module?: string | undefined;
  confidence: MappingConfidence;
  evidence: string[];
};

export type FlutterRouteMapping = {
  sourceRoute?: string | undefined;
  targetRoute?: string | undefined;
  targetRouteSymbol?: string | undefined;
  sourceModule?: string | undefined;
  targetModule?: string | undefined;
  pageWidget?: string | undefined;
  confidence: MappingConfidence;
  reason: string;
  evidence: string[];
  candidates: FlutterRouteEntry[];
  unresolved?: boolean | undefined;
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
  targetConventions: FlutterTargetConventionProfile;
  themeUsages: string[];
  routeUsages: string[];
  routeRegistry?: FlutterRouteEntry[] | undefined;
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
  gitBase?: string | undefined;
  excludePaths?: string[] | undefined;
  candidateOutputRoot?: string | undefined;
  module?: string | undefined;
  pattern?: string | undefined;
  roles?: FlutterComponentRole[] | undefined;
  symbols?: string[] | undefined;
  screenId?: string | undefined;
  limit?: number | undefined;
};

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
  state: FlutterArchitectureFacet;
  routing: FlutterArchitectureFacet;
  i18n: FlutterArchitectureFacet;
  theme: FlutterArchitectureThemeFacet;
  components: FlutterArchitectureComponentsFacet;
  fileOrganization: FlutterArchitectureFacet;
};

export type FlutterTargetConventionProfile = {
  architectureProfile: FlutterArchitectureProfile;
  unresolved: string[];
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
  targetConventions?: FlutterTargetConventionProfile | undefined;
  warnings: string[];
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

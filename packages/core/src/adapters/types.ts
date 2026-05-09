import type {
  AnalyzeFlutterContextInput,
  AnalyzePrototypePageInput,
  FlutterContextAnalysis,
  FlutterImplementationPlan,
  MapTokensInput,
  MigrationRecommendations,
  MigrationContext,
  PrototypePageAnalysis,
  TokenMapResult,
  WidgetRecommendation,
  CaptureResult,
  PageEvidence,
} from '../types/index.js';

export type AdapterProjectRef = {
  adapter: string;
  root: string;
  ref?: string | undefined;
  meta?: Record<string, unknown> | undefined;
};

export type BridgeInput = {
  source: AdapterProjectRef;
  targetProject: AdapterProjectRef;
  page?: {
    route?: string | undefined;
    file?: string | undefined;
    url?: string | undefined;
  } | undefined;
  output: {
    outDir: string;
  };
  capture?: {
    enabled?: boolean | undefined;
    url?: string | undefined;
  } | undefined;
};

export type SourceAdapter = {
  id: string;
  technology: string;
  analyze(input: AnalyzePrototypePageInput): Promise<PrototypePageAnalysis>;
};

export type TargetAdapter = {
  id: string;
  technology: string;
  analyze(input: AnalyzeFlutterContextInput): Promise<FlutterContextAnalysis>;
  mapTokens(input: MapTokensInput): TokenMapResult;
  buildImplementationPlan(input: {
    source: PrototypePageAnalysis;
    target: FlutterContextAnalysis;
    widgets: WidgetRecommendation[];
  }): FlutterImplementationPlan;
  buildRecommendations(input: {
    source: PrototypePageAnalysis;
    tokenMap: TokenMapResult;
    target: FlutterContextAnalysis;
    capture?: CaptureResult | undefined;
    pageEvidence?: PageEvidence | undefined;
    captureSkipped: boolean;
  }): MigrationRecommendations;
  renderMigrationSpec(context: MigrationContext): string;
};

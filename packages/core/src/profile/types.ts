import type { FlutterComponentRole, MappingConfidence } from '../types/index.js';

export type RestorationProfileMode = 'explicit' | 'auto' | 'generic';

export type RestorationProfileConfig = string | false;

export type RestorationProfileSourceLexicon = {
  sectionClassTerms?: string[] | undefined;
  chartTerms?: string[] | undefined;
  listTerms?: string[] | undefined;
  sectionTerms?: string[] | undefined;
  summaryTerms?: string[] | undefined;
  bottomActionTerms?: string[] | undefined;
  dynamicQuantityTerms?: string[] | undefined;
  listHeadingTerms?: string[] | undefined;
  mockDataTerms?: string[] | undefined;
  navigationTerms?: string[] | undefined;
  chartDataTerms?: string[] | undefined;
  tradeTerms?: string[] | undefined;
  portfolioTerms?: string[] | undefined;
  authTerms?: string[] | undefined;
  wizardTerms?: string[] | undefined;
  articleTerms?: string[] | undefined;
  statusTerms?: string[] | undefined;
  timeBadgePattern?: string | undefined;
};

export type RestorationThemeTokens = {
  colors?: Record<string, string> | undefined;
  colorValues?: Record<string, string> | undefined;
  typography?: Record<string, string> | undefined;
  typographyValues?: Record<string, string> | undefined;
};

export type RestorationTargetSymbol = {
  symbol: string;
  role: FlutterComponentRole;
  reason: string;
  generic?: boolean | undefined;
};

export type RestorationPatternSymbols = {
  pattern: RegExp;
  symbols: string[];
};

export type RestorationProfile = {
  id: string;
  displayName: string;
  aliases?: string[] | undefined;
  moduleAliases?: Record<string, string> | undefined;
  targetSymbols?: RestorationTargetSymbol[] | undefined;
  roleSymbols?: Partial<Record<FlutterComponentRole, string[]>> | undefined;
  patternSymbols?: RestorationPatternSymbols[] | undefined;
  usageSymbols?: {
    theme?: string[] | undefined;
    route?: string[] | undefined;
    i18n?: string[] | undefined;
  } | undefined;
  themeTokens?: RestorationThemeTokens | undefined;
  sourceLexicon?: RestorationProfileSourceLexicon | undefined;
};

export type ResolvedRestorationProfile = {
  profile: RestorationProfile;
  id: string;
  mode: RestorationProfileMode;
  inferredFrom?: string | undefined;
  warnings: string[];
};

export type RestorationProfileArtifact = {
  id: string;
  mode: RestorationProfileMode;
  inferredFrom?: string | undefined;
  warnings: string[];
};

export type ThemeTokenResolutionInput = {
  source?: string | undefined;
  cssVar?: string | undefined;
  value?: string | undefined;
  mixin?: string | undefined;
};

export type ThemeTokenResolution = {
  target?: string | undefined;
  candidateTargets?: string[] | undefined;
  matchedBy: 'css-var' | 'source-mixin' | 'exact' | 'ambiguous' | 'family' | 'manual';
  confidence: MappingConfidence;
  reason: string;
};

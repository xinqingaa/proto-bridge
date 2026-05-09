import type { MappingConfidence, TargetPlatform } from './common.js';

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

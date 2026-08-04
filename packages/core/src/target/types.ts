export type TargetResolutionStatus =
  | 'resolved'
  | 'candidate'
  | 'stale'
  | 'conflict'
  | 'unresolved'
  | 'unsupported';

export type TargetDeclarationSource = {
  kind: 'target-policy' | 'machine-contract' | 'target-documentation' | 'code-heuristic';
  path: string;
  digest: string;
  location?: { line: number };
  priority: number;
};

export type TargetMappingDeclaration = {
  id: string;
  kind: 'component' | 'token';
  symbol?: string;
  accessor?: string;
  importPath?: string;
  definitionPath?: string;
  constructorHints: string[];
  usageHints: string[];
  source: TargetDeclarationSource;
};

export type TargetResolutionCandidate = {
  symbol?: string;
  accessor?: string;
  importPath?: string;
  definitionPath?: string;
  constructorHints: string[];
  usageHints: string[];
  source: TargetDeclarationSource;
};

export type TargetCodeValidation = {
  exists: boolean;
  importable: boolean;
  signatureCompatible: boolean;
  usageFound: boolean;
  details: string[];
};

export type TargetResolution = {
  id: string;
  kind: 'component' | 'token';
  status: TargetResolutionStatus;
  declarationSources: TargetDeclarationSource[];
  candidates: TargetResolutionCandidate[];
  validation: TargetCodeValidation;
  reason: string;
  nextQueries: string[];
};

export type TargetRevisionKey = {
  targetRootRealpath: string;
  gitBase?: string;
  currentRevision: string;
  contentDigest: string;
};

export type ResolveTargetMappingsInput = {
  targetRoot: string;
  ids: string[];
  gitBase?: string;
  excludePaths?: string[];
  candidateOutputRoot?: string;
};

export type TargetResolutionBatch = {
  adapterId: 'flutter' | 'unsupported';
  supported: boolean;
  kind: 'component' | 'token';
  targetRevisionKey: TargetRevisionKey;
  resolutions: TargetResolution[];
  policySources: TargetDeclarationSource[];
  warnings: string[];
};

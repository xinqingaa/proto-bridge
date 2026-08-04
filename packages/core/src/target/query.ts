import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathExists } from '../shared/paths.js';
import {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
} from './flutter-app/query.js';
import type {
  FlutterComponentRole,
  FlutterExampleRef,
  FlutterTargetConventions,
} from '../types/index.js';
import {
  resolveFlutterTargetComponents,
  resolveFlutterTargetTokens,
} from './flutter-app/resolver.js';
import type {
  ResolveTargetMappingsInput,
  TargetResolutionBatch,
} from './types.js';

export type TargetAdapterId = 'flutter' | 'unsupported';

export type TargetAdapterDetection = {
  adapterId: TargetAdapterId;
  confidence: 'high' | 'low';
  reason: string;
};

export type ReadTargetConventionsInput = {
  targetRoot: string;
  module?: string | undefined;
  roles?: string[] | undefined;
  symbols?: string[] | undefined;
};

export type FindTargetExamplesInput = ReadTargetConventionsInput & {
  gitBase?: string | undefined;
  excludePaths?: string[] | undefined;
  candidateOutputRoot?: string | undefined;
  pattern?: string | undefined;
  screenId?: string | undefined;
  limit?: number | undefined;
};

export type TargetConventionsResult =
  | ({ adapterId: 'flutter'; supported: true } & FlutterTargetConventions)
  | {
      adapterId: 'unsupported';
      supported: false;
      targetRoot: string;
      warnings: string[];
      unresolved: string[];
    };

export type TargetExamplesResult = {
  adapterId: TargetAdapterId;
  supported: boolean;
  examples: FlutterExampleRef[];
  warnings: string[];
  unresolved: string[];
};

export async function detectTargetAdapter(
  targetRootInput: string,
): Promise<TargetAdapterDetection> {
  const targetRoot = path.resolve(targetRootInput);
  const [pubspec, lib] = await Promise.all([
    readFlutterPubspec(targetRoot),
    pathExists(path.join(targetRoot, 'lib')),
  ]);
  if (pubspec && lib) {
    return {
      adapterId: 'flutter',
      confidence: 'high',
      reason: 'pubspec.yaml and lib/ identify a Flutter target.',
    };
  }
  return {
    adapterId: 'unsupported',
    confidence: 'low',
    reason: 'No registered Target adapter matched this target root.',
  };
}

async function readFlutterPubspec(targetRoot: string): Promise<boolean> {
  try {
    const text = await readFile(path.join(targetRoot, 'pubspec.yaml'), 'utf8');
    return /(?:^|\n)\s*flutter\s*:\s*(?:\n|$)/.test(text) || /sdk\s*:\s*flutter\b/.test(text);
  } catch {
    return false;
  }
}

export async function readTargetConventions(
  input: ReadTargetConventionsInput,
): Promise<TargetConventionsResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const detection = await detectTargetAdapter(targetRoot);
  if (detection.adapterId !== 'flutter') {
    return {
      adapterId: 'unsupported',
      supported: false,
      targetRoot,
      warnings: [detection.reason],
      unresolved: ['No applicable Target adapter is registered for this project.'],
    };
  }
  return {
    adapterId: 'flutter',
    supported: true,
    ...(await getFlutterTargetConventions({
      flutterRoot: input.targetRoot,
      module: input.module,
      roles: input.roles as FlutterComponentRole[] | undefined,
      symbols: input.symbols,
    })),
  };
}

export async function findTargetExamples(
  input: FindTargetExamplesInput,
): Promise<TargetExamplesResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const detection = await detectTargetAdapter(targetRoot);
  if (detection.adapterId !== 'flutter') {
    return {
      adapterId: 'unsupported',
      supported: false,
      examples: [],
      warnings: [detection.reason],
      unresolved: ['Example lookup requires an applicable Target adapter.'],
    };
  }
  return {
    adapterId: 'flutter',
    supported: true,
    examples: await findFlutterTargetExamples({
      flutterRoot: input.targetRoot,
      module: input.module,
      pattern: input.pattern,
      roles: input.roles as FlutterComponentRole[] | undefined,
      symbols: input.symbols,
      screenId: input.screenId,
      limit: input.limit,
      gitBase: input.gitBase,
      excludePaths: input.excludePaths,
      candidateOutputRoot: input.candidateOutputRoot,
    }),
    warnings: [],
    unresolved: [],
  };
}

export async function resolveTargetComponents(
  input: ResolveTargetMappingsInput,
): Promise<TargetResolutionBatch> {
  return resolveFlutterTargetComponents(input);
}

export async function resolveTargetTokens(
  input: ResolveTargetMappingsInput,
): Promise<TargetResolutionBatch> {
  return resolveFlutterTargetTokens(input);
}

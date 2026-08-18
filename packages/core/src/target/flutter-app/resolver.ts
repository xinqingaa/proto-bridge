import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import fg from 'fast-glob';
import { z } from 'zod';
import type {
  ResolveTargetMappingsInput,
  TargetCodeValidation,
  TargetDeclarationSource,
  TargetMappingDeclaration,
  TargetResolution,
  TargetResolutionBatch,
  TargetResolutionCandidate,
  TargetRevisionKey,
} from '../types.js';
import type { TargetAdapterAuthorityInspection } from '../readiness.js';

const execFileAsync = promisify(execFile);
const machineMapping = z.object({
  symbol: z.string().min(1).optional(),
  accessor: z.string().min(1).optional(),
  import: z.string().min(1).optional(),
  definition: z.string().min(1).optional(),
  constructorHints: z.array(z.string().min(1)).optional(),
  usageHints: z.array(z.string().min(1)).optional(),
}).strict();
const flutterFinder = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('value-key'), value: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('semantics-label'), value: z.string().min(1), isRegExp: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal('text'), value: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('tooltip'), value: z.string().min(1) }).strict(),
  z.object({ kind: z.literal('type'), value: z.string().min(1) }).strict(),
]);
const flutterScenarioAction = z.discriminatedUnion('kind', [
  z.object({ actionId: z.string().min(1), kind: z.literal('tap'), targetRegionId: z.string().min(1), finder: flutterFinder }).strict(),
  z.object({ actionId: z.string().min(1), kind: z.literal('enter-text'), targetRegionId: z.string().min(1), finder: flutterFinder, text: z.string() }).strict(),
  z.object({ actionId: z.string().min(1), kind: z.literal('scroll'), targetRegionId: z.string().min(1), finder: flutterFinder, dx: z.number(), dy: z.number(), durationMicros: z.number().int().positive(), frequency: z.number().int().positive() }).strict(),
  z.object({ actionId: z.string().min(1), kind: z.literal('scroll-into-view'), targetRegionId: z.string().min(1), finder: flutterFinder, alignment: z.number().min(0).max(1) }).strict(),
  z.object({ actionId: z.string().min(1), kind: z.literal('wait-for'), targetRegionId: z.string().min(1), finder: flutterFinder }).strict(),
]);
export const FlutterReviewContract = z.object({
  version: z.literal(2),
  provider: z.literal('dart-flutter-mcp'),
  runtime: z.object({
    applicationIdentity: z.string().min(1),
    identityServiceExtension: z.string().regex(/^ext\.[A-Za-z0-9_.-]+$/),
    prepareServiceExtension: z.string().regex(/^ext\.[A-Za-z0-9_.-]+$/),
    observeServiceExtension: z.string().regex(/^ext\.[A-Za-z0-9_.-]+$/),
    reviewHarnessVersion: z.string().min(1),
    textEntryEmulation: z.boolean(),
    settleTimeoutMs: z.number().int().min(100).max(30_000).optional(),
  }).strict(),
  cases: z.record(z.string().min(1), z.object({
    screenId: z.string().min(1),
    route: z.string().min(1).optional(),
    fixture: z.string().min(1).optional(),
    variantId: z.string().min(1).optional(),
    stateSeed: z.string().optional(),
    regions: z.record(z.string().min(1), flutterFinder).optional(),
  }).strict()),
  scenarios: z.record(z.string().min(1), z.object({
    screenId: z.string().min(1),
    scenarioId: z.string().min(1),
    checkpointId: z.string().min(1),
    actions: z.array(flutterScenarioAction).min(1),
  }).strict()).optional(),
}).strict();
export type FlutterReviewContract = z.infer<typeof FlutterReviewContract>;
const machineContract = z.object({
  version: z.literal(1),
  technology: z.literal('flutter'),
  policyEntrypoints: z.array(z.string().min(1)).optional(),
  components: z.record(z.string().min(1), machineMapping).optional(),
  tokens: z.record(z.string().min(1), machineMapping).optional(),
  queryExclusions: z.array(z.string().min(1)).optional(),
  review: FlutterReviewContract.optional(),
}).strict();

type MappingKind = 'component' | 'token';
type InventoryFile = { path: string; text: string; digest: string };
type Inventory = {
  revision: TargetRevisionKey;
  files: InventoryFile[];
  dartFiles: InventoryFile[];
  declarations: TargetMappingDeclaration[];
  policySources: TargetDeclarationSource[];
  warnings: string[];
  reviewContract?: FlutterReviewContract;
};

const inventoryCache = new Map<string, Inventory>();

export async function resolveFlutterTargetComponents(
  input: ResolveTargetMappingsInput,
): Promise<TargetResolutionBatch> {
  return resolveFlutterMappings(input, 'component');
}

export async function resolveFlutterTargetTokens(
  input: ResolveTargetMappingsInput,
): Promise<TargetResolutionBatch> {
  return resolveFlutterMappings(input, 'token');
}

export async function inspectFlutterTargetAuthority(input: {
  targetRoot: string;
  gitBase?: string;
  excludePaths?: string[];
  candidateOutputRoot?: string;
}): Promise<TargetAdapterAuthorityInspection> {
  const targetRootRealpath = await realpath(input.targetRoot).catch(() => path.resolve(input.targetRoot));
  if (!(await isFlutterTarget(targetRootRealpath))) {
    return {
      adapterId: 'unsupported',
      supported: false,
      targetRevisionKey: await unsupportedRevision(targetRootRealpath, input.gitBase),
      authorities: {},
      warnings: ['No Flutter Target adapter matched this target root.'],
    };
  }
  const inventory = await loadInventory(targetRootRealpath, { ...input, ids: [] });
  const review = inventory.reviewContract;
  const source = inventory.policySources.find((item) => item.kind === 'machine-contract')?.path;
  const authority = (available: boolean, name: string, missing: string) => ({
    available,
    authority: name,
    ...(source ? { source } : {}),
    reason: available ? `Target contract declares ${name}.` : missing,
  });
  return {
    adapterId: 'flutter',
    supported: true,
    targetRevisionKey: inventory.revision,
    authorities: {
      components: authority(true, 'target-component-occurrence-verifier', 'Component occurrence verifier is unavailable.'),
      tokens: authority(true, 'target-token-slot-verifier', 'Token slot verifier is unavailable.'),
      structure: authority(Boolean(review), 'flutter-mcp-widget-inspector', 'Target contract does not declare Flutter MCP Case bindings.'),
      states: authority(Boolean(review), 'flutter-mcp-runtime-observer', 'Target contract does not declare a Flutter MCP Runtime observer.'),
      interactions: authority(Boolean(review?.scenarios), 'flutter-mcp-scenario-driver', 'Target contract does not declare Flutter MCP Scenario bindings.'),
    },
    ...(review ? { declaredCaseIds: Object.keys(review.cases).sort() } : {}),
    ...(review?.scenarios ? { declaredScenarioIds: Object.values(review.scenarios).map((item) => item.scenarioId).sort() } : {}),
    warnings: inventory.warnings,
  };
}

async function resolveFlutterMappings(
  input: ResolveTargetMappingsInput,
  kind: MappingKind,
): Promise<TargetResolutionBatch> {
  const ids = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))];
  const targetRootRealpath = await realpath(input.targetRoot).catch(() => path.resolve(input.targetRoot));
  const supported = await isFlutterTarget(targetRootRealpath);
  if (!supported) {
    const revision = await unsupportedRevision(targetRootRealpath, input.gitBase);
    return {
      adapterId: 'unsupported',
      supported: false,
      kind,
      targetRevisionKey: revision,
      resolutions: ids.map((id) => unsupportedResolution(id, kind)),
      policySources: [],
      warnings: ['No Flutter Target adapter matched this target root.'],
    };
  }
  const inventory = await loadInventory(targetRootRealpath, input);
  return {
    adapterId: 'flutter',
    supported: true,
    kind,
    targetRevisionKey: inventory.revision,
    resolutions: ids.map((id) => resolveOne(inventory, id, kind)),
    policySources: inventory.policySources,
    warnings: inventory.warnings,
  };
}

async function loadInventory(
  targetRootRealpath: string,
  input: ResolveTargetMappingsInput,
): Promise<Inventory> {
  const exclusions = await normalizedExclusions(targetRootRealpath, input);
  const paths = await fg(
    ['pubspec.yaml', '**/*.md', 'proto-bridge.target.json', 'lib/**/*.dart'],
    {
      cwd: targetRootRealpath,
      onlyFiles: true,
      dot: true,
      unique: true,
      ignore: ['**/.git/**', '**/.dart_tool/**', '**/build/**', '**/dist/**', ...exclusions.flatMap(ignorePatterns)],
      suppressErrors: true,
    },
  );
  const files = await Promise.all(
    paths.sort().map(async (relativePath) => {
      const text = await readFile(path.join(targetRootRealpath, relativePath), 'utf8');
      return {
        path: posix(relativePath),
        text,
        digest: digest(text),
      };
    }),
  );
  const currentRevision = await gitRevision(targetRootRealpath);
  const contentDigest = digest(
    files.map((file) => `${file.path}\0${file.digest}`).join('\0'),
  );
  const revision: TargetRevisionKey = {
    targetRootRealpath,
    ...(input.gitBase ? { gitBase: input.gitBase } : {}),
    currentRevision,
    contentDigest,
  };
  const cacheKey = JSON.stringify(revision);
  const cached = inventoryCache.get(cacheKey);
  if (cached) return cached;

  const warnings: string[] = [];
  const declarations: TargetMappingDeclaration[] = [];
  const policySources: TargetDeclarationSource[] = [];
  let machineQueryExclusions: string[] = [];
  let reviewContract: FlutterReviewContract | undefined;
  for (const file of files.filter((item) => item.path.endsWith('.md'))) {
    const sourceKind = /(?:^|\/)AGENTS\.md$/i.test(file.path)
      ? 'target-policy' as const
      : 'target-documentation' as const;
    const source = sourceFor(file, sourceKind, sourceKind === 'target-policy' ? 100 : 60);
    if (sourceKind === 'target-policy' || /^(?:README\.md|docs\/(?:components|theme|proto-bridge)\.md)$/i.test(file.path)) {
      policySources.push(source);
    }
    declarations.push(...markdownDeclarations(file, sourceKind));
  }

  const machine = files.find((file) => file.path === 'proto-bridge.target.json');
  if (machine) {
    try {
      const parsedJson = JSON.parse(machine.text) as unknown;
      const parsed = machineContract.safeParse(parsedJson);
      if (!parsed.success) {
        warnings.push(`Invalid proto-bridge.target.json: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
      } else {
        machineQueryExclusions = parsed.data.queryExclusions ?? [];
        reviewContract = parsed.data.review;
        const source = sourceFor(machine, 'machine-contract', 80);
        policySources.push(source);
        declarations.push(
          ...machineDeclarations(parsed.data.components ?? {}, 'component', source),
          ...machineDeclarations(parsed.data.tokens ?? {}, 'token', source),
        );
      }
    } catch (error) {
      warnings.push(`Invalid proto-bridge.target.json JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const normalizedMachineExclusions = machineQueryExclusions.length
    ? await normalizedExclusions(targetRootRealpath, {
        targetRoot: targetRootRealpath,
        ids: [],
        excludePaths: machineQueryExclusions,
      })
    : [];
  const includedDartFiles = files.filter(
    (file) =>
      file.path.endsWith('.dart') &&
      !normalizedMachineExclusions.some(
        (excluded) => file.path === excluded || file.path.startsWith(`${excluded}/`),
      ),
  );

  const inventory: Inventory = {
    revision,
    files,
    dartFiles: includedDartFiles,
    declarations,
    policySources: uniqueSources(policySources),
    warnings,
    ...(reviewContract ? { reviewContract } : {}),
  };
  inventoryCache.set(cacheKey, inventory);
  return inventory;
}

function resolveOne(inventory: Inventory, id: string, kind: MappingKind): TargetResolution {
  const declarations = inventory.declarations
    .filter((item) => item.kind === kind && item.id === id)
    .sort((left, right) => right.source.priority - left.source.priority || left.source.path.localeCompare(right.source.path));
  const distinct = new Map<string, TargetMappingDeclaration>();
  for (const declaration of declarations) distinct.set(mappingIdentity(declaration), declaration);
  if (distinct.size > 1) {
    return {
      id,
      kind,
      status: 'conflict',
      declarationSources: declarations.map((item) => item.source),
      candidates: declarations.map(toCandidate),
      validation: emptyValidation('Conflicting explicit target declarations were not selected.'),
      reason: 'Explicit target declarations disagree; policy and machine mappings are not silently prioritized.',
      nextQueries: declarations.map((item) => `Reconcile ${item.source.path}${item.source.location ? `:${item.source.location.line}` : ''}.`),
    };
  }
  const declaration = declarations[0];
  if (declaration) {
    const candidate = toCandidate(declaration);
    const validation = validateCandidate(inventory, candidate, kind);
    const usageRequired = kind === 'token' || candidate.usageHints.length > 0;
    const valid =
      validation.exists &&
      validation.importable &&
      validation.signatureCompatible &&
      (!usageRequired || validation.usageFound);
    return {
      id,
      kind,
      status: valid ? 'resolved' : 'stale',
      declarationSources: declarations.map((item) => item.source),
      candidates: [candidate],
      validation,
      reason: valid
        ? 'An explicit target declaration is backed by the current target code.'
        : 'The explicit target declaration is stale or incompatible with the current target code.',
      nextQueries: valid ? [] : ['Update the target declaration or restore the referenced public API.'],
    };
  }

  const candidates = heuristicCandidates(inventory, id, kind);
  if (candidates.length === 1) {
    return {
      id,
      kind,
      status: 'candidate',
      declarationSources: [candidates[0]!.source],
      candidates,
      validation: validateCandidate(inventory, candidates[0]!, kind),
      reason: 'One code heuristic matched, but no explicit target declaration authorizes a resolved mapping.',
      nextQueries: ['Confirm the candidate in target documentation or proto-bridge.target.json.'],
    };
  }
  return {
    id,
    kind,
    status: 'unresolved',
    declarationSources: candidates.map((item) => item.source),
    candidates,
    validation: emptyValidation(candidates.length ? 'Multiple heuristic candidates require disambiguation.' : 'No declaration or code candidate matched.'),
    reason: candidates.length ? 'Multiple code candidates matched the open Evidence ID.' : 'No target mapping declaration or credible code candidate was found.',
    nextQueries: candidates.length
      ? ['Add an explicit mapping that distinguishes the intended public API.']
      : ['Inspect target docs/code and add an explicit target-owned mapping if appropriate.'],
  };
}

function markdownDeclarations(
  file: InventoryFile,
  sourceKind: TargetDeclarationSource['kind'],
): TargetMappingDeclaration[] {
  const lines = file.text.split(/\r?\n/);
  let section: MappingKind | undefined;
  const results: TargetMappingDeclaration[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (/^#{1,4}\s+.*(?:语义组件|component.*mapping|component.*落点)/i.test(line)) section = 'component';
    else if (/^#{1,4}\s+.*(?:Token 对照|token.*mapping)/i.test(line)) section = 'token';
    else if (/^#{1,4}\s+/.test(line)) section = undefined;
    if (!section || !/^\s*\|/.test(line) || /^\s*\|?\s*:?-{3}/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const ids = [...(cells[0] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1]!).filter((value) => !/Evidence|语义/i.test(value));
    const target = [...(cells[1] ?? '').matchAll(/`([^`]+)`/g)][0]?.[1];
    if (!ids.length || !target) continue;
    const importPath = [...(cells[2] ?? '').matchAll(/`([^`]+)`/g)][0]?.[1];
    const source: TargetDeclarationSource = {
      ...sourceFor(file, sourceKind, sourceKind === 'target-policy' ? 100 : 60),
      location: { line: index + 1 },
    };
    for (const id of ids) {
      results.push({
        id,
        kind: section,
        ...(section === 'component' ? { symbol: target } : { accessor: target }),
        ...(importPath ? { importPath } : {}),
        constructorHints: [],
        usageHints: [],
        source,
      });
    }
  }
  return results;
}

function machineDeclarations(
  mappings: Record<string, z.infer<typeof machineMapping>>,
  kind: MappingKind,
  source: TargetDeclarationSource,
): TargetMappingDeclaration[] {
  return Object.entries(mappings).map(([id, mapping]) => ({
    id,
    kind,
    ...(mapping.symbol ? { symbol: mapping.symbol } : {}),
    ...(mapping.accessor ? { accessor: mapping.accessor } : {}),
    ...(mapping.import ? { importPath: mapping.import } : {}),
    ...(mapping.definition ? { definitionPath: mapping.definition } : {}),
    constructorHints: mapping.constructorHints ?? [],
    usageHints: mapping.usageHints ?? [],
    source,
  }));
}

function validateCandidate(
  inventory: Inventory,
  candidate: TargetResolutionCandidate,
  kind: MappingKind,
): TargetCodeValidation {
  const target = candidate.symbol ?? candidate.accessor ?? '';
  const shape = mappingShape(candidate, kind);
  if (!shape.valid) {
    return {
      exists: false,
      importable: false,
      signatureCompatible: false,
      usageFound: false,
      details: [shape.reason],
    };
  }
  const definition = candidate.definitionPath
    ? inventory.dartFiles.find((file) => file.path === posix(candidate.definitionPath!))
    : definitionFor(inventory.dartFiles, target, kind);
  const definitionMatches =
    Boolean(definition) &&
    (candidate.definitionPath
      ? declarationMatchesInFile(definition!.text, target, kind)
      : true);
  const exists =
    definitionMatches &&
    (kind === 'token' ? accessorChainExists(inventory.dartFiles, target) : true);
  const importable = !candidate.importPath || importPathExists(inventory, candidate.importPath);
  const signatureCompatible = candidate.constructorHints.every((hint) =>
    inventory.dartFiles.some((file) => stripDartComments(file.text).includes(hint)),
  );
  const usageFound = candidate.usageHints.length > 0
    ? candidate.usageHints.every((hint) =>
        inventory.dartFiles.some((file) => stripDartComments(file.text).includes(hint)),
      )
    : targetUsageFound(inventory.dartFiles, target, kind);
  return {
    exists,
    importable,
    signatureCompatible,
    usageFound,
    details: [
      exists ? `Current code contains ${target}.` : `Current code does not contain ${target}.`,
      importable ? 'Declared import is reachable.' : `Declared import is missing: ${candidate.importPath}.`,
      signatureCompatible ? 'Constructor/accessor hints are compatible.' : 'One or more required constructor/accessor hints are missing.',
      usageFound ? 'All required current target usage hints were found.' : 'Required current target usage was not found.',
    ],
  };
}

function heuristicCandidates(
  inventory: Inventory,
  id: string,
  kind: MappingKind,
): TargetResolutionCandidate[] {
  const words = id.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
  const results: TargetResolutionCandidate[] = [];
  if (kind === 'component') {
    for (const file of inventory.dartFiles) {
      for (const match of file.text.matchAll(/\bclass\s+([A-Z]\w*)\s+extends\s+(?:StatelessWidget|StatefulWidget|ConsumerWidget|GetView)/g)) {
        const symbol = match[1]!;
        const normalized = symbol.toLowerCase();
        if (!words.some((word) => normalized.includes(word))) continue;
        results.push(codeCandidate(file, { symbol }));
      }
    }
  } else {
    const tail = words.at(-1);
    if (tail) {
      const accessorPattern = new RegExp(`\\b([A-Z][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)+\\.${escapeRegExp(tail)}[A-Za-z0-9_]*)\\b`, 'g');
      for (const file of inventory.dartFiles) {
        for (const match of file.text.matchAll(accessorPattern)) {
          results.push(codeCandidate(file, { accessor: match[1]! }));
        }
      }
    }
  }
  return uniqueCandidates(results);
}

function codeCandidate(
  file: InventoryFile,
  target: { symbol?: string; accessor?: string },
): TargetResolutionCandidate {
  return {
    ...target,
    definitionPath: file.path,
    constructorHints: [],
    usageHints: [],
    source: sourceFor(file, 'code-heuristic', 10),
  };
}

function definitionFor(files: InventoryFile[], target: string, kind: MappingKind): InventoryFile | undefined {
  if (kind === 'token') {
    return files.find((file) => accessorChainExistsInText(file.text, target));
  }
  if (kind === 'component' && /^[A-Za-z_]\w*$/.test(target)) {
    const pattern = new RegExp(`\\b(?:class|mixin|extension|enum)\\s+${escapeRegExp(target)}\\b`);
    return files.find((file) => pattern.test(file.text));
  }
  return files.find((file) => codeContainsTarget(file.text, target));
}

function mappingShape(
  candidate: TargetResolutionCandidate,
  kind: MappingKind,
): { valid: boolean; reason: string } {
  const hasSymbol = Boolean(candidate.symbol);
  const hasAccessor = Boolean(candidate.accessor);
  if (hasSymbol === hasAccessor) {
    return {
      valid: false,
      reason: 'Target mapping must declare exactly one of symbol or accessor.',
    };
  }
  if (kind === 'component' && !hasSymbol) {
    return {
      valid: false,
      reason: 'Component mappings must declare a symbol, not an accessor.',
    };
  }
  if (kind === 'token' && !hasAccessor) {
    return {
      valid: false,
      reason: 'Token mappings must declare an accessor, not a symbol.',
    };
  }
  return { valid: true, reason: '' };
}

function accessorChainExists(files: InventoryFile[], target: string): boolean {
  return files.some((file) => accessorChainExistsInText(file.text, target));
}

function accessorChainExistsInText(text: string, target: string): boolean {
  const segments = target.split('.').filter((item) => /^[A-Za-z_]\w*$/.test(item));
  if (segments.length < 2 || segments.length !== target.split('.').length) return false;
  const chain = segments.map(escapeRegExp).join('\\s*\\.\\s*');
  return new RegExp(`(?:^|[^$\\w])${chain}(?![$\\w])`).test(stripDartComments(text));
}

function declarationMatchesInFile(text: string, target: string, kind: MappingKind): boolean {
  const source = stripDartComments(text);
  if (kind === 'token') {
    if (accessorChainExistsInText(source, target)) return true;
    const tail = target.split('.').at(-1);
    return Boolean(
      tail &&
      new RegExp(`\\b(?:get|set|final|const|var|late|static|[A-Za-z_]\\w*)\\s+${escapeRegExp(tail)}\\b`).test(source),
    );
  }
  const symbol = target.split('.').at(-1) ?? target;
  if (/^[A-Za-z_]\w*$/.test(target)) {
    return new RegExp(`\\b(?:class|mixin|extension|enum)\\s+${escapeRegExp(symbol)}\\b`).test(source);
  }
  return new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`).test(source);
}

function codeContainsTarget(text: string, target: string): boolean {
  const source = stripDartComments(text);
  if (target.includes('.')) return accessorChainExistsInText(source, target);
  return new RegExp(`\\b${escapeRegExp(target)}\\b`).test(source);
}

function targetUsageFound(files: InventoryFile[], target: string, kind: MappingKind): boolean {
  return files.some((file) => {
    const source = stripDartComments(file.text);
    if (kind === 'token' || target.includes('.')) {
      return accessorChainExistsInText(source, target);
    }
    const declarationPattern = new RegExp(`\\b(?:class|mixin|extension|enum)\\s+${escapeRegExp(target)}\\b`);
    const withoutDeclaration = source.replace(declarationPattern, '');
    return new RegExp(`\\b(?:const\\s+|new\\s+)?${escapeRegExp(target)}\\s*(?:<[^>]+>)?\\s*\\(`).test(withoutDeclaration);
  });
}

function stripDartComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function importPathExists(inventory: Inventory, importPath: string): boolean {
  if (importPath.startsWith('package:')) {
    return inventory.dartFiles.some((file) => file.text.includes(importPath));
  }
  const relative = posix(importPath).replace(/^lib\//, '');
  return inventory.dartFiles.some((file) => file.path === `lib/${relative}` || file.path === relative);
}

async function normalizedExclusions(
  root: string,
  input: ResolveTargetMappingsInput,
): Promise<string[]> {
  const values = [...(input.excludePaths ?? []), ...(input.candidateOutputRoot ? [input.candidateOutputRoot] : [])];
  const results: string[] = [];
  for (const value of values) {
    const absolute = path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
    const resolved = await stat(absolute).then(() => realpath(absolute)).catch(() => Promise.resolve(absolute));
    const relative = path.relative(root, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Target query exclusion must resolve inside targetRoot: ${value}`);
    }
    results.push(posix(relative));
  }
  return [...new Set(results)].sort();
}

function ignorePatterns(relative: string): string[] {
  return [relative, `${relative}/**`];
}

async function isFlutterTarget(root: string): Promise<boolean> {
  try {
    const pubspec = await readFile(path.join(root, 'pubspec.yaml'), 'utf8');
    return /sdk\s*:\s*flutter\b/.test(pubspec) || /(?:^|\n)\s*flutter\s*:/m.test(pubspec);
  } catch {
    return false;
  }
}

async function unsupportedRevision(root: string, gitBase?: string): Promise<TargetRevisionKey> {
  return {
    targetRootRealpath: root,
    ...(gitBase ? { gitBase } : {}),
    currentRevision: await gitRevision(root),
    contentDigest: digest('unsupported'),
  };
}

async function gitRevision(root: string): Promise<string> {
  try {
    return (await execFileAsync('git', ['-C', root, 'rev-parse', 'HEAD'])).stdout.trim() || 'unversioned';
  } catch {
    return 'unversioned';
  }
}

function sourceFor(
  file: InventoryFile,
  kind: TargetDeclarationSource['kind'],
  priority: number,
): TargetDeclarationSource {
  return { kind, path: file.path, digest: file.digest, priority };
}

function toCandidate(declaration: TargetMappingDeclaration): TargetResolutionCandidate {
  return {
    ...(declaration.symbol ? { symbol: declaration.symbol } : {}),
    ...(declaration.accessor ? { accessor: declaration.accessor } : {}),
    ...(declaration.importPath ? { importPath: declaration.importPath } : {}),
    ...(declaration.definitionPath ? { definitionPath: declaration.definitionPath } : {}),
    constructorHints: [...declaration.constructorHints],
    usageHints: [...declaration.usageHints],
    source: declaration.source,
  };
}

function mappingIdentity(item: TargetMappingDeclaration): string {
  return JSON.stringify([
    item.symbol,
    item.accessor,
    item.importPath,
    item.definitionPath,
    item.constructorHints,
    item.usageHints,
  ]);
}

function emptyValidation(detail: string): TargetCodeValidation {
  return { exists: false, importable: false, signatureCompatible: false, usageFound: false, details: [detail] };
}

function unsupportedResolution(id: string, kind: MappingKind): TargetResolution {
  return {
    id,
    kind,
    status: 'unsupported',
    declarationSources: [],
    candidates: [],
    validation: emptyValidation('No applicable Target adapter.'),
    reason: 'No applicable Target adapter.',
    nextQueries: ['Inspect the target manually or add an adapter for its technology.'],
  };
}

function uniqueCandidates(candidates: TargetResolutionCandidate[]): TargetResolutionCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = JSON.stringify([candidate.symbol, candidate.accessor, candidate.definitionPath]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function uniqueSources(sources: TargetDeclarationSource[]): TargetDeclarationSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.kind}:${source.path}:${source.digest}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => right.priority - left.priority || left.path.localeCompare(right.path));
}

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function posix(value: string): string {
  return value.split(path.sep).join('/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

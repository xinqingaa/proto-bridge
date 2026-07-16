import path from 'node:path';
import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import type { FlutterRouteEntry, FlutterRouteIntentMapping, FlutterRouteMapping, MappingConfidence, SourceRouteEntry } from '../../types/index.js';
import { toPosixPath } from '../../shared/paths.js';

type DartFile = {
  path: string;
  text: string;
};

type ImportRef = {
  uri: string;
  module?: string | undefined;
};

const WEAK_ROUTE_TOKENS = new Set([
  'add',
  'all',
  'center',
  'detail',
  'edit',
  'history',
  'home',
  'index',
  'list',
  'manage',
  'page',
  'record',
  'records',
  'setting',
  'settings',
  'view',
]);

export async function scanFlutterRouteRegistry(flutterRoot: string): Promise<FlutterRouteEntry[]> {
  const files = await readDartFiles(flutterRoot, [
    'lib/**/*.dart',
  ]);
  const constants = collectRouteConstants(files);
  const entries = files.flatMap((file) => [
    ...(file.text.includes('GetPage') ? parseGetPages(file, constants) : []),
    ...(/\bonGenerateRoute\b|\bRoute<dynamic>\b/.test(file.text) ? parseMaterialSwitchRoutes(file, constants) : []),
    ...(/\broutes\s*:|Map<String,\s*WidgetBuilder>/.test(file.text) ? parseNavigatorRoutesMap(file, constants) : []),
    ...(file.text.includes('GoRoute') ? parseGoRoutes(file, constants) : []),
  ]);
  return dedupeRouteEntries(entries)
    .sort((left, right) => routeApiPriority(left.routeApiPattern) - routeApiPriority(right.routeApiPattern) || left.file.localeCompare(right.file))
    .slice(0, 240);
}

export function matchFlutterRoute(input: {
  sourceRoute?: string | undefined;
  sourceModule?: string | undefined;
  sourceRegistry?: SourceRouteEntry[] | undefined;
  targetRoutes: FlutterRouteEntry[];
  existingModules: string[];
}): FlutterRouteMapping | undefined {
  if (input.targetRoutes.length === 0) return undefined;
  const sourceCandidates = sourceRouteCandidates(input.sourceRoute, input.sourceRegistry);
  const scored = input.targetRoutes
    .map((route) => {
      const score = routeScore(route, sourceCandidates, input.sourceModule);
      return { route, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || Number(Boolean(right.route.module)) - Number(Boolean(left.route.module))
      || confidenceScore(right.route.confidence) - confidenceScore(left.route.confidence),
    );

  const best = scored[0];
  if (!best) {
    return {
      sourceRoute: input.sourceRoute,
      sourceModule: input.sourceModule,
      confidence: 'low',
      reason: 'No target route registry entry matched the source route.',
      evidence: sourceCandidates.slice(0, 5),
      candidates: [],
      unresolved: true,
    };
  }

  const confidence: MappingConfidence = best.score >= 80 ? 'high' : best.score >= 45 ? 'medium' : 'low';
  const candidates = scored.slice(0, 5).map((item) => item.route);
  if (best.score < 100) {
    return {
      sourceRoute: input.sourceRoute,
      sourceModule: input.sourceModule,
      confidence: 'low',
      reason: `Target route candidates were found, but none exactly match the source route; leave integration unresolved.`,
      evidence: sourceCandidates.slice(0, 5),
      candidates,
      unresolved: true,
    };
  }
  const targetModule = best.route.module ?? moduleFromRoute(best.route.route, input.existingModules);
  return {
    sourceRoute: input.sourceRoute,
    targetRoute: best.route.route,
    targetRouteSymbol: best.route.routeSymbol,
    sourceModule: input.sourceModule,
    ...(targetModule ? { targetModule } : {}),
    pageWidget: best.route.pageWidget,
    confidence,
    reason: routeMatchReason(best.route, best.score, sourceCandidates),
    evidence: [
      ...best.route.evidence,
      ...sourceCandidates.slice(0, 3).map((candidate) => `source route candidate: ${candidate}`),
    ].slice(0, 10),
    candidates,
  };
}

export function matchFlutterRouteIntents(input: {
  routes: Array<{
    action: string;
    target?: string | undefined;
  }>;
  sourceModule?: string | undefined;
  sourceRegistry?: SourceRouteEntry[] | undefined;
  targetRoutes: FlutterRouteEntry[];
  existingModules: string[];
}): FlutterRouteIntentMapping[] {
  return input.routes.flatMap((route) => {
    if (route.action !== 'navigate' || !isRouteLike(route.target)) return [];
    const mapping = matchFlutterRoute({
      sourceRoute: route.target,
      sourceModule: sourceModuleForRoute(route.target, input.sourceRegistry) ?? input.sourceModule,
      sourceRegistry: input.sourceRegistry,
      targetRoutes: input.targetRoutes,
      existingModules: input.existingModules,
    });
    return mapping ? [{ ...mapping, action: route.action }] : [];
  });
}

function parseGetPages(file: DartFile, constants: Map<string, string>): FlutterRouteEntry[] {
  return [...file.text.matchAll(/GetPage\s*\(([\s\S]*?)\n\s*\),/g)].flatMap((match) => {
    const body = match[1] ?? '';
    const routeRef = body.match(/\bname\s*:\s*([^,\n]+)/)?.[1]?.trim();
    const pageWidget = body.match(/\bpage\s*:\s*(?:\(\)\s*=>\s*)?(?:const\s+)?([A-Z]\w+)/)?.[1]
      ?? body.match(/\bpage\s*:\s*([A-Z]\w+)\.new/)?.[1];
    const binding = body.match(/\bbinding\s*:\s*(?:const\s+)?([A-Z]\w+)/)?.[1];
    return entryFromRouteRef({
      routeRef,
      pageWidget,
      binding,
      file,
      constants,
      routeApiPattern: 'getx',
      evidencePrefix: 'GetPage',
    });
  });
}

function parseMaterialSwitchRoutes(file: DartFile, constants: Map<string, string>): FlutterRouteEntry[] {
  return [...file.text.matchAll(/case\s+([^:]+):([\s\S]*?)(?=\n\s*case\s+|\n\s*default\s*:|\n\s*}\s*$)/g)].flatMap((match) => {
    const routeRef = match[1]?.trim();
    const body = match[2] ?? '';
    if (!/MaterialPageRoute|CupertinoPageRoute|PageRouteBuilder/.test(body)) return [];
    const pageWidget = body.match(/\bbuilder\s*:\s*\([^)]*\)\s*=>\s*(?:const\s+)?([A-Z]\w+)/)?.[1];
    return entryFromRouteRef({
      routeRef,
      pageWidget,
      file,
      constants,
      routeApiPattern: 'material_on_generate_route',
      evidencePrefix: 'onGenerateRoute switch',
    });
  });
}

function routeApiPriority(pattern: FlutterRouteEntry['routeApiPattern']): number {
  if (pattern === 'getx' || pattern === 'go_router') return 0;
  if (pattern === 'navigator_routes') return 1;
  if (pattern === 'material_on_generate_route') return 2;
  return 3;
}

function parseNavigatorRoutesMap(file: DartFile, constants: Map<string, string>): FlutterRouteEntry[] {
  return [...file.text.matchAll(/([A-Za-z_][\w.]*|['"][^'"]+['"])\s*:\s*\([^)]*\)\s*=>\s*(?:const\s+)?([A-Z]\w+)/g)].flatMap((match) =>
    entryFromRouteRef({
      routeRef: match[1]?.trim(),
      pageWidget: match[2],
      file,
      constants,
      routeApiPattern: 'navigator_routes',
      evidencePrefix: 'Material routes map',
    }),
  );
}

function parseGoRoutes(file: DartFile, constants: Map<string, string>): FlutterRouteEntry[] {
  return [...file.text.matchAll(/GoRoute\s*\(([\s\S]*?)\n\s*\),/g)].flatMap((match) => {
    const body = match[1] ?? '';
    const routeRef = body.match(/\bpath\s*:\s*([^,\n]+)/)?.[1]?.trim()
      ?? body.match(/\bname\s*:\s*([^,\n]+)/)?.[1]?.trim();
    const pageWidget = body.match(/\b(?:builder|pageBuilder)\s*:\s*\([^)]*\)\s*=>\s*(?:const\s+)?([A-Z]\w+)/)?.[1];
    return entryFromRouteRef({
      routeRef,
      pageWidget,
      file,
      constants,
      routeApiPattern: 'go_router',
      evidencePrefix: 'GoRoute',
    });
  });
}

function entryFromRouteRef(input: {
  routeRef?: string | undefined;
  pageWidget?: string | undefined;
  binding?: string | undefined;
  file: DartFile;
  constants: Map<string, string>;
  routeApiPattern: FlutterRouteEntry['routeApiPattern'];
  evidencePrefix: string;
}): FlutterRouteEntry[] {
  if (!input.routeRef) return [];
  const route = resolveRouteRef(input.routeRef, input.constants);
  if (!route) return [];
  const imports = parseImports(input.file);
  const module = inferModuleForRoute(input.pageWidget, input.binding, imports, input.file.path);
  const routeSymbol = normalizeRouteSymbol(input.routeRef);
  return [{
    route,
    ...(routeSymbol ? { routeSymbol } : {}),
    routeApiPattern: input.routeApiPattern,
    ...(input.pageWidget ? { pageWidget: input.pageWidget } : {}),
    ...(input.binding ? { binding: input.binding } : {}),
    file: input.file.path,
    ...(module ? { module } : {}),
    confidence: module ? 'high' : 'medium',
    evidence: [
      `${input.evidencePrefix}: ${input.routeRef}`,
      ...(input.pageWidget ? [`page=${input.pageWidget}`] : []),
      ...(input.binding ? [`binding=${input.binding}`] : []),
      ...(module ? [`module=${module}`] : []),
    ],
  }];
}

function collectRouteConstants(files: DartFile[]): Map<string, string> {
  const constants = new Map<string, string>();
  for (const file of files) {
    for (const match of file.text.matchAll(/\bstatic\s+const\s+(?:String\s+)?([A-Za-z_]\w*)\s*=\s*['"]([^'"]+)['"]/g)) {
      const name = match[1];
      const value = match[2];
      if (!name || !value) continue;
      constants.set(name, value);
      const className = classNameBefore(file.text, match.index ?? 0);
      if (className) constants.set(`${className}.${name}`, value);
    }
    for (const match of file.text.matchAll(/\bconst\s+(?:String\s+)?([A-Za-z_]\w*)\s*=\s*['"]([^'"]+)['"]/g)) {
      if (match[1] && match[2]) constants.set(match[1], match[2]);
    }
  }
  return constants;
}

function classNameBefore(text: string, index: number): string | undefined {
  const prefix = text.slice(0, index);
  return [...prefix.matchAll(/\bclass\s+([A-Za-z_]\w*)\b/g)].at(-1)?.[1];
}

function resolveRouteRef(ref: string, constants: Map<string, string>): string | undefined {
  const trimmed = ref.replace(/,$/, '').trim();
  const literal = trimmed.match(/^['"]([^'"]+)['"]$/)?.[1];
  if (literal) return normalizeTargetRoute(literal);
  const withoutConst = trimmed.replace(/^const\s+/, '');
  return constants.get(withoutConst) ? normalizeTargetRoute(constants.get(withoutConst) ?? '') : undefined;
}

function normalizeRouteSymbol(ref: string): string | undefined {
  const trimmed = ref.replace(/,$/, '').trim();
  return /^['"]/.test(trimmed) ? undefined : trimmed;
}

function parseImports(file: DartFile): ImportRef[] {
  return [...file.text.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((match) => {
    const uri = match[1] ?? '';
    return {
      uri,
      module: moduleFromPath(resolveImportPath(file.path, uri)),
    };
  });
}

function inferModuleForRoute(
  pageWidget: string | undefined,
  binding: string | undefined,
  imports: ImportRef[],
  filePath: string,
): string | undefined {
  const names = [pageWidget, binding].filter(Boolean).map((name) => name?.toLowerCase());
  const byName = imports.find((item) =>
    item.module && names.some((name) => name && normalizeName(item.uri).includes(name.replace(/(page|view|binding|controller)$/i, '').toLowerCase())),
  );
  return byName?.module ?? moduleFromPath(filePath);
}

function resolveImportPath(fromFile: string, uri: string): string {
  if (uri.startsWith('package:')) {
    const packageRelative = uri.match(/^package:[^/]+\/(.+)$/)?.[1];
    return packageRelative ? `lib/${packageRelative}` : uri;
  }
  if (!uri.startsWith('.')) return uri;
  return toPosixPath(path.normalize(path.join(path.dirname(fromFile), uri)));
}

function moduleFromPath(filePath: string): string | undefined {
  const structural = new Set([
    'lib', 'app', 'src', 'features', 'feature', 'modules', 'module', 'domains', 'domain',
    'presentation', 'pages', 'page', 'screens', 'screen', 'views', 'view', 'widgets',
    'components', 'common', 'shared', 'core', 'data', 'infrastructure', 'routes', 'routing',
  ]);
  const directories = toPosixPath(filePath).split('/').slice(0, -1);
  return directories.reverse().find((part) => !structural.has(part));
}

function routeScore(route: FlutterRouteEntry, sourceCandidates: string[], sourceModule: string | undefined): number {
  const target = normalizeComparableRoute(route.route);
  const targetParts = routeParts(route.route);
  let score = 0;
  for (const candidate of sourceCandidates) {
    const normalized = normalizeComparableRoute(candidate);
    if (normalizeTargetRoute(candidate) === normalizeTargetRoute(route.route)) score = Math.max(score, 100);
    if (normalized && target && normalized === target) score = Math.max(score, 100);
    const candidateLeaf = leafSegment(candidate);
    const targetLeaf = leafSegment(route.route);
    if (candidateLeaf && targetLeaf && candidateLeaf === targetLeaf) score = Math.max(score, 70);
    const candidateParts = routeParts(candidate);
    const overlap = candidateParts.filter((part) => targetParts.includes(part)).length;
    const strongOverlap = candidateParts.filter((part) => targetParts.includes(part) && !isWeakRouteToken(part)).length;
    if (overlap >= 2 && strongOverlap >= 1) score = Math.max(score, 40 + overlap * 8 + strongOverlap * 4);
    if (strongOverlap >= 2) score = Math.max(score, 52 + strongOverlap * 8);
  }
  if (score > 0 && sourceModule && route.module && sourceModule === route.module) score += 12;
  return score;
}

function sourceRouteCandidates(route: string | undefined, registry: SourceRouteEntry[] | undefined): string[] {
  const current = route ? normalizeTargetRoute(route) : undefined;
  const related = (registry ?? [])
    .filter((entry) => {
      if (!current) return false;
      return entry.route === current;
    })
    .flatMap((entry) => [entry.route, entry.screenId, entry.view, entry.key, entry.title, entry.label])
    .filter((item): item is string => Boolean(item));
  return dedupe([...(current ? [current] : []), ...related]);
}

function routeMatchReason(route: FlutterRouteEntry, score: number, sourceCandidates: string[]): string {
  if (score >= 100) return `Exact target route registry match for ${route.route}.`;
  if (score >= 70) return `Matched target route ${route.route} by route leaf segment.`;
  return `Matched target route ${route.route} by route token overlap with ${sourceCandidates.slice(0, 3).join(', ')}.`;
}

function moduleFromRoute(route: string, existingModules: string[]): string | undefined {
  const first = route.split(/[?#]/)[0]?.split('/').filter(Boolean)[0];
  if (!first) return undefined;
  return existingModules.find((moduleName) => normalizeModuleName(moduleName) === normalizeModuleName(first));
}

function sourceModuleForRoute(route: string | undefined, registry: SourceRouteEntry[] | undefined): string | undefined {
  const normalized = route ? normalizeTargetRoute(route) : undefined;
  if (!normalized) return undefined;
  return registry?.find((entry) => entry.route === normalized)?.module;
}

function isRouteLike(value: string | undefined): boolean {
  return Boolean(value && value.includes('/'));
}

function normalizeModuleName(value: string): string {
  return value.replace(/[-_\s]+/g, '').toLowerCase();
}

function routeParts(value: string | undefined): string[] {
  return normalizeComparableRoute(value)
    .split('-')
    .filter((part) => part.length >= 3 && !['design', 'prototype', 'page', 'view'].includes(part));
}

function leafSegment(value: string | undefined): string | undefined {
  const comparable = normalizeComparableRoute(value);
  if (!comparable) return undefined;
  const leaf = comparable.split('-').filter(Boolean).at(-1);
  return leaf && !isWeakRouteToken(leaf) ? leaf : undefined;
}

function isWeakRouteToken(value: string): boolean {
  return WEAK_ROUTE_TOKENS.has(value.toLowerCase());
}

function normalizeComparableRoute(value: string | undefined): string {
  return normalizeTargetRoute(value ?? '')
    .replace(/^\/+/, '')
    .replace(/^(design|prototype)\//, '')
    .replace(/[/_]+/g, '-')
    .toLowerCase();
}

function normalizeTargetRoute(value: string): string {
  const route = value.split('?')[0]?.split('#')[0] ?? value;
  return route.startsWith('/') ? route : `/${route}`;
}

function normalizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
}

async function readDartFiles(flutterRoot: string, patterns: string[]): Promise<DartFile[]> {
  const paths = await fg(patterns, {
    cwd: flutterRoot,
    onlyFiles: true,
    absolute: false,
    suppressErrors: true,
    ignore: ['**/*.g.dart', '**/*.freezed.dart', '**/.dart_tool/**', '**/build/**'],
  });
  const files: DartFile[] = [];
  for (const filePath of paths.sort()) {
    try {
      const text = await readFile(path.join(flutterRoot, filePath), 'utf8');
      files.push({ path: toPosixPath(filePath), text });
    } catch {
      // Route registry is advisory; ignore unreadable files.
    }
  }
  return files;
}

function dedupeRouteEntries(entries: FlutterRouteEntry[]): FlutterRouteEntry[] {
  const seen = new Set<string>();
  const result: FlutterRouteEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.route}:${entry.pageWidget ?? ''}:${entry.file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function confidenceScore(confidence: MappingConfidence): number {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

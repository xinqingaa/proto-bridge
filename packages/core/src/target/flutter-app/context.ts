import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import fg from 'fast-glob';
import type { AnalyzeFlutterContextInput, FlutterContextAnalysis } from '../../types/index.js';
import { pathExists, toPosixPath } from '../../shared/paths.js';
import { detectFlutterTargetConventions } from './architecture-profile.js';
import { matchFlutterRoute, matchFlutterRouteIntents, scanFlutterRouteRegistry } from './route-registry.js';

export async function analyzeFlutterContext(input: AnalyzeFlutterContextInput): Promise<FlutterContextAnalysis> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const warnings: string[] = [];

  if (!(await pathExists(flutterRoot))) {
    warnings.push(`Flutter root not found: ${flutterRoot}`);
  }

  const existingModules = await listModuleDirectories(flutterRoot);
  const routeRegistry = await scanFlutterRouteRegistry(flutterRoot);
  const routeMapping = matchFlutterRoute({
    sourceRoute: input.route,
    sourceModule: input.prototypeModule ?? input.screenId?.split('.')[0],
    sourceRegistry: input.sourceRouteRegistry,
    targetRoutes: routeRegistry,
    existingModules,
  });
  const routeIntentMappings = matchFlutterRouteIntents({
    routes: input.sourceRoutes ?? [],
    sourceModule: input.prototypeModule ?? input.screenId?.split('.')[0],
    sourceRegistry: input.sourceRouteRegistry,
    targetRoutes: routeRegistry,
    existingModules,
  });
  const suggestedModule = suggestModule(input, existingModules, routeMapping?.targetModule);
  const routesFiles = [...new Set([
    ...routeRegistry.map((entry) => entry.file),
    ...await discoverFiles(flutterRoot, [
      'lib/**/routes/*.{dart,arb,json}', 'lib/**/routing/*.{dart,arb,json}',
      'lib/**/*_routes.dart', 'lib/**/*_router.dart',
    ]),
  ])].sort();
  const translationFiles = await discoverFiles(flutterRoot, [
    'lib/**/*translation*.dart', 'lib/**/*localization*.dart', 'lib/**/*l10n*.dart', 'lib/**/*i18n*.dart',
    'lib/**/translations/**/*.{dart,arb,json}', 'lib/**/l10n/**/*.{dart,arb,json}',
    'assets/**/translations/**/*.{arb,json}', 'assets/**/l10n/**/*.{arb,json}',
  ]);
  const assetDirectories = await discoverAssetDirectories(flutterRoot);
  const reusableWidgets = await collectReusableWidgets(flutterRoot, input);
  const similarFiles = suggestedModule ? await collectSimilarFiles(flutterRoot, suggestedModule, input.screenId) : [];
  const targetConventions = await detectFlutterTargetConventions({
    flutterRoot,
    module: suggestedModule,
  });

  if (!suggestedModule) {
    warnings.push('Unable to suggest a Flutter module from prototype module or screenId.');
  }

  return {
    platform: 'flutter',
    flutterRoot,
    suggestedModule,
    routeRegistry,
    ...(routeMapping ? { routeMapping } : {}),
    ...(routeIntentMappings.length ? { routeIntentMappings } : {}),
    existingModules,
    reusableWidgets,
    routesFiles,
    translationFiles,
    assetDirectories,
    similarFiles,
    targetConventions,
    warnings,
  };
}

export function getFlutterModuleMap(): Record<string, string> {
  return {};
}

function suggestModule(
  input: AnalyzeFlutterContextInput,
  existingModules: string[],
  routeMappedModule: string | undefined,
): string | undefined {
  if (input.targetModule) return input.targetModule;
  if (routeMappedModule && existingModules.includes(routeMappedModule)) return routeMappedModule;

  const candidates = [
    input.prototypeModule,
    input.screenId?.split('.')[0],
    input.route?.split('/').filter(Boolean).at(-1),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const mapped = resolveModuleAlias(candidate, input, existingModules);
    if (existingModules.includes(mapped)) return mapped;
  }

  return undefined;
}

async function listModuleDirectories(flutterRoot: string): Promise<string[]> {
  const roots = [
    'lib/app/modules', 'lib/features', 'lib/src/features', 'lib/modules', 'lib/src/modules',
    'lib/domains', 'lib/src/domains',
  ];
  const modules = new Set<string>();
  for (const root of roots) {
    try {
      const entries = await readdir(path.join(flutterRoot, root), { withFileTypes: true });
      for (const entry of entries) if (entry.isDirectory() && !entry.name.startsWith('_')) modules.add(entry.name);
    } catch {
      // Candidate topology root is absent.
    }
  }
  return [...modules].sort();
}

async function discoverFiles(root: string, patterns: string[]): Promise<string[]> {
  return (await fg(patterns, { cwd: root, onlyFiles: true, absolute: false, suppressErrors: true }))
    .map(toPosixPath)
    .sort()
    .slice(0, 120);
}

async function discoverAssetDirectories(root: string): Promise<string[]> {
  const files = await fg(['assets/**/*', 'lib/assets/**/*'], {
    cwd: root,
    onlyFiles: true,
    absolute: false,
    suppressErrors: true,
  });
  return [...new Set(files.map((file) => toPosixPath(path.dirname(file))))].sort().slice(0, 80);
}

async function collectReusableWidgets(flutterRoot: string, input: AnalyzeFlutterContextInput): Promise<string[]> {
  const commonFiles = await fg(
    ['lib/**/*.dart'],
    {
      cwd: flutterRoot,
      onlyFiles: true,
      absolute: false,
      suppressErrors: true,
    },
  );

  if (commonFiles.length === 0) return [];

  const discovered = new Set<string>();
  for (const filePath of commonFiles) {
    if (!/\/(?:common|shared|widgets?|components?|design_system|ui)\//.test(toPosixPath(filePath))) continue;
    try {
      const text = await readFile(path.join(flutterRoot, filePath), 'utf8');
      for (const match of text.matchAll(/\bclass\s+([A-Z]\w*)\s+extends\s+(?:StatelessWidget|StatefulWidget|ConsumerWidget|HookWidget|GetView\b)/g)) {
        if (match[1]) discovered.add(match[1]);
      }
    } catch {
      // Ignore unreadable advisory evidence.
    }
  }
  return [...discovered].sort();
}

function resolveModuleAlias(candidate: string, input: AnalyzeFlutterContextInput, existingModules: string[]): string {
  return candidate;
}

async function collectSimilarFiles(
  flutterRoot: string,
  suggestedModule: string,
  screenId: string | undefined,
): Promise<string[]> {
  const files = await fg(['lib/**/*.dart'], {
    cwd: flutterRoot,
    onlyFiles: true,
    absolute: false,
    suppressErrors: true,
  });

  const keywords = (screenId ?? suggestedModule)
    .split(/[._/-]+/)
    .filter((keyword) => keyword.length >= 3)
    .map((keyword) => keyword.toLowerCase());

  const scopedFiles = files.filter((filePath) => toPosixPath(filePath).split('/').includes(suggestedModule));
  const scored = scopedFiles
    .map((filePath) => {
      const normalized = toPosixPath(filePath).toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
      return { filePath, score };
    })
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  return scored.slice(0, 24).map((item) => item.filePath);
}

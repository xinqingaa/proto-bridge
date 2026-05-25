import path from 'node:path';
import { readdir } from 'node:fs/promises';
import fg from 'fast-glob';
import type { AnalyzeFlutterContextInput, FlutterContextAnalysis } from '../../types/index.js';
import { pathExists, toPosixPath } from '../../shared/paths.js';
import { detectFlutterTargetConventions } from './architecture-profile.js';
import { restorationProfileArtifact } from '../../profile/index.js';
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
  const routesFiles = await existingPaths(flutterRoot, [
    'lib/app/routes/app_routes.dart',
    'lib/app/routes/app_pages.dart',
  ]);
  const translationFiles = await existingPaths(flutterRoot, [
    'lib/app/translations/en_US.dart',
    'lib/app/translations/zh_CN.dart',
    'lib/app/translations/zh_HK.dart',
  ]);
  const assetDirectories = await existingPaths(flutterRoot, [
    'assets/images',
    'assets/dark_images',
    'assets/svg',
    'assets/json',
  ]);
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
    ...(input.restorationProfile ? { restorationProfile: restorationProfileArtifact(input.restorationProfile) } : {}),
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
    if (existingModules.length === 0 || existingModules.includes(mapped)) return mapped;
  }

  return candidates[0] ? resolveModuleAlias(candidates[0], input, existingModules) : undefined;
}

async function listModuleDirectories(flutterRoot: string): Promise<string[]> {
  const modulesDir = path.join(flutterRoot, 'lib/app/modules');
  try {
    const entries = await readdir(modulesDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function existingPaths(root: string, relativePaths: string[]): Promise<string[]> {
  const result: string[] = [];
  for (const relativePath of relativePaths) {
    const absolute = path.join(root, relativePath);
    if (await pathExists(absolute)) result.push(relativePath);
  }
  return result;
}

async function collectReusableWidgets(flutterRoot: string, input: AnalyzeFlutterContextInput): Promise<string[]> {
  const commonFiles = await fg(
    ['lib/app/common/{widget,widgets,pop}/**/*.dart', 'lib/app/widgets/**/*.dart'],
    {
      cwd: flutterRoot,
      onlyFiles: true,
      absolute: false,
      suppressErrors: true,
    },
  );

  if (commonFiles.length === 0) return [];

  const fileStemIndex = new Set(
    commonFiles.map((filePath) =>
      path
        .basename(filePath, '.dart')
        .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
        .toLowerCase(),
    ),
  );

  const profileSymbols = input.restorationProfile?.profile.targetSymbols ?? [];
  const detected = profileSymbols.map((item) => item.symbol).filter((widget) =>
    fileStemIndex.has(widget.replace('.', '').replace(/\(context\)/, '').toLowerCase()),
  );

  return detected;
}

function resolveModuleAlias(candidate: string, input: AnalyzeFlutterContextInput, existingModules: string[]): string {
  const mapped = input.restorationProfile?.profile.moduleAliases?.[candidate] ?? candidate;
  if (mapped !== candidate && existingModules.includes(mapped)) return mapped;
  return candidate;
}

async function collectSimilarFiles(
  flutterRoot: string,
  suggestedModule: string,
  screenId: string | undefined,
): Promise<string[]> {
  const modulePattern = `lib/app/modules/${suggestedModule}/**/*.dart`;
  const files = await fg([modulePattern], {
    cwd: flutterRoot,
    onlyFiles: true,
    absolute: false,
    suppressErrors: true,
  });

  const keywords = (screenId ?? suggestedModule)
    .split(/[._/-]+/)
    .filter((keyword) => keyword.length >= 3)
    .map((keyword) => keyword.toLowerCase());

  const scored = files
    .map((filePath) => {
      const normalized = toPosixPath(filePath).toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
      return { filePath, score };
    })
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  return scored.slice(0, 24).map((item) => item.filePath);
}

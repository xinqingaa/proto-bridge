import path from 'node:path';
import { readdir } from 'node:fs/promises';
import fg from 'fast-glob';
import type { AnalyzeFlutterContextInput, FlutterContextAnalysis } from '../../../types/index.js';
import { pathExists, toPosixPath } from '../../../utils/path.js';

const MODULE_MAP: Record<string, string> = {
  stock: 'order',
  options: 'option',
  'options-trade': 'option',
  account: 'account',
  asset: 'account',
  security: 'auth',
  onboard: 'account',
};

const IMPORTANT_COMMON_WIDGETS = [
  'CommonAppBar',
  'CommonButton',
  'CommonImage',
  'CommonSvg',
  'CommonNetImage',
  'CommonToast',
  'CommonEmpty',
  'CommonLoading',
  'Pop.sheet',
  'YouFiPop',
  'BaseGetView',
  'BaseGetPullView',
];

export async function analyzeFlutterContext(input: AnalyzeFlutterContextInput): Promise<FlutterContextAnalysis> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const warnings: string[] = [];

  if (!(await pathExists(flutterRoot))) {
    warnings.push(`Flutter root not found: ${flutterRoot}`);
  }

  const existingModules = await listModuleDirectories(flutterRoot);
  const suggestedModule = suggestModule(input, existingModules);
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
  const reusableWidgets = await collectReusableWidgets(flutterRoot);
  const similarFiles = suggestedModule ? await collectSimilarFiles(flutterRoot, suggestedModule, input.screenId) : [];

  if (!suggestedModule) {
    warnings.push('Unable to suggest a Flutter module from prototype module or screenId.');
  }

  return {
    platform: 'flutter',
    flutterRoot,
    suggestedModule,
    existingModules,
    reusableWidgets,
    routesFiles,
    translationFiles,
    assetDirectories,
    similarFiles,
    warnings,
  };
}

export function getFlutterModuleMap(): Record<string, string> {
  return { ...MODULE_MAP };
}

function suggestModule(input: AnalyzeFlutterContextInput, existingModules: string[]): string | undefined {
  if (input.targetModule) return input.targetModule;

  const candidates = [
    input.prototypeModule,
    input.screenId?.split('.')[0],
    input.route?.split('/').filter(Boolean).at(-1),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const mapped = MODULE_MAP[candidate] ?? candidate;
    if (existingModules.length === 0 || existingModules.includes(mapped)) return mapped;
  }

  return candidates[0] ? (MODULE_MAP[candidates[0]] ?? candidates[0]) : undefined;
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

async function collectReusableWidgets(flutterRoot: string): Promise<string[]> {
  const commonFiles = await fg(
    ['lib/app/common/{widget,widgets,pop}/**/*.dart', 'lib/app/widgets/**/*.dart'],
    {
      cwd: flutterRoot,
      onlyFiles: true,
      absolute: false,
      suppressErrors: true,
    },
  );

  if (commonFiles.length === 0) return [...IMPORTANT_COMMON_WIDGETS];

  const fileStemIndex = new Set(
    commonFiles.map((filePath) =>
      path
        .basename(filePath, '.dart')
        .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
        .toLowerCase(),
    ),
  );

  const detected = IMPORTANT_COMMON_WIDGETS.filter((widget) =>
    fileStemIndex.has(widget.replace('.', '').toLowerCase()),
  );

  return detected.length > 0 ? detected : [...IMPORTANT_COMMON_WIDGETS];
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

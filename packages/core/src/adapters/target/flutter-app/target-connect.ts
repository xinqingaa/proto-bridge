import path from 'node:path';
import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import type {
  AnalyzeFlutterTargetConventionsInput,
  FindFlutterTargetExamplesInput,
  FlutterComponentRef,
  FlutterComponentRole,
  FlutterExampleRef,
  FlutterTargetConventions,
  MappingConfidence,
} from '../../../types/index.js';
import { pathExists, toPosixPath } from '../../../utils/path.js';
import { analyzeFlutterContext } from './flutter-context.js';

type KnownFlutterSymbol = {
  symbol: string;
  role: FlutterComponentRole;
  reason: string;
};

type DartFile = {
  path: string;
  text: string;
};

const KNOWN_SYMBOLS: KnownFlutterSymbol[] = [
  { symbol: 'CommonAppBar', role: 'app-bar', reason: 'YouFi common app bar candidate.' },
  { symbol: 'CommonButton', role: 'button', reason: 'YouFi common button candidate.' },
  { symbol: 'CommonImage', role: 'image', reason: 'YouFi common image candidate.' },
  { symbol: 'CommonSvg', role: 'image', reason: 'YouFi common SVG candidate.' },
  { symbol: 'CommonNetImage', role: 'image', reason: 'YouFi common network image candidate.' },
  { symbol: 'CommonEmpty', role: 'empty', reason: 'YouFi common empty-state candidate.' },
  { symbol: 'CommonLoading', role: 'loading', reason: 'YouFi common loading candidate.' },
  { symbol: 'CommonToast', role: 'toast', reason: 'YouFi common toast candidate.' },
  { symbol: 'Pop.sheet', role: 'sheet', reason: 'YouFi sheet/popup candidate.' },
  { symbol: 'YouFiPop', role: 'sheet', reason: 'YouFi popup candidate.' },
  { symbol: 'BaseGetView', role: 'page-base', reason: 'YouFi page base class candidate.' },
  { symbol: 'BaseGetPullView', role: 'page-base', reason: 'YouFi pull-to-refresh page base candidate.' },
  { symbol: 'SmartRefresher', role: 'refresh', reason: 'Refresh/list paging candidate.' },
  { symbol: 'themeService.colors', role: 'theme', reason: 'YouFi color token usage.' },
  { symbol: 'themeService.textStyles', role: 'theme', reason: 'YouFi text style usage.' },
  { symbol: '.tr', role: 'i18n', reason: 'GetX translation usage.' },
  { symbol: 'Get.toNamed', role: 'route', reason: 'GetX named route navigation usage.' },
  { symbol: 'Get.back', role: 'route', reason: 'GetX back navigation usage.' },
];

const ROLE_SYMBOLS: Partial<Record<FlutterComponentRole, string[]>> = {
  'app-bar': ['CommonAppBar', 'AppBar'],
  button: ['CommonButton', 'TextButton', 'GestureDetector'],
  image: ['CommonImage', 'CommonSvg', 'CommonNetImage', 'Image.asset'],
  empty: ['CommonEmpty'],
  loading: ['CommonLoading'],
  sheet: ['Pop.sheet', 'YouFiPop', 'showModalBottomSheet'],
  toast: ['CommonToast'],
  'page-base': ['BaseGetView', 'BaseGetPullView', 'GetView'],
  refresh: ['SmartRefresher', 'RefreshController'],
  theme: ['themeService.colors', 'themeService.textStyles'],
  i18n: ['.tr'],
  route: ['Get.toNamed', 'Get.back', 'Routes.'],
};

export async function getFlutterTargetConventions(
  input: AnalyzeFlutterTargetConventionsInput,
): Promise<FlutterTargetConventions> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const warnings: string[] = [];
  if (!(await pathExists(flutterRoot))) warnings.push(`Flutter root not found: ${flutterRoot}`);

  const context = await analyzeFlutterContext({
    flutterRoot,
    targetModule: input.module,
  });
  const components = await collectFlutterComponents({
    flutterRoot,
    symbols: input.symbols,
    roles: input.roles,
  });

  return {
    flutterRoot,
    ...(input.module ? { module: input.module } : {}),
    existingModules: context.existingModules,
    routesFiles: context.routesFiles,
    translationFiles: context.translationFiles,
    assetDirectories: context.assetDirectories,
    components,
    themeUsages: await collectUsageLines(flutterRoot, ['themeService.colors', 'themeService.textStyles'], input.module),
    routeUsages: await collectUsageLines(flutterRoot, ['Get.toNamed', 'Get.back', 'Routes.'], input.module),
    i18nUsages: await collectUsageLines(flutterRoot, ['.tr'], input.module),
    warnings: [...warnings, ...context.warnings],
  };
}

export async function findFlutterTargetExamples(input: FindFlutterTargetExamplesInput): Promise<FlutterExampleRef[]> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const limit = clamp(input.limit ?? 8, 1, 20);
  const files = await readDartFiles(flutterRoot, moduleFilePatterns(input.module));
  const roles = input.roles ?? [];
  const requestedSymbols = dedupe([
    ...(input.symbols ?? []),
    ...roles.flatMap((role) => ROLE_SYMBOLS[role] ?? []),
    ...symbolsForPattern(input.pattern),
  ]);
  const keywords = dedupe([
    ...(input.screenId ?? '').split(/[._/-]+/),
    ...(input.pattern ?? '').split(/[._/-]+/),
    input.module ?? '',
    ...roles,
  ]
    .map((item) => item.toLowerCase())
    .filter((item) => item.length >= 3));

  const scored = files.map((file) => {
    const lowerPath = file.path.toLowerCase();
    const lowerText = file.text.toLowerCase();
    const matchedSymbols = requestedSymbols.filter((symbol) => includesSymbol(file.text, symbol));
    const matchedRoles = rolesForSymbols(matchedSymbols);
    const keywordMatches = keywords.filter((keyword) => lowerPath.includes(keyword) || lowerText.includes(keyword));
    const structuralScore = scoreFlutterStructure(file.text);
    const score = matchedSymbols.length * 4 + matchedRoles.length * 3 + keywordMatches.length * 2 + structuralScore;
    const snippetNeedles = (matchedSymbols.length ? matchedSymbols : keywordMatches).slice(0, 8);
    return {
      path: file.path,
      reason: buildExampleReason({ matchedSymbols, matchedRoles, keywordMatches, structuralScore, module: input.module }),
      matchedRoles,
      matchedSymbols,
      snippets: extractSnippets(file.text, snippetNeedles.length ? snippetNeedles : requestedSymbols, 3),
      score,
    };
  });

  const positive = scored.filter((item) => item.score > 0);
  const fallback = scored
    .filter((item) => item.score === 0 && (!input.module || item.path.includes(`/modules/${input.module}/`)))
    .slice(0, Math.max(0, limit - positive.length))
    .map((item) => ({
      ...item,
      reason: input.module ? `Same module fallback: ${input.module}.` : 'Fallback Flutter module example.',
    }));

  return [...positive, ...fallback]
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}

async function collectFlutterComponents(input: {
  flutterRoot: string;
  symbols?: string[] | undefined;
  roles?: FlutterComponentRole[] | undefined;
}): Promise<FlutterComponentRef[]> {
  const known = selectKnownSymbols(input.symbols, input.roles);
  const packageName = await readPubspecPackageName(input.flutterRoot);
  const files = await readDartFiles(input.flutterRoot, [
    'lib/app/common/{widget,widgets,pop}/**/*.dart',
    'lib/app/widgets/**/*.dart',
    'lib/app/modules/**/*.dart',
  ]);

  return known.map((knownSymbol) => {
    const definition = findDefinition(files, knownSymbol.symbol);
    const usageFiles = files.filter((file) => includesSymbol(file.text, knownSymbol.symbol));
    const snippets = usageFiles.flatMap((file) => extractSnippets(file.text, [knownSymbol.symbol], 1, file.path)).slice(0, 4);
    const propsHints = inferPropsHints(knownSymbol.symbol, snippets);
    const confidence = componentConfidence(definition, usageFiles);
    return {
      symbol: knownSymbol.symbol,
      role: knownSymbol.role,
      ...(definition ? { path: definition.path } : {}),
      ...(definition ? { importPath: toDartImportPath(definition.path, packageName) } : {}),
      usageSnippets: snippets,
      propsHints,
      confidence,
      reason: componentReason(knownSymbol, confidence),
    };
  });
}

function selectKnownSymbols(
  symbols: string[] | undefined,
  roles: FlutterComponentRole[] | undefined,
): KnownFlutterSymbol[] {
  const selected = KNOWN_SYMBOLS.filter((item) => {
    const symbolMatch = !symbols?.length || symbols.includes(item.symbol);
    const roleMatch = !roles?.length || roles.includes(item.role);
    return symbolMatch && roleMatch;
  });

  if (symbols?.length) {
    const extra = symbols
      .filter((symbol) => !selected.some((item) => item.symbol === symbol))
      .map((symbol) => ({ symbol, role: 'unknown' as const, reason: 'User-requested Flutter symbol.' }));
    return [...selected, ...extra];
  }

  return selected;
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
      // Ignore unreadable files; target connect is advisory.
    }
  }
  return files;
}

function moduleFilePatterns(module: string | undefined): string[] {
  if (module) return [`lib/app/modules/${module}/**/*.dart`];
  return ['lib/app/modules/**/*.dart'];
}

async function collectUsageLines(flutterRoot: string, symbols: string[], module: string | undefined): Promise<string[]> {
  const patterns = module
    ? [`lib/app/modules/${module}/**/*.dart`]
    : ['lib/app/modules/**/*.dart', 'lib/app/common/{widget,widgets,pop}/**/*.dart', 'lib/app/widgets/**/*.dart'];
  const files = await readDartFiles(flutterRoot, patterns);
  return files
    .flatMap((file) => extractSnippets(file.text, symbols, 1, file.path))
    .slice(0, 12);
}

function findDefinition(files: DartFile[], symbol: string): DartFile | undefined {
  if (symbol.includes('.')) return files.find((file) => includesSymbol(file.text, symbol));
  const classPattern = new RegExp(`\\b(class|mixin|enum|extension)\\s+${escapeRegExp(symbol)}\\b`);
  const constructorPattern = new RegExp(`\\b${escapeRegExp(symbol)}\\s*\\(`);
  return files.find((file) => classPattern.test(file.text))
    ?? files.find((file) => /lib\/app\/(common|widgets)\//.test(file.path) && constructorPattern.test(file.text))
    ?? files.find((file) => constructorPattern.test(file.text));
}

function includesSymbol(text: string, symbol: string): boolean {
  if (!symbol) return false;
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
    return new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(text);
  }
  return text.includes(symbol);
}

function extractSnippets(text: string, needles: string[], maxSnippets: number, label?: string): string[] {
  if (needles.length === 0) return [];
  const lines = text.split(/\r?\n/);
  const snippets: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!needles.some((needle) => needle && line.toLowerCase().includes(needle.toLowerCase()))) continue;
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    const snippetLines = lines.slice(start, end).map((snippetLine, offset) => {
      const lineNumber = start + offset + 1;
      return `${lineNumber}: ${snippetLine.trimEnd()}`;
    });
    snippets.push(`${label ? `${label}\n` : ''}${snippetLines.join('\n')}`);
    if (snippets.length >= maxSnippets) break;
  }
  return snippets;
}

function inferPropsHints(symbol: string, snippets: string[]): string[] {
  const props = new Set<string>();
  const namedArgPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  for (const snippet of snippets) {
    if (!snippet.includes(symbol) && symbol !== '.tr') continue;
    let match: RegExpExecArray | null;
    while ((match = namedArgPattern.exec(snippet))) {
      const prop = match[1];
      if (prop && !['if', 'for', 'switch', 'case', 'package'].includes(prop)) props.add(prop);
    }
  }
  return [...props].slice(0, 16);
}

function componentConfidence(definition: DartFile | undefined, usageFiles: DartFile[]): MappingConfidence {
  if (definition) return 'high';
  if (usageFiles.length > 0) return 'medium';
  return 'low';
}

function componentReason(known: KnownFlutterSymbol, confidence: MappingConfidence): string {
  if (confidence === 'high') return `${known.reason} Definition or direct usage was found in the target repo.`;
  if (confidence === 'medium') return `${known.reason} Usage was found in the target repo.`;
  return `${known.reason} Known fallback; no direct usage was detected.`;
}

function toDartImportPath(relativePath: string, packageName: string | undefined): string | undefined {
  if (!packageName || !relativePath.startsWith('lib/')) return undefined;
  return `package:${packageName}/${relativePath.slice('lib/'.length)}`;
}

async function readPubspecPackageName(flutterRoot: string): Promise<string | undefined> {
  try {
    const text = await readFile(path.join(flutterRoot, 'pubspec.yaml'), 'utf8');
    return text.match(/^name:\s*([a-zA-Z0-9_]+)/m)?.[1];
  } catch {
    return undefined;
  }
}

function symbolsForPattern(pattern: string | undefined): string[] {
  if (!pattern) return [];
  if (/record|list|history/.test(pattern)) return ['SmartRefresher', 'ListView', 'CommonEmpty', 'CommonLoading'];
  if (/quote|detail|trade/.test(pattern)) return ['CommonAppBar', 'BaseGetView', 'themeService.colors', 'themeService.textStyles'];
  if (/form|ticket|auth/.test(pattern)) return ['CommonButton', 'BaseGetView', 'Pop.sheet'];
  return ['CommonAppBar', 'BaseGetView'];
}

function rolesForSymbols(symbols: string[]): FlutterComponentRole[] {
  const roles = new Set<FlutterComponentRole>();
  for (const symbol of symbols) {
    const known = KNOWN_SYMBOLS.find((item) => item.symbol === symbol);
    if (known) roles.add(known.role);
    for (const [role, roleSymbols] of Object.entries(ROLE_SYMBOLS)) {
      if (roleSymbols?.some((roleSymbol) => symbol.includes(roleSymbol) || roleSymbol.includes(symbol))) {
        roles.add(role as FlutterComponentRole);
      }
    }
  }
  return [...roles];
}

function scoreFlutterStructure(text: string): number {
  let score = 0;
  if (/\bextends\s+(BaseGetView|BaseGetPullView|GetView)\b/.test(text)) score += 3;
  if (/\bWidget\s+build\s*\(/.test(text)) score += 2;
  if (/\bController\b/.test(text)) score += 1;
  if (/themeService\.(colors|textStyles)/.test(text)) score += 1;
  if (/\.tr\b/.test(text)) score += 1;
  return score;
}

function buildExampleReason(input: {
  matchedSymbols: string[];
  matchedRoles: FlutterComponentRole[];
  keywordMatches: string[];
  structuralScore: number;
  module?: string | undefined;
}): string {
  const reasons: string[] = [];
  if (input.module) reasons.push(`module=${input.module}`);
  if (input.matchedRoles.length) reasons.push(`roles=${input.matchedRoles.join(', ')}`);
  if (input.matchedSymbols.length) reasons.push(`symbols=${input.matchedSymbols.slice(0, 6).join(', ')}`);
  if (input.keywordMatches.length) reasons.push(`keywords=${input.keywordMatches.slice(0, 6).join(', ')}`);
  if (input.structuralScore > 0) reasons.push('has Flutter page structure/theme/i18n signals');
  return reasons.length ? reasons.join('; ') : 'No strong match; returned as a fallback reference.';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

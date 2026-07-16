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
} from '../../types/index.js';
import { pathExists, toPosixPath } from '../../shared/paths.js';
import { analyzeFlutterContext } from './context.js';
import { detectFlutterTargetConventions } from './architecture-profile.js';

type DartFile = { path: string; text: string };
type ComponentCandidate = { symbol: string; role: FlutterComponentRole; reason: string };

const FLUTTER_TECHNICAL_COMPONENTS: ComponentCandidate[] = [
  { symbol: 'AppBar', role: 'app-bar', reason: 'Flutter Material app-bar API.' },
  { symbol: 'Scaffold', role: 'page-base', reason: 'Flutter Material page shell.' },
  { symbol: 'TextButton', role: 'button', reason: 'Flutter Material button API.' },
  { symbol: 'ElevatedButton', role: 'button', reason: 'Flutter Material button API.' },
  { symbol: 'GestureDetector', role: 'button', reason: 'Flutter interaction wrapper.' },
  { symbol: 'Image.asset', role: 'image', reason: 'Flutter local image API.' },
  { symbol: 'showModalBottomSheet', role: 'sheet', reason: 'Flutter Material sheet API.' },
  { symbol: 'RefreshIndicator', role: 'refresh', reason: 'Flutter Material refresh API.' },
  { symbol: 'Theme.of(context)', role: 'theme', reason: 'Flutter inherited theme API.' },
  { symbol: 'Navigator.pushNamed', role: 'route', reason: 'Flutter named navigation API.' },
  { symbol: 'Navigator.pop', role: 'route', reason: 'Flutter back navigation API.' },
];

const TECHNICAL_USAGE_SYMBOLS = {
  theme: ['Theme.of(context)', 'ColorScheme.of(context)', 'DefaultTextStyle.of(context)'],
  route: ['Navigator.pushNamed', 'Navigator.pop', 'context.go', 'context.push', 'Get.toNamed', 'Get.back'],
  i18n: ['AppLocalizations.of', 'S.of', 'Intl.message', 'context.t', '.tr'],
};

export async function getFlutterTargetConventions(
  input: AnalyzeFlutterTargetConventionsInput,
): Promise<FlutterTargetConventions> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const warnings: string[] = [];
  if (!(await pathExists(flutterRoot))) warnings.push(`Flutter root not found: ${flutterRoot}`);

  const context = await analyzeFlutterContext({ flutterRoot, targetModule: input.module });
  const targetConventions = context.targetConventions ?? await detectFlutterTargetConventions({
    flutterRoot,
    module: input.module,
  });
  const components = await collectFlutterComponents({
    flutterRoot,
    module: input.module,
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
    targetConventions,
    themeUsages: await collectUsageLines(flutterRoot, TECHNICAL_USAGE_SYMBOLS.theme, input.module),
    routeUsages: await collectUsageLines(flutterRoot, TECHNICAL_USAGE_SYMBOLS.route, input.module),
    routeRegistry: context.routeRegistry,
    i18nUsages: await collectUsageLines(flutterRoot, TECHNICAL_USAGE_SYMBOLS.i18n, input.module),
    warnings: [...warnings, ...context.warnings],
  };
}

export async function findFlutterTargetExamples(input: FindFlutterTargetExamplesInput): Promise<FlutterExampleRef[]> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const limit = clamp(input.limit ?? 8, 1, 20);
  const files = await readDartFiles(flutterRoot, ['lib/**/*.dart']);
  const scopedFiles = input.module
    ? files.filter((file) => pathSegments(file.path).includes(input.module ?? ''))
    : files;
  const candidates = scopedFiles.length > 0 ? scopedFiles : files;
  const roles = input.roles ?? [];
  const requestedSymbols = dedupe([
    ...(input.symbols ?? []),
    ...FLUTTER_TECHNICAL_COMPONENTS
      .filter((candidate) => roles.length === 0 || roles.includes(candidate.role))
      .map((candidate) => candidate.symbol),
  ]);
  const keywords = dedupe([
    ...(input.screenId ?? '').split(/[._/-]+/),
    ...(input.pattern ?? '').split(/[._/-]+/),
    input.module ?? '',
    ...roles,
  ].map((item) => item.toLowerCase()).filter((item) => item.length >= 3));

  return candidates
    .map((file) => {
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
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}

async function collectFlutterComponents(input: {
  flutterRoot: string;
  module?: string | undefined;
  symbols?: string[] | undefined;
  roles?: FlutterComponentRole[] | undefined;
}): Promise<FlutterComponentRef[]> {
  const packageName = await readPubspecPackageName(input.flutterRoot);
  const files = await readDartFiles(input.flutterRoot, ['lib/**/*.dart']);
  const scopedFiles = input.module
    ? files.filter((file) => looksShared(file.path) || pathSegments(file.path).includes(input.module ?? ''))
    : files;
  const requested = selectTechnicalCandidates(input.symbols, input.roles);
  const discovered = discoverComponentCandidates(scopedFiles, input.roles, files);
  const candidates = dedupeBy([...requested, ...discovered], (candidate) => `${candidate.symbol}:${candidate.role}`);

  return candidates.flatMap((candidate) => {
    const definition = findDefinition(files, candidate.symbol);
    const usageFiles = scopedFiles.filter((file) => includesSymbol(file.text, candidate.symbol));
    if (!definition && usageFiles.length === 0) return [];
    const snippets = usageFiles
      .flatMap((file) => extractSnippets(file.text, [candidate.symbol], 1, file.path))
      .slice(0, 4);
    const confidence = componentConfidence(definition, usageFiles, candidate);
    return [{
      symbol: candidate.symbol,
      role: candidate.role,
      ...(definition ? { path: definition.path } : {}),
      ...(definition ? { importPath: toDartImportPath(definition.path, packageName) } : {}),
      usageSnippets: snippets,
      propsHints: inferPropsHints(candidate.symbol, snippets),
      confidence,
      reason: `${candidate.reason} ${definition ? 'Definition' : 'Usage'} was found in the target repo.`,
    }];
  });
}

function selectTechnicalCandidates(
  symbols: string[] | undefined,
  roles: FlutterComponentRole[] | undefined,
): ComponentCandidate[] {
  if (symbols?.length) {
    return symbols.map((symbol) => FLUTTER_TECHNICAL_COMPONENTS.find((item) => item.symbol === symbol) ?? {
      symbol,
      role: 'unknown',
      reason: 'Caller-requested Flutter symbol.',
    });
  }
  return FLUTTER_TECHNICAL_COMPONENTS.filter((item) => !roles?.length || roles.includes(item.role));
}

function discoverComponentCandidates(
  files: DartFile[],
  requestedRoles?: FlutterComponentRole[],
  usageCorpus: DartFile[] = files,
): ComponentCandidate[] {
  const candidates: ComponentCandidate[] = [];
  for (const file of files) {
    for (const match of file.text.matchAll(/\bclass\s+([A-Z]\w*)\s+extends\s+([A-Z]\w*(?:<[^>{}]+>)?)/g)) {
      const symbol = match[1];
      if (!symbol) continue;
      const role = inferComponentRole(symbol, file.path, file.text);
      if (role === 'unknown' || (requestedRoles?.length && !requestedRoles.includes(role))) continue;
      if (role === 'page-base' && !looksShared(file.path) && !/^(?:Base|Abstract)|(?:Shell|Layout)$/.test(symbol)) continue;
      const usageCount = usageCorpus.filter((candidate) => candidate.path !== file.path && includesSymbol(candidate.text, symbol)).length;
      if (usageCount === 0 && !looksShared(file.path)) continue;
      candidates.push({
        symbol,
        role,
        reason: `Target-defined ${role} candidate inferred from its definition, path, and ${usageCount} external usage file(s).`,
      });
    }
  }
  return candidates;
}

function inferComponentRole(symbol: string, filePath: string, text: string): FlutterComponentRole {
  const haystack = `${symbol} ${filePath}`.toLowerCase();
  if (/(?:page|screen|view)$/.test(symbol.toLowerCase()) && /StatelessWidget|StatefulWidget|ConsumerWidget|GetView/.test(text)) return 'page-base';
  if (/app.?bar|navbar|toolbar|header/.test(haystack) || /implements\s+PreferredSizeWidget/.test(text)) return 'app-bar';
  if (/button|cta/.test(haystack)) return 'button';
  if (/empty|placeholder/.test(haystack)) return 'empty';
  if (/loading|loader|progress/.test(haystack)) return 'loading';
  if (/image|picture|avatar|svg/.test(haystack)) return 'image';
  if (/sheet|dialog|popup|modal/.test(haystack)) return 'sheet';
  if (/toast|snackbar/.test(haystack)) return 'toast';
  if (/refresh|pagination|paging/.test(haystack)) return 'refresh';
  return 'unknown';
}

function looksShared(filePath: string): boolean {
  if (/(?:^|\/)modules?(?:\/|$)/.test(filePath)) return false;
  return /(?:^|\/)(?:common|shared|widgets?|components?|design_system|ui)(?:\/|$)/.test(filePath);
}

async function readDartFiles(flutterRoot: string, patterns: string[]): Promise<DartFile[]> {
  const paths = await fg(patterns, {
    cwd: flutterRoot,
    onlyFiles: true,
    absolute: false,
    suppressErrors: true,
    ignore: ['**/*.g.dart', '**/*.freezed.dart', '**/.dart_tool/**', '**/build/**', '**/_proto/**'],
  });
  const files: DartFile[] = [];
  for (const filePath of paths.sort()) {
    try {
      files.push({ path: toPosixPath(filePath), text: await readFile(path.join(flutterRoot, filePath), 'utf8') });
    } catch {
      // Target discovery is advisory; unreadable files are reported through missing evidence.
    }
  }
  return files;
}

async function collectUsageLines(flutterRoot: string, symbols: string[], module: string | undefined): Promise<string[]> {
  const files = await readDartFiles(flutterRoot, ['lib/**/*.dart']);
  const scoped = module ? files.filter((file) => pathSegments(file.path).includes(module)) : files;
  return scoped.flatMap((file) => extractSnippets(file.text, symbols, 1, file.path)).slice(0, 12);
}

function findDefinition(files: DartFile[], symbol: string): DartFile | undefined {
  if (symbol.includes('.')) return undefined;
  const pattern = new RegExp(`\\b(class|mixin|enum|extension)\\s+${escapeRegExp(symbol)}\\b`);
  return files.find((file) => pattern.test(file.text));
}

function includesSymbol(text: string, symbol: string): boolean {
  if (!symbol) return false;
  if (symbol === '.tr') return /\.tr\b/.test(text);
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) return new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(text);
  return text.includes(symbol);
}

function extractSnippets(text: string, needles: string[], maxSnippets: number, label?: string): string[] {
  if (needles.length === 0) return [];
  const lines = text.split(/\r?\n/);
  const snippets: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!needles.some((needle) => needle && includesSymbol(line, needle))) continue;
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    const body = lines.slice(start, end).map((value, offset) => `${start + offset + 1}: ${value.trimEnd()}`).join('\n');
    snippets.push(`${label ? `${label}\n` : ''}${body}`);
    if (snippets.length >= maxSnippets) break;
  }
  return snippets;
}

function inferPropsHints(symbol: string, snippets: string[]): string[] {
  const props = new Set<string>();
  for (const snippet of snippets) {
    if (!snippet.includes(symbol)) continue;
    for (const match of snippet.matchAll(/\b([a-zA-Z_]\w*)\s*:/g)) {
      const prop = match[1];
      if (prop && !['if', 'for', 'switch', 'case', 'package'].includes(prop)) props.add(prop);
    }
  }
  return [...props].slice(0, 16);
}

function componentConfidence(definition: DartFile | undefined, usageFiles: DartFile[], candidate: ComponentCandidate): MappingConfidence {
  if (definition && usageFiles.length >= 2 && candidate.role !== 'unknown') return 'high';
  if (definition || usageFiles.length > 0) return 'medium';
  return 'low';
}

function rolesForSymbols(symbols: string[]): FlutterComponentRole[] {
  return dedupe(symbols.map((symbol) => FLUTTER_TECHNICAL_COMPONENTS.find((item) => item.symbol === symbol)?.role ?? 'unknown'));
}

function scoreFlutterStructure(text: string): number {
  let score = 0;
  if (/\bextends\s+(StatelessWidget|StatefulWidget)\b|\bConsumerWidget\b|\bGetView\b/.test(text)) score += 3;
  if (/\bWidget\s+build\s*\(/.test(text)) score += 2;
  if (/\b(Controller|Cubit|Bloc|Provider|Notifier)\b/.test(text)) score += 1;
  if (/Theme\.of\s*\(|ColorScheme\.of\s*\(|textTheme\b/.test(text)) score += 1;
  if (/AppLocalizations\.of\s*\(|S\.of\s*\(|Intl\.message\s*\(|\.tr\b/.test(text)) score += 1;
  return score;
}

function toDartImportPath(relativePath: string, packageName: string | undefined): string | undefined {
  return packageName && relativePath.startsWith('lib/') ? `package:${packageName}/${relativePath.slice(4)}` : undefined;
}

async function readPubspecPackageName(flutterRoot: string): Promise<string | undefined> {
  try {
    return (await readFile(path.join(flutterRoot, 'pubspec.yaml'), 'utf8')).match(/^name:\s*([a-zA-Z0-9_]+)/m)?.[1];
  } catch {
    return undefined;
  }
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
  return reasons.join('; ');
}

function pathSegments(filePath: string): string[] {
  return filePath.split('/').filter(Boolean);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

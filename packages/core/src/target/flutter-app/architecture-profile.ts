import path from 'node:path';
import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import type {
  FlutterArchitectureConfidence,
  FlutterArchitectureEvidence,
  FlutterArchitectureFacet,
  FlutterArchitectureProfile,
  FlutterI18nArchitectureFacet,
  FlutterRoutingArchitectureFacet,
  FlutterStateArchitectureFacet,
  FlutterTargetConventionProfile,
} from '../../types/index.js';
import { pathExists, toPosixPath } from '../../shared/paths.js';

type DartFile = {
  path: string;
  text: string;
  generated: boolean;
};

type PatternSignal = {
  pattern: string;
  evidence: FlutterArchitectureEvidence[];
};

type ComponentSignal = {
  symbol: string;
  evidence: FlutterArchitectureEvidence[];
};

const STATE_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'flutter_bloc', needles: [/\bBlocProvider\b/, /\bBlocBuilder\b/, /\bBlocListener\b/, /\bCubit\s*</, /\bextends\s+Cubit\b/, /package:flutter_bloc\/flutter_bloc\.dart/] },
  { pattern: 'getx', needles: [/\bGetView\b/, /\bGetxController\b/, /\bObx\s*\(/, /\bGetBuilder\s*</, /package:get\/get\.dart/] },
  { pattern: 'riverpod', needles: [/\bConsumerWidget\b/, /\bWidgetRef\b/, /\bProviderScope\b/, /package:flutter_riverpod\/flutter_riverpod\.dart/, /package:riverpod\/riverpod\.dart/] },
  { pattern: 'provider', needles: [/\bChangeNotifierProvider\b/, /\bConsumer\s*</, /\bcontext\.(watch|read)\s*</, /package:provider\/provider\.dart/] },
  { pattern: 'stateful_widget', needles: [/\bStatefulWidget\b/, /\bsetState\s*\(/] },
];

const STATE_PACKAGE_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'flutter_bloc', needles: [/^\s{0,2}flutter_bloc\s*:/m] },
  { pattern: 'getx', needles: [/^\s{0,2}get\s*:/m] },
  { pattern: 'riverpod', needles: [/^\s{0,2}(flutter_riverpod|riverpod)\s*:/m] },
  { pattern: 'provider', needles: [/^\s{0,2}provider\s*:/m] },
];

const PAGE_STATE_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'flutter_bloc', needles: [/\bclass\s+\w+(Cubit|Bloc)\s+extends\s+(Cubit|Bloc)\b/, /\bBlocProvider\s*<\s*\w+(Cubit|Bloc)\s*>/, /\bBlocBuilder\s*<\s*\w+(Cubit|Bloc)\s*,/] },
  { pattern: 'getx', needles: [/\bclass\s+\w+Controller\s+extends\s+GetxController\b/, /\bextends\s+GetView\s*<\s*\w+Controller\s*>/, /\bObx\s*\(/] },
  { pattern: 'riverpod', needles: [/\bConsumerWidget\b/, /\bWidgetRef\b/, /\b(ref\.watch|ref\.read)\s*\(/] },
  { pattern: 'provider', needles: [/\bclass\s+\w+\s+extends\s+ChangeNotifier\b/, /\bChangeNotifierProvider\s*<\s*\w+>/] },
  { pattern: 'stateful_widget', needles: [/\bStatefulWidget\b/, /\bsetState\s*\(/] },
];

const GLOBAL_STATE_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'flutter_bloc', needles: [/\bBlocProvider\b/, /\bBlocBuilder\b/, /\bCubit\s*</, /package:flutter_bloc\/flutter_bloc\.dart/] },
  { pattern: 'getx', needles: [/\bGetMaterialApp\b/, /\bGet\.put\b/, /package:get\/get\.dart/] },
  { pattern: 'riverpod', needles: [/\bProviderScope\b/, /package:flutter_riverpod\/flutter_riverpod\.dart/] },
  { pattern: 'provider', needles: [/\bMultiProvider\b/, /\bProvider\s*<\s*/, /package:provider\/provider\.dart/] },
];

const ROUTING_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'go_router', needles: [/\bGoRouter\b/, /\bcontext\.(go|push|replace)\s*\(/, /package:go_router\/go_router\.dart/] },
  { pattern: 'getx', needles: [/\bGet\.(toNamed|offNamed|back|arguments|parameters)\b/, /package:get\/get\.dart/] },
  { pattern: 'material_on_generate_route', needles: [/\bonGenerateRoute\s*:/, /\bRouteSettings\b/, /\bMaterialPageRoute\b/] },
  { pattern: 'navigator', needles: [/\bNavigator\.(of\(.*\)\.)?(push|pop|pushNamed|popUntil)\b/] },
];

const ROUTING_REGISTRATION_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'material_on_generate_route', needles: [/\bonGenerateRoute\s*:/, /\bRouteSettings\b/, /\bMaterialPageRoute\b/] },
  { pattern: 'go_router', needles: [/\bGoRouter\b/, /package:go_router\/go_router\.dart/] },
  { pattern: 'getx', needles: [/\bGetMaterialApp\b/, /\bGetPage\s*\(/, /package:get\/get\.dart/] },
  { pattern: 'navigator_routes', needles: [/\broutes\s*:\s*<\s*String\s*,\s*WidgetBuilder\s*>/] },
];

const ROUTING_NAVIGATION_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'navigator', needles: [/\bNavigator\.(of\(.*\)\.)?(push|pop|pushNamed|popUntil)\b/] },
  { pattern: 'go_router', needles: [/\bcontext\.(go|push|replace)\s*\(/] },
  { pattern: 'getx', needles: [/\bGet\.(toNamed|offNamed|back|arguments|parameters)\b/] },
];

const I18N_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'build_context_t_extension', needles: [/\bcontext\.t\s*\(/, /\bString\s+t\s*\(\s*String\s+key\s*\)/] },
  { pattern: 'getx_tr', needles: [/(^|[^A-Za-z0-9_])['"][^'"]+['"]\.tr\b/, /package:get\/get\.dart/] },
  { pattern: 'app_localizations', needles: [/\bAppLocalizations\.of\s*\(/, /flutter_gen\/gen_l10n/, /\bS\.of\s*\(/] },
  { pattern: 'intl', needles: [/\bIntl\.message\s*\(/, /package:intl\/intl\.dart/] },
];

const I18N_LOOKUP_PATTERNS = I18N_PATTERNS;

const THEME_PATTERNS: Array<{ pattern: string; needles: RegExp[] }> = [
  { pattern: 'context.pbColors', needles: [/\bcontext\.pbColors\b/, /\bAppPalette\b/] },
  { pattern: 'context.pbTextStyles', needles: [/\bcontext\.pbTextStyles\b/] },
  { pattern: 'themeService.colors', needles: [/\bthemeService\.colors\b/] },
  { pattern: 'themeService.textStyles', needles: [/\bthemeService\.textStyles\b/] },
  { pattern: 'Theme.of(context)', needles: [/\bTheme\.of\s*\(\s*context\s*\)/] },
  { pattern: 'AppSpacing', needles: [/\bAppSpacing\./] },
  { pattern: 'AppRadii', needles: [/\bAppRadii\./] },
];

const COMPONENT_PATTERNS: Array<{ symbol: string; needles: RegExp[] }> = [
  { symbol: 'CommonAppBar', needles: [/\bCommonAppBar\b/] },
  { symbol: 'CommonButton', needles: [/\bCommonButton\b/] },
  { symbol: 'CommonImage', needles: [/\bCommonImage\b/] },
  { symbol: 'CommonSvg', needles: [/\bCommonSvg\b/] },
  { symbol: 'CommonNetImage', needles: [/\bCommonNetImage\b/] },
  { symbol: 'CommonEmpty', needles: [/\bCommonEmpty\b/] },
  { symbol: 'CommonLoading', needles: [/\bCommonLoading\b/] },
  { symbol: 'Pop.sheet', needles: [/\bPop\.sheet\b/] },
  { symbol: 'YouFiPop', needles: [/\bYouFiPop\b/] },
  { symbol: 'BaseGetView', needles: [/\bBaseGetView\b/] },
  { symbol: 'BaseGetPullView', needles: [/\bBaseGetPullView\b/] },
  { symbol: 'SmartRefresher', needles: [/\bSmartRefresher\b/] },
  { symbol: 'SectionPanel', needles: [/\bSectionPanel\b/] },
];

export async function detectFlutterTargetConventions(input: {
  flutterRoot: string;
  module?: string | undefined;
}): Promise<FlutterTargetConventionProfile> {
  const flutterRoot = path.resolve(input.flutterRoot);
  if (!(await pathExists(flutterRoot))) {
    return unknownProfile([`Flutter root not found: ${flutterRoot}`]);
  }

  const [pubspec, files, commonFiles, moduleFiles, routeFiles, appFiles] = await Promise.all([
    readPubspec(flutterRoot),
    readDartFiles(flutterRoot, ['lib/**/*.dart']),
    readDartFiles(flutterRoot, ['lib/app/common/**/*.dart', 'lib/app/widgets/**/*.dart']),
    input.module ? readDartFiles(flutterRoot, [`lib/app/modules/${input.module}/**/*.dart`]) : Promise.resolve([]),
    readDartFiles(flutterRoot, ['lib/app/routes/**/*.dart']),
    readDartFiles(flutterRoot, ['lib/main*.dart', 'lib/app/app*.dart', 'lib/app/preferences/**/*.dart']),
  ]);
  const allFiles = files;
  const nonGeneratedFiles = files.filter((file) => !file.generated);
  const nonGeneratedCommonFiles = commonFiles.filter((file) => !file.generated);
  const nonGeneratedModuleFiles = moduleFiles.filter((file) => !file.generated);
  const scopedFiles = nonGeneratedModuleFiles.length > 0 ? [...nonGeneratedModuleFiles, ...nonGeneratedCommonFiles] : nonGeneratedFiles;
  const packageSignals = pubspecToSignals(pubspec);
  const unresolved: string[] = [];

  const state = buildStateFacet({
    packageSignals: collectPubspecPatternSignals(pubspec, STATE_PACKAGE_PATTERNS),
    globalSignals: collectPatternSignals(appFiles.filter((file) => !file.generated), GLOBAL_STATE_PATTERNS),
    pageSignals: collectPatternSignals(nonGeneratedModuleFiles, PAGE_STATE_PATTERNS),
    fallbackSignals: [
      ...packageSignals.state,
      ...collectPatternSignals(scopedFiles, STATE_PATTERNS),
    ],
  });
  const routing = buildRoutingFacet({
    registrationSignals: collectPatternSignals(routeFiles.filter((file) => !file.generated), ROUTING_REGISTRATION_PATTERNS),
    navigationSignals: collectPatternSignals(nonGeneratedFiles, ROUTING_NAVIGATION_PATTERNS),
    fallbackSignals: [
      ...packageSignals.routing,
      ...collectPatternSignals(nonGeneratedFiles, ROUTING_PATTERNS),
    ],
  });
  const i18n = buildI18nFacet([
    ...packageSignals.i18n,
    ...collectPatternSignals(scopedFiles, I18N_LOOKUP_PATTERNS),
  ]);
  const themeSignals = collectPatternSignals(scopedFiles, THEME_PATTERNS);
  const components = collectComponentSignals(scopedFiles, COMPONENT_PATTERNS);
  const fileOrganization = detectFileOrganization(nonGeneratedFiles, input.module);

  if (state.pattern === 'unknown') unresolved.push('state pattern was not detected from pubspec.yaml or Dart usage.');
  if (state.page?.pattern === 'unknown') unresolved.push('page-level state pattern was not detected from target module files.');
  if (routing.pattern === 'unknown') unresolved.push('routing pattern was not detected from route files or Dart usage.');
  if (routing.navigation?.pattern === 'unknown') unresolved.push('navigation call pattern was not detected from non-generated Dart usage.');
  if (i18n.pattern === 'unknown') unresolved.push('i18n pattern was not detected from translations or Dart usage.');
  if (themeSignals.length === 0) unresolved.push('theme token/access pattern was not detected from Dart usage.');
  if (components.length === 0) unresolved.push('reusable component symbols were not detected from common widgets or module usage.');
  if (fileOrganization.pattern === 'unknown') unresolved.push('file organization pattern was not detected from lib/app/modules.');

  return {
    architectureProfile: {
      state,
      routing,
      i18n,
      theme: {
        patterns: themeSignals.map((signal) => signal.pattern),
        confidence: confidenceForEvidence(themeSignals.flatMap((signal) => signal.evidence)),
        evidence: themeSignals.map((signal) => `${signal.pattern} detected from target usage.`),
        examples: themeSignals.flatMap((signal) => signal.evidence).slice(0, 12),
      },
      components: {
        detectedSymbols: components.map((signal) => signal.symbol),
        confidence: confidenceForEvidence(components.flatMap((signal) => signal.evidence)),
        evidence: components.map((signal) => `${signal.symbol} detected from target usage or definition.`),
        examples: components.flatMap((signal) => signal.evidence).slice(0, 12),
      },
      fileOrganization,
    },
    unresolved,
  };
}

function unknownProfile(unresolved: string[]): FlutterTargetConventionProfile {
  const state = unknownStateFacet();
  const routing = unknownRoutingFacet();
  const i18n = unknownI18nFacet();
  return {
    architectureProfile: {
      state,
      routing,
      i18n,
      theme: { patterns: [], confidence: 'low', evidence: [], examples: [] },
      components: { detectedSymbols: [], confidence: 'low', evidence: [], examples: [] },
      fileOrganization: unknownFacet(),
    },
    unresolved,
  };
}

function unknownStateFacet(): FlutterStateArchitectureFacet {
  return {
    ...unknownFacet(),
    package: unknownFacet(),
    global: unknownFacet(),
    page: unknownFacet(),
  };
}

function unknownRoutingFacet(): FlutterRoutingArchitectureFacet {
  return {
    ...unknownFacet(),
    registration: unknownFacet(),
    navigation: unknownFacet(),
  };
}

function unknownI18nFacet(): FlutterI18nArchitectureFacet {
  return {
    ...unknownFacet(),
    lookup: unknownFacet(),
  };
}

function unknownFacet(): FlutterArchitectureFacet {
  return {
    pattern: 'unknown',
    confidence: 'low',
    evidence: [],
    examples: [],
  };
}

function bestFacet(signals: PatternSignal[], label: string): FlutterArchitectureFacet {
  const scored = signals
    .map((signal) => ({ ...signal, score: signal.evidence.length }))
    .filter((signal) => signal.score > 0)
    .sort((left, right) => right.score - left.score || left.pattern.localeCompare(right.pattern));
  const best = scored[0];
  if (!best) return unknownFacet();
  return {
    pattern: best.pattern,
    confidence: confidenceForEvidence(best.evidence),
    evidence: [`${label} pattern ${best.pattern} detected from target evidence.`],
    examples: best.evidence.slice(0, 8),
  };
}

function buildStateFacet(input: {
  packageSignals: PatternSignal[];
  globalSignals: PatternSignal[];
  pageSignals: PatternSignal[];
  fallbackSignals: PatternSignal[];
}): FlutterStateArchitectureFacet {
  const packageFacet = bestFacet(input.packageSignals, 'state package');
  const globalFacet = bestFacet(input.globalSignals, 'global state');
  const pageFacet = bestFacet(input.pageSignals, 'page state');
  const overall = pageFacet.pattern !== 'unknown'
    ? pageFacet
    : globalFacet.pattern !== 'unknown'
      ? globalFacet
      : packageFacet.pattern !== 'unknown'
        ? packageFacet
        : bestFacet(input.fallbackSignals, 'state');
  return {
    ...overall,
    evidence: [
      ...overall.evidence,
      ...(pageFacet.pattern === 'unknown' && globalFacet.pattern !== 'unknown'
        ? ['Only global/app-level state evidence was detected; page-level state expression remains unresolved.']
        : []),
    ],
    package: packageFacet,
    global: globalFacet,
    page: pageFacet,
  };
}

function buildRoutingFacet(input: {
  registrationSignals: PatternSignal[];
  navigationSignals: PatternSignal[];
  fallbackSignals: PatternSignal[];
}): FlutterRoutingArchitectureFacet {
  const registration = bestFacet(input.registrationSignals, 'route registration');
  const navigation = bestFacet(input.navigationSignals, 'navigation');
  const fallback = bestFacet(input.fallbackSignals, 'routing');
  const overall = registration.pattern !== 'unknown' ? registration : navigation.pattern !== 'unknown' ? navigation : fallback;
  return {
    ...overall,
    registration,
    navigation,
  };
}

function buildI18nFacet(signals: PatternSignal[]): FlutterI18nArchitectureFacet {
  const lookup = bestFacet(signals, 'i18n lookup');
  return {
    ...lookup,
    lookup,
  };
}

function collectPatternSignals(
  files: DartFile[],
  definitions: Array<{ pattern: string; needles: RegExp[] }>,
): PatternSignal[] {
  return definitions
    .map((definition) => ({
      pattern: definition.pattern,
      evidence: collectNeedleEvidence(files, definition.pattern, definition.needles),
    }))
    .filter((signal) => signal.evidence.length > 0);
}

function collectComponentSignals(
  files: DartFile[],
  definitions: Array<{ symbol: string; needles: RegExp[] }>,
): ComponentSignal[] {
  return definitions
    .map((definition) => ({
      symbol: definition.symbol,
      evidence: collectNeedleEvidence(files, definition.symbol, definition.needles),
    }))
    .filter((signal) => signal.evidence.length > 0);
}

function collectNeedleEvidence(
  files: DartFile[],
  symbol: string,
  needles: RegExp[],
): FlutterArchitectureEvidence[] {
  const evidence: FlutterArchitectureEvidence[] = [];
  for (const file of files) {
    const lines = file.text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (!needles.some((needle) => needle.test(line))) continue;
      evidence.push({
        file: file.path,
        line: index + 1,
        symbol,
        snippet: line.trim(),
      });
      if (evidence.length >= 12) return evidence;
    }
  }
  return evidence;
}

function confidenceForEvidence(evidence: FlutterArchitectureEvidence[]): FlutterArchitectureConfidence {
  const files = new Set(evidence.map((item) => item.file));
  if (evidence.length >= 4 && files.size >= 2) return 'high';
  if (evidence.length >= 2) return 'medium';
  return evidence.length > 0 ? 'medium' : 'low';
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
      const normalizedPath = toPosixPath(filePath);
      files.push({ path: normalizedPath, text, generated: isGeneratedPath(normalizedPath) });
    } catch {
      // Ignore unreadable target files; profile evidence is advisory.
    }
  }
  return files;
}

function isGeneratedPath(filePath: string): boolean {
  return /(^|\/)(_proto|generated|gen)(\/|_)|_proto\.dart$|main_proto\.dart$|app_proto\.dart$|app_pages_proto\.dart$/.test(filePath);
}

async function readPubspec(flutterRoot: string): Promise<string> {
  try {
    return await readFile(path.join(flutterRoot, 'pubspec.yaml'), 'utf8');
  } catch {
    return '';
  }
}

function pubspecToSignals(pubspec: string): {
  state: PatternSignal[];
  routing: PatternSignal[];
  i18n: PatternSignal[];
} {
  const file = 'pubspec.yaml';
  const dep = (name: string): FlutterArchitectureEvidence[] => {
    const match = pubspec.match(new RegExp(`^\\s{0,2}${escapeRegExp(name)}\\s*:`, 'm'));
    return match
      ? [{
        file,
        symbol: name,
        snippet: match[0].trim(),
      }]
      : [];
  };
  return {
    state: [
      { pattern: 'flutter_bloc', evidence: dep('flutter_bloc') },
      { pattern: 'getx', evidence: dep('get') },
      { pattern: 'riverpod', evidence: [...dep('flutter_riverpod'), ...dep('riverpod')] },
      { pattern: 'provider', evidence: dep('provider') },
    ].filter((item) => item.evidence.length > 0),
    routing: [
      { pattern: 'go_router', evidence: dep('go_router') },
      { pattern: 'getx', evidence: dep('get') },
    ].filter((item) => item.evidence.length > 0),
    i18n: [
      { pattern: 'intl', evidence: dep('intl') },
    ].filter((item) => item.evidence.length > 0),
  };
}

function collectPubspecPatternSignals(
  pubspec: string,
  definitions: Array<{ pattern: string; needles: RegExp[] }>,
): PatternSignal[] {
  return definitions
    .map((definition) => ({
      pattern: definition.pattern,
      evidence: collectPubspecEvidence(pubspec, definition.pattern, definition.needles),
    }))
    .filter((signal) => signal.evidence.length > 0);
}

function collectPubspecEvidence(
  pubspec: string,
  symbol: string,
  needles: RegExp[],
): FlutterArchitectureEvidence[] {
  return needles
    .filter((needle) => needle.test(pubspec))
    .slice(0, 4)
    .map((needle) => {
      const match = pubspec.match(needle);
      return {
        file: 'pubspec.yaml',
        symbol,
        snippet: match?.[0]?.trim() ?? symbol,
      };
    });
}

function detectFileOrganization(files: DartFile[], module: string | undefined): FlutterArchitectureFacet {
  const paths = files.map((file) => file.path);
  const modulePaths = module
    ? paths.filter((filePath) => filePath.includes(`/modules/${module}/`))
    : paths.filter((filePath) => filePath.includes('/modules/'));
  const examples = modulePaths.slice(0, 8).map((filePath) => ({
    file: filePath,
    symbol: 'fileOrganization',
    snippet: filePath,
  }));
  if (modulePaths.some((filePath) => /lib\/app\/modules\/[^/]+\/[^/]+\/widgets\/.+\.dart$/.test(filePath))) {
    return {
      pattern: 'module_feature_with_widgets',
      confidence: confidenceForEvidence(examples),
      evidence: ['Dart files are organized under lib/app/modules/<module>/<feature>/widgets.'],
      examples,
    };
  }
  if (modulePaths.some((filePath) => /lib\/app\/modules\/[^/]+\/_proto\/.+\.dart$/.test(filePath))) {
    return {
      pattern: 'module_proto_bucket',
      confidence: confidenceForEvidence(examples),
      evidence: ['Dart files are organized under lib/app/modules/<module>/_proto.'],
      examples,
    };
  }
  if (modulePaths.some((filePath) => /lib\/app\/modules\/[^/]+\/.+\.dart$/.test(filePath))) {
    return {
      pattern: 'module_flat_or_mixed',
      confidence: confidenceForEvidence(examples),
      evidence: ['Dart files are organized under lib/app/modules/<module>.'],
      examples,
    };
  }
  return unknownFacet();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

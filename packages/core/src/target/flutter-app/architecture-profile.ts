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
  FlutterTargetDocumentationEvidence,
} from '../../types/index.js';
import { pathExists, toPosixPath } from '../../shared/paths.js';
import { scanFlutterTargetDocumentation, withDocumentationConflicts } from './documentation.js';

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
  { pattern: 'Theme.of(context)', needles: [/\bTheme\.of\s*\(\s*context\s*\)/] },
  { pattern: 'ColorScheme.of(context)', needles: [/\bColorScheme\.of\s*\(\s*context\s*\)/] },
  { pattern: 'DefaultTextStyle.of(context)', needles: [/\bDefaultTextStyle\.of\s*\(\s*context\s*\)/] },
];

const ABSENT_STATE_EVIDENCE =
  'Target adapter does not infer state libraries from pubspec or Dart usage. Read target architecture docs or disclose unknown.';

export async function detectFlutterTargetConventions(input: {
  flutterRoot: string;
  module?: string | undefined;
}): Promise<FlutterTargetConventionProfile> {
  const flutterRoot = path.resolve(input.flutterRoot);
  if (!(await pathExists(flutterRoot))) {
    return unknownProfile([`Flutter root not found: ${flutterRoot}`]);
  }

  const [pubspec, files, documentationScan] = await Promise.all([
    readPubspec(flutterRoot),
    readDartFiles(flutterRoot, ['lib/**/*.dart']),
    scanFlutterTargetDocumentation({ flutterRoot }),
  ]);
  const commonFiles = files.filter((file) => isSharedArchitectureFile(file.path));
  const moduleFiles = input.module ? files.filter((file) => file.path.split('/').includes(input.module ?? '')) : [];
  const routeFiles = files.filter((file) => /(?:^|\/)(?:routes?|router|navigation)(?:\/|_|\.)/i.test(file.path) || /\b(?:GoRouter|GetPage|onGenerateRoute)\b/.test(file.text));
  const nonGeneratedFiles = files.filter((file) => !file.generated);
  const nonGeneratedCommonFiles = commonFiles.filter((file) => !file.generated);
  const nonGeneratedModuleFiles = moduleFiles.filter((file) => !file.generated);
  const scopedFiles = nonGeneratedModuleFiles.length > 0 ? [...nonGeneratedModuleFiles, ...nonGeneratedCommonFiles] : nonGeneratedFiles;
  const packageSignals = pubspecToSignals(pubspec);
  const unresolved: string[] = [];

  const state = stateFacetFromDocumentation(documentationScan);
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
  const themeSignals = collectThemeSignals(scopedFiles);
  const components = collectComponentSignals(scopedFiles);
  const fileOrganization = detectFileOrganization(nonGeneratedFiles, input.module);

  if (routing.pattern === 'unknown') unresolved.push('routing pattern was not detected from route files or Dart usage.');
  if (routing.navigation?.pattern === 'unknown') unresolved.push('navigation call pattern was not detected from non-generated Dart usage.');
  if (i18n.pattern === 'unknown') unresolved.push('i18n pattern was not detected from translations or Dart usage.');
  if (themeSignals.length === 0) unresolved.push('theme token/access pattern was not detected from Dart usage.');
  if (components.length === 0) unresolved.push('reusable component symbols were not detected from common widgets or module usage.');
  if (fileOrganization.pattern === 'unknown') unresolved.push('file organization pattern was not detected from target Dart paths.');

  const architectureProfile: FlutterArchitectureProfile = {
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
  };
  const documentation = withDocumentationConflicts(documentationScan, architectureProfile);

  return {
    architectureProfile,
    documentation,
    unresolved: [...unresolved, ...documentation.conflicts],
  };
}

function isSharedArchitectureFile(filePath: string): boolean {
  if (/(?:^|\/)modules?(?:\/|$)/.test(filePath)) return false;
  return /(?:^|\/)(?:common|shared|widgets?|components?|design_system|ui)(?:\/|$)/.test(filePath);
}

function unknownProfile(unresolved: string[]): FlutterTargetConventionProfile {
  const routing = unknownRoutingFacet();
  const i18n = unknownI18nFacet();
  return {
    architectureProfile: {
      state: absentStateFacet(),
      routing,
      i18n,
      theme: { patterns: [], confidence: 'low', evidence: [], examples: [] },
      components: { detectedSymbols: [], confidence: 'low', evidence: [], examples: [] },
      fileOrganization: unknownFacet(),
    },
    unresolved,
  };
}

function absentStateFacet(): FlutterStateArchitectureFacet {
  return {
    source: 'absent',
    pattern: 'unspecified',
    confidence: 'low',
    evidence: [ABSENT_STATE_EVIDENCE],
    examples: [],
  };
}

function stateFacetFromDocumentation(
  documentation: FlutterTargetDocumentationEvidence,
): FlutterStateArchitectureFacet {
  const hints = documentation.architectureHints.filter((hint) => hint.kind === 'state');
  const hint = hints[0];
  if (!hint) return absentStateFacet();
  return {
    source: 'target-documentation',
    pattern: hint.pattern,
    confidence: hint.confidence,
    evidence: [
      `Target documentation ${hint.file} declares state pattern ${hint.pattern}.`,
      ...hints.slice(1).map((item) => `Additional documentation hint: ${item.pattern} in ${item.file}.`),
    ],
    examples: [{
      file: hint.file,
      symbol: hint.pattern,
      snippet: hint.evidence,
    }],
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

function collectThemeSignals(files: DartFile[]): PatternSignal[] {
  const known = collectPatternSignals(files, THEME_PATTERNS);
  const dynamicPatterns = new Set<string>();
  for (const file of files) {
    for (const match of file.text.matchAll(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*){1,3})\.[a-zA-Z_]\w*/g)) {
      const accessRoot = match[1];
      if (accessRoot && /color|style|theme|spacing|radius|radii|typograph/i.test(accessRoot)) dynamicPatterns.add(accessRoot);
    }
    for (const match of file.text.matchAll(/\b([A-Z]\w*(?:Color|Colors|Style|Styles|Theme|Spacing|Radius|Radii|Typography))\.[a-zA-Z_]\w*/g)) {
      if (match[1]) dynamicPatterns.add(match[1]);
    }
  }
  return [
    ...known,
    ...[...dynamicPatterns].map((pattern) => ({
      pattern,
      evidence: collectNeedleEvidence(files, pattern, [new RegExp(`\\b${escapeRegExp(pattern)}\\b`)]),
    })),
  ].filter((signal) => signal.evidence.length > 0);
}

function collectComponentSignals(files: DartFile[]): ComponentSignal[] {
  const result: ComponentSignal[] = [];
  for (const file of files) {
    const lines = file.text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const symbol = line.match(/\bclass\s+([A-Z]\w*)\s+extends\s+(?:StatelessWidget|StatefulWidget|ConsumerWidget|HookWidget|GetView\b)/)?.[1];
      if (!symbol) continue;
      const usageCount = files.filter((candidate) => candidate.path !== file.path && new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(candidate.text)).length;
      if (usageCount === 0 && !/\/(?:common|shared|widgets?|components?|design_system|ui)\//.test(file.path)) continue;
      result.push({
        symbol,
        evidence: [{ file: file.path, line: index + 1, symbol, snippet: line.trim() }],
      });
    }
  }
  return result;
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
      // Ignore unreadable target files; partial scan evidence is advisory.
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
    routing: [
      { pattern: 'go_router', evidence: dep('go_router') },
      { pattern: 'getx', evidence: dep('get') },
    ].filter((item) => item.evidence.length > 0),
    i18n: [
      { pattern: 'intl', evidence: dep('intl') },
    ].filter((item) => item.evidence.length > 0),
  };
}

function detectFileOrganization(files: DartFile[], module: string | undefined): FlutterArchitectureFacet {
  const paths = files.map((file) => file.path);
  const modulePaths = module
    ? paths.filter((filePath) => filePath.split('/').includes(module))
    : paths.filter((filePath) => /lib\/(?:app\/modules|features|src\/features|modules)\/[^/]+\//.test(filePath));
  const examples = modulePaths.slice(0, 8).map((filePath) => ({
    file: filePath,
    symbol: 'fileOrganization',
    snippet: filePath,
  }));
  const hasViews = modulePaths.some((filePath) => /\/views?\/.+\.dart$/.test(filePath));
  const hasControllers = modulePaths.some((filePath) => /\/controllers?\/.+_controller\.dart$/.test(filePath));
  const hasBindings = modulePaths.some((filePath) => /\/bindings?\/.+_binding\.dart$/.test(filePath));
  if (hasViews && hasControllers && hasBindings) {
    return {
      pattern: 'module_views_controllers_bindings',
      confidence: confidenceForEvidence(examples),
      evidence: ['Target evidence contains sibling views/controllers/bindings directories for a feature.'],
      examples,
    };
  }
  if (modulePaths.some((filePath) => /\/presentation\/(?:pages?|screens?|widgets?|bloc|cubit|providers?)\//.test(filePath))) {
    return {
      pattern: 'feature_presentation',
      confidence: confidenceForEvidence(examples),
      evidence: ['Target evidence uses a feature presentation layer with page/widget/state subdirectories.'],
      examples,
    };
  }
  if (modulePaths.some((filePath) => /\/[^/]+\/widgets?\/.+\.dart$/.test(filePath))) {
    return {
      pattern: 'feature_with_widgets',
      confidence: confidenceForEvidence(examples),
      evidence: ['Target evidence places reusable widgets below feature directories.'],
      examples,
    };
  }
  if (modulePaths.length > 0) {
    return {
      pattern: 'feature_flat_or_mixed',
      confidence: confidenceForEvidence(examples),
      evidence: ['Target evidence groups Dart files below a detected feature root.'],
      examples,
    };
  }
  return unknownFacet();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import fg from 'fast-glob';
import type {
  FlutterArchitectureConfidence,
  FlutterArchitectureProfile,
  FlutterTargetDocumentationEvidence,
} from '../../types/index.js';
import { toPosixPath } from '../../shared/paths.js';

type DocumentationHint = FlutterTargetDocumentationEvidence['architectureHints'][number];

const DOC_PATTERNS = [
  'README.md',
  'readme.md',
  'AGENTS.md',
  'agents.md',
  'AGENT.md',
  'agent.md',
  'CLAUDE.md',
  'claude.md',
  '.cursorrules',
  '.cursor/rules/**/*',
  '.claude/**/*',
  '.agents/**/*',
  '.codex/**/*',
  'docs/**/*.md',
  'Docs/**/*.md',
];

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/build/**',
  '**/.dart_tool/**',
  '**/output/**',
  '**/dist/**',
  '**/.git/**',
];

const MAX_FILE_BYTES = 80 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024;

const HINT_PATTERNS: Array<{
  kind: DocumentationHint['kind'];
  pattern: string;
  confidence: FlutterArchitectureConfidence;
  needles: RegExp[];
}> = [
  { kind: 'state', pattern: 'getx', confidence: 'medium', needles: [/\bGetxController\b/i, /\bGetView\b/i, /\bBindings\b/i] },
  { kind: 'state', pattern: 'flutter_bloc', confidence: 'medium', needles: [/\bBlocProvider\b/i, /\bBlocBuilder\b/i, /\bCubit\b/i, /\bflutter_bloc\b/i] },
  { kind: 'state', pattern: 'riverpod', confidence: 'medium', needles: [/\bConsumerWidget\b/i, /\bWidgetRef\b/i, /\briverpod\b/i] },
  { kind: 'state', pattern: 'provider', confidence: 'medium', needles: [/\bChangeNotifierProvider\b/i, /\bcontext\.(watch|read)\b/i, /\bprovider\b/i] },
  { kind: 'routing', pattern: 'getx', confidence: 'medium', needles: [/\bGetPage\b/i, /\bGet\.toNamed\b/i, /\bGetMaterialApp\b/i] },
  { kind: 'routing', pattern: 'go_router', confidence: 'medium', needles: [/\bGoRouter\b/i, /\bcontext\.(go|push|replace)\b/i] },
  { kind: 'routing', pattern: 'navigator', confidence: 'low', needles: [/\bNavigator\.(push|pop|pushNamed)\b/i] },
  { kind: 'i18n', pattern: 'getx_tr', confidence: 'medium', needles: [/['"`][^'"`]+['"`]\.tr\b/i, /\b\.tr\b/i] },
  { kind: 'i18n', pattern: 'build_context_t_extension', confidence: 'medium', needles: [/\bcontext\.t\s*\(/i] },
  { kind: 'i18n', pattern: 'app_localizations', confidence: 'medium', needles: [/\bAppLocalizations\.of\b/i, /\bflutter_gen\/gen_l10n\b/i] },
  { kind: 'theme', pattern: 'Theme.of(context)', confidence: 'low', needles: [/\bTheme\.of\s*\(\s*context\s*\)/i] },
  { kind: 'component', pattern: 'shared-components', confidence: 'medium', needles: [/\bCommon[A-Z]\w*\b/, /lib\/(?:common|shared|widgets|components)\//i] },
  { kind: 'file-organization', pattern: 'page_state_files', confidence: 'medium', needles: [/\b(?:features|modules)\/[^/\s]+\//i, /\b(?:controller|bloc|cubit|provider)\.dart\b/i] },
  { kind: 'workflow', pattern: 'target-validation', confidence: 'medium', needles: [/flutter analyze/i, /flutter test/i] },
  { kind: 'workflow', pattern: 'architecture-doc', confidence: 'low', needles: [/\barchitecture\b/i, /\bconvention\b/i, /架构|约定|规范/] },
];

export async function scanFlutterTargetDocumentation(input: {
  flutterRoot: string;
  architectureProfile?: FlutterArchitectureProfile | undefined;
}): Promise<FlutterTargetDocumentationEvidence> {
  const flutterRoot = path.resolve(input.flutterRoot);
  const warnings: string[] = [];
  const files = await fg(DOC_PATTERNS, {
    cwd: flutterRoot,
    onlyFiles: true,
    absolute: false,
    dot: true,
    unique: true,
    ignore: IGNORE_PATTERNS,
    suppressErrors: true,
  });
  let totalBytes = 0;
  const documents: Array<{ path: string; size: number; text: string }> = [];

  for (const file of dedupeCaseInsensitive(files).sort()) {
    if (!isSupportedDocument(file)) continue;
    const absolute = path.join(flutterRoot, file);
    try {
      const stats = await stat(absolute);
      if (stats.size > MAX_FILE_BYTES) {
        warnings.push(`Skipped large target documentation file: ${toPosixPath(file)} (${stats.size} bytes).`);
        continue;
      }
      if (totalBytes + stats.size > MAX_TOTAL_BYTES) {
        warnings.push('Skipped remaining target documentation files after documentation scan budget was reached.');
        break;
      }
      const text = await readFile(absolute, 'utf8');
      totalBytes += stats.size;
      documents.push({ path: toPosixPath(file), size: stats.size, text });
    } catch {
      warnings.push(`Unable to read target documentation file: ${toPosixPath(file)}.`);
    }
  }

  const architectureHints = dedupeHints(documents.flatMap((document) => hintsForDocument(document)));
  const contract = buildDocumentationContract(documents.map((document) => document.path));
  return {
    files: documents.map((document) => ({
      path: document.path,
      size: document.size,
      summary: summarizeDocument(document.text),
    })),
    architectureHints,
    contract,
    conflicts: input.architectureProfile ? detectDocumentationConflicts(architectureHints, input.architectureProfile) : [],
    warnings,
  };
}

export function withDocumentationConflicts(
  documentation: FlutterTargetDocumentationEvidence,
  architectureProfile: FlutterArchitectureProfile,
): FlutterTargetDocumentationEvidence {
  return {
    ...documentation,
    conflicts: detectDocumentationConflicts(documentation.architectureHints, architectureProfile),
  };
}

function buildDocumentationContract(
  files: string[],
): FlutterTargetDocumentationEvidence['contract'] {
  const lower = new Map(files.map((file) => [file.toLowerCase(), file]));
  const matching = (...needles: string[]) =>
    needles.flatMap((needle) => {
      const match = lower.get(needle.toLowerCase());
      return match ? [match] : [];
    });
  const entrypoints = matching('AGENTS.md', 'README.md');
  const architecture = matching('docs/architecture.md');
  const components = matching('docs/components.md');
  const theme = matching('docs/theme.md');
  const routing = matching('docs/routing.md');
  const testing = matching('docs/testing.md');
  const adapter = matching('docs/proto-bridge.md');
  const missing = [
    ...(!lower.has('agents.md') ? ['AGENTS.md'] : []),
    ...(!lower.has('readme.md') ? ['README.md'] : []),
    ...(!architecture.length ? ['docs/architecture.md'] : []),
    ...(!components.length ? ['docs/components.md'] : []),
    ...(!theme.length ? ['docs/theme.md'] : []),
    ...(!routing.length ? ['docs/routing.md'] : []),
    ...(!testing.length ? ['docs/testing.md'] : []),
  ];
  return {
    entrypoints,
    architecture,
    components,
    theme,
    routing,
    testing,
    adapter,
    missing,
    complete: missing.length === 0,
  };
}

function isSupportedDocument(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.mdc') || lower.endsWith('.txt') || lower.endsWith('cursorrules');
}

function hintsForDocument(document: { path: string; text: string }): DocumentationHint[] {
  return HINT_PATTERNS.flatMap((pattern) => {
    const match = pattern.needles.find((needle) => needle.test(document.text));
    if (!match) return [];
    return [{
      kind: pattern.kind,
      pattern: pattern.pattern,
      confidence: pattern.confidence,
      evidence: snippetFor(document.text, match),
      file: document.path,
    }];
  });
}

function snippetFor(text: string, needle: RegExp): string {
  const lines = text.split(/\r?\n/g);
  const index = lines.findIndex((line) => needle.test(line));
  const line = index >= 0 ? lines[index] : lines.find((item) => item.trim()) ?? '';
  return (line ?? '').trim().replace(/\s+/g, ' ').slice(0, 220);
}

function summarizeDocument(text: string): string[] {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('```'));
  const headings = lines.filter((line) => /^#{1,3}\s+/.test(line)).slice(0, 6);
  const keywordLines = lines
    .filter((line) => /架构|约定|规范|GetX|Bloc|Riverpod|Provider|route|routing|i18n|theme|component|module/i.test(line))
    .slice(0, 6);
  return dedupe([...headings, ...keywordLines]).map((line) => line.slice(0, 220)).slice(0, 8);
}

function detectDocumentationConflicts(
  hints: DocumentationHint[],
  scannedArchitecture: FlutterArchitectureProfile,
): string[] {
  const conflicts: string[] = [];
  for (const hint of hints) {
    if (hint.confidence === 'low') continue;
    if (hint.kind === 'routing' && scannedArchitecture.routing.pattern !== 'unknown' && scannedArchitecture.routing.pattern !== hint.pattern) {
      conflicts.push(`Target documentation ${hint.file} mentions routing pattern ${hint.pattern}, but code scan detected ${scannedArchitecture.routing.pattern}.`);
    }
    if (hint.kind === 'i18n' && scannedArchitecture.i18n.pattern !== 'unknown' && scannedArchitecture.i18n.pattern !== hint.pattern) {
      conflicts.push(`Target documentation ${hint.file} mentions i18n pattern ${hint.pattern}, but code scan detected ${scannedArchitecture.i18n.pattern}.`);
    }
    if (hint.kind === 'theme' && scannedArchitecture.theme.patterns.length > 0 && !scannedArchitecture.theme.patterns.includes(hint.pattern)) {
      conflicts.push(`Target documentation ${hint.file} mentions theme pattern ${hint.pattern}, but code scan did not detect it in target usage.`);
    }
  }
  return dedupe(conflicts);
}

function dedupeHints(hints: DocumentationHint[]): DocumentationHint[] {
  return dedupeBy(hints, (hint) => `${hint.kind}:${hint.pattern}:${hint.file}`);
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function dedupeCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}

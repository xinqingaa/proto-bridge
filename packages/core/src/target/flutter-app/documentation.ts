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
  'AGENT.md',
  'agent.md',
  'CLAUDE.md',
  'claude.md',
  '.cursorrules',
  '.cursor/rules/**/*',
  '.claude/**/*',
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
  { kind: 'state', pattern: 'getx', confidence: 'medium', needles: [/\bGetxController\b/i, /\bBaseGetView\b/i, /\bGetView\b/i, /\bBindings\b/i] },
  { kind: 'state', pattern: 'flutter_bloc', confidence: 'medium', needles: [/\bBlocProvider\b/i, /\bBlocBuilder\b/i, /\bCubit\b/i, /\bflutter_bloc\b/i] },
  { kind: 'state', pattern: 'riverpod', confidence: 'medium', needles: [/\bConsumerWidget\b/i, /\bWidgetRef\b/i, /\briverpod\b/i] },
  { kind: 'state', pattern: 'provider', confidence: 'medium', needles: [/\bChangeNotifierProvider\b/i, /\bcontext\.(watch|read)\b/i, /\bprovider\b/i] },
  { kind: 'routing', pattern: 'getx', confidence: 'medium', needles: [/\bGetPage\b/i, /\bGet\.toNamed\b/i, /\bGetMaterialApp\b/i] },
  { kind: 'routing', pattern: 'go_router', confidence: 'medium', needles: [/\bGoRouter\b/i, /\bcontext\.(go|push|replace)\b/i] },
  { kind: 'routing', pattern: 'navigator', confidence: 'low', needles: [/\bNavigator\.(push|pop|pushNamed)\b/i] },
  { kind: 'i18n', pattern: 'getx_tr', confidence: 'medium', needles: [/['"`][^'"`]+['"`]\.tr\b/i, /\b\.tr\b/i] },
  { kind: 'i18n', pattern: 'build_context_t_extension', confidence: 'medium', needles: [/\bcontext\.t\s*\(/i] },
  { kind: 'i18n', pattern: 'app_localizations', confidence: 'medium', needles: [/\bAppLocalizations\.of\b/i, /\bflutter_gen\/gen_l10n\b/i] },
  { kind: 'theme', pattern: 'themeService.colors', confidence: 'medium', needles: [/\bthemeService\.colors\b/i] },
  { kind: 'theme', pattern: 'themeService.textStyles', confidence: 'medium', needles: [/\bthemeService\.textStyles\b/i] },
  { kind: 'theme', pattern: 'context.pbColors', confidence: 'medium', needles: [/\bcontext\.pbColors\b/i] },
  { kind: 'theme', pattern: 'context.pbTextStyles', confidence: 'medium', needles: [/\bcontext\.pbTextStyles\b/i] },
  { kind: 'theme', pattern: 'Theme.of(context)', confidence: 'low', needles: [/\bTheme\.of\s*\(\s*context\s*\)/i] },
  { kind: 'component', pattern: 'CommonAppBar', confidence: 'medium', needles: [/\bCommonAppBar\b/i] },
  { kind: 'component', pattern: 'CommonButton', confidence: 'medium', needles: [/\bCommonButton\b/i] },
  { kind: 'component', pattern: 'CommonImage', confidence: 'medium', needles: [/\bCommonImage\b/i, /\bCommonSvg\b/i] },
  { kind: 'component', pattern: 'BaseGetView', confidence: 'medium', needles: [/\bBaseGetView\b/i, /\bBaseGetPullView\b/i] },
  { kind: 'file-organization', pattern: 'module_page_controller_binding', confidence: 'medium', needles: [/\bmodules\/[^/\s]+\/[^/\s]+_page\.dart\b/i, /\bcontroller\.dart\b/i, /\bbinding\.dart\b/i] },
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
  return {
    files: documents.map((document) => ({
      path: document.path,
      size: document.size,
      summary: summarizeDocument(document.text),
    })),
    architectureHints,
    conflicts: input.architectureProfile ? detectDocumentationConflicts(architectureHints, input.architectureProfile) : [],
    warnings,
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
  profile: FlutterArchitectureProfile,
): string[] {
  const conflicts: string[] = [];
  for (const hint of hints) {
    if (hint.confidence === 'low') continue;
    if (hint.kind === 'state' && profile.state.pattern !== 'unknown' && profile.state.pattern !== hint.pattern) {
      conflicts.push(`Target documentation ${hint.file} mentions state pattern ${hint.pattern}, but code scan detected ${profile.state.pattern}.`);
    }
    if (hint.kind === 'routing' && profile.routing.pattern !== 'unknown' && profile.routing.pattern !== hint.pattern) {
      conflicts.push(`Target documentation ${hint.file} mentions routing pattern ${hint.pattern}, but code scan detected ${profile.routing.pattern}.`);
    }
    if (hint.kind === 'i18n' && profile.i18n.pattern !== 'unknown' && profile.i18n.pattern !== hint.pattern) {
      conflicts.push(`Target documentation ${hint.file} mentions i18n pattern ${hint.pattern}, but code scan detected ${profile.i18n.pattern}.`);
    }
    if (hint.kind === 'theme' && profile.theme.patterns.length > 0 && !profile.theme.patterns.includes(hint.pattern)) {
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

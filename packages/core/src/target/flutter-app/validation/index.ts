import path from 'node:path';
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import fg from 'fast-glob';

const execFileAsync = promisify(execFile);

export type FlutterTargetFileIssue = {
  file: string;
  issue: string;
};

export type FlutterTargetValidationResult = {
  targetRoot: string;
  changedFiles: string[];
  allowedPaths: string[];
  outsideAllowedPaths: string[];
  fileIssues: FlutterTargetFileIssue[];
  expectedFiles: string[];
  missingExpectedFiles: string[];
  mappingIssues: FlutterTargetFileIssue[];
  validationHints: string[];
  status: 'ok' | 'needs-review';
};

export type ValidateFlutterTargetChangesInput = {
  targetRoot: string;
  gitBase?: string;
  allowedPaths?: string[];
  expectedFiles?: string[];
  validationHints?: string[];
  resolvedMappings?: FlutterAdoptedMapping[];
};

export type FlutterAdoptedMapping = {
  id: string;
  kind: 'component' | 'token';
  symbol?: string;
  accessor?: string;
  importPath?: string;
};

/**
 * Independent V2 Target validation boundary. It reads only the target
 * repository and never accepts Source Evidence, Snapshot or Handoff objects.
 */
export async function validateFlutterTargetChanges(
  input: ValidateFlutterTargetChangesInput,
): Promise<FlutterTargetValidationResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const expectedFiles = input.expectedFiles ?? [];
  const changedFiles = await collectChangedFiles(targetRoot, input.gitBase);
  const missingExpectedFiles = await collectMissingFiles(
    targetRoot,
    expectedFiles,
  );
  const fileIssues = await scanFlutterTargetDartFiles(
    targetRoot,
    changedFiles.filter((file) => file.endsWith('.dart')),
  );
  const mappingIssues = await validateAdoptedMappings(
    targetRoot,
    input.resolvedMappings ?? [],
  );
  return buildFlutterTargetValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths: input.allowedPaths ?? [],
    fileIssues,
    validationHints: input.validationHints,
    expectedFiles,
    missingExpectedFiles,
    mappingIssues,
  });
}

async function collectChangedFiles(
  targetRoot: string,
  gitBase: string | undefined,
): Promise<string[]> {
  const diff = await runGit(
    targetRoot,
    gitBase ? ['diff', '--name-only', gitBase] : ['diff', '--name-only'],
  );
  const staged = await runGit(targetRoot, [
    'diff',
    '--cached',
    '--name-only',
  ]);
  const untracked = await runGit(targetRoot, [
    'ls-files',
    '--others',
    '--exclude-standard',
  ]);
  return [
    ...new Set(
      [...splitLines(diff), ...splitLines(staged), ...splitLines(untracked)].map(
        (value) => value.split(path.sep).join('/'),
      ),
    ),
  ];
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    return (
      await execFileAsync('git', ['-C', cwd, ...args], {
        maxBuffer: 4 * 1024 * 1024,
      })
    ).stdout;
  } catch {
    return '';
  }
}

async function collectMissingFiles(
  targetRoot: string,
  files: string[],
): Promise<string[]> {
  const missing: string[] = [];
  for (const file of files) {
    try {
      await access(path.join(targetRoot, file));
    } catch {
      missing.push(file);
    }
  }
  return missing;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function scanFlutterTargetDartFiles(
  targetRoot: string,
  files: string[],
): Promise<FlutterTargetFileIssue[]> {
  const issues: FlutterTargetFileIssue[] = [];
  for (const file of files) {
    let text = '';
    try {
      text = await readFile(path.join(targetRoot, file), 'utf8');
    } catch {
      continue;
    }
    if (/Text\s*\(\s*['"`](展示|TODO|待实现|placeholder|示例)/i.test(text)) {
      issues.push({ file, issue: 'Possible placeholder UI text found.' });
    }
    if (/\bTODO\b|待确认|待实现/.test(text)) {
      issues.push({ file, issue: 'TODO or pending confirmation marker found.' });
    }
    if (/Color\(\s*0x/i.test(text) && !usesDetectedColorTheme(text)) {
      issues.push({ file, issue: 'Hard-coded Color detected without a detected target theme accessor nearby.' });
    }
    if (/\bfontSize\s*:\s*\d/i.test(text) && !usesDetectedTextTheme(text)) {
      issues.push({ file, issue: 'Hard-coded fontSize detected without a detected target text style accessor nearby.' });
    }
    if (/BoxShadow\s*\(/.test(text) && !usesDetectedColorTheme(text)) {
      issues.push({ file, issue: 'Local BoxShadow detected; confirm it matches captured page evidence and target theme conventions.' });
    }
    if (/Image\.network\s*\(/.test(text)) {
      issues.push({ file, issue: 'Network image usage detected; confirm source asset plan allows remote images.' });
    }
    if (/Get\.toNamed\s*\(/.test(text) && !/TODO|待确认|business/i.test(text)) {
      issues.push({ file, issue: 'Navigation behavior detected without nearby TODO/confirmation marker.' });
    }
  }
  return issues;
}

export function buildFlutterTargetValidationResult(input: {
  targetRoot: string;
  changedFiles: string[];
  allowedPaths: string[];
  fileIssues: FlutterTargetFileIssue[];
  validationHints?: string[] | undefined;
  expectedFiles?: string[] | undefined;
  missingExpectedFiles?: string[] | undefined;
  mappingIssues?: FlutterTargetFileIssue[] | undefined;
}): FlutterTargetValidationResult {
  const outsideAllowedPaths = input.allowedPaths.length
    ? input.changedFiles.filter((file) => !input.allowedPaths.some((allowedPath) => file === allowedPath || file.startsWith(ensureTrailingSlash(allowedPath))))
    : [];
  const missingExpectedFiles = input.missingExpectedFiles ?? [];
  const mappingIssues = input.mappingIssues ?? [];
  return {
    targetRoot: input.targetRoot,
    changedFiles: input.changedFiles,
    allowedPaths: input.allowedPaths,
    outsideAllowedPaths,
    fileIssues: input.fileIssues,
    expectedFiles: input.expectedFiles ?? [],
    missingExpectedFiles,
    mappingIssues,
    validationHints: input.validationHints ?? [],
    status: outsideAllowedPaths.length || input.fileIssues.length || missingExpectedFiles.length || mappingIssues.length ? 'needs-review' : 'ok',
  };
}

async function validateAdoptedMappings(
  targetRoot: string,
  mappings: FlutterAdoptedMapping[],
): Promise<FlutterTargetFileIssue[]> {
  if (mappings.length === 0) return [];
  const paths = await fg(['lib/**/*.dart'], {
    cwd: targetRoot,
    onlyFiles: true,
    ignore: ['**/*.g.dart', '**/*.freezed.dart', '**/.dart_tool/**', '**/build/**'],
    suppressErrors: true,
  });
  const files = await Promise.all(
    paths.sort().map(async (file) => ({ file, text: await readFile(path.join(targetRoot, file), 'utf8') })),
  );
  const issues: FlutterTargetFileIssue[] = [];
  for (const mapping of mappings) {
    const target = mapping.symbol ?? mapping.accessor;
    if (!target || !files.some((file) => target.split('.').every((segment) => file.text.includes(segment)))) {
      issues.push({ file: mapping.importPath ?? '<target>', issue: `Resolved ${mapping.kind} mapping ${mapping.id} no longer exposes ${target ?? 'a target symbol/accessor'}.` });
      continue;
    }
    if (mapping.importPath && !mapping.importPath.startsWith('package:')) {
      const relative = mapping.importPath.replace(/^lib\//, '');
      if (!paths.includes(`lib/${relative}`) && !paths.includes(relative)) {
        issues.push({ file: mapping.importPath, issue: `Resolved mapping import no longer exists for ${mapping.id}.` });
      }
    }
  }
  return issues;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function usesDetectedColorTheme(text: string): boolean {
  return /\.(?:colors|colorScheme)\b|Theme\.of\s*\(\s*context\s*\)\.colorScheme/.test(text);
}

function usesDetectedTextTheme(text: string): boolean {
  return /\.(?:textStyles|textTheme)\b|Theme\.of\s*\(\s*context\s*\)\.textTheme/.test(text);
}

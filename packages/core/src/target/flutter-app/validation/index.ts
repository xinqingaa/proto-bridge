import path from 'node:path';
import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

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
  validationHints: string[];
  status: 'ok' | 'needs-review';
};

export type ValidateFlutterTargetChangesInput = {
  targetRoot: string;
  gitBase?: string;
  allowedPaths?: string[];
  expectedFiles?: string[];
  validationHints?: string[];
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
  return buildFlutterTargetValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths: input.allowedPaths ?? [],
    fileIssues,
    validationHints: input.validationHints,
    expectedFiles,
    missingExpectedFiles,
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
}): FlutterTargetValidationResult {
  const outsideAllowedPaths = input.allowedPaths.length
    ? input.changedFiles.filter((file) => !input.allowedPaths.some((allowedPath) => file === allowedPath || file.startsWith(ensureTrailingSlash(allowedPath))))
    : [];
  const missingExpectedFiles = input.missingExpectedFiles ?? [];
  return {
    targetRoot: input.targetRoot,
    changedFiles: input.changedFiles,
    allowedPaths: input.allowedPaths,
    outsideAllowedPaths,
    fileIssues: input.fileIssues,
    expectedFiles: input.expectedFiles ?? [],
    missingExpectedFiles,
    validationHints: input.validationHints ?? [],
    status: outsideAllowedPaths.length || input.fileIssues.length || missingExpectedFiles.length ? 'needs-review' : 'ok',
  };
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

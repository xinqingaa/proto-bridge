import path from 'node:path';
import { readFile } from 'node:fs/promises';

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
    if (/Color\(\s*0x/i.test(text) && !/themeService\.colors/.test(text)) {
      issues.push({ file, issue: 'Hard-coded Color detected without themeService.colors nearby.' });
    }
    if (/\bfontSize\s*:\s*\d/i.test(text) && !/themeService\.textStyles/.test(text)) {
      issues.push({ file, issue: 'Hard-coded fontSize detected without themeService.textStyles nearby.' });
    }
    if (/BoxShadow\s*\(/.test(text) && !/themeService\.colors/.test(text)) {
      issues.push({ file, issue: 'Local BoxShadow detected; confirm it matches snapshot evidence and YouFi component conventions.' });
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

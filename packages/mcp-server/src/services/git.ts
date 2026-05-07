import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GeneratedRun, JsonObject, JsonValue } from '../types.js';
import { dedupe, splitLines, toPosix } from '../utils/args.js';

const execFileAsync = promisify(execFile);

export async function collectChangedFiles(targetRoot: string, gitBase: string | undefined): Promise<string[]> {
  const args = gitBase ? ['diff', '--name-only', gitBase] : ['diff', '--name-only'];
  const diff = await runGit(targetRoot, args);
  const staged = await runGit(targetRoot, ['diff', '--cached', '--name-only']);
  const untracked = await runGit(targetRoot, ['ls-files', '--others', '--exclude-standard']);
  return dedupe([...splitLines(diff), ...splitLines(staged), ...splitLines(untracked)].map(toPosix));
}

export async function scanChangedDartFiles(targetRoot: string, files: string[]): Promise<JsonValue[]> {
  const issues: JsonValue[] = [];
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
  }
  return issues;
}

export function defaultAllowedPaths(run: GeneratedRun | undefined): string[] {
  if (!run) return [];
  const context = run.result.context;
  const module = context.target.suggestedModule;
  const plannedDirs = context.recommendations.implementationPlan.fileTree
    .map((file) => file.path.split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  return dedupe([
    ...(module ? [`lib/app/modules/${module}`] : []),
    ...plannedDirs,
    ...context.target.routesFiles,
    ...context.target.translationFiles,
  ]);
}

export function buildValidationResult(input: {
  targetRoot: string;
  changedFiles: string[];
  allowedPaths: string[];
  fileIssues: JsonValue[];
  run?: GeneratedRun | undefined;
  validationHints?: string[] | undefined;
}): JsonObject {
  const outsideAllowedPaths = input.allowedPaths.length
    ? input.changedFiles.filter((file) => !input.allowedPaths.some((allowedPath) => file === allowedPath || file.startsWith(ensureTrailingSlash(allowedPath))))
    : [];
  return {
    targetRoot: input.targetRoot,
    changedFiles: input.changedFiles,
    allowedPaths: input.allowedPaths,
    outsideAllowedPaths,
    fileIssues: input.fileIssues,
    checklist: input.run?.result.context.recommendations.implementationPlan.checklist ?? [],
    validationHints: input.validationHints ?? [],
    status: outsideAllowedPaths.length || input.fileIssues.length ? 'needs-review' : 'ok',
  } as unknown as JsonObject;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 1024 * 1024 * 4 });
    return stdout;
  } catch {
    return '';
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

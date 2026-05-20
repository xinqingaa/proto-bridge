import path from 'node:path';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  buildFlutterTargetValidationResult,
  scanFlutterTargetDartFiles,
} from '../target/flutter-app/index.js';
import type { UiValidateCapabilityInput, UiValidateCapabilityResult } from './types.js';

const execFileAsync = promisify(execFile);

export async function validateUiCapability(input: UiValidateCapabilityInput): Promise<UiValidateCapabilityResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const expectedFiles = input.expectedFiles ?? [];
  const missingExpectedFiles = await collectMissingFiles(targetRoot, expectedFiles);
  const changedFiles = await collectChangedFiles(targetRoot, input.gitBase);
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanFlutterTargetDartFiles(targetRoot, dartFiles, input.plan);
  const result = buildFlutterTargetValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths: input.allowedPaths ?? [],
    fileIssues,
    validationHints: input.validationHints,
    expectedFiles,
    missingExpectedFiles,
  });
  return {
    ...result,
    capability: 'ui.validate',
    warnings: buildValidationWarnings(result),
  };
}

async function collectChangedFiles(targetRoot: string, gitBase: string | undefined): Promise<string[]> {
  const args = gitBase ? ['diff', '--name-only', gitBase] : ['diff', '--name-only'];
  const diff = await runGit(targetRoot, args);
  const staged = await runGit(targetRoot, ['diff', '--cached', '--name-only']);
  const untracked = await runGit(targetRoot, ['ls-files', '--others', '--exclude-standard']);
  return dedupe([...splitLines(diff), ...splitLines(staged), ...splitLines(untracked)].map(toPosix));
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 1024 * 1024 * 4 });
    return stdout;
  } catch {
    return '';
  }
}

async function collectMissingFiles(targetRoot: string, files: string[]): Promise<string[]> {
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

function buildValidationWarnings(result: ReturnType<typeof buildFlutterTargetValidationResult>): string[] {
  return [
    ...(result.outsideAllowedPaths.length ? [`${result.outsideAllowedPaths.length} changed file(s) are outside allowed paths.`] : []),
    ...(result.fileIssues.length ? [`${result.fileIssues.length} Dart file issue(s) need review.`] : []),
    ...(result.missingExpectedFiles.length ? [`${result.missingExpectedFiles.length} expected file(s) are missing.`] : []),
  ];
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

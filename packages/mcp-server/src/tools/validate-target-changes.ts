import path from 'node:path';
import { access } from 'node:fs/promises';
import {
  buildFlutterTargetValidationResult,
  scanFlutterTargetDartFiles,
} from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveProjectRoot, resolveRuntimeConfig, resolveRuntimeTargetRoot } from '../services/config.js';
import { collectChangedFiles } from '../services/git.js';

export async function validateTargetChangesTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const config = await resolveRuntimeConfig(context.options);
  const configTargetRoot = resolveProjectRoot(config?.target, context.options.configDir);
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot') ?? configTargetRoot);
  const pageId = readString(args, 'pageId');
  const page = pageId ? context.pages.require(pageId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? allowedPathsFromPlan(page);
  const expectedFiles = page?.plan?.fileTree.map((file) => file.path) ?? [];
  const missingExpectedFiles = await collectMissingFiles(targetRoot, expectedFiles);
  const changedFiles = await collectChangedFiles(targetRoot, readString(args, 'gitBase'));
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanFlutterTargetDartFiles(targetRoot, dartFiles);
  return buildFlutterTargetValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths,
    fileIssues,
    validationHints: page?.plan?.validationHints,
    expectedFiles,
    missingExpectedFiles,
  }) as unknown as JsonObject;
}

function allowedPathsFromPlan(page: ReturnType<ToolContext['pages']['get']>): string[] {
  if (!page?.plan) return [];
  const plannedDirs = page.plan.fileTree
    .map((file) => file.path.split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  const module = page.plan.target.module;
  return [...new Set([
    ...(module ? [`lib/app/modules/${module}`] : []),
    ...plannedDirs,
    ...page.plan.target.routesFiles,
    ...page.plan.target.translationFiles,
  ])];
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

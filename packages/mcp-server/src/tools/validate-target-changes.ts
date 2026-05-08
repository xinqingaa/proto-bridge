import path from 'node:path';
import { access } from 'node:fs/promises';
import {
  buildFlutterTargetValidationResult,
  scanFlutterTargetDartFiles,
} from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, ToolContext } from '../types.js';
import { readString, readStringArray } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import { collectChangedFiles } from '../services/git.js';

export async function validateTargetChangesTool(context: ToolContext, args: JsonObject): Promise<JsonObject> {
  const targetRoot = resolveRuntimeTargetRoot(readString(args, 'targetRoot'));
  const planId = readString(args, 'planId');
  const plan = planId ? context.plans.require(planId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? allowedPathsFromPlan(plan);
  const expectedFiles = plan?.result.plan.fileTree.map((file) => file.path) ?? [];
  const missingExpectedFiles = await collectMissingFiles(targetRoot, expectedFiles);
  const changedFiles = await collectChangedFiles(targetRoot, readString(args, 'gitBase'));
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanFlutterTargetDartFiles(targetRoot, dartFiles);
  return buildFlutterTargetValidationResult({
    targetRoot,
    changedFiles,
    allowedPaths,
    fileIssues,
    validationHints: plan?.result.plan.validationHints,
    expectedFiles,
    missingExpectedFiles,
  }) as unknown as JsonObject;
}

function allowedPathsFromPlan(plan: ReturnType<ToolContext['plans']['get']>): string[] {
  if (!plan) return [];
  const plannedDirs = plan.result.plan.fileTree
    .map((file) => file.path.split('/').slice(0, -1).join('/'))
    .filter(Boolean);
  const module = plan.result.plan.target.module;
  return [...new Set([
    ...(module ? [`lib/app/modules/${module}`] : []),
    ...plannedDirs,
    ...plan.result.plan.target.routesFiles,
    ...plan.result.plan.target.translationFiles,
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

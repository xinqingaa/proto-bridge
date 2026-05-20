import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { UiBuildPlan } from '../../../types/index.js';

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
  plan?: UiBuildPlan | undefined,
): Promise<FlutterTargetFileIssue[]> {
  const issues: FlutterTargetFileIssue[] = [];
  const contract = plan ? buildArchitectureContract(plan) : undefined;
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
    if (/Color\(\s*0x/i.test(text) && !usesDetectedColorTheme(text, contract)) {
      issues.push({ file, issue: 'Hard-coded Color detected without a detected target theme accessor nearby.' });
    }
    if (/\bfontSize\s*:\s*\d/i.test(text) && !usesDetectedTextTheme(text, contract)) {
      issues.push({ file, issue: 'Hard-coded fontSize detected without a detected target text style accessor nearby.' });
    }
    if (/BoxShadow\s*\(/.test(text) && !usesDetectedColorTheme(text, contract)) {
      issues.push({ file, issue: 'Local BoxShadow detected; confirm it matches captured page evidence and target theme conventions.' });
    }
    if (/Image\.network\s*\(/.test(text)) {
      issues.push({ file, issue: 'Network image usage detected; confirm source asset plan allows remote images.' });
    }
    if (/Get\.toNamed\s*\(/.test(text) && !/TODO|待确认|business/i.test(text)) {
      issues.push({ file, issue: 'Navigation behavior detected without nearby TODO/confirmation marker.' });
    }
    if (contract) {
      issues.push(...scanArchitectureContract(file, text, contract));
      if (plan) issues.push(...scanWidgetContract(file, text, plan));
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

type ArchitectureContract = {
  statePattern: string;
  pageStatePattern: string;
  stateScope: 'page' | 'global' | 'package' | 'unknown';
  routingPattern: string;
  navigationPattern: string;
  i18nPattern: string;
  themePatterns: string[];
  expectedWidgetFileStems: Set<string>;
};

function buildArchitectureContract(plan: UiBuildPlan): ArchitectureContract {
  const stateBinding = plan.implementationContract.targetBindings.state;
  return {
    statePattern: plan.targetConventions.architectureProfile.state.pattern,
    pageStatePattern: plan.targetConventions.architectureProfile.state.page?.pattern ?? 'unknown',
    stateScope: stateBinding?.scope ?? 'unknown',
    routingPattern: plan.targetConventions.architectureProfile.routing.pattern,
    navigationPattern: plan.targetConventions.architectureProfile.routing.navigation?.pattern ?? 'unknown',
    i18nPattern: plan.targetConventions.architectureProfile.i18n.lookup?.pattern ?? plan.targetConventions.architectureProfile.i18n.pattern,
    themePatterns: plan.targetConventions.architectureProfile.theme.patterns,
    expectedWidgetFileStems: new Set(plan.implementationContract.fileTree.map((file) => path.basename(file.path, '.dart'))),
  };
}

function scanArchitectureContract(
  file: string,
  text: string,
  contract: ArchitectureContract,
): FlutterTargetFileIssue[] {
  const issues: FlutterTargetFileIssue[] = [];
  const unsupported = unsupportedFrameworkPatterns(contract);
  for (const item of unsupported) {
    if (item.pattern.test(text)) {
      issues.push({
        file,
        issue: `Architecture contract violation: ${item.label} is not supported by targetConventions evidence.`,
      });
    }
  }

  const routingPattern = contract.navigationPattern !== 'unknown' ? contract.navigationPattern : contract.routingPattern;
  if (routingPattern !== 'unknown' && routingPattern !== 'getx' && /\bGet\.(toNamed|offNamed|back|parameters|arguments)\b/.test(text)) {
    issues.push({ file, issue: `Architecture contract violation: routing pattern is ${routingPattern}, but GetX routing usage was introduced.` });
  }
  if (routingPattern !== 'unknown' && routingPattern !== 'go_router' && /package:go_router\/go_router\.dart|\bGoRouter\b|\bcontext\.(go|push|replace)\s*\(/.test(text)) {
    issues.push({ file, issue: `Architecture contract violation: routing pattern is ${routingPattern}, but go_router usage was introduced.` });
  }
  if (contract.i18nPattern !== 'unknown' && contract.i18nPattern !== 'getx_tr' && /\.tr\b/.test(text)) {
    issues.push({ file, issue: `Architecture contract violation: i18n pattern is ${contract.i18nPattern}, but GetX .tr usage was introduced.` });
  }
  if (contract.i18nPattern !== 'unknown' && contract.i18nPattern !== 'build_context_t_extension' && /\bcontext\.t\s*\(/.test(text)) {
    issues.push({ file, issue: `Architecture contract violation: i18n pattern is ${contract.i18nPattern}, but context.t usage was introduced.` });
  }
  if (contract.themePatterns.length > 0 && !hasThemePattern(contract, 'themeService.colors') && /\bthemeService\.colors\b/.test(text)) {
    issues.push({ file, issue: 'Architecture contract violation: themeService.colors was introduced without targetConventions theme evidence.' });
  }
  if (contract.themePatterns.length > 0 && !hasThemePattern(contract, 'context.pbColors') && /\bcontext\.pbColors\b/.test(text)) {
    issues.push({ file, issue: 'Architecture contract violation: context.pbColors was introduced without targetConventions theme evidence.' });
  }

  const stem = path.basename(file, '.dart');
  if (/widgets\/.+_section(?:_\d+)?\.dart$/.test(file) && !contract.expectedWidgetFileStems.has(stem)) {
    issues.push({ file, issue: 'Architecture drift: generated widget file looks like a runtime DOM section translation and is not in implementationContract.fileTree.' });
  }

  return issues;
}

function unsupportedFrameworkPatterns(contract: ArchitectureContract): Array<{ label: string; pattern: RegExp }> {
  const patterns: Array<{ label: string; pattern: RegExp }> = [];
  const statePattern = contract.pageStatePattern !== 'unknown'
    ? contract.pageStatePattern
    : contract.stateScope === 'global' || contract.stateScope === 'package'
      ? 'unknown'
      : contract.statePattern;
  if (statePattern !== 'unknown' && statePattern !== 'getx') {
    patterns.push({ label: 'GetX state framework', pattern: /package:get\/get\.dart|\bGetxController\b|\bGetView\b|\bObx\s*\(|\bGetBuilder\s*</ });
  }
  if (statePattern !== 'unknown' && statePattern !== 'flutter_bloc') {
    patterns.push({ label: 'flutter_bloc state framework', pattern: /package:flutter_bloc\/flutter_bloc\.dart|\bBlocProvider\b|\bBlocBuilder\b|\bBlocListener\b|\bCubit\s*</ });
  }
  if (statePattern !== 'unknown' && statePattern !== 'riverpod') {
    patterns.push({ label: 'Riverpod state framework', pattern: /package:flutter_riverpod\/flutter_riverpod\.dart|package:riverpod\/riverpod\.dart|\bConsumerWidget\b|\bWidgetRef\b|\bProviderScope\b/ });
  }
  if (statePattern !== 'unknown' && statePattern !== 'provider' && statePattern !== 'flutter_bloc') {
    patterns.push({ label: 'Provider state framework', pattern: /package:provider\/provider\.dart|\bChangeNotifierProvider\b|\bConsumer\s*</ });
  }
  return patterns;
}

function usesDetectedColorTheme(text: string, contract: ArchitectureContract | undefined): boolean {
  if (!contract) return /themeService\.colors|context\.pbColors|Theme\.of\s*\(\s*context\s*\)\.colorScheme/.test(text);
  return (hasThemePattern(contract, 'themeService.colors') && /\bthemeService\.colors\b/.test(text))
    || (hasThemePattern(contract, 'context.pbColors') && /\bcontext\.pbColors\b/.test(text))
    || (contract.themePatterns.includes('Theme.of(context)') && /\bTheme\.of\s*\(\s*context\s*\)\.colorScheme\b/.test(text));
}

function usesDetectedTextTheme(text: string, contract: ArchitectureContract | undefined): boolean {
  if (!contract) return /themeService\.textStyles|context\.pbTextStyles|Theme\.of\s*\(\s*context\s*\)\.textTheme/.test(text);
  return (hasThemePattern(contract, 'themeService.textStyles') && /\bthemeService\.textStyles\b/.test(text))
    || (hasThemePattern(contract, 'context.pbTextStyles') && /\bcontext\.pbTextStyles\b/.test(text))
    || (contract.themePatterns.includes('Theme.of(context)') && /\bTheme\.of\s*\(\s*context\s*\)\.textTheme\b/.test(text));
}

function hasThemePattern(contract: ArchitectureContract, pattern: string): boolean {
  if (contract.themePatterns.includes(pattern)) return true;
  if (pattern === 'themeService.colors' && contract.themePatterns.includes('themeService.textStyles')) return true;
  if (pattern === 'context.pbColors' && contract.themePatterns.includes('context.pbTextStyles')) return true;
  return false;
}

function scanWidgetContract(file: string, text: string, plan: UiBuildPlan): FlutterTargetFileIssue[] {
  const issues: FlutterTargetFileIssue[] = [];
  const stem = path.basename(file, '.dart');
  const contract = plan.implementationContract.widgetContracts.find((item) => toSnakeCase(item.widget) === stem);
  if (!contract || contract.shouldReadController) return issues;
  if (/\b(context\.(watch|read)\s*<|BlocProvider\.of\s*<|Get\.find\s*<|Provider\.of\s*<|ref\.watch\s*\(|ref\.read\s*\()/.test(text)) {
    issues.push({
      file,
      issue: `Widget contract violation: ${contract.widget} should receive props/callbacks and not read the page controller/cubit/provider directly.`,
    });
  }
  return issues;
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

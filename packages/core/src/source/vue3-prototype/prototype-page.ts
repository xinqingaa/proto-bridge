import path from 'node:path';
import {
  basenameWithoutExt,
  firstSegment,
  normalizeRoute,
  pathExists,
  readJsonIfExists,
  readTextIfExists,
  relativeOrAbsolute,
  resolveFrom,
  toPosixPath,
} from '../../shared/paths.js';
import { evaluateModuleArray, extractExportedArrayLiteral } from './js-literal.js';
import { analyzeVueSfc } from './vue-sfc.js';
import type {
  AnalyzePrototypePageInput,
  ChangelogItem,
  ModuleConfig,
  PageType,
  PrototypePageAnalysis,
  ScreenConfig,
} from '../../types/index.js';

type ConfigSource = {
  pageType: PageType;
  exportName: string;
  configPath: string;
  viewsRoot: string;
};

type ScreenEntry = {
  pageType: PageType;
  moduleLabel?: string | undefined;
  screen: ScreenConfig;
};

const CONFIG_SOURCES: ConfigSource[] = [
  {
    pageType: 'prototype',
    exportName: 'prototypeModules',
    configPath: 'prototype/src/config/prototypeScreens.js',
    viewsRoot: 'prototype/src/views/prototype',
  },
  {
    pageType: 'prototype',
    exportName: 'prdPageModules',
    configPath: 'prototype/src/config/prdPageRegistry.js',
    viewsRoot: 'prototype/src/views/prototype',
  },
  {
    pageType: 'design',
    exportName: 'designModules',
    configPath: 'prototype/src/config/designScreens.js',
    viewsRoot: 'prototype/src/views/design',
  },
];

export async function analyzePrototypePage(input: AnalyzePrototypePageInput): Promise<PrototypePageAnalysis> {
  const prototypeRoot = path.resolve(input.prototypeRoot);
  const warnings: string[] = [];
  const entries = await loadScreenEntries(prototypeRoot, warnings);

  const route = input.route ? normalizeRoute(input.route) : undefined;
  const vueCandidates = input.vue ? buildVueMatchCandidates(prototypeRoot, input.vue) : [];

  const matchedEntry =
    (route ? entries.find((entry) => normalizeRoute(asString(entry.screen.path) ?? '') === route) : undefined) ??
    (route ? findEntryByRouteLastSegment(entries, route) : undefined) ??
    (vueCandidates.length > 0
      ? entries.find((entry) => viewMatchesCandidates(asString(entry.screen.view), vueCandidates))
      : undefined);

  if (!matchedEntry && !input.vue) {
    throw new Error(formatMissingRouteError(prototypeRoot, route, entries, warnings));
  }

  const pageType = matchedEntry?.pageType ?? inferPageTypeFromVue(input.vue);
  const screen = matchedEntry?.screen;
  const view = asString(screen?.view) ?? input.vue;

  if (!view) {
    throw new Error('Unable to resolve Vue file. Provide --vue or a route that maps to a view.');
  }

  const vuePath = await resolveVuePath(prototypeRoot, pageType, view, input.vue);
  const sourceCode = await readTextIfExists(vuePath);
  if (!sourceCode) {
    warnings.push(`Vue source file not found: ${vuePath}`);
  }
  const sfc = analyzeVueSfc(sourceCode);

  const screenId = asString(screen?.screenId);
  const moduleFromView = firstSegment(asString(screen?.view) ?? input.vue);
  const moduleFromScreenId = screenId?.split('.')[0];
  const prototypeModule = moduleFromView ?? moduleFromScreenId;
  const notesResult = await readNotes(prototypeRoot, screen, {
    module: prototypeModule,
    screenId,
    view: asString(screen?.view) ?? input.vue,
    vuePath,
  });
  if (!notesResult.notes) {
    warnings.push(`Notes file not found for ${screenId ?? view}`);
  }

  const i18nResult = await readI18n(prototypeRoot, screenId, warnings);

  if (!matchedEntry && input.vue) {
    warnings.push('No screen config matched the provided Vue file; generated metadata from the file path only.');
  }

  return {
    prototypeRoot,
    pageType,
    route: route ?? asString(screen?.path),
    vuePath,
    vueRelativePath: relativeOrAbsolute(prototypeRoot, vuePath),
    screenId,
    module: prototypeModule,
    moduleLabel: matchedEntry?.moduleLabel,
    label: asString(screen?.label),
    title: asString(screen?.title),
    view: asString(screen?.view),
    key: asString(screen?.key),
    name: asString(screen?.name),
    status: asString(screen?.status),
    completed: asBoolean(screen?.completed),
    owner: asString(screen?.owner),
    changelog: normalizeChangelog(screen?.changelog),
    sourceCode,
    sfc,
    notes: notesResult.notes,
    notesPath: notesResult.notesPath,
    i18n: i18nResult.i18n,
    i18nPath: i18nResult.i18nPath,
    config: screen,
    warnings,
  };
}

async function loadScreenEntries(prototypeRoot: string, warnings: string[]): Promise<ScreenEntry[]> {
  const entries: ScreenEntry[] = [];
  const optionalConfigWarnings: string[] = [];

  for (const source of CONFIG_SOURCES) {
    const filePath = path.join(prototypeRoot, source.configPath);
    const text = await readTextIfExists(filePath);
    if (!text) {
      optionalConfigWarnings.push(`Config file not found: ${filePath}`);
      continue;
    }

    const literal = extractExportedArrayLiteral(text, source.exportName);
    if (!literal) {
      optionalConfigWarnings.push(`Unable to find export ${source.exportName} in ${filePath}`);
      continue;
    }

    try {
      const modules = evaluateModuleArray(literal, source.exportName);
      collectScreens(source.pageType, modules, entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(message);
    }
  }

  if (entries.length === 0) warnings.push(...optionalConfigWarnings);
  return entries;
}

function collectScreens(pageType: PageType, modules: ModuleConfig[], entries: ScreenEntry[]): void {
  for (const moduleConfig of modules) {
    const moduleLabel = asString(moduleConfig.module);
    collectScreenItems(pageType, moduleLabel, moduleConfig.items ?? [], entries);
  }
}

function collectScreenItems(
  pageType: PageType,
  moduleLabel: string | undefined,
  items: ScreenConfig[],
  entries: ScreenEntry[],
): void {
  for (const item of items) {
    entries.push({ pageType, moduleLabel, screen: item });
    if (Array.isArray(item.children)) {
      collectScreenItems(pageType, moduleLabel, item.children, entries);
    }
  }
}

async function resolveVuePath(
  prototypeRoot: string,
  pageType: PageType,
  view: string,
  vueInput: string | undefined,
): Promise<string> {
  const candidates: string[] = [];
  const viewsRoot = CONFIG_SOURCES.find((source) => source.pageType === pageType)?.viewsRoot;

  if (vueInput) {
    candidates.push(resolveFrom(prototypeRoot, vueInput));
    candidates.push(path.join(prototypeRoot, 'prototype/src/views/prototype', vueInput));
    candidates.push(path.join(prototypeRoot, 'prototype/src/views/design', vueInput));
    candidates.push(path.join(prototypeRoot, 'prototype/src/views', vueInput));
  }

  if (viewsRoot) {
    candidates.push(path.join(prototypeRoot, viewsRoot, view));
  }

  candidates.push(path.join(prototypeRoot, view));

  for (const candidate of dedupe(candidates)) {
    if (await pathExists(candidate)) return candidate;
  }

  return candidates[0] ?? path.join(prototypeRoot, view);
}

function buildVueMatchCandidates(prototypeRoot: string, vueInput: string): string[] {
  const absolute = resolveFrom(prototypeRoot, vueInput);
  const candidates = [
    vueInput,
    toPosixPath(vueInput),
    toPosixPath(path.relative(path.join(prototypeRoot, 'prototype/src/views/prototype'), absolute)),
    toPosixPath(path.relative(path.join(prototypeRoot, 'prototype/src/views/design'), absolute)),
    toPosixPath(path.relative(path.join(prototypeRoot, 'prototype/src/views'), absolute)),
    toPosixPath(path.relative(prototypeRoot, absolute)),
  ];

  return dedupe(
    candidates
      .filter((candidate) => candidate && !candidate.startsWith('..'))
      .flatMap((candidate) => [
        candidate,
        candidate.replace(/^prototype\/src\/views\/prototype\//, ''),
        candidate.replace(/^prototype\/src\/views\/design\//, ''),
        candidate.replace(/^prototype\/src\/views\//, ''),
      ]),
  );
}

function viewMatchesCandidates(view: string | undefined, candidates: string[]): boolean {
  if (!view) return false;
  const normalizedView = toPosixPath(view);
  return candidates.some((candidate) => {
    const normalizedCandidate = toPosixPath(candidate);
    return normalizedCandidate === normalizedView || normalizedCandidate.endsWith(`/${normalizedView}`);
  });
}

function findEntryByRouteLastSegment(entries: ScreenEntry[], route: string): ScreenEntry | undefined {
  const lastSegment = routeLastSegment(route);
  if (!lastSegment) return undefined;
  const matches = entries.filter((entry) => routeLastSegment(asString(entry.screen.path)) === lastSegment);
  return matches.length === 1 ? matches[0] : undefined;
}

function routeLastSegment(route: string | undefined): string | undefined {
  const normalized = route ? normalizeRoute(route) : '';
  return normalized.split('?')[0]?.split('/').filter(Boolean).at(-1);
}

function formatMissingRouteError(
  prototypeRoot: string,
  route: string | undefined,
  entries: ScreenEntry[],
  warnings: string[],
): string {
  const routeSamples = entries
    .map((entry) => normalizeRoute(asString(entry.screen.path) ?? ''))
    .filter((item) => item.length > 1)
    .slice(0, 8);
  const details = [
    `Unable to find prototype screen for route: ${route ?? '(missing route)'}`,
    `source.root: ${prototypeRoot}`,
    `loaded screens: ${entries.length}`,
  ];

  if (routeSamples.length > 0) {
    details.push(`available route examples: ${routeSamples.join(', ')}`);
  }

  if (warnings.length > 0) {
    details.push(`source config warnings: ${warnings.slice(0, 4).join(' | ')}`);
  }

  details.push('Suggestions: check config.source.root, verify the route exists in prototypeScreens.js/prdPageRegistry.js/designScreens.js, or use --vue <file>.');
  return details.join('\n');
}

async function readNotes(
  prototypeRoot: string,
  screen: ScreenConfig | undefined,
  context: {
    module?: string | undefined;
    screenId?: string | undefined;
    view?: string | undefined;
    vuePath: string;
  },
): Promise<{ notes?: string | undefined; notesPath?: string | undefined }> {
  const explicit = asString(screen?.notesPath) ?? asString(screen?.notes);
  if (explicit && !looksLikePath(explicit)) {
    return { notes: explicit };
  }

  const basename = `${basenameWithoutExt(context.view ?? context.vuePath)}.md`;
  const modules = dedupe([
    context.module,
    context.screenId?.split('.')[0],
    firstSegment(context.view),
    firstSegment(relativeOrAbsolute(path.join(prototypeRoot, 'prototype/src/views/prototype'), context.vuePath)),
  ]);

  const candidates = [
    explicit ? path.join(prototypeRoot, explicit) : undefined,
    explicit ? path.join(prototypeRoot, 'prototype/notes', explicit) : undefined,
    ...modules.map((moduleName) => path.join(prototypeRoot, 'prototype/notes', moduleName, basename)),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of dedupe(candidates)) {
    const notes = await readTextIfExists(candidate);
    if (notes) return { notes, notesPath: candidate };
  }

  return {};
}

async function readI18n(
  prototypeRoot: string,
  screenId: string | undefined,
  warnings: string[],
): Promise<{ i18n?: Record<string, unknown> | undefined; i18nPath?: string | undefined }> {
  if (!screenId) return {};

  const i18nPath = path.join(prototypeRoot, 'prototype/src/i18n/prototype', `${screenId}.json`);
  try {
    const i18n = await readJsonIfExists(i18nPath);
    return i18n ? { i18n, i18nPath } : {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Unable to parse i18n file ${i18nPath}: ${message}`);
    return {};
  }
}

function inferPageTypeFromVue(vue: string | undefined): PageType {
  if (vue && toPosixPath(vue).includes('/design/')) return 'design';
  return 'prototype';
}

function looksLikePath(value: string): boolean {
  return value.endsWith('.md') || value.includes('/');
}

function normalizeChangelog(value: unknown): ChangelogItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object') return {};
    const record = item as Record<string, unknown>;
    return {
      date: asString(record.date),
      author: asString(record.author),
      summary: asString(record.summary),
    };
  });
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function dedupe<T>(items: Array<T | undefined>): T[] {
  return [...new Set(items.filter((item): item is T => item !== undefined))];
}

import { createHash } from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { AdapterProjectConfig } from '../types/index.js';
import type { ReconstructPageContextInput } from '../workflows/capability-first/types.js';

export const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';
export const DEFAULT_OUTPUT_ROOT = './output';

export type ProtoBridgeProjectConfig = {
  adapter?: string | undefined;
  root?: string | undefined;
};

export type ProtoBridgeRuntimeConfig = {
  capture?: boolean | undefined;
  viewport?: ProtoBridgeViewport | undefined;
};

export type ProtoBridgeViewport = {
  width: number;
  height: number;
  deviceScaleFactor?: number | undefined;
};

export type ProtoBridgeOutputConfig = {
  root?: string | undefined;
};

export type ProtoBridgeConfig = {
  schemaVersion?: 1 | undefined;
  source?: ProtoBridgeProjectConfig | undefined;
  target?: ProtoBridgeProjectConfig | undefined;
  runtime?: ProtoBridgeRuntimeConfig | undefined;
  output?: ProtoBridgeOutputConfig | undefined;
  sourceBrief?: boolean | undefined;
};

export type ProtoBridgeInputOverrides = {
  sourceRoot?: string | undefined;
  sourceAdapter?: string | undefined;
  targetRoot?: string | undefined;
  targetAdapter?: string | undefined;
  url?: string | undefined;
  route?: string | undefined;
  vue?: string | undefined;
  output?: string | undefined;
  capture?: boolean | undefined;
  viewport?: ProtoBridgeViewport | undefined;
  sourceBrief?: boolean | undefined;
  buildPlan?: boolean | undefined;
  buildReview?: boolean | undefined;
  saveArtifacts?: boolean | undefined;
  trace?: boolean | undefined;
  screenshotPath?: string | undefined;
  ocrText?: string[] | undefined;
  ocrBoxes?: import('../types/index.js').OcrTextBox[] | undefined;
  targetModule?: string | undefined;
};

export type ResolveProtoBridgeInputOptions = {
  config?: ProtoBridgeConfig | undefined;
  configDir: string;
  cwd: string;
  outputBaseDir?: string | undefined;
  overrides?: ProtoBridgeInputOverrides | undefined;
  requirePageInput?: boolean | undefined;
};

export type ResolvedProtoBridgeInput = {
  input: ReconstructPageContextInput;
  page: {
    url?: string | undefined;
    route?: string | undefined;
    vue?: string | undefined;
  };
  sourceRoot?: string | undefined;
  targetRoot?: string | undefined;
  warnings: string[];
};

const TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'source',
  'target',
  'runtime',
  'output',
  'sourceBrief',
]);

export async function readProtoBridgeConfigFile(
  configPath: string,
  options: { required: boolean },
): Promise<ProtoBridgeConfig | undefined> {
  let text: string;
  try {
    text = await readFile(configPath, 'utf8');
  } catch {
    if (options.required) {
      throw new Error(`Missing required config file.\nConfig path: ${configPath}`);
    }
    return undefined;
  }
  return parseProtoBridgeConfig(text, configPath);
}

export function parseProtoBridgeConfig(text: string, configPath = 'proto-bridge.config.json'): ProtoBridgeConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config file ${configPath}: ${message}`);
  }

  if (!isRecord(parsed)) throw new Error(`Invalid config file ${configPath}: config root must be a JSON object`);
  assertAllowedKeys(parsed, TOP_LEVEL_KEYS, `config ${configPath}`);

  const schemaVersion = parsed.schemaVersion;
  if (schemaVersion !== undefined && schemaVersion !== 1) {
    throw new Error(`Invalid config file ${configPath}: schemaVersion must be 1`);
  }

  return {
    ...(schemaVersion === 1 ? { schemaVersion: 1 } : {}),
    source: parseProjectConfig(parsed.source, 'source', configPath),
    target: parseProjectConfig(parsed.target, 'target', configPath),
    runtime: parseRuntimeConfig(parsed.runtime, configPath),
    output: parseOutputConfig(parsed.output, configPath),
    sourceBrief: parseOptionalBoolean(parsed.sourceBrief, 'sourceBrief', configPath),
  };
}

export function resolveProtoBridgeInput(options: ResolveProtoBridgeInputOptions): ResolvedProtoBridgeInput {
  const config = options.config;
  const overrides = options.overrides ?? {};
  const page = resolvePageInput(overrides);
  if (options.requirePageInput && !page.url && !page.route && !page.vue && !overrides.screenshotPath) {
    throw new Error('Provide --url, --route, --vue, or screenshotPath.');
  }

  const sourceRoot = overrides.sourceRoot
    ? resolvePath(overrides.sourceRoot, options.cwd)
    : resolveProjectRoot(config?.source, options.configDir);
  const targetRoot = overrides.targetRoot
    ? resolvePath(overrides.targetRoot, options.cwd)
    : resolveProjectRoot(config?.target, options.configDir);
  const source = sourceRoot
    ? projectToAdapterConfig(overrides.sourceAdapter ?? config?.source?.adapter ?? 'vue3-prototype', sourceRoot)
    : undefined;
  const target = targetRoot
    ? projectToAdapterConfig(overrides.targetAdapter ?? config?.target?.adapter ?? 'flutter-app', targetRoot)
    : undefined;
  const outDir = resolveOutputDir({
    output: overrides.output,
    configuredOutputRoot: config?.output?.root,
    configDir: options.configDir,
    cwd: options.cwd,
    outputBaseDir: options.outputBaseDir,
    seed: page.route ?? page.vue ?? page.url ?? 'page',
  });

  return {
    input: {
      source,
      target,
      route: page.route,
      vue: page.vue,
      url: page.url,
      screenshotPath: overrides.screenshotPath ? resolvePath(overrides.screenshotPath, options.cwd) : undefined,
      ocrText: overrides.ocrText,
      ocrBoxes: overrides.ocrBoxes,
      outDir,
      capture: overrides.capture ?? config?.runtime?.capture ?? Boolean(page.url),
      viewport: overrides.viewport ?? config?.runtime?.viewport,
      saveArtifacts: overrides.saveArtifacts,
      targetModule: overrides.targetModule,
      buildPlan: overrides.buildPlan ?? Boolean(target),
      buildReview: overrides.buildReview ?? Boolean(target),
      sourceBrief: overrides.sourceBrief ?? config?.sourceBrief ?? false,
      trace: overrides.trace ?? false,
    },
    page,
    sourceRoot,
    targetRoot,
    warnings: [],
  };
}

export function resolveConfigPath(input: string | undefined, cwd: string): string {
  const configInput = input ?? DEFAULT_CONFIG_FILE;
  return path.isAbsolute(configInput) ? configInput : path.resolve(cwd, configInput);
}

export function extractRouteFromUrl(urlInput: string): string {
  const routeWithQuery = routeWithQueryFromUrl(urlInput);
  const route = routeWithQuery.split('?')[0]?.split('#')[0];
  if (!route) throw new Error(`Unable to extract route from URL: ${urlInput}`);
  return normalizePageRoute(route);
}

export function normalizePageRoute(route: string): string {
  const routeOnly = route.split('?')[0] ?? route;
  const normalized = routeOnly.startsWith('/') ? routeOnly : `/${routeOnly}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function resolvePageInput(
  overrides: ProtoBridgeInputOverrides,
): { url?: string | undefined; route?: string | undefined; vue?: string | undefined } {
  const url = overrides.url;
  const explicitRoute = overrides.route;
  const vue = overrides.vue;
  const route = explicitRoute
    ? normalizePageRoute(explicitRoute)
    : url
      ? extractRouteFromUrl(url)
      : undefined;
  return { url, route, vue };
}

function routeWithQueryFromUrl(urlInput: string): string {
  if (!urlInput.trim()) throw new Error('url must be a non-empty URL or route path.');
  if (urlInput.startsWith('/')) return urlInput;

  try {
    const parsed = new URL(urlInput);
    if (parsed.hash.startsWith('#/')) return parsed.hash.slice(1);
    if (parsed.pathname) return `${parsed.pathname}${parsed.search}`;
  } catch {
    throw new Error(`url must be an absolute URL or a route path: ${urlInput}`);
  }

  throw new Error(`Unable to extract route from URL: ${urlInput}`);
}

function resolveOutputDir(input: {
  output?: string | undefined;
  configuredOutputRoot?: string | undefined;
  configDir: string;
  cwd: string;
  outputBaseDir?: string | undefined;
  seed: string;
}): string {
  if (input.output) return resolvePath(input.output, input.outputBaseDir ?? input.cwd);
  const root = input.configuredOutputRoot
    ? resolvePath(input.configuredOutputRoot, input.configDir)
    : resolvePath(DEFAULT_OUTPUT_ROOT, input.cwd);
  return path.join(root, createOutputDirectoryName(input.seed));
}

function createOutputDirectoryName(seed: string): string {
  const timestamp = Date.now().toString(36);
  const digest = createHash('sha1').update(`${seed}:${timestamp}`).digest('hex').slice(0, 6);
  return `${slugFromSeed(seed)}-${timestamp}-${digest}`;
}

function slugFromSeed(seed: string): string {
  return seed
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/Page$/i, '')
    .toLowerCase()
    || 'page';
}

function resolveProjectRoot(project: ProtoBridgeProjectConfig | undefined, configDir: string): string | undefined {
  if (!project?.root) return undefined;
  return resolvePath(project.root, configDir);
}

function projectToAdapterConfig(adapter: string, root: string): AdapterProjectConfig {
  return { adapter, root };
}

function resolvePath(value: string, baseDir: string): string {
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function parseProjectConfig(value: unknown, label: string, configPath: string): ProtoBridgeProjectConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`Invalid config file ${configPath}: ${label} must be an object`);
  assertAllowedKeys(value, new Set(['adapter', 'root']), `${label} in ${configPath}`);
  return {
    adapter: parseOptionalString(value.adapter, `${label}.adapter`, configPath),
    root: parseOptionalString(value.root, `${label}.root`, configPath),
  };
}

function parseRuntimeConfig(value: unknown, configPath: string): ProtoBridgeRuntimeConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`Invalid config file ${configPath}: runtime must be an object`);
  assertAllowedKeys(value, new Set(['capture', 'viewport']), `runtime in ${configPath}`);
  return {
    capture: parseOptionalBoolean(value.capture, 'runtime.capture', configPath),
    viewport: parseViewport(value.viewport, configPath),
  };
}

function parseOutputConfig(value: unknown, configPath: string): ProtoBridgeOutputConfig | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`Invalid config file ${configPath}: output must be an object`);
  assertAllowedKeys(value, new Set(['root']), `output in ${configPath}`);
  return {
    root: parseOptionalString(value.root, 'output.root', configPath),
  };
}

function parseViewport(value: unknown, configPath: string): ProtoBridgeViewport | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`Invalid config file ${configPath}: runtime.viewport must be an object`);
  assertAllowedKeys(value, new Set(['width', 'height', 'deviceScaleFactor']), `runtime.viewport in ${configPath}`);
  if (typeof value.width !== 'number' || typeof value.height !== 'number') {
    throw new Error(`Invalid config file ${configPath}: runtime.viewport.width and height must be numbers`);
  }
  return {
    width: value.width,
    height: value.height,
    deviceScaleFactor: parseOptionalNumber(value.deviceScaleFactor, 'runtime.viewport.deviceScaleFactor', configPath),
  };
}

function parseOptionalString(value: unknown, label: string, configPath: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Invalid config file ${configPath}: ${label} must be a string`);
  return value;
}

function parseOptionalBoolean(value: unknown, label: string, configPath: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`Invalid config file ${configPath}: ${label} must be a boolean`);
  return value;
}

function parseOptionalNumber(value: unknown, label: string, configPath: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number') throw new Error(`Invalid config file ${configPath}: ${label} must be a number`);
  return value;
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: Set<string>, label: string): void {
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown config field(s) in ${label}: ${unknownKeys.join(', ')}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

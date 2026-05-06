#!/usr/bin/env node

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { generateMigrationSpec, type GenerateMigrationSpecInput } from '@proto-bridge/core';

type ParsedArgs = {
  command: string;
  values: Record<string, string | boolean>;
};

type ProtoBridgeConfig = {
  source?: ProjectConfig | undefined;
  target?: ProjectConfig | undefined;
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
  prototypeUrl?: string | undefined;
  out?: string | undefined;
  outDir?: string | undefined;
  noCapture?: boolean | undefined;
};

type ProjectConfig = {
  adapter?: string | undefined;
  root?: string | undefined;
};

type LoadedConfig = {
  path: string;
  dir: string;
  config: ProtoBridgeConfig;
};

const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';
const ALLOWED_FLAGS = new Set([
  'capture',
  'config',
  'help',
  'no-capture',
  'out',
  'out-dir',
  'prototype-url',
  'route',
  'source-adapter',
  'target-adapter',
  'url',
  'vue',
]);

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.values.help || parsed.command === 'help') {
    console.log(usage());
    return;
  }

  if (parsed.command !== 'generate') {
    throw new Error(`Unknown command: ${parsed.command || '(missing)'}`);
  }

  const input = await buildGenerateInput(parsed.values);
  const result = await generateMigrationSpec(input);

  console.log(`screenId: ${result.context.source.screenId ?? 'unknown'}`);
  console.log(`migration-context: ${result.files.migrationContext}`);
  console.log(`migration-spec: ${result.files.migrationSpec}`);
  if (result.files.screenshot) console.log(`screenshot: ${result.files.screenshot}`);
  if (result.files.domSnapshot) console.log(`dom-snapshot: ${result.files.domSnapshot}`);
  if (result.context.recommendations.risks.length > 0) {
    console.log(`warnings: ${result.context.recommendations.risks.length}`);
  }
}

async function buildGenerateInput(values: Record<string, string | boolean>): Promise<GenerateMigrationSpecInput> {
  const loadedConfig = await loadRequiredConfig(values);
  const config = loadedConfig.config;
  const invocationDir = process.env.INIT_CWD ?? process.cwd();

  const sourceRoot = resolveInputPath(config.source?.root, invocationDir, loadedConfig.dir);
  const targetRoot = resolveInputPath(config.target?.root, invocationDir, loadedConfig.dir);
  const sourceAdapter = readString(values, 'source-adapter') ?? config.source?.adapter ?? 'vue3-prototype';
  const targetAdapter = readString(values, 'target-adapter') ?? config.target?.adapter ?? 'flutter-app';
  const pageInput = resolvePageInput(values, config);
  const prototypeUrl = resolvePrototypeUrl(values, config, pageInput.url);
  const noCapture = resolveNoCapture(values, config);
  const outValue =
    readString(values, 'out') ??
    readString(values, 'out-dir') ??
    config.out ??
    config.outDir ??
    defaultOutDir(pageInput.route, pageInput.vue);
  const outDir = resolveOutDir(outValue);

  if (!sourceRoot) throw new Error('config.source.root is required');
  if (!targetRoot) throw new Error('config.target.root is required');
  if (!pageInput.route && !pageInput.vue) throw new Error('Provide --url, --route, or --vue.');
  if (pageInput.route && pageInput.vue) throw new Error('Use only one page input: --url, --route, or --vue.');
  if (sourceAdapter !== 'vue3-prototype') throw new Error('Phase 1 only supports --source-adapter vue3-prototype');
  if (targetAdapter !== 'flutter-app') throw new Error('Phase 1 only supports --target-adapter flutter-app');

  return {
    source: {
      adapter: sourceAdapter,
      root: sourceRoot,
    },
    target: {
      adapter: targetAdapter,
      root: targetRoot,
    },
    route: pageInput.route,
    vue: pageInput.vue,
    prototypeUrl,
    outDir,
    noCapture,
  };
}

async function loadRequiredConfig(values: Record<string, string | boolean>): Promise<LoadedConfig> {
  const invocationDir = process.env.INIT_CWD ?? process.cwd();
  const configInput = readString(values, 'config') ?? DEFAULT_CONFIG_FILE;
  const configPath = path.isAbsolute(configInput) ? configInput : path.resolve(invocationDir, configInput);

  let text: string;
  try {
    text = await readFile(configPath, 'utf8');
  } catch {
    throw new Error(
      [
        `Missing required config file: ${configPath}`,
        `Create it from the example first: cp proto-bridge.config.example.json ${DEFAULT_CONFIG_FILE}`,
        'Then edit source.root and target.root for your local machine.',
      ].join('\n'),
    );
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) throw new Error('config root must be a JSON object');
    return {
      path: configPath,
      dir: path.dirname(configPath),
      config: parsed as ProtoBridgeConfig,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config file ${configPath}: ${message}`);
  }
}

function resolvePageInput(
  values: Record<string, string | boolean>,
  config: ProtoBridgeConfig,
): { route?: string | undefined; vue?: string | undefined; url?: string | undefined } {
  const cliUrl = readString(values, 'url');
  if (cliUrl) return { route: extractRouteFromUrl(cliUrl), url: cliUrl };

  const cliRoute = readString(values, 'route');
  if (cliRoute) return { route: normalizeRoute(cliRoute) };

  const cliVue = readString(values, 'vue');
  if (cliVue) return { vue: cliVue };

  if (config.url) return { route: extractRouteFromUrl(config.url), url: config.url };
  if (config.route) return { route: normalizeRoute(config.route) };
  if (config.vue) return { vue: config.vue };

  return {};
}

function resolvePrototypeUrl(
  values: Record<string, string | boolean>,
  config: ProtoBridgeConfig,
  pageUrl: string | undefined,
): string | undefined {
  return readString(values, 'prototype-url') ?? pageUrl ?? config.prototypeUrl ?? config.url;
}

function resolveNoCapture(values: Record<string, string | boolean>, config: ProtoBridgeConfig): boolean {
  if (values.capture !== undefined) return false;
  const cliNoCapture = readBoolean(values, 'no-capture');
  if (cliNoCapture !== undefined) return cliNoCapture;
  return config.noCapture ?? false;
}

function resolveInputPath(
  configValue: string | undefined,
  invocationDir: string,
  configDir: string,
): string | undefined {
  if (configValue) return path.isAbsolute(configValue) ? configValue : path.resolve(configDir, configValue);
  return undefined;
}

function parseArgs(args: string[]): ParsedArgs {
  const cleanArgs = args.filter((arg) => arg !== '--');
  const [maybeCommand, ...rest] = cleanArgs;
  const command = maybeCommand?.startsWith('--') ? 'generate' : maybeCommand ?? 'generate';
  const tokens = maybeCommand?.startsWith('--') ? cleanArgs : rest;
  const values: Record<string, string | boolean> = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token ?? ''}`);
    }

    const withoutPrefix = token.slice(2);
    const [inlineKey, inlineValue] = withoutPrefix.split('=', 2);
    const key = inlineKey;

    if (!key) throw new Error(`Invalid flag: ${token}`);
    if (!ALLOWED_FLAGS.has(key)) throw new Error(`Unknown flag: --${key}`);

    if (inlineValue !== undefined) {
      values[key] = inlineValue;
      continue;
    }

    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) {
      values[key] = true;
      continue;
    }

    values[key] = next;
    index += 1;
  }

  return { command, values };
}

function readString(values: Record<string, string | boolean>, key: string): string | undefined {
  const value = values[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readBoolean(values: Record<string, string | boolean>, key: string): boolean | undefined {
  const value = values[key];
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`--${key} must be true or false when a value is provided`);
}

function extractRouteFromUrl(urlInput: string): string {
  const routeWithQuery = routeWithQueryFromUrl(urlInput);
  const route = routeWithQuery.split('?')[0]?.split('#')[0];
  if (!route) throw new Error(`Unable to extract route from --url: ${urlInput}`);
  return normalizeRoute(route);
}

function routeWithQueryFromUrl(urlInput: string): string {
  if (urlInput.startsWith('/')) return urlInput;

  try {
    const parsed = new URL(urlInput);
    if (parsed.hash.startsWith('#/')) return parsed.hash.slice(1);
    if (parsed.pathname) return `${parsed.pathname}${parsed.search}`;
  } catch {
    throw new Error(`--url must be an absolute URL or a route path: ${urlInput}`);
  }

  throw new Error(`Unable to extract route from --url: ${urlInput}`);
}

function normalizeRoute(route: string): string {
  const routeOnly = route.split('?')[0] ?? route;
  const normalized = routeOnly.startsWith('/') ? routeOnly : `/${routeOnly}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function defaultOutDir(route: string | undefined, vue: string | undefined): string {
  const source = route ?? vue ?? 'migration';
  const slug = source
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .toLowerCase();
  return path.join('output', slug || 'migration');
}

function resolveOutDir(outDir: string): string {
  if (path.isAbsolute(outDir)) return outDir;
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), outDir);
}

function usage(): string {
  return `Usage:
  pnpm run generate -- --url <prototype-url> [options]
  pnpm run generate -- --route <route> [options]
  pnpm run generate -- --vue <file> [options]

Required:
  proto-bridge.config.json must exist in the directory where you run the command.

Options:
  --config <file>             Config path, defaults to ./proto-bridge.config.json
  --url <url>                 Full prototype URL, hash route is extracted automatically
  --route <route>             Prototype or design route, for example /prototype/trade
  --vue <file>                Vue file path, absolute or relative to source.root
  --source-adapter <id>       Source adapter, defaults to vue3-prototype
  --target-adapter <id>       Target adapter, defaults to flutter-app
  --prototype-url <url>       Optional running prototype URL for Playwright capture
  --out <dir>                 Output directory
  --no-capture                Skip screenshot and DOM capture
  --capture                   Override config.noCapture and run Playwright capture
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`proto-bridge: ${message}`);
  process.exitCode = 1;
});

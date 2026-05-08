#!/usr/bin/env node

import path from 'node:path';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  generateMigrationSpec,
  type GenerateMigrationSpecInput,
  type GenerateMigrationSpecResult,
} from '@proto-bridge/core/workflows/source-aware-migration';

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
  outputRoot?: string | undefined;
  capture?: boolean | undefined;
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

type PageInput = {
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
  interactive?: boolean | undefined;
};

const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';
const DEFAULT_OUTPUT_ROOT = './output';
const ICON = {
  info: 'ℹ',
  step: '●',
  success: '✔',
  error: '✖',
  warn: '⚠',
};
const COLOR = {
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};
const ALLOWED_FLAGS = new Set([
  'capture',
  'config',
  'help',
  'output',
  'prototype-url',
  'route',
  'source-adapter',
  'target-adapter',
  'url',
  'vue',
]);
const BOOLEAN_FLAGS = new Set(['capture', 'help']);

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.values.help || parsed.command === 'help') {
    console.log(usage());
    return;
  }

  if (parsed.command === 'init') {
    await initConfig(parsed.values);
    return;
  }

  if (parsed.command !== 'generate') {
    throw new Error(`Unknown command: ${parsed.command || '(missing)'}`);
  }

  const input = await buildGenerateInput(parsed.values);
  step('Analyzing prototype and writing migration files...');
  const result = await generateMigrationSpec(input);

  printSuccess(input, result, parsed.values);
}

async function buildGenerateInput(values: Record<string, string | boolean>): Promise<GenerateMigrationSpecInput> {
  step('Loading proto-bridge config...');
  const loadedConfig = await loadRequiredConfig(values);
  const config = loadedConfig.config;
  const invocationDir = process.env.INIT_CWD ?? process.cwd();

  const sourceRoot = resolveInputPath(config.source?.root, loadedConfig.dir);
  const targetRoot = resolveInputPath(config.target?.root, loadedConfig.dir);
  const sourceAdapter = readString(values, 'source-adapter') ?? config.source?.adapter ?? 'vue3-prototype';
  const targetAdapter = readString(values, 'target-adapter') ?? config.target?.adapter ?? 'flutter-app';
  const pageInput = await resolvePageInput(values, config);
  const prototypeUrl = resolvePrototypeUrl(values, config, pageInput.url);
  const capture = resolveCapture(values, config);
  const outDir = await resolveGenerateOutDir(values, config, pageInput, invocationDir);

  if (!sourceRoot) throw new Error('config.source.root is required');
  if (!targetRoot) throw new Error('config.target.root is required');
  step('Checking project roots...');
  await validateProjectRoot('config.source.root', sourceRoot);
  await validateProjectRoot('config.target.root', targetRoot);
  if (!pageInput.route && !pageInput.vue) throw new Error('Provide --url, --route, or --vue.');
  if (pageInput.route && pageInput.vue) throw new Error('Use only one page input: --url, --route, or --vue.');
  if (sourceAdapter !== 'vue3-prototype') throw new Error('Unsupported source adapter. Supported: vue3-prototype');
  if (targetAdapter !== 'flutter-app') throw new Error('Unsupported target adapter. Supported: flutter-app');

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
    capture,
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
        'Missing required config file.',
        `Config path: ${configPath}`,
        'Create one: npx @proto-bridge/cli init',
        'Or create proto-bridge.config.json manually with source.root, target.root, outputRoot, and capture.',
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

async function initConfig(values: Record<string, string | boolean>): Promise<void> {
  const invocationDir = process.env.INIT_CWD ?? process.cwd();
  const configInput = readString(values, 'config') ?? DEFAULT_CONFIG_FILE;
  const configPath = path.isAbsolute(configInput) ? configInput : path.resolve(invocationDir, configInput);

  try {
    await access(configPath);
    throw new Error(`Config file already exists: ${configPath}`);
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }

  if (!isInteractive()) {
    throw new Error('proto-bridge init requires an interactive terminal.');
  }

  const answers = await withReadline(async (rl) => {
    const sourceRoot = await askRequired(rl, 'Source project root');
    const targetRoot = await askRequired(rl, 'Target project root');
    const outputRoot = (await ask(rl, `Output root (${DEFAULT_OUTPUT_ROOT})`)) || DEFAULT_OUTPUT_ROOT;
    const captureAnswer = (await ask(rl, 'Enable runtime capture? (y/N)')).toLowerCase();
    return {
      sourceRoot,
      targetRoot,
      outputRoot,
      capture: captureAnswer === 'y' || captureAnswer === 'yes',
    };
  });

  const config: ProtoBridgeConfig = {
    source: {
      adapter: 'vue3-prototype',
      root: answers.sourceRoot,
    },
    target: {
      adapter: 'flutter-app',
      root: answers.targetRoot,
    },
    outputRoot: answers.outputRoot,
    capture: answers.capture,
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  success('Config created');
  kv('config', configPath);
}

async function resolvePageInput(values: Record<string, string | boolean>, config: ProtoBridgeConfig): Promise<PageInput> {
  const cliUrl = readString(values, 'url');
  if (cliUrl) return { route: extractRouteFromUrl(cliUrl), url: cliUrl };

  const cliRoute = readString(values, 'route');
  if (cliRoute) return { route: normalizeRoute(cliRoute) };

  const cliVue = readString(values, 'vue');
  if (cliVue) return { vue: cliVue };

  if (config.url) return { route: extractRouteFromUrl(config.url), url: config.url };
  if (config.route) return { route: normalizeRoute(config.route) };
  if (config.vue) return { vue: config.vue };

  if (!isInteractive()) return {};

  return withReadline(async (rl) => {
    const inputType = await askChoice(rl, 'Page input type', ['url', 'route', 'vue']);
    const value = await askRequired(rl, `Enter ${inputType}`);

    if (inputType === 'url') return { route: extractRouteFromUrl(value), url: value, interactive: true };
    if (inputType === 'route') return { route: normalizeRoute(value), interactive: true };
    return { vue: value, interactive: true };
  });
}

function resolvePrototypeUrl(
  values: Record<string, string | boolean>,
  config: ProtoBridgeConfig,
  pageUrl: string | undefined,
): string | undefined {
  return readString(values, 'prototype-url') ?? pageUrl ?? config.prototypeUrl ?? config.url;
}

function resolveCapture(values: Record<string, string | boolean>, config: ProtoBridgeConfig): boolean {
  if (values.capture !== undefined) return true;
  return config.capture ?? false;
}

async function resolveGenerateOutDir(
  values: Record<string, string | boolean>,
  config: ProtoBridgeConfig,
  pageInput: PageInput,
  invocationDir: string,
): Promise<string> {
  const output = readString(values, 'output');
  if (output) return resolveFromDir(output, invocationDir);

  const outputRoot = config.outputRoot ?? DEFAULT_OUTPUT_ROOT;
  const defaultOutput = path.join(outputRoot, outputSlug(pageInput.route, pageInput.vue));
  const selectedOutput = pageInput.interactive ? await confirmOutputDir(defaultOutput) : defaultOutput;
  return resolveFromDir(selectedOutput, invocationDir);
}

async function confirmOutputDir(defaultOutput: string): Promise<string> {
  return withReadline(async (rl) => {
    const answer = await ask(rl, `Output directory (${defaultOutput})`);
    return answer || defaultOutput;
  });
}

function resolveInputPath(configValue: string | undefined, configDir: string): string | undefined {
  if (configValue) return path.isAbsolute(configValue) ? configValue : path.resolve(configDir, configValue);
  return undefined;
}

async function validateProjectRoot(label: string, root: string): Promise<void> {
  try {
    const stats = await stat(root);
    if (stats.isDirectory()) return;
    throw new Error(`${label} is not a directory: ${root}`);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new Error(`${label} does not exist: ${root}\nRun proto-bridge init or edit proto-bridge.config.json with your local project path.`);
    }
    throw error;
  }
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
    if (!ALLOWED_FLAGS.has(key)) throw new Error(unknownFlagMessage(key));

    if (inlineValue !== undefined) {
      if (BOOLEAN_FLAGS.has(key)) throw new Error(`--${key} does not accept a value.\nExample: npx @proto-bridge/cli generate --capture`);
      values[key] = inlineValue;
      continue;
    }

    const next = tokens[index + 1];
    if (BOOLEAN_FLAGS.has(key)) {
      values[key] = true;
      continue;
    }

    if (!next || next.startsWith('--')) throw new Error(missingFlagValueMessage(key));

    values[key] = next;
    index += 1;
  }

  return { command, values };
}

function readString(values: Record<string, string | boolean>, key: string): string | undefined {
  const value = values[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function unknownFlagMessage(key: string): string {
  return [
    `Unknown flag: --${key}`,
    'Supported flags: --config, --url, --route, --vue, --prototype-url, --output, --capture.',
    'Example: npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"',
  ].join('\n');
}

function missingFlagValueMessage(key: string): string {
  const examples: Record<string, string> = {
    config: 'npx @proto-bridge/cli generate --config ./proto-bridge.config.json --route /prototype/etf-detail',
    output: 'npx @proto-bridge/cli generate --route /prototype/etf-detail --output ./output/etf-detail',
    route: 'npx @proto-bridge/cli generate --route /prototype/etf-detail',
    url: 'npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"',
    vue: 'npx @proto-bridge/cli generate --vue prototype/src/views/prototype/etf/ETFDetailPage.vue',
    'prototype-url': 'npx @proto-bridge/cli generate --route /prototype/etf-detail --prototype-url "http://localhost:5173/#/prototype/etf-detail" --capture',
    'source-adapter': 'npx @proto-bridge/cli generate --route /prototype/etf-detail --source-adapter vue3-prototype',
    'target-adapter': 'npx @proto-bridge/cli generate --route /prototype/etf-detail --target-adapter flutter-app',
  };
  return [`--${key} requires a value.`, `Example: ${examples[key] ?? 'npx @proto-bridge/cli --help'}`].join('\n');
}

function extractRouteFromUrl(urlInput: string): string {
  const routeWithQuery = routeWithQueryFromUrl(urlInput);
  const route = routeWithQuery.split('?')[0]?.split('#')[0];
  if (!route) throw new Error(`Unable to extract route from --url: ${urlInput}`);
  return normalizeRoute(route);
}

function routeWithQueryFromUrl(urlInput: string): string {
  if (!urlInput.trim()) {
    throw new Error('--url requires a non-empty URL or route path.\nExample: npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"');
  }

  if (urlInput.startsWith('/')) return urlInput;

  try {
    const parsed = new URL(urlInput);
    if (parsed.hash.startsWith('#/')) return parsed.hash.slice(1);
    if (parsed.pathname) return `${parsed.pathname}${parsed.search}`;
  } catch {
    throw new Error([
      `--url must be an absolute URL or a route path: ${urlInput}`,
      'If you only have the route, use: npx @proto-bridge/cli generate --route /prototype/etf-detail',
      'If your shell shows dquote>, press Ctrl+C and rerun with a closing quote.',
    ].join('\n'));
  }

  throw new Error(`Unable to extract route from --url: ${urlInput}`);
}

function normalizeRoute(route: string): string {
  const routeOnly = route.split('?')[0] ?? route;
  const normalized = routeOnly.startsWith('/') ? routeOnly : `/${routeOnly}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function outputSlug(route: string | undefined, vue: string | undefined): string {
  const source = route ?? vue ?? 'migration';
  const slug = source
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/Page$/i, '')
    .toLowerCase();
  return slug || 'migration';
}

function resolveFromDir(value: string, dir: string): string {
  if (path.isAbsolute(value)) return value;
  return path.resolve(dir, value);
}

function isInteractive(): boolean {
  return Boolean(input.isTTY && output.isTTY);
}

async function withReadline<T>(callback: (rl: readline.Interface) => Promise<T>): Promise<T> {
  const rl = readline.createInterface({ input, output });
  try {
    return await callback(rl);
  } finally {
    rl.close();
  }
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return (await rl.question(`${question}: `)).trim();
}

async function askRequired(rl: readline.Interface, question: string): Promise<string> {
  while (true) {
    const answer = await ask(rl, question);
    if (answer) return answer;
    console.log('Value is required.');
  }
}

async function askChoice(rl: readline.Interface, question: string, choices: string[]): Promise<string> {
  const label = `${question} (${choices.join('/')})`;
  while (true) {
    const answer = (await ask(rl, label)).toLowerCase();
    if (choices.includes(answer)) return answer;
    console.log(`Choose one of: ${choices.join(', ')}`);
  }
}

function printSuccess(
  input: GenerateMigrationSpecInput,
  result: GenerateMigrationSpecResult,
  values: Record<string, string | boolean>,
): void {
  const warnings = result.context.recommendations.risks.length;
  console.log();
  success('Success! Migration spec generated.');
  kv('input', describeInput(input, values));
  kv('route', result.context.source.route ?? input.route ?? '(unknown)');
  kv('screenId', result.context.source.screenId ?? 'unknown');
  kv('output', input.outDir);
  kv('migration spec', result.files.migrationSpec);
  kv('migration context', result.files.migrationContext);
  if (result.files.screenshot) kv('screenshot', result.files.screenshot);
  if (result.files.domSnapshot) kv('dom snapshot', result.files.domSnapshot);
  if (warnings > 0) warn(`${warnings} warning${warnings === 1 ? '' : 's'} found. Review migration-spec.md before implementation.`);
}

function describeInput(input: GenerateMigrationSpecInput, values: Record<string, string | boolean>): string {
  const url = readString(values, 'url');
  if (url) return `url ${url}`;
  const route = readString(values, 'route') ?? input.route;
  if (route) return `route ${route}`;
  const vue = readString(values, 'vue') ?? input.vue;
  if (vue) return `vue ${vue}`;
  if (input.route) return `route ${input.route}`;
  if (input.vue) return `vue ${input.vue}`;
  return 'unknown';
}

function step(message: string): void {
  console.log(`${color(ICON.step, COLOR.cyan)} ${color(message, COLOR.dim)}`);
}

function success(message: string): void {
  console.log(`${color(ICON.success, COLOR.green)} ${color(message, COLOR.green, COLOR.bold)}`);
}

function warn(message: string): void {
  console.log(`${color(ICON.warn, COLOR.yellow)} ${color(message, COLOR.yellow, COLOR.bold)}`);
}

function printError(message: string): void {
  const lines = message.split('\n');
  console.error();
  console.error(`${color(ICON.error, COLOR.red)} ${color(lines[0] ?? 'Error', COLOR.red, COLOR.bold)}`);
  for (const line of lines.slice(1)) {
    console.error(`  ${line}`);
  }
}

function kv(label: string, value: string): void {
  console.log(`  ${color(label.padEnd(17), COLOR.bold)} ${value}`);
}

function color(text: string, ...styles: string[]): string {
  if (!output.isTTY && !process.env.FORCE_COLOR) return text;
  return `${styles.join('')}${text}${COLOR.reset}`;
}

function usage(): string {
  return `Usage:
  proto-bridge init [options]
  proto-bridge generate --url <prototype-url> [options]
  proto-bridge generate --route <route> [options]
  proto-bridge generate --vue <file> [options]
  proto-bridge generate

Required:
  proto-bridge.config.json must exist in the directory where you run generate.

Options:
  --config <file>             Config path, defaults to ./proto-bridge.config.json
  --url <url>                 Full prototype URL, hash route is extracted automatically
  --route <route>             Prototype or design route, for example /prototype/trade
  --vue <file>                Vue file path, absolute or relative to source.root
  --source-adapter <id>       Source adapter, defaults to vue3-prototype
  --target-adapter <id>       Target adapter, defaults to flutter-app
  --prototype-url <url>       Optional running prototype URL for Playwright capture
  --output <dir>              Override the generated output directory
  --capture                   Run Playwright screenshot and DOM capture
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  printError(message);
  process.exitCode = 1;
});

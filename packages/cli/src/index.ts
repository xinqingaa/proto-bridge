#!/usr/bin/env node

import path from 'node:path';
import { access, stat, writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  DEFAULT_CONFIG_FILE,
  readProtoBridgeConfigFile,
  resolveConfigPath,
  resolveProtoBridgeInput,
  type ProtoBridgeConfig,
  type ProtoBridgeInputOverrides,
} from '@proto-bridge/core/config';
import {
  reconstructPageContext,
  type ReconstructPageContextInput,
  type ReconstructPageContextResult,
} from '@proto-bridge/core/workflows/capability-first';

type ParsedArgs = {
  command: string;
  values: Record<string, string | boolean>;
};

type LoadedConfig = {
  path: string;
  dir: string;
  config?: ProtoBridgeConfig | undefined;
};

type PageInputOverrides = {
  url?: string | undefined;
  route?: string | undefined;
  vue?: string | undefined;
};

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
  'route',
  'source-adapter',
  'source-root',
  'target-adapter',
  'target-root',
  'trace',
  'url',
  'vue',
]);
const BOOLEAN_FLAGS = new Set(['capture', 'help', 'trace']);

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
  step('Reconstructing page context with capability-first workflow...');
  const result = await reconstructPageContext(input);
  if (parsed.values.trace) printTrace(result);

  printSuccess(input, result, parsed.values);
}

async function buildGenerateInput(values: Record<string, string | boolean>): Promise<ReconstructPageContextInput> {
  step('Loading proto-bridge config...');
  const loadedConfig = await loadOptionalConfig(values);
  const invocationDir = process.env.INIT_CWD ?? process.cwd();
  const overrides: ProtoBridgeInputOverrides = {
    sourceRoot: readString(values, 'source-root'),
    sourceAdapter: readString(values, 'source-adapter'),
    targetRoot: readString(values, 'target-root'),
    targetAdapter: readString(values, 'target-adapter'),
    url: readString(values, 'url'),
    route: readString(values, 'route'),
    vue: readString(values, 'vue'),
    output: readString(values, 'output'),
    capture: values.capture === true ? true : undefined,
    trace: values.trace === true,
  };

  if (!hasPageInput(overrides, loadedConfig.config) && isInteractive()) {
    Object.assign(overrides, await askPageInput());
  }

  const resolved = resolveProtoBridgeInput({
    config: loadedConfig.config,
    configDir: loadedConfig.dir,
    cwd: invocationDir,
    overrides,
    requirePageInput: true,
  });

  step('Checking project roots...');
  if (resolved.sourceRoot) await validateProjectRoot('source.root', resolved.sourceRoot);
  if (resolved.targetRoot) await validateProjectRoot('target.root', resolved.targetRoot);
  if (resolved.input.source && resolved.input.source.adapter !== 'vue3-prototype') throw new Error('Unsupported source adapter. Supported: vue3-prototype');
  if (resolved.input.target && resolved.input.target.adapter !== 'flutter-app') throw new Error('Unsupported target adapter. Supported: flutter-app');

  return resolved.input;
}

async function loadOptionalConfig(values: Record<string, string | boolean>): Promise<LoadedConfig> {
  const invocationDir = process.env.INIT_CWD ?? process.cwd();
  const configPath = resolveConfigPath(readString(values, 'config'), invocationDir);
  const required = Boolean(readString(values, 'config'));
  const config = await readProtoBridgeConfigFile(configPath, { required });
  return {
    path: configPath,
    dir: path.dirname(configPath),
    config,
  };
}

function hasPageInput(overrides: ProtoBridgeInputOverrides, _config: ProtoBridgeConfig | undefined): boolean {
  return Boolean(
    overrides.url ||
    overrides.route ||
    overrides.vue,
  );
}

async function askPageInput(): Promise<PageInputOverrides> {
  return withReadline(async (rl) => {
    const inputType = await askChoice(rl, 'Page input type', ['url', 'route', 'vue']);
    const value = await askRequired(rl, `Enter ${inputType}`);
    if (inputType === 'url') return { url: value };
    if (inputType === 'route') return { route: value };
    return { vue: value };
  });
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
    const sourceRoot = await ask(rl, 'Source project root (optional)');
    const targetRoot = await ask(rl, 'Target project root (optional)');
    const outputRootAnswer = (await ask(rl, 'Output root (./output)')) || './output';
    const captureAnswer = (await ask(rl, 'Enable runtime capture? (y/N)')).toLowerCase();
    return {
      sourceRoot,
      targetRoot,
      outputRootAnswer,
      capture: captureAnswer === 'y' || captureAnswer === 'yes',
    };
  });

  const config: ProtoBridgeConfig = {
    schemaVersion: 1,
    source: answers.sourceRoot ? {
      adapter: 'vue3-prototype',
      root: answers.sourceRoot,
    } : undefined,
    target: answers.targetRoot ? {
      adapter: 'flutter-app',
      root: answers.targetRoot,
    } : undefined,
    runtime: {
      capture: answers.capture,
    },
    output: {
      root: answers.outputRootAnswer,
    },
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  success('Config created');
  kv('config', configPath);
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
    'Supported flags: --config, --url, --route, --vue, --output, --capture, --trace, --source-root, --target-root.',
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
    'source-adapter': 'npx @proto-bridge/cli generate --route /prototype/etf-detail --source-adapter vue3-prototype',
    'source-root': 'npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail" --source-root /path/to/source',
    'target-adapter': 'npx @proto-bridge/cli generate --route /prototype/etf-detail --target-adapter flutter-app',
    'target-root': 'npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail" --target-root /path/to/target',
  };
  return [`--${key} requires a value.`, `Example: ${examples[key] ?? 'npx @proto-bridge/cli --help'}`].join('\n');
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
  input: ReconstructPageContextInput,
  result: ReconstructPageContextResult,
  values: Record<string, string | boolean>,
): void {
  const warnings = result.warnings.length;
  console.log();
  success('Success! Page context reconstructed.');
  kv('input', describeInput(input, values));
  kv('route', result.page.sourceFacts?.analysis.route ?? result.page.page.route ?? input.route ?? '(unknown)');
  kv('screenId', result.page.sourceFacts?.analysis.screenId ?? 'unknown');
  kv('output', input.outDir);
  kv('page canonical', result.files.pageCanonical);
  kv('debug index', result.files.pageDebugIndex);
  if (result.files.uiBuildPlan) kv('ui build plan', result.files.uiBuildPlan);
  if (result.files.uiBuildReview) kv('ui build review', result.files.uiBuildReview);
  for (const screenshot of result.files.screenshots) kv('screenshot', screenshot);
  if (warnings > 0) warn(`${warnings} warning${warnings === 1 ? '' : 's'} found. Review ui-build-review.md before implementation.`);
}

function describeInput(input: ReconstructPageContextInput, values: Record<string, string | boolean>): string {
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
  proto-bridge generate --url <url> [options]
  proto-bridge generate --route <route> [options]
  proto-bridge generate --vue <file> [options]
  proto-bridge generate

Options:
  --config <file>             Config path, defaults to ./proto-bridge.config.json
  --url <url>                 Primary page input. Hash route is extracted automatically
  --route <route>             Advanced source route override, for example /prototype/trade
  --vue <file>                Advanced Vue file override, absolute or relative to source.root
  --source-root <dir>         Optional prototype/source root
  --source-adapter <id>       Source adapter, defaults to vue3-prototype
  --target-root <dir>         Optional target Flutter root
  --target-adapter <id>       Target adapter, defaults to flutter-app
  --output <dir>              Override the generated output directory
  --capture                   Run Playwright screenshot and DOM capture
  --trace                     Print temporary capability orchestration trace

Artifacts:
  Always writes page-canonical.json and page-debug-index.json.
  With target config or --target-root, writes ui-build-plan.json and ui-build-review.md.
  With source config or --source-root, URL-derived route enables source-aware evidence.
`;
}

function printTrace(result: ReconstructPageContextResult): void {
  console.log();
  step('Capability trace...');
  for (const traceStep of result.trace.steps) {
    const marker = traceStep.status === 'skipped' ? '-' : traceStep.status === 'completed' ? '✓' : '+';
    console.log(`  ${marker} ${traceStep.capability} [${traceStep.status}] ${traceStep.reason}`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  printError(message);
  process.exitCode = 1;
});

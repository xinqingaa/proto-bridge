#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  capturePrototypePage,
  defaultAdapterRegistry,
  findFlutterTargetExamples,
  generateMigrationSpec,
  getFlutterTargetConventions,
} from '@proto-bridge/core';
import type {
  FindFlutterTargetExamplesInput,
  FlutterComponentRole,
  GenerateMigrationSpecInput,
  GenerateMigrationSpecResult,
  MigrationContext,
  SourceAdapter,
  TargetAdapter,
} from '@proto-bridge/core';

export {
  capturePrototypePage,
  defaultAdapterRegistry,
  findFlutterTargetExamples,
  generateMigrationSpec,
  getFlutterTargetConventions,
};

export type {
  FindFlutterTargetExamplesInput,
  GenerateMigrationSpecInput,
  SourceAdapter,
  TargetAdapter,
};

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null | undefined;
  method: string;
  params?: JsonObject | undefined;
};

type ProtoBridgeConfig = {
  source?: { adapter?: string | undefined; root?: string | undefined } | undefined;
  target?: { adapter?: string | undefined; root?: string | undefined } | undefined;
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
  prototypeUrl?: string | undefined;
  outputRoot?: string | undefined;
  capture?: boolean | undefined;
};

type ResolvedConfig = {
  configPath: string;
  configDir: string;
  config: ProtoBridgeConfig;
};

type GeneratedRun = {
  id: string;
  createdAt: string;
  configPath: string;
  result: GenerateMigrationSpecResult;
};

const execFileAsync = promisify(execFile);
const runs = new Map<string, GeneratedRun>();
const serverOptions = parseServerOptions(process.argv.slice(2));

startServer();

function startServer(): void {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) void handleLine(line);
      newlineIndex = buffer.indexOf('\n');
    }
  });
  process.stdin.on('end', () => {
    // Let in-flight async tool calls finish before Node exits naturally.
  });
}

async function handleLine(line: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(line) as JsonRpcRequest;
  } catch (error) {
    sendError(null, -32700, `Invalid JSON: ${errorMessage(error)}`);
    return;
  }

  try {
    const result = await dispatch(request);
    if (request.id !== undefined && request.id !== null) {
      send({ jsonrpc: '2.0', id: request.id, result });
    }
  } catch (error) {
    if (request.id !== undefined && request.id !== null) {
      sendError(request.id, -32603, errorMessage(error));
    } else {
      console.error(errorMessage(error));
    }
  }
}

async function dispatch(request: JsonRpcRequest): Promise<JsonObject> {
  switch (request.method) {
    case 'initialize':
      return {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'proto-bridge',
          version: '0.1.0',
        },
      };
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return {};
    case 'tools/list':
      return { tools: toolsList() };
    case 'tools/call':
      return callTool(request.params);
    case 'resources/list':
      return { resources: resourcesList() };
    case 'resources/read':
      return readResource(request.params);
    case 'prompts/list':
      return { prompts: promptsList() };
    case 'prompts/get':
      return getPrompt(request.params);
    default:
      throw new Error(`Unsupported MCP method: ${request.method}`);
  }
}

function toolsList(): JsonValue[] {
  return [
    {
      name: 'generate_migration_spec',
      description: 'Generate ProtoBridge migration context/spec from a prototype URL, route, or Vue file.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string', description: 'Path to proto-bridge.config.json. Defaults to server --config or ./proto-bridge.config.json.' },
          url: { type: 'string', description: 'Prototype URL. Hash routes are extracted automatically.' },
          route: { type: 'string', description: 'Prototype route, for example /prototype/etf-detail.' },
          vue: { type: 'string', description: 'Vue SFC path, absolute or relative to source.root.' },
          output: { type: 'string', description: 'Override output directory for this run.' },
          outputRoot: { type: 'string', description: 'Override output root used to derive page output directory.' },
          prototypeUrl: { type: 'string', description: 'Runtime URL for capture.' },
          capture: { type: 'boolean', description: 'Run Playwright capture.' },
        },
      },
    },
    {
      name: 'get_migration_brief',
      description: 'Return an agent-friendly brief from a generated run or migration-context.json.',
      inputSchema: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          contextPath: { type: 'string' },
        },
      },
    },
    {
      name: 'read_migration_artifact',
      description: 'Read the generated migration spec or context for a run.',
      inputSchema: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          artifact: { type: 'string', enum: ['spec', 'context'] },
          path: { type: 'string', description: 'Direct file path fallback.' },
        },
      },
    },
    {
      name: 'get_target_conventions',
      description: 'Read YouFi Flutter target conventions, common components, routes, i18n, assets, and theme usage.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          module: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'find_target_examples',
      description: 'Find similar YouFi Flutter examples and snippets by module, page pattern, roles, and symbols.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          module: { type: 'string' },
          pattern: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
          screenId: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'validate_target_changes',
      description: 'Inspect target git changes for scope, obvious placeholder UI, TODOs, and ProtoBridge checklist alignment.',
      inputSchema: {
        type: 'object',
        properties: {
          config: { type: 'string' },
          runId: { type: 'string' },
          gitBase: { type: 'string', description: 'Optional git base ref for diff --name-only.' },
          allowedPaths: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ];
}

async function callTool(params: JsonObject | undefined): Promise<JsonObject> {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (!name) throw new Error('tools/call requires params.name');

  if (name === 'generate_migration_spec') {
    const run = await generateRun(args);
    return toolJson(buildRunSummary(run));
  }
  if (name === 'get_migration_brief') {
    const context = await contextFromArgs(args);
    return toolJson(buildMigrationBrief(context));
  }
  if (name === 'read_migration_artifact') {
    return toolText(await readMigrationArtifact(args));
  }
  if (name === 'get_target_conventions') {
    const resolved = await loadConfig(readString(args, 'config'));
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
      module: readString(args, 'module'),
      roles: readRoles(args),
      symbols: readStringArray(args, 'symbols'),
    });
    return toolJson(conventions);
  }
  if (name === 'find_target_examples') {
    const resolved = await loadConfig(readString(args, 'config'));
    const input: FindFlutterTargetExamplesInput = {
      flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
      module: readString(args, 'module'),
      pattern: readString(args, 'pattern'),
      roles: readRoles(args),
      symbols: readStringArray(args, 'symbols'),
      screenId: readString(args, 'screenId'),
      limit: readNumber(args, 'limit'),
    };
    return toolJson(await findFlutterTargetExamples(input));
  }
  if (name === 'validate_target_changes') {
    return toolJson(await validateTargetChanges(args));
  }

  throw new Error(`Unknown tool: ${name}`);
}

function resourcesList(): JsonValue[] {
  const runResources = [...runs.values()].flatMap((run) => [
    {
      uri: `proto-bridge://runs/${run.id}/spec`,
      name: `ProtoBridge migration spec ${run.id}`,
      mimeType: 'text/markdown',
    },
    {
      uri: `proto-bridge://runs/${run.id}/context`,
      name: `ProtoBridge migration context ${run.id}`,
      mimeType: 'application/json',
    },
  ]);
  return [
    {
      uri: 'proto-bridge://target/conventions',
      name: 'ProtoBridge target conventions',
      mimeType: 'application/json',
    },
    ...runResources,
  ];
}

async function readResource(params: JsonObject | undefined): Promise<JsonObject> {
  const uri = readString(params, 'uri');
  if (!uri) throw new Error('resources/read requires params.uri');

  if (uri === 'proto-bridge://target/conventions') {
    const resolved = await loadConfig(undefined);
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    });
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(conventions, null, 2) }],
    };
  }

  const match = uri.match(/^proto-bridge:\/\/runs\/([^/]+)\/(spec|context)$/);
  if (!match?.[1] || !match[2]) throw new Error(`Unknown resource uri: ${uri}`);
  const run = requireRun(match[1]);
  const filePath = match[2] === 'spec' ? run.result.files.migrationSpec : run.result.files.migrationContext;
  const mimeType = match[2] === 'spec' ? 'text/markdown' : 'application/json';
  return {
    contents: [{ uri, mimeType, text: await readFile(filePath, 'utf8') }],
  };
}

function promptsList(): JsonValue[] {
  return [
    {
      name: 'migrate_vue_prototype_to_youfi_flutter',
      description: 'Use ProtoBridge to migrate a prototype URL/route/Vue file into the YouFi Flutter app.',
      arguments: [
        { name: 'url', description: 'Prototype URL.', required: false },
        { name: 'route', description: 'Prototype route.', required: false },
        { name: 'vue', description: 'Vue SFC path.', required: false },
      ],
    },
  ];
}

function getPrompt(params: JsonObject | undefined): JsonObject {
  const name = readString(params, 'name');
  if (name !== 'migrate_vue_prototype_to_youfi_flutter') throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
  const args = readObject(params, 'arguments') ?? {};
  const input = readString(args, 'url') ?? readString(args, 'route') ?? readString(args, 'vue') ?? '<url | route | vue>';
  return {
    description: 'ProtoBridge YouFi Flutter migration workflow',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Use ProtoBridge to migrate ${input} into the YouFi Flutter app.`,
            'Call generate_migration_spec first, then get_migration_brief, find_target_examples, and get_target_conventions.',
            'Implement Dart files in the target repo according to the generated file tree, Widget contracts, state strategy, i18n/assets/routes guidance, and checklist.',
            'Do not translate Vue template or CSS classes one-to-one. Prefer existing YouFi widgets, BaseGetView patterns, themeService colors/textStyles, .tr translations, and similar module examples.',
            'Run formatting/static checks when possible, then call validate_target_changes and report changed files, verification, warnings, and unresolved P0/P1 items.',
          ].join('\n'),
        },
      },
    ],
  };
}

async function generateRun(args: JsonObject): Promise<GeneratedRun> {
  const resolved = await loadConfig(readString(args, 'config'));
  const pageInput = resolvePageInput(args, resolved.config);
  const outDir = resolveOutputDir(args, resolved, pageInput);
  const capture = readBoolean(args, 'capture') ?? resolved.config.capture ?? false;
  const prototypeUrl = readString(args, 'prototypeUrl') ?? pageInput.url ?? resolved.config.prototypeUrl ?? resolved.config.url;
  const input: GenerateMigrationSpecInput = {
    source: {
      adapter: resolved.config.source?.adapter ?? 'vue3-prototype',
      root: resolveProjectRoot(resolved, resolved.config.source?.root, 'source.root'),
    },
    target: {
      adapter: resolved.config.target?.adapter ?? 'flutter-app',
      root: resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root'),
    },
    route: pageInput.route,
    vue: pageInput.vue,
    prototypeUrl,
    outDir,
    capture,
  };
  const result = await generateMigrationSpec(input);
  const id = createRunId(result.context);
  const run = {
    id,
    createdAt: new Date().toISOString(),
    configPath: resolved.configPath,
    result,
  };
  runs.set(id, run);
  return run;
}

function buildRunSummary(run: GeneratedRun): JsonObject {
  const context = run.result.context;
  return {
    runId: run.id,
    createdAt: run.createdAt,
    files: run.result.files as unknown as JsonObject,
    resourceUris: {
      spec: `proto-bridge://runs/${run.id}/spec`,
      context: `proto-bridge://runs/${run.id}/context`,
    },
    brief: buildMigrationBrief(context),
  };
}

function buildMigrationBrief(context: MigrationContext): JsonObject {
  const plan = context.recommendations.implementationPlan;
  return {
    page: {
      title: context.source.title ?? context.source.label ?? context.source.name,
      route: context.source.route,
      screenId: context.source.screenId,
      sourceModule: context.source.module,
      vuePath: context.source.vueRelativePath ?? context.source.vuePath,
      notesPath: context.source.notesPath,
      i18nPath: context.source.i18nPath,
    },
    target: {
      suggestedModule: context.target.suggestedModule,
      routesFiles: context.target.routesFiles,
      translationFiles: context.target.translationFiles,
      assetDirectories: context.target.assetDirectories,
      reusableWidgets: context.target.reusableWidgets,
      similarFiles: context.target.similarFiles.slice(0, 12),
    },
    implementation: {
      shape: context.recommendations.implementationShape,
      complexity: plan.complexity,
      summary: plan.summary,
      fileTree: plan.fileTree,
      widgetTree: plan.widgetTree,
      stateStrategy: plan.stateStrategy,
      controllerBoundaries: plan.controllerBoundaries,
      widgetContracts: plan.widgetContracts,
      doNotTranslate: plan.doNotTranslate,
    } as unknown as JsonObject,
    quality: {
      checklist: plan.checklist,
      risks: context.recommendations.risks,
      manualQuestions: context.recommendations.manualQuestions,
      unresolvedTokenCount: context.tokenMap.unresolved.length,
      warnings: dedupe([
        ...context.source.warnings,
        ...context.target.warnings,
        ...(context.capture?.warnings ?? []),
      ]),
    } as unknown as JsonObject,
  };
}

async function contextFromArgs(args: JsonObject): Promise<MigrationContext> {
  const runId = readString(args, 'runId');
  if (runId) return requireRun(runId).result.context;
  const contextPath = readString(args, 'contextPath');
  if (!contextPath) throw new Error('Provide runId or contextPath.');
  return JSON.parse(await readFile(path.resolve(contextPath), 'utf8')) as MigrationContext;
}

async function readMigrationArtifact(args: JsonObject): Promise<string> {
  const directPath = readString(args, 'path');
  if (directPath) return readFile(path.resolve(directPath), 'utf8');

  const runId = readString(args, 'runId');
  const artifact = readString(args, 'artifact') ?? 'spec';
  if (!runId) throw new Error('read_migration_artifact requires runId or path.');
  const run = requireRun(runId);
  const filePath = artifact === 'context' ? run.result.files.migrationContext : run.result.files.migrationSpec;
  return readFile(filePath, 'utf8');
}

async function validateTargetChanges(args: JsonObject): Promise<JsonObject> {
  const resolved = await loadConfig(readString(args, 'config'));
  const targetRoot = resolveProjectRoot(resolved, resolved.config.target?.root, 'target.root');
  const runId = readString(args, 'runId');
  const run = runId ? requireRun(runId) : undefined;
  const allowedPaths = readStringArray(args, 'allowedPaths') ?? defaultAllowedPaths(run);
  const gitBase = readString(args, 'gitBase');
  const changedFiles = await collectChangedFiles(targetRoot, gitBase);
  const outsideAllowedPaths = allowedPaths.length
    ? changedFiles.filter((file) => !allowedPaths.some((allowedPath) => file === allowedPath || file.startsWith(ensureTrailingSlash(allowedPath))))
    : [];
  const dartFiles = changedFiles.filter((file) => file.endsWith('.dart'));
  const fileIssues = await scanChangedDartFiles(targetRoot, dartFiles);
  return {
    targetRoot,
    changedFiles,
    allowedPaths,
    outsideAllowedPaths,
    fileIssues,
    checklist: run?.result.context.recommendations.implementationPlan.checklist ?? [],
    status: outsideAllowedPaths.length || fileIssues.length ? 'needs-review' : 'ok',
  } as unknown as JsonObject;
}

async function collectChangedFiles(targetRoot: string, gitBase: string | undefined): Promise<string[]> {
  const args = gitBase ? ['diff', '--name-only', gitBase] : ['diff', '--name-only'];
  const diff = await runGit(targetRoot, args);
  const staged = await runGit(targetRoot, ['diff', '--cached', '--name-only']);
  const untracked = await runGit(targetRoot, ['ls-files', '--others', '--exclude-standard']);
  return dedupe([...splitLines(diff), ...splitLines(staged), ...splitLines(untracked)].map(toPosix));
}

async function scanChangedDartFiles(targetRoot: string, files: string[]): Promise<JsonValue[]> {
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

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 1024 * 1024 * 4 });
    return stdout;
  } catch {
    return '';
  }
}

function defaultAllowedPaths(run: GeneratedRun | undefined): string[] {
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

async function loadConfig(configPathInput: string | undefined): Promise<ResolvedConfig> {
  const configPath = path.resolve(configPathInput ?? serverOptions.config ?? 'proto-bridge.config.json');
  const text = await readFile(configPath, 'utf8');
  return {
    configPath,
    configDir: path.dirname(configPath),
    config: JSON.parse(text) as ProtoBridgeConfig,
  };
}

function resolveProjectRoot(config: ResolvedConfig, root: string | undefined, label: string): string {
  if (!root) throw new Error(`Missing ${label} in ${config.configPath}`);
  return path.isAbsolute(root) ? root : path.resolve(config.configDir, root);
}

function resolvePageInput(args: JsonObject, config: ProtoBridgeConfig): { route?: string | undefined; vue?: string | undefined; url?: string | undefined } {
  const url = readString(args, 'url') ?? config.url;
  if (url) return { route: extractRouteFromUrl(url), url };
  const route = readString(args, 'route') ?? config.route;
  if (route) return { route: normalizeRoute(route) };
  const vue = readString(args, 'vue') ?? config.vue;
  if (vue) return { vue };
  throw new Error('Provide url, route, or vue.');
}

function resolveOutputDir(args: JsonObject, config: ResolvedConfig, pageInput: { route?: string | undefined; vue?: string | undefined }): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(config.configDir, output);
  const outputRoot = readString(args, 'outputRoot') ?? config.config.outputRoot ?? './output';
  const absoluteOutputRoot = path.isAbsolute(outputRoot) ? outputRoot : path.resolve(config.configDir, outputRoot);
  return path.join(absoluteOutputRoot, outputSlug(pageInput.route, pageInput.vue));
}

function createRunId(context: MigrationContext): string {
  const slug = outputSlug(context.source.route, context.source.vueRelativePath ?? context.source.vuePath);
  return `${slug}-${Date.now().toString(36)}`;
}

function requireRun(runId: string): GeneratedRun {
  const run = runs.get(runId);
  if (!run) throw new Error(`Unknown runId: ${runId}`);
  return run;
}

function parseServerOptions(argv: string[]): { config?: string | undefined } {
  const options: { config?: string | undefined } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--config') {
      const value = argv[index + 1];
      if (value) options.config = value;
      index += 1;
    }
  }
  return options;
}

function send(message: JsonObject): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendError(id: string | number | null, code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function toolJson(value: unknown): JsonObject {
  return toolText(JSON.stringify(value, null, 2));
}

function toolText(text: string): JsonObject {
  return { content: [{ type: 'text', text }] };
}

function readObject(value: JsonObject | undefined, key: string): JsonObject | undefined {
  const item = value?.[key];
  if (item && typeof item === 'object' && !Array.isArray(item)) return item as JsonObject;
  return undefined;
}

function readString(value: JsonObject | undefined, key: string): string | undefined {
  const item = value?.[key];
  return typeof item === 'string' && item.trim() ? item : undefined;
}

function readBoolean(value: JsonObject | undefined, key: string): boolean | undefined {
  const item = value?.[key];
  return typeof item === 'boolean' ? item : undefined;
}

function readNumber(value: JsonObject | undefined, key: string): number | undefined {
  const item = value?.[key];
  return typeof item === 'number' ? item : undefined;
}

function readStringArray(value: JsonObject | undefined, key: string): string[] | undefined {
  const item = value?.[key];
  if (!Array.isArray(item)) return undefined;
  return item.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function readRoles(value: JsonObject | undefined): FlutterComponentRole[] | undefined {
  return readStringArray(value, 'roles') as FlutterComponentRole[] | undefined;
}

function extractRouteFromUrl(urlInput: string): string {
  if (urlInput.startsWith('/')) return normalizeRoute(urlInput.split('?')[0] ?? urlInput);
  const parsed = new URL(urlInput);
  if (parsed.hash.startsWith('#/')) return normalizeRoute(parsed.hash.slice(1).split('?')[0] ?? parsed.hash.slice(1));
  return normalizeRoute(parsed.pathname);
}

function normalizeRoute(route: string): string {
  const routeOnly = route.split('?')[0] ?? route;
  const normalized = routeOnly.startsWith('/') ? routeOnly : `/${routeOnly}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function outputSlug(route: string | undefined, vue: string | undefined): string {
  const source = route ?? vue ?? 'migration';
  return source
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'migration';
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function splitLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean))];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

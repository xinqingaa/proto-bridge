#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_URL = 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1';
const DEFAULT_ROUTE = '/prototype/asset/pnl-analysis';
const BOOLEAN_FLAGS = new Set(['matrix', 'source-brief']);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = readMode(process.argv[2]);
const args = parseArgs(process.argv.slice(mode.consumedArgs));
const testCase = readCase(args.case);
const matrix = readBooleanFlag(args, 'matrix');
const url = readString(args, 'url') ?? DEFAULT_URL;
const route = readString(args, 'route') ?? routeFromUrl(url) ?? DEFAULT_ROUTE;
const sourceRoot = path.resolve(repoRoot, readString(args, 'source-root') ?? '../TradeAppPrd');
const targetRoot = path.resolve(repoRoot, readString(args, 'target-root') ?? '../youfi');
const outputRoot = path.resolve(repoRoot, readString(args, 'output-root') ?? './output/test-ui-reconstruction');
const sourceBrief = readBooleanFlag(args, 'source-brief');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const ICON = {
  step: '●',
  ok: '✔',
  warn: '⚠',
  fail: '✖',
};

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await ensureBuild();

  const report = {};
  if (matrix) {
    report.matrix = [];
    for (const caseName of ['hybrid', 'source-only', 'runtime-only']) {
      report.matrix.push(await runCaseForMode(caseName));
    }
    report.failures = await runFailureCases();
    if (mode.kind === 'mcp' || mode.kind === 'all') {
      report.mcpConfig = await runMcpConfigCase();
    }
  } else {
    Object.assign(report, await runCaseForMode(testCase));
  }

  ok('UI reconstruction test completed.');
  printReport(report);
}

async function ensureBuild() {
  step('Building packages...');
  await run('pnpm', ['build'], { cwd: repoRoot });
}

async function runCaseForMode(caseName) {
  const report = {};
  if (mode.kind === 'cli' || mode.kind === 'all') {
    report.cli = await runCliCase(caseName);
  }
  if (mode.kind === 'mcp' || mode.kind === 'all') {
    report.mcp = await runMcpCase(caseName);
  }
  return report;
}

async function runCliCase(caseName) {
  step(`Running CLI capability-first ${caseName} test...`);
  const outDir = path.join(outputRoot, `cli-${caseSlug(caseName)}-${timestamp}`);
  const configPath = caseName === 'runtime-only'
    ? await writeRuntimeOnlyConfig(outDir)
    : path.join(repoRoot, 'proto-bridge.config.json');
  const commandArgs = [
    path.join(repoRoot, 'packages/cli/dist/index.js'),
    'generate',
    '--config',
    configPath,
    '--output',
    outDir,
    '--trace',
  ];
  if (caseName === 'source-only') {
    commandArgs.push('--route', route);
  } else {
    commandArgs.push('--url', url);
  }
  if (caseName === 'hybrid') commandArgs.push('--capture');
  if (sourceBrief) commandArgs.push('--source-brief');

  try {
    await run('node', commandArgs, { cwd: repoRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      `CLI ${caseName} test failed.`,
      'CLI should support source-only, runtime-only, and hybrid through reconstructPageContext.',
      message,
    ].join('\n'));
  }

  const expected = expectedFiles(outDir);
  await requireUnifiedArtifacts(expected, expectedContract(caseName, 'cli'));
  if (sourceBrief && caseName !== 'runtime-only') {
    await requireFile(expected.migrationSpec);
  } else {
    await requireAbsent(expected.migrationSpec);
  }
  await requireAbsent(path.join(outDir, 'migration-context.json'));
  expected.screenshots = await screenshotsFromCanonical(expected.pageCanonical);

  ok(`CLI capability-first ${caseName} test passed.`);
  return {
    case: caseName,
    output: outDir,
    files: compactFiles(expected),
  };
}

async function screenshotsFromCanonical(pageCanonicalPath) {
  const canonical = JSON.parse(await readFile(pageCanonicalPath, 'utf8'));
  return (canonical.screenshots ?? []).map((screenshot) => screenshot.path).filter(Boolean);
}

async function runMcpCase(caseName) {
  step(`Running MCP capability-first ${caseName} test...`);
  await requireDirectory(targetRoot);
  const outDir = path.join(outputRoot, `mcp-${caseSlug(caseName)}-${timestamp}`);
  await mkdir(outDir, { recursive: true });

  const client = await startMcpClient({ cwd: targetRoot });
  try {
    const tools = await client.request('tools/list', {});
    const toolNames = new Set((tools.tools ?? []).map((tool) => tool.name));
    for (const tool of [
      'reconstruct_page_context',
      'read_target_conventions',
      'find_target_examples',
      'validate_ui_build',
    ]) {
      if (!toolNames.has(tool)) throw new Error(`MCP tools/list is missing ${tool}`);
    }
    for (const removedTool of [
      'capture_page_canonical',
      'build_ui_plan',
      'attach_screenshot_ocr',
      'export_ui_review',
    ]) {
      if (toolNames.has(removedTool)) throw new Error(`MCP tools/list should not expose removed tool ${removedTool}`);
    }

    const sourceAvailable = await directoryExists(sourceRoot);
    if ((caseName === 'source-only' || caseName === 'hybrid') && !sourceAvailable) {
      throw new Error(`Source root is required for ${caseName}: ${sourceRoot}`);
    }

    const reconstruct = parseToolJson(await client.request('tools/call', {
      name: 'reconstruct_page_context',
      arguments: {
        ...(caseName !== 'runtime-only' ? { sourceRoot, route } : {}),
        ...(caseName !== 'source-only' ? { url } : {}),
        targetRoot,
        output: outDir,
        capture: caseName !== 'source-only',
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        saveArtifacts: true,
        sourceBrief,
        trace: true,
      },
    }));
    const pageId = requireString(reconstruct.pageId, 'reconstruct.pageId');

    const resources = await client.request('resources/list', {});
    const resourceUris = new Set((resources.resources ?? []).map((resource) => resource.uri));
    for (const uri of [
      `proto-bridge://pages/${pageId}/page-canonical`,
      `proto-bridge://pages/${pageId}/page-debug-index`,
      `proto-bridge://pages/${pageId}/ui-build-plan`,
      `proto-bridge://pages/${pageId}/ui-build-review`,
    ]) {
      if (!resourceUris.has(uri)) throw new Error(`MCP resources/list is missing ${uri}`);
    }

    const files = {
      pageCanonical: requireString(reconstruct.files?.pageCanonical, 'reconstruct.files.pageCanonical'),
      pageDebugIndex: requireString(reconstruct.files?.pageDebugIndex, 'reconstruct.files.pageDebugIndex'),
      uiBuildPlan: requireString(reconstruct.files?.uiBuildPlan, 'reconstruct.files.uiBuildPlan'),
      uiBuildReview: requireString(reconstruct.files?.uiBuildReview, 'reconstruct.files.uiBuildReview'),
      ...(typeof reconstruct.files?.migrationSpec === 'string' ? { migrationSpec: reconstruct.files.migrationSpec } : {}),
      screenshots: Array.isArray(reconstruct.files?.screenshots) ? reconstruct.files.screenshots.map(String) : [],
    };
    await requireUnifiedArtifacts(files, expectedContract(caseName, 'mcp'));
    await Promise.all(files.screenshots.map((screenshot) => requireFile(String(screenshot))));
    if (sourceBrief && caseName !== 'runtime-only') {
      await requireFile(files.migrationSpec);
    } else {
      await requireAbsent(path.join(outDir, 'migration-spec.md'));
    }
    await requireAbsent(path.join(outDir, 'migration-context.json'));
    if (!reconstruct.summary?.trace) throw new Error('MCP trace=true should return summary.trace.');

    ok(`MCP capability-first ${caseName} test passed.`);
    return {
      case: caseName,
      pageId,
      output: outDir,
      files,
    };
  } finally {
    await client.close();
  }
}

async function runMcpConfigCase() {
  step('Running MCP config fallback test...');
  await requireDirectory(targetRoot);
  const outDir = path.join(outputRoot, `mcp-config-${caseSlug('hybrid')}-${timestamp}`);
  await mkdir(outDir, { recursive: true });
  const configPath = await writeHybridConfig(outDir);
  const client = await startMcpClient({ cwd: repoRoot, args: ['--config', configPath] });
  try {
    const reconstruct = parseToolJson(await client.request('tools/call', {
      name: 'reconstruct_page_context',
      arguments: {
        output: outDir,
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        trace: true,
      },
    }));
    const files = {
      pageCanonical: requireString(reconstruct.files?.pageCanonical, 'reconstruct.files.pageCanonical'),
      pageDebugIndex: requireString(reconstruct.files?.pageDebugIndex, 'reconstruct.files.pageDebugIndex'),
      uiBuildPlan: requireString(reconstruct.files?.uiBuildPlan, 'reconstruct.files.uiBuildPlan'),
      uiBuildReview: requireString(reconstruct.files?.uiBuildReview, 'reconstruct.files.uiBuildReview'),
      screenshots: Array.isArray(reconstruct.files?.screenshots) ? reconstruct.files.screenshots.map(String) : [],
    };
    await requireUnifiedArtifacts(files, expectedContract('hybrid', 'mcp-config'));
    ok('MCP config fallback test passed.');
    return {
      case: 'config-hybrid',
      pageId: requireString(reconstruct.pageId, 'reconstruct.pageId'),
      output: outDir,
      files,
    };
  } finally {
    await client.close();
  }
}

async function runFailureCases() {
  const results = [];
  if (mode.kind === 'cli' || mode.kind === 'all') {
    results.push(await expectCliFailure('no-page-identity', [
      path.join(repoRoot, 'packages/cli/dist/index.js'),
      'generate',
      '--config',
      await writeRuntimeOnlyConfig(path.join(outputRoot, `cli-no-page-identity-${timestamp}`)),
      '--output',
      path.join(outputRoot, `cli-no-page-identity-${timestamp}`),
    ], 'Provide --url, --route, or --vue.'));
    results.push(await expectCliFailure('route-without-source', [
      path.join(repoRoot, 'packages/cli/dist/index.js'),
      'generate',
      '--config',
      await writeRuntimeOnlyConfig(path.join(outputRoot, `cli-route-without-source-${timestamp}`)),
      '--route',
      route,
      '--output',
      path.join(outputRoot, `cli-route-without-source-${timestamp}`),
    ], 'config.source.root is required'));
  }
  if (mode.kind === 'mcp' || mode.kind === 'all') {
    results.push(await expectMcpFailure('no-page-identity', {}, 'requires at least one'));
  }
  return results;
}

async function expectCliFailure(name, commandArgs, expectedMessage) {
  try {
    await run('node', commandArgs, { cwd: repoRoot, stdio: 'pipe' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessage)) {
      throw new Error(`CLI failure case ${name} did not include "${expectedMessage}". Got:\n${message}`);
    }
    ok(`CLI failure case ${name} passed.`);
    return { entry: 'cli', case: name };
  }
  throw new Error(`CLI failure case ${name} unexpectedly succeeded.`);
}

async function expectMcpFailure(name, toolArgs, expectedMessage) {
  const client = await startMcpClient({ cwd: targetRoot });
  try {
    try {
      await client.request('tools/call', {
        name: 'reconstruct_page_context',
        arguments: {
          targetRoot,
          output: path.join(outputRoot, `mcp-${name}-${timestamp}`),
          ...toolArgs,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes(expectedMessage)) {
        throw new Error(`MCP failure case ${name} did not include "${expectedMessage}". Got:\n${message}`);
      }
      ok(`MCP failure case ${name} passed.`);
      return { entry: 'mcp', case: name };
    }
    throw new Error(`MCP failure case ${name} unexpectedly succeeded.`);
  } finally {
    await client.close();
  }
}

async function startMcpClient(options) {
  const child = spawn('node', [path.join(repoRoot, 'packages/mcp-server/dist/index.js'), ...(options.args ?? [])], {
    cwd: options.cwd,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  let nextId = 1;
  const pending = new Map();
  const rl = createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) {
      slot.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      return;
    }
    slot.resolve(message.result);
  });

  child.on('exit', (code) => {
    const error = new Error(`MCP server exited with code ${code ?? 'unknown'}`);
    for (const slot of pending.values()) slot.reject(error);
    pending.clear();
  });

  return {
    request(method, params) {
      const id = nextId++;
      const payload = { jsonrpc: '2.0', id, method, params };
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
          if (error) {
            pending.delete(id);
            reject(error);
          }
        });
      });
    },
    async close() {
      rl.close();
      child.stdin.end();
      child.kill();
    },
  };
}

function expectedFiles(outDir) {
  return {
    pageCanonical: path.join(outDir, 'page-canonical.json'),
    pageDebugIndex: path.join(outDir, 'page-debug-index.json'),
    uiBuildPlan: path.join(outDir, 'ui-build-plan.json'),
    uiBuildReview: path.join(outDir, 'ui-build-review.md'),
    migrationSpec: path.join(outDir, 'migration-spec.md'),
    screenshots: [],
  };
}

async function writeHybridConfig(outDir) {
  await mkdir(outDir, { recursive: true });
  const configPath = path.join(outDir, 'proto-bridge.hybrid.config.json');
  const config = {
    source: {
      adapter: 'vue3-prototype',
      root: sourceRoot,
    },
    target: {
      adapter: 'flutter-app',
      root: targetRoot,
    },
    route,
    url,
    outputRoot,
    capture: true,
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return configPath;
}

async function writeRuntimeOnlyConfig(outDir) {
  await mkdir(outDir, { recursive: true });
  const configPath = path.join(outDir, 'proto-bridge.runtime-only.config.json');
  const config = {
    target: {
      adapter: 'flutter-app',
      root: targetRoot,
    },
    outputRoot,
    capture: true,
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return configPath;
}

function expectedContract(testCaseName, entry) {
  return {
    entry,
    testCase: testCaseName,
    requireSourceFacts: testCaseName !== 'runtime-only',
    requireRuntimeFacts: testCaseName !== 'source-only',
    requireScreenshots: testCaseName !== 'source-only',
    expectedStrategy: testCaseName === 'hybrid' ? 'source-runtime' : testCaseName,
  };
}

async function requireUnifiedArtifacts(files, options) {
  await Promise.all([
    requireFile(files.pageCanonical),
    requireFile(files.pageDebugIndex),
    requireFile(files.uiBuildPlan),
    requireFile(files.uiBuildReview),
  ]);
  const canonical = JSON.parse(await readFile(files.pageCanonical, 'utf8'));
  if (canonical.schemaVersion !== 3) throw new Error('page-canonical.json must use schemaVersion=3.');
  if (!canonical.pageId) throw new Error('page-canonical.json must include pageId.');
  if (canonical.merge?.strategy !== options.expectedStrategy) {
    throw new Error(`Expected merge.strategy=${options.expectedStrategy}, got ${canonical.merge?.strategy}.`);
  }
  if (!canonical.merge?.selectedCapabilities?.includes('page.merge')) throw new Error('page-canonical.json must include merge.selectedCapabilities.');
  if (!canonical.orchestrationTrace?.temporary) throw new Error('page-canonical.json must include temporary orchestrationTrace.');
  if (!Array.isArray(canonical.fieldPriority) || canonical.fieldPriority.length < 4) throw new Error('page-canonical.json must include fieldPriority rules.');
  if (options.requireSourceFacts && !canonical.sourceFacts) throw new Error('page-canonical.json must include sourceFacts.');
  if (options.requireRuntimeFacts && !canonical.runtimeFacts) throw new Error('page-canonical.json must include runtimeFacts.');
  if (options.requireScreenshots && (canonical.screenshots?.length ?? 0) === 0) throw new Error('page-canonical.json must include screenshots.');

  const plan = JSON.parse(await readFile(files.uiBuildPlan, 'utf8'));
  if (!Array.isArray(plan.fileTree) || plan.fileTree.length === 0) throw new Error('ui-build-plan.json must include fileTree.');
  if (!Array.isArray(plan.widgetTree) || plan.widgetTree.length === 0) throw new Error('ui-build-plan.json must include widgetTree.');

  const review = await readFile(files.uiBuildReview, 'utf8');
  if (!review.includes('## 能力上下文')) throw new Error('ui-build-review.md must include 能力上下文.');
  if (options.requireSourceFacts && !review.includes('## 有源码实现交接')) {
    throw new Error('source review must include 有源码实现交接.');
  }
  if (options.requireSourceFacts) requireReviewParitySections(review);
}

function requireReviewParitySections(review) {
  const required = [
    '### 页面元信息',
    '### 迁移结论',
    '### Flutter 实现规划',
    '#### Widget 契约',
    '#### Controller 边界',
    '### 状态与交互',
    '### 路由与布局',
    '### 主题、I18n 与资源',
    '### 目标工程可复用能力',
    '### 人工确认',
  ];
  for (const section of required) {
    if (!review.includes(section)) throw new Error(`ui-build-review.md is missing parity section: ${section}`);
  }
  if (review.includes('Flutter 迁移说明书')) {
    throw new Error('ui-build-review.md should not embed the legacy migration-spec document verbatim.');
  }
}

function compactFiles(files) {
  return Object.fromEntries(Object.entries(files).filter(([key, value]) => {
    if (value === undefined) return false;
    if (!sourceBrief && key === 'migrationSpec') return false;
    return true;
  }));
}

function parseToolJson(result) {
  const text = result?.content?.find?.((item) => item.type === 'text')?.text;
  if (typeof text !== 'string') throw new Error(`Tool result does not contain text JSON: ${JSON.stringify(result)}`);
  return JSON.parse(text);
}

function readMode(value) {
  if (!value || value.startsWith('--')) return { kind: 'all', consumedArgs: 2 };
  if (value === 'all' || value === 'cli' || value === 'mcp') return { kind: value, consumedArgs: 3 };
  throw new Error(`Unknown test mode: ${value}. Expected all, cli, or mcp.`);
}

function readCase(value) {
  if (!value) return 'hybrid';
  if (value === 'source-only' || value === 'runtime-only' || value === 'hybrid') return value;
  throw new Error(`Unknown --case: ${value}. Expected source-only, runtime-only, or hybrid.`);
}

function parseArgs(tokens) {
  const values = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--') continue;
    if (!token?.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const [key, inlineValue] = token.slice(2).split('=', 2);
    if (!key) throw new Error(`Invalid flag: ${token}`);
    if (inlineValue !== undefined) {
      values[key] = inlineValue;
      continue;
    }
    if (BOOLEAN_FLAGS.has(key)) {
      values[key] = true;
      continue;
    }
    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`--${key} requires a value.`);
    values[key] = next;
    index += 1;
  }
  return values;
}

function readString(values, key) {
  const value = values[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readBooleanFlag(values, key) {
  return values[key] === true || values[key] === 'true' || values[key] === '1';
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

async function requireFile(filePath) {
  if (!filePath) throw new Error('Expected file path is missing.');
  try {
    await access(filePath);
  } catch {
    throw new Error(`Expected file was not created: ${filePath}`);
  }
}

async function requireAbsent(filePath) {
  try {
    await access(filePath);
    throw new Error(`File should not be created by default: ${filePath}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('File should not be created')) throw error;
  }
}

async function requireDirectory(dirPath) {
  try {
    await access(dirPath);
  } catch {
    throw new Error(`Expected directory does not exist: ${dirPath}`);
  }
}

async function directoryExists(dirPath) {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

function run(command, commandArgs, options) {
  return new Promise((resolve, reject) => {
    const outputChunks = [];
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: process.env,
      stdio: options.stdio ?? 'inherit',
    });
    if (options.stdio === 'pipe') {
      child.stdout?.on('data', (chunk) => outputChunks.push(Buffer.from(chunk)));
      child.stderr?.on('data', (chunk) => outputChunks.push(Buffer.from(chunk)));
    }
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const outputText = outputChunks.length ? `\n${Buffer.concat(outputChunks).toString('utf8')}` : '';
      reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code ?? 'unknown'}${outputText}`));
    });
  });
}

function printReport(report) {
  const lines = [];
  if (report.matrix) {
    for (const item of report.matrix) {
      lines.push('');
      lines.push('Matrix case:');
      appendEntry(lines, 'CLI', item.cli);
      appendEntry(lines, 'MCP', item.mcp);
    }
  }
  if (report.failures?.length) {
    lines.push('');
    lines.push('Failure cases:');
    for (const item of report.failures) lines.push(`  ${item.entry}: ${item.case}`);
  }
  if (report.cli) {
    appendEntry(lines, 'CLI', report.cli);
  }
  if (report.mcp) {
    appendEntry(lines, 'MCP', report.mcp);
  }
  if (report.mcpConfig) {
    appendEntry(lines, 'MCP config', report.mcpConfig);
  }
  console.log(lines.join('\n'));
}

function appendEntry(lines, label, entry) {
  if (!entry) return;
  lines.push('');
  lines.push(`${label}:`);
  lines.push(`  case: ${entry.case}`);
  if (entry.pageId) lines.push(`  pageId: ${entry.pageId}`);
  lines.push(`  output: ${entry.output}`);
  for (const [fileLabel, filePath] of Object.entries(entry.files)) {
    lines.push(`  ${fileLabel}: ${Array.isArray(filePath) ? (filePath.join(', ') || '(none)') : filePath}`);
  }
}

function routeFromUrl(input) {
  try {
    const parsed = new URL(input);
    if (parsed.hash.startsWith('#/')) return parsed.hash.slice(1).split('?')[0];
    return parsed.pathname || undefined;
  } catch {
    return undefined;
  }
}

function slugFromUrl(input) {
  try {
    const parsed = new URL(input);
    const route = parsed.hash.startsWith('#/') ? parsed.hash.slice(1).split('?')[0] : parsed.pathname;
    return sanitizeSlug(route.split('/').filter(Boolean).at(-1) ?? parsed.hostname);
  } catch {
    return sanitizeSlug(input);
  }
}

function sanitizeSlug(value) {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'page';
}

function caseSlug(caseName) {
  return sanitizeSlug(`${caseName}-${route.split('/').filter(Boolean).at(-1) ?? slugFromUrl(url)}`);
}

function step(message) {
  console.log(`${ICON.step} ${message}`);
}

function ok(message) {
  console.log(`${ICON.ok} ${message}`);
}

function fail(message) {
  console.error(`${ICON.fail} ${message}`);
}

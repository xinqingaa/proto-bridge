#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOLEAN_FLAGS = new Set();
const CASES = ['hybrid'];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = readMode(process.argv[2]);
const args = parseArgs(process.argv.slice(mode.consumedArgs));
let url = readString(args, 'url');
const sourceRoot = path.resolve(repoRoot, readString(args, 'source-root') ?? 'tests/fixtures/vue3-prototype');
const targetRoot = path.resolve(repoRoot, readString(args, 'target-root') ?? 'tests/fixtures/flutter-target');
const outputRoot = path.resolve(repoRoot, readString(args, 'output-root') ?? './output/test-e2e');
const e2eConfigPath = path.join(outputRoot, 'proto-bridge.config.json');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const ICON = {
  step: '●',
  ok: '✔',
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
  await writeFile(e2eConfigPath, `${JSON.stringify({ schemaVersion: 1 }, null, 2)}\n`, 'utf8');
  await ensureBuild();
  const runtime = url ? undefined : await startFixtureRuntime();
  url ??= runtime?.url;
  try {
    const results = [];
    for (const caseName of CASES) {
      results.push(await runCaseForMode(caseName));
    }
    ok('E2E test completed.');
    printReport(results);
  } finally {
    await runtime?.close();
  }
}

async function startFixtureRuntime() {
  step('Starting test fixture runtime...');
  const html = `<!doctype html><html><head><style>
    body{margin:0;font-family:Arial,sans-serif;background:#f5f6f8;color:#172033}
    .app-bar{height:56px;padding:0 16px;display:flex;align-items:center;background:#fff;border-bottom:1px solid #ddd}
    main{padding:16px}.summary-card,.task-card{background:#fff;border-radius:12px;padding:16px;margin-bottom:12px}
    .status-chip{display:inline-block;padding:4px 8px;border-radius:12px;background:#dce8ff;color:#2457a6}
  </style></head><body><header class="app-bar"><h1>项目协作</h1></header><main class="task-list">
    <section class="summary-card"><h2>今日任务</h2><p>3 项待处理</p></section>
    <article class="task-card"><h3>核对工作台契约</h3><span class="status-chip">进行中</span></article>
  </main></body></html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture runtime did not expose a TCP port.');
  return {
    url: `http://127.0.0.1:${address.port}/prototype/project/task-list?variant=default&theme=light`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function ensureBuild() {
  step('Building packages...');
  await run('pnpm', ['build'], { cwd: repoRoot });
}

async function runCaseForMode(caseName) {
  const report = { case: caseName };
  if (mode.kind === 'cli' || mode.kind === 'all') {
    report.cli = await runCliCase(caseName);
  }
  if (mode.kind === 'mcp' || mode.kind === 'all') {
    report.mcp = await runMcpCase(caseName);
  }
  return report;
}

async function runCliCase(caseName) {
  step(`Running CLI ${caseName} test...`);
  await requireExternalRoots();
  const outDir = path.join(outputRoot, `cli-${caseSlug(caseName)}-${timestamp}`);
  const commandArgs = [
    path.join(repoRoot, 'packages/cli/dist/index.js'),
    'generate',
    '--config',
    e2eConfigPath,
    '--url',
    url,
    '--output',
    outDir,
    '--trace',
  ];
  commandArgs.push('--source-root', sourceRoot, '--target-root', targetRoot);
  await run('node', commandArgs, { cwd: repoRoot });
  const files = expectedFiles(outDir);
  files.screenshots = await screenshotsFromCanonical(files.pageCanonical);
  await requireArtifacts(files, expectedContract());
  ok(`CLI ${caseName} test passed.`);
  return { output: outDir, files: compactFiles(files, expectedContract()) };
}

async function runMcpCase(caseName) {
  step(`Running MCP ${caseName} test...`);
  await requireExternalRoots();
  const outDir = path.join(outputRoot, `mcp-${caseSlug(caseName)}-${timestamp}`);
  await mkdir(outDir, { recursive: true });
  const client = await startMcpClient({ cwd: repoRoot, args: ['--config', e2eConfigPath] });

  try {
    await requireMcpTools(client);
    const reconstruct = parseToolJson(await client.request('tools/call', {
      name: 'reconstruct_page_context',
      arguments: {
        url,
        sourceRoot,
        targetRoot,
        output: outDir,
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        saveArtifacts: true,
        trace: true,
      },
    }));
    const pageId = requireString(reconstruct.pageId, 'reconstruct.pageId');
    const files = filesFromToolResult(reconstruct);
    await requireArtifacts(files, expectedContract());
    if (!reconstruct.summary?.trace) throw new Error('MCP trace=true should return summary.trace.');

    const validation = parseToolJson(await client.request('tools/call', {
      name: 'validate_ui_build',
      arguments: { targetRoot, pageId },
    }));
    if (validation.capability !== 'ui.validate') {
      throw new Error(`validate_ui_build should return ui.validate capability, got ${validation.capability ?? '(missing)'}.`);
    }
    if (!Array.isArray(validation.changedFiles)) throw new Error('validate_ui_build must return changedFiles.');

    ok(`MCP ${caseName} test passed.`);
    return { pageId, output: outDir, files };
  } finally {
    await client.close();
  }
}

function expectedContract() {
  return {
    requireSourceFacts: true,
    requireTargetFacts: true,
    requireRuntimeFacts: true,
    requireScreenshots: true,
    requirePlan: true,
    requireReview: true,
    expectedStrategy: 'source-runtime',
  };
}

async function requireArtifacts(files, contract) {
  await requireFile(files.pageCanonical);
  await requireAbsent(path.join(path.dirname(files.pageCanonical), 'page-debug-index.json'));

  const canonicalText = await readFile(files.pageCanonical, 'utf8');
  const canonical = JSON.parse(canonicalText);
  if (canonicalText.trim().includes('\n')) throw new Error('page-canonical.json must use compact JSON serialization.');
  if (canonical.schemaVersion !== 3) throw new Error('page-canonical.json must use schemaVersion=3.');
  if (!canonical.pageId) throw new Error('page-canonical.json must include pageId.');
  if (canonical.merge?.strategy !== contract.expectedStrategy) {
    throw new Error(`Expected merge.strategy=${contract.expectedStrategy}, got ${canonical.merge?.strategy}.`);
  }
  if (!canonical.merge?.selectedCapabilities?.includes('page.merge')) throw new Error('page-canonical.json must include page.merge.');
  if (contract.requireSourceFacts && !canonical.sourceFacts) throw new Error('page-canonical.json must include sourceFacts.');
  if (!contract.requireSourceFacts && canonical.sourceFacts) throw new Error('page-canonical.json should not include sourceFacts.');
  if (contract.requireSourceFacts) {
    const screen = canonical.sourceFacts?.analysis?.config;
    if (screen?.screenId !== 'project.task-list' || screen?.screenSlug !== 'task-list') {
      throw new Error('Source fixture must preserve global screenId and URL screenSlug separately.');
    }
    if (screen?.variants?.some((variant) => variant.query?.variant !== undefined || variant.query?.theme !== undefined)) {
      throw new Error('Variant business query must not duplicate reserved variant/theme URL parameters.');
    }
    if (screen?.variants?.find((variant) => variant.id === 'empty')?.fixture !== 'fixtures/empty.json') {
      throw new Error('Variant fixture must be relative to its prototype directory.');
    }
  }
  if (contract.requireTargetFacts && !canonical.targetFacts) throw new Error('page-canonical.json must include targetFacts.');
  if (!contract.requireTargetFacts && canonical.targetFacts) throw new Error('page-canonical.json should not include targetFacts.');
  if (contract.requireRuntimeFacts && !canonical.runtimeFacts) throw new Error('page-canonical.json must include runtimeFacts.');
  if (contract.requireScreenshots && (canonical.screenshots?.length ?? 0) === 0) throw new Error('page-canonical.json must include screenshots.');

  if (contract.requirePlan) {
    await requireFile(files.uiBuildPlan);
    const plan = JSON.parse(await readFile(files.uiBuildPlan, 'utf8'));
    if (plan.schemaVersion !== 3) throw new Error('ui-build-plan.json must use schemaVersion=3.');
    if (typeof plan.canonicalReadPolicy?.required !== 'boolean') throw new Error('ui-build-plan.json must include canonicalReadPolicy.');
    if (!plan.implementationContract) throw new Error('ui-build-plan.json must include implementationContract.');
    if (!Array.isArray(plan.implementationContract.fileTree)) throw new Error('ui-build-plan.json must include implementationContract.fileTree.');
    if (!Array.isArray(plan.implementationContract.widgetTree) || plan.implementationContract.widgetTree.length === 0) throw new Error('ui-build-plan.json must include implementationContract.widgetTree.');
    if (!plan.targetConventions?.architectureProfile) throw new Error('ui-build-plan.json must include targetConventions.architectureProfile.');
    if (!plan.visualPlan) throw new Error('ui-build-plan.json must include visualPlan.');
    if (!Array.isArray(plan.stylePlan?.facts) || plan.stylePlan.facts.length === 0) throw new Error('ui-build-plan.json must preserve stylePlan.facts.');
    for (const duplicate of ['fileTree', 'widgetTree', 'themeMappings', 'themeMappingGroups']) {
      if (duplicate in plan) throw new Error(`ui-build-plan.json must not duplicate ${duplicate}.`);
    }
    if ('restorationProfile' in plan) throw new Error('ui-build-plan.json must not include project restorationProfile metadata.');
    if (plan.implementationContract.fileTree.some((file) => file.path.includes('__proto_bridge__'))) {
      throw new Error('Logical planner paths must be resolved from target scan evidence before artifact output.');
    }
    const reusable = plan.target?.reusableComponents ?? [];
    if (contract.requireTargetFacts && !reusable.some((item) => item.symbol === 'CommonAppBar' && item.role === 'app-bar')) {
      throw new Error('Target-defined reusable widgets must be discovered without a project profile.');
    }
  } else {
    await requireAbsent(files.uiBuildPlan);
  }

  if (contract.requireReview) {
    await requireFile(files.uiBuildReview);
    const review = await readFile(files.uiBuildReview, 'utf8');
    if (!review.includes('## 页面总览')) throw new Error('ui-build-review.md must include 页面总览.');
    if (!review.includes('## 页面架构图') || !review.includes('## 页面流程图')) throw new Error('ui-build-review.md must include architecture and flow diagrams.');
    if (!review.includes('## 人工修订（优先于自动接入建议）')) throw new Error('ui-build-review.md must include the preserved manual override section.');
    if (!review.includes('## B 工程接入建议（非权威）')) throw new Error('ui-build-review.md must include non-authoritative target integration guidance.');
    if (contract.requireSourceFacts && !review.includes('### Source 语义摘要')) throw new Error('source review must include Source 语义摘要.');
  } else {
    await requireAbsent(files.uiBuildReview);
  }

  await Promise.all(files.screenshots.map((screenshot) => requireFile(String(screenshot))));
  await requireAbsent(path.join(path.dirname(files.pageCanonical), 'migration-context.json'));
  await requireAbsent(files.migrationSpec);
}

async function requireExternalRoots() {
  await requireDirectory(sourceRoot);
  await requireDirectory(targetRoot);
}

async function requireMcpTools(client) {
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
}

async function screenshotsFromCanonical(pageCanonicalPath) {
  const canonical = JSON.parse(await readFile(pageCanonicalPath, 'utf8'));
  return (canonical.screenshots ?? []).map((screenshot) => screenshot.path).filter(Boolean);
}

function expectedFiles(outDir) {
  return {
    pageCanonical: path.join(outDir, 'page-canonical.json'),
    uiBuildPlan: path.join(outDir, 'ui-build-plan.json'),
    uiBuildReview: path.join(outDir, 'ui-build-review.md'),
    migrationSpec: path.join(outDir, 'migration-spec.md'),
    screenshots: [],
  };
}

function filesFromToolResult(reconstruct) {
  return {
    pageCanonical: requireString(reconstruct.files?.pageCanonical, 'reconstruct.files.pageCanonical'),
    uiBuildPlan: typeof reconstruct.files?.uiBuildPlan === 'string' ? reconstruct.files.uiBuildPlan : path.join(path.dirname(String(reconstruct.files?.pageCanonical)), 'ui-build-plan.json'),
    uiBuildReview: typeof reconstruct.files?.uiBuildReview === 'string' ? reconstruct.files.uiBuildReview : path.join(path.dirname(String(reconstruct.files?.pageCanonical)), 'ui-build-review.md'),
    migrationSpec: path.join(path.dirname(String(reconstruct.files?.pageCanonical)), 'migration-spec.md'),
    screenshots: Array.isArray(reconstruct.files?.screenshots) ? reconstruct.files.screenshots.map(String) : [],
  };
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

function parseToolJson(result) {
  const text = result?.content?.find?.((item) => item.type === 'text')?.text;
  if (typeof text !== 'string') throw new Error(`Tool result does not contain text JSON: ${JSON.stringify(result)}`);
  return JSON.parse(text);
}

function compactFiles(files, contract) {
  return Object.fromEntries(Object.entries(files).filter(([key, value]) => {
    if (value === undefined) return false;
    if (key === 'migrationSpec') return false;
    if ((key === 'uiBuildPlan' || key === 'uiBuildReview') && !contract.requirePlan) return false;
    return true;
  }));
}

function readMode(value) {
  if (!value || value.startsWith('--')) return { kind: 'all', consumedArgs: 2 };
  if (value === 'all' || value === 'cli' || value === 'mcp') return { kind: value, consumedArgs: 3 };
  throw new Error(`Unknown test mode: ${value}. Expected all, cli, or mcp.`);
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
  if (!filePath) return;
  try {
    await access(filePath);
    throw new Error(`File should not be created: ${filePath}`);
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

function printReport(results) {
  const lines = [];
  for (const result of results) {
    if (result.failures) {
      lines.push('');
      lines.push('Failure cases:');
      for (const item of result.failures) lines.push(`  ${item.entry}: ${item.case}`);
      continue;
    }
    lines.push('');
    lines.push(`Case: ${result.case}`);
    appendEntry(lines, 'CLI', result.cli);
    appendEntry(lines, 'MCP', result.mcp);
  }
  console.log(lines.join('\n'));
}

function appendEntry(lines, label, entry) {
  if (!entry) return;
  lines.push(`  ${label}:`);
  if (entry.pageId) lines.push(`    pageId: ${entry.pageId}`);
  lines.push(`    output: ${entry.output}`);
  for (const [fileLabel, filePath] of Object.entries(entry.files)) {
    lines.push(`    ${fileLabel}: ${Array.isArray(filePath) ? (filePath.join(', ') || '(none)') : filePath}`);
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

function sanitizeSlug(value) {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'page';
}

function caseSlug(caseName) {
  const route = routeFromUrl(url) ?? url;
  return sanitizeSlug(`${caseName}-${route.split('/').filter(Boolean).at(-1) ?? 'page'}`);
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

#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_URL = 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1';
const DEFAULT_ROUTE = '/prototype/asset/pnl-analysis';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = readMode(process.argv[2]);
const args = parseArgs(process.argv.slice(mode.consumedArgs));
const testCase = readCase(args.case);
const url = readString(args, 'url') ?? DEFAULT_URL;
const route = readString(args, 'route') ?? routeFromUrl(url) ?? DEFAULT_ROUTE;
const sourceRoot = path.resolve(repoRoot, readString(args, 'source-root') ?? '../TradeAppPrd');
const targetRoot = path.resolve(repoRoot, readString(args, 'target-root') ?? '../youfi');
const outputRoot = path.resolve(repoRoot, readString(args, 'output-root') ?? './output/test-ui-reconstruction');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const slug = sanitizeSlug(`${testCase}-${route.split('/').filter(Boolean).at(-1) ?? slugFromUrl(url)}`);

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
  if (mode.kind === 'cli' || mode.kind === 'all') {
    report.cli = await runCliCase();
  }
  if (mode.kind === 'mcp' || mode.kind === 'all') {
    report.mcp = await runMcpCase();
  }

  ok('UI reconstruction test completed.');
  printReport(report);
}

async function ensureBuild() {
  step('Building packages...');
  await run('pnpm', ['build'], { cwd: repoRoot });
}

async function runCliCase() {
  step(`Running CLI capability-first ${testCase} test...`);
  if (testCase === 'runtime-only') {
    throw new Error('CLI runtime-only is not supported yet because CLI generate still requires config.source.root. Use MCP with --case runtime-only.');
  }
  const outDir = path.join(outputRoot, `cli-${slug}-${timestamp}`);
  const commandArgs = [
    path.join(repoRoot, 'packages/cli/dist/index.js'),
    'generate',
    '--config',
    path.join(repoRoot, 'proto-bridge.config.json'),
    '--output',
    outDir,
    '--trace',
  ];
  if (testCase === 'source-only') {
    commandArgs.push('--route', route);
  } else {
    commandArgs.push('--url', url);
  }
  if (testCase === 'hybrid') commandArgs.push('--capture');

  try {
    await run('node', commandArgs, { cwd: repoRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      `CLI ${testCase} test failed.`,
      'CLI currently requires config.source.root and config.target.root.',
      'For runtime-only coverage, use MCP with --case runtime-only.',
      message,
    ].join('\n'));
  }

  const expected = expectedFiles(outDir);
  await requireUnifiedArtifacts(expected, expectedContract(testCase, 'cli'));
  if (testCase !== 'runtime-only') await requireFile(expected.migrationSpec);
  await requireAbsent(path.join(outDir, 'migration-context.json'));
  expected.screenshots = await screenshotsFromCanonical(expected.pageCanonical);

  ok(`CLI capability-first ${testCase} test passed.`);
  return {
    case: testCase,
    output: outDir,
    files: compactFiles(expected),
  };
}

async function screenshotsFromCanonical(pageCanonicalPath) {
  const canonical = JSON.parse(await readFile(pageCanonicalPath, 'utf8'));
  return (canonical.screenshots ?? []).map((screenshot) => screenshot.path).filter(Boolean);
}

async function runMcpCase() {
  step(`Running MCP capability-first ${testCase} test...`);
  await requireDirectory(targetRoot);
  const outDir = path.join(outputRoot, `mcp-${slug}-${timestamp}`);
  await mkdir(outDir, { recursive: true });

  const client = await startMcpClient({ cwd: targetRoot });
  try {
    const tools = await client.request('tools/list', {});
    const toolNames = new Set((tools.tools ?? []).map((tool) => tool.name));
    for (const tool of [
      'reconstruct_page_context',
      'capture_page_canonical',
      'build_ui_plan',
      'attach_screenshot_ocr',
      'export_ui_review',
      'read_target_conventions',
      'find_target_examples',
      'validate_ui_build',
    ]) {
      if (!toolNames.has(tool)) throw new Error(`MCP tools/list is missing ${tool}`);
    }

    const sourceAvailable = await directoryExists(sourceRoot);
    if ((testCase === 'source-only' || testCase === 'hybrid') && !sourceAvailable) {
      throw new Error(`Source root is required for ${testCase}: ${sourceRoot}`);
    }

    const reconstruct = parseToolJson(await client.request('tools/call', {
      name: 'reconstruct_page_context',
      arguments: {
        ...(testCase !== 'runtime-only' ? { sourceRoot, route } : {}),
        ...(testCase !== 'source-only' ? { url } : {}),
        targetRoot,
        output: outDir,
        capture: testCase !== 'source-only',
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        saveArtifacts: true,
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
      migrationSpec: typeof reconstruct.files?.migrationSpec === 'string' ? reconstruct.files.migrationSpec : undefined,
      screenshots: Array.isArray(reconstruct.files?.screenshots) ? reconstruct.files.screenshots.map(String) : [],
    };
    await requireUnifiedArtifacts(files, expectedContract(testCase, 'mcp'));
    await Promise.all(files.screenshots.map((screenshot) => requireFile(String(screenshot))));
    if (testCase !== 'runtime-only') await requireFile(files.migrationSpec);
    await requireAbsent(path.join(outDir, 'migration-context.json'));
    if (!reconstruct.summary?.trace) throw new Error('MCP trace=true should return summary.trace.');

    ok(`MCP capability-first ${testCase} test passed.`);
    return {
      case: testCase,
      pageId,
      output: outDir,
      files,
    };
  } finally {
    await client.close();
  }
}

async function startMcpClient(options) {
  const child = spawn('node', [path.join(repoRoot, 'packages/mcp-server/dist/index.js')], {
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
  if (!review.includes('## Capability Context')) throw new Error('ui-build-review.md must include Capability Context.');
  if (options.requireSourceFacts && !review.includes('## Source-Aware Implementation Handoff')) {
    throw new Error('source review must include Source-Aware Implementation Handoff.');
  }
  if (options.requireSourceFacts) requireReviewParitySections(review);
}

function requireReviewParitySections(review) {
  const required = [
    '### Page Metadata',
    '### Migration Conclusion',
    '### Flutter Implementation Plan',
    '#### Widget Contracts',
    '#### Controller Boundaries',
    '### State And Interaction',
    '### Routing And Layout',
    '### Theme, I18n And Assets',
    '### Reusable Target Capabilities',
    '### Manual Confirmation',
  ];
  for (const section of required) {
    if (!review.includes(section)) throw new Error(`ui-build-review.md is missing parity section: ${section}`);
  }
  if (review.includes('Flutter 迁移说明书')) {
    throw new Error('ui-build-review.md should not embed the legacy migration-spec document verbatim.');
  }
}

function compactFiles(files) {
  return Object.fromEntries(Object.entries(files).filter(([, value]) => value !== undefined));
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
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${commandArgs.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function printReport(report) {
  const lines = [];
  if (report.cli) {
    lines.push('');
    lines.push('CLI:');
    lines.push(`  case: ${report.cli.case}`);
    lines.push(`  output: ${report.cli.output}`);
    for (const [label, filePath] of Object.entries(report.cli.files)) {
      lines.push(`  ${label}: ${Array.isArray(filePath) ? (filePath.join(', ') || '(none)') : filePath}`);
    }
  }
  if (report.mcp) {
    lines.push('');
    lines.push('MCP:');
    lines.push(`  case: ${report.mcp.case}`);
    lines.push(`  pageId: ${report.mcp.pageId}`);
    lines.push(`  output: ${report.mcp.output}`);
    for (const [label, filePath] of Object.entries(report.mcp.files)) {
      lines.push(`  ${label}: ${Array.isArray(filePath) ? (filePath.join(', ') || '(none)') : filePath}`);
    }
  }
  console.log(lines.join('\n'));
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

function step(message) {
  console.log(`${ICON.step} ${message}`);
}

function ok(message) {
  console.log(`${ICON.ok} ${message}`);
}

function fail(message) {
  console.error(`${ICON.fail} ${message}`);
}

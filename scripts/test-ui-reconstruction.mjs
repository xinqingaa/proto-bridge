#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_URL = 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = readMode(process.argv[2]);
const args = parseArgs(process.argv.slice(3));
const url = readString(args, 'url') ?? DEFAULT_URL;
const targetRoot = path.resolve(repoRoot, readString(args, 'target-root') ?? '../youfi');
const outputRoot = path.resolve(repoRoot, readString(args, 'output-root') ?? './output/test-ui-reconstruction');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const slug = slugFromUrl(url);

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
  if (mode === 'cli' || mode === 'all') {
    report.cli = await runCliSmoke();
  }
  if (mode === 'mcp' || mode === 'all') {
    report.mcp = await runMcpSmoke();
  }

  ok('UI reconstruction test completed.');
  printReport(report);
}

async function ensureBuild() {
  step('Building packages...');
  await run('pnpm', ['build'], { cwd: repoRoot });
}

async function runCliSmoke() {
  step('Running CLI source-aware regression test...');
  const outDir = path.join(outputRoot, `cli-${slug}-${timestamp}`);
  try {
    await run('node', [
      path.join(repoRoot, 'packages/cli/dist/index.js'),
      'generate',
      '--config',
      path.join(repoRoot, 'proto-bridge.config.json'),
      '--url',
      url,
      '--prototype-url',
      url,
      '--capture',
      '--output',
      outDir,
    ], { cwd: repoRoot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      'CLI source-aware regression test failed.',
      'Current CLI requires the URL route to resolve to a source route or Vue file in proto-bridge.config.json.',
      'URL-only design pages should use the MCP URL-first test until hybrid capability orchestration lands.',
      message,
    ].join('\n'));
  }

  const expected = {
    migrationSpec: path.join(outDir, 'migration-spec.md'),
    migrationContext: path.join(outDir, 'migration-context.json'),
  };
  await requireFile(expected.migrationSpec);
  await requireFile(expected.migrationContext);

  const context = JSON.parse(await readFile(expected.migrationContext, 'utf8'));
  const screenshot = context?.capture?.screenshotPath;
  const domSnapshot = context?.capture?.domSnapshotPath;
  if (typeof screenshot === 'string') await requireFile(screenshot);
  if (typeof domSnapshot === 'string') await requireFile(domSnapshot);

  ok('CLI source-aware regression test passed.');
  return {
    output: outDir,
    files: {
      ...expected,
      ...(typeof screenshot === 'string' ? { screenshot } : {}),
      ...(typeof domSnapshot === 'string' ? { domSnapshot } : {}),
    },
  };
}

async function runMcpSmoke() {
  step('Running MCP URL-first UI reconstruction test...');
  await requireDirectory(targetRoot);
  const outDir = path.join(outputRoot, `mcp-${slug}-${timestamp}`);
  await mkdir(outDir, { recursive: true });

  const client = await startMcpClient({ cwd: targetRoot });
  try {
    const tools = await client.request('tools/list', {});
    const toolNames = new Set((tools.tools ?? []).map((tool) => tool.name));
    for (const tool of [
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

    const capture = parseToolJson(await client.request('tools/call', {
      name: 'capture_page_canonical',
      arguments: {
        url,
        targetRoot,
        output: outDir,
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        saveArtifacts: true,
      },
    }));
    const pageId = requireString(capture.pageId, 'capture.pageId');

    const plan = parseToolJson(await client.request('tools/call', {
      name: 'build_ui_plan',
      arguments: {
        pageId,
        targetRoot,
      },
    }));

    const review = parseToolJson(await client.request('tools/call', {
      name: 'export_ui_review',
      arguments: {
        pageId,
        targetRoot,
      },
    }));

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
      pageCanonical: requireString(capture.files?.pageCanonical, 'capture.files.pageCanonical'),
      pageDebugIndex: requireString(capture.files?.pageDebugIndex, 'capture.files.pageDebugIndex'),
      uiBuildPlan: requireString(plan.files?.uiBuildPlan, 'plan.files.uiBuildPlan'),
      uiBuildReview: requireString(review.files?.uiBuildReview, 'review.files.uiBuildReview'),
    };
    const screenshots = Array.isArray(capture.files?.screenshots) ? capture.files.screenshots : [];
    if (screenshots.length === 0) throw new Error('capture.files.screenshots is empty');

    await Promise.all([
      requireFile(files.pageCanonical),
      requireFile(files.pageDebugIndex),
      requireFile(files.uiBuildPlan),
      requireFile(files.uiBuildReview),
      ...screenshots.map((screenshot) => requireFile(String(screenshot))),
    ]);

    ok('MCP URL-first UI reconstruction test passed.');
    return {
      pageId,
      output: outDir,
      files: {
        ...files,
        screenshots,
      },
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

function parseToolJson(result) {
  const text = result?.content?.find?.((item) => item.type === 'text')?.text;
  if (typeof text !== 'string') throw new Error(`Tool result does not contain text JSON: ${JSON.stringify(result)}`);
  return JSON.parse(text);
}

function readMode(value) {
  if (!value || value.startsWith('--')) return 'all';
  if (value === 'all' || value === 'cli' || value === 'mcp') return value;
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
  try {
    await access(filePath);
  } catch {
    throw new Error(`Expected file was not created: ${filePath}`);
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
    lines.push(`  output: ${report.cli.output}`);
    for (const [label, filePath] of Object.entries(report.cli.files)) {
      lines.push(`  ${label}: ${filePath}`);
    }
  }
  if (report.mcp) {
    lines.push('');
    lines.push('MCP:');
    lines.push(`  pageId: ${report.mcp.pageId}`);
    lines.push(`  output: ${report.mcp.output}`);
    for (const [label, filePath] of Object.entries(report.mcp.files)) {
      lines.push(`  ${label}: ${Array.isArray(filePath) ? filePath.join(', ') : filePath}`);
    }
  }
  console.log(lines.join('\n'));
}

function slugFromUrl(input) {
  try {
    const parsed = new URL(input);
    const last = parsed.pathname.split('/').filter(Boolean).at(-1) ?? parsed.hostname;
    return sanitizeSlug(last);
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

#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = path.join(repoRoot, 'examples/vue3-to-flutter');
const sourceRoot = path.join(exampleRoot, 'source-vue3');
const targetRoot = path.join(exampleRoot, 'target-flutter');
const configPath = path.join(exampleRoot, 'proto-bridge.config.json');
const cliPath = path.join(repoRoot, 'packages/cli/dist/index.js');
const screenshotsDir = path.join(exampleRoot, 'screenshots');
const devPort = await findAvailablePort(5173);
const baseUrl = `http://127.0.0.1:${devPort}`;
const flutterPreviewPort = await findAvailablePort(5599);

const pages = [
  {
    label: 'simple',
    url: `${baseUrl}/#/prototype/asset/holding-list`,
    output: path.join(exampleRoot, 'output/simple'),
  },
  {
    label: 'complex',
    url: `${baseUrl}/#/prototype/asset/pnl-analysis?tab=overview`,
    output: path.join(exampleRoot, 'output/complex'),
  },
];

let devServer;
let flutterPreviewServer;

try {
  step('Installing Vue example dependencies...');
  if (!existsSync(path.join(sourceRoot, 'node_modules'))) {
    await run('pnpm', ['install'], { cwd: repoRoot });
  }

  step('Building ProtoBridge packages...');
  await run('pnpm', ['run', 'build'], { cwd: repoRoot });

  step('Checking Vue source build...');
  await run('pnpm', ['--dir', sourceRoot, 'build'], { cwd: repoRoot });

  step('Checking Flutter target dependencies...');
  await run('flutter', ['pub', 'get'], { cwd: targetRoot });

  step('Checking Playwright browser runtime...');
  await run('pnpm', ['exec', 'playwright', 'install', 'chromium'], { cwd: repoRoot });

  step('Starting Vue prototype server...');
  devServer = spawn('pnpm', ['--dir', sourceRoot, 'exec', 'vite', '--host', '127.0.0.1', '--port', String(devPort), '--strictPort'], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'ignore',
  });
  await waitForHttp(baseUrl);

  for (const page of pages) {
    step(`Generating ${page.label} page artifacts...`);
    await run('node', [
      cliPath,
      'generate',
      '--config',
      configPath,
      '--url',
      page.url,
      '--output',
      page.output,
      '--source-brief',
    ], { cwd: repoRoot });
  }

  step('Preparing screenshot gallery...');
  await mirrorPrototypeScreenshots();
  await run('flutter', ['build', 'web'], { cwd: targetRoot });
  flutterPreviewServer = await startStaticServer(path.join(targetRoot, 'build/web'), flutterPreviewPort);
  await captureFlutterScreenshots(`http://127.0.0.1:${flutterPreviewPort}`);

  step('Example artifacts ready.');
  console.log();
  console.log('Recommended reading order:');
  for (const page of pages) {
    console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-review.md`);
    console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-plan.json`);
    console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-debug-index.json`);
    console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-canonical.json`);
  }
  console.log(`  screenshots: ${path.relative(repoRoot, screenshotsDir)}`);
} finally {
  if (devServer && !devServer.killed) devServer.kill('SIGTERM');
  if (flutterPreviewServer) {
    await new Promise((resolve) => flutterPreviewServer.close(resolve));
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

async function mirrorPrototypeScreenshots() {
  await mkdir(screenshotsDir, { recursive: true });
  await copyFile(
    path.join(exampleRoot, 'output/simple/screenshots/full-page.png'),
    path.join(screenshotsDir, 'prototype-simple.png'),
  );
  await copyFile(
    path.join(exampleRoot, 'output/complex/screenshots/full-page.png'),
    path.join(screenshotsDir, 'prototype-complex.png'),
  );
}

async function captureFlutterScreenshots(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(5_000);
    await page.screenshot({ path: path.join(screenshotsDir, 'flutter-simple.png'), fullPage: true });
    await page.mouse.click(132, 523);
    await page.waitForTimeout(2_500);
    await page.screenshot({ path: path.join(screenshotsDir, 'flutter-complex.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

function startStaticServer(root, port) {
  const server = createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const safeRoot = path.resolve(root);
      let filePath = path.resolve(safeRoot, relativePath);
      if (!filePath.startsWith(safeRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html');
      } catch {
        filePath = path.join(safeRoot, 'index.html');
      }

      response.writeHead(200, { 'content-type': contentType(filePath) });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(500);
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function contentType(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  return 'text/html';
}

async function waitForHttp(url) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ''}`);
}

function step(message) {
  console.log(`● ${message}`);
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`Unable to find an available port near ${startPort}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

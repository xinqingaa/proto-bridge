#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repoRoot, 'examples/vue3-to-flutter/source-vue3');
const targetRoot = path.join(repoRoot, 'examples/vue3-to-flutter/target-flutter');
const protoMain = path.join(targetRoot, 'lib/main_proto.dart');

const vuePort = await findAvailablePort(5173);
const flutterPort = await findAvailablePort(5599);
const children = [];
let flutterServer;
let stopping = false;

console.log('● Starting Vue prototype and Flutter target previews...');
if (vuePort !== 5173 || flutterPort !== 5599) {
  console.log(`● Default port occupied, using Vue:${vuePort} Flutter:${flutterPort}`);
}
console.log();
console.log('Vue prototype:');
console.log(`  http://127.0.0.1:${vuePort}/`);
console.log(`  http://127.0.0.1:${vuePort}/#/prototype/asset/holding-list`);
console.log(`  http://127.0.0.1:${vuePort}/#/prototype/asset/pnl-analysis?tab=overview`);
console.log();
console.log('Flutter target:');
console.log(`  http://127.0.0.1:${flutterPort}/`);
console.log();
console.log('Press Ctrl+C to stop both servers.');
console.log();

start('vue', 'pnpm', [
  '--dir',
  sourceRoot,
  'exec',
  'vite',
  '--host',
  '127.0.0.1',
  '--port',
  String(vuePort),
  '--strictPort',
]);

console.log('[flutter] Building web preview...');
await rm(path.join(targetRoot, 'build/web'), { recursive: true, force: true });
const flutterBuildArgs = ['build', 'web', '--pwa-strategy=none'];
if (await exists(protoMain)) {
  flutterBuildArgs.push('-t', 'lib/main_proto.dart');
} else {
  console.log('[flutter] Generated _proto entry not found. Run pnpm run example to generate pages; showing fallback app.');
}
await run('flutter', flutterBuildArgs, targetRoot, 'flutter');
flutterServer = await startStaticServer(path.join(targetRoot, 'build/web'), flutterPort);
console.log(`[flutter] Flutter target is being served at http://127.0.0.1:${flutterPort}/`);

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
process.on('SIGHUP', () => stopAll('SIGHUP'));
process.on('uncaughtException', (error) => {
  console.error(error);
  process.exitCode = 1;
  void stopAll('uncaughtException');
});
process.on('unhandledRejection', (error) => {
  console.error(error);
  process.exitCode = 1;
  void stopAll('unhandledRejection');
});
process.on('exit', () => {
  killChildren('SIGTERM');
});

await new Promise(() => {});

function start(label, command, args, cwd = repoRoot) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);

  child.stdout.on('data', (chunk) => prefix(label, chunk));
  child.stderr.on('data', (chunk) => prefix(label, chunk));
  child.on('exit', (code, signal) => {
    if (signal || process.exitCode !== undefined) return;
    if (code !== 0) {
      console.error(`\n${label} exited with ${code ?? 1}. Stopping preview.`);
      process.exitCode = code ?? 1;
      stopAll();
    }
  });
}

function run(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => prefix(label, chunk));
    child.stderr.on('data', (chunk) => prefix(label, chunk));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function prefix(label, chunk) {
  for (const line of String(chunk).split(/\r?\n/)) {
    if (line.trim()) console.log(`[${label}] ${line}`);
  }
}

async function stopAll(reason = 'exit') {
  if (stopping) return;
  stopping = true;
  console.log(`\n● Stopping example preview (${reason})...`);

  killChildren('SIGTERM');
  if (flutterServer) {
    await closeServer(flutterServer);
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
  await releasePort(vuePort);
  await releasePort(flutterPort);
  process.exit(process.exitCode ?? 0);
}

function killChildren(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

function closeServer(server) {
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
  return Promise.race([
    new Promise((resolve) => {
      server.close(() => resolve());
    }),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
}

async function releasePort(port) {
  const pids = await listPortPids(port);
  const ownPid = String(process.pid);
  for (const pid of pids) {
    if (pid === ownPid) continue;
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {
      // Process already exited.
    }
  }
}

function listPortPids(port) {
  return new Promise((resolve) => {
    const child = spawn('lsof', ['-ti', `tcp:${port}`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', () => resolve([]));
    child.on('exit', () => {
      resolve(output.split(/\s+/).filter(Boolean));
    });
  });
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

function startStaticServer(root, port) {
  const sockets = new Set();
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
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('close', () => {
    for (const socket of sockets) socket.destroy();
    sockets.clear();
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

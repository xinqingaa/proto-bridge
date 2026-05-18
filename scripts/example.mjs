#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = path.join(repoRoot, 'examples/vue3-to-flutter');
const sourceRoot = path.join(exampleRoot, 'source-vue3');
const targetRoot = path.join(exampleRoot, 'target-flutter');
const configPath = path.join(exampleRoot, 'proto-bridge.config.json');
const cliPath = path.join(repoRoot, 'packages/cli/dist/index.js');
const protoModuleRoot = path.join(targetRoot, 'lib/app/modules/account/_proto');
const devPort = await findAvailablePort(5173);
const baseUrl = `http://127.0.0.1:${devPort}`;

const pages = [
  {
    label: 'simple',
    url: `${baseUrl}/#/prototype/asset/holding-list`,
    output: path.join(exampleRoot, 'output/simple'),
  },
  {
    label: 'complex-overview',
    url: `${baseUrl}/#/prototype/asset/pnl-analysis?tab=overview`,
    output: path.join(exampleRoot, 'output/complex-overview'),
  },
  {
    label: 'complex-realized',
    url: `${baseUrl}/#/prototype/asset/pnl-analysis?tab=realized`,
    output: path.join(exampleRoot, 'output/complex-realized'),
  },
  {
    label: 'complex-risk',
    url: `${baseUrl}/#/prototype/asset/pnl-analysis?tab=risk`,
    output: path.join(exampleRoot, 'output/complex-risk'),
  },
];

const agentProtoFiles = [
  path.join(targetRoot, 'lib/main_proto.dart'),
  path.join(targetRoot, 'lib/app/app_proto.dart'),
  path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'),
  path.join(protoModuleRoot, 'account_proto_models.dart'),
  path.join(protoModuleRoot, 'account_proto_repository.dart'),
  path.join(protoModuleRoot, 'account_proto_widgets.dart'),
  path.join(protoModuleRoot, 'account_proto_pages.dart'),
];

let devServer;

async function main() {
  try {
    step('Installing Vue example dependencies...');
    if (!existsSync(path.join(sourceRoot, 'node_modules'))) {
      await run('pnpm', ['install'], { cwd: repoRoot });
    }

    step('Building ProtoBridge packages...');
    await run('pnpm', ['run', 'build'], { cwd: repoRoot });

    step('Checking Vue source build...');
    await run('pnpm', ['--dir', sourceRoot, 'build'], { cwd: repoRoot });

    step('Starting Vue prototype server...');
    devServer = spawn('pnpm', ['--dir', sourceRoot, 'exec', 'vite', '--host', '127.0.0.1', '--port', String(devPort), '--strictPort'], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'ignore',
    });
    await waitForHttp(baseUrl);

    for (const page of pages) {
      step(`Generating ${page.label} ProtoBridge output...`);
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

    step('Checking agent-generated Flutter _proto files...');
    validateAgentProtoFiles();

    step('Example output and agent-generated Flutter pages are ready.');
    console.log();
    console.log('Generated but git-ignored:');
    console.log(`  ${path.relative(repoRoot, path.join(exampleRoot, 'output'))}`);
    console.log();
    console.log('Agent workflow Flutter files:');
    for (const file of agentProtoFiles) {
      console.log(`  ${path.relative(repoRoot, file)}`);
    }
    console.log();
    console.log('Key review artifacts:');
    for (const page of pages) {
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-review.md`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-plan.json`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-debug-index.json`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-canonical.json`);
    }
    console.log();
    console.log('Run pnpm run example:dev or pnpm run example:android to open the agent-generated pages.');
  } finally {
    if (devServer) {
      devServer.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

function validateAgentProtoFiles() {
  const missing = agentProtoFiles.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(`Missing agent-generated Flutter files:\n${missing.map((file) => `  - ${path.relative(repoRoot, file)}`).join('\n')}`);
  }
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
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

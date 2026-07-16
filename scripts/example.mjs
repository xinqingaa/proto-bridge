#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = path.join(repoRoot, 'examples/vue3-to-flutter');
const sourceRoot = path.join(exampleRoot, 'source-vue3');
const targetRoot = path.join(exampleRoot, 'target-flutter');
const configPath = path.join(exampleRoot, 'proto-bridge.config.json');
const cliPath = path.join(repoRoot, 'packages/cli/dist/index.js');
const agentOutputRoot = path.join(exampleRoot, 'agent-output');
const agentManifestPath = path.join(agentOutputRoot, 'flutter-proto-manifest.json');
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
      await rm(page.output, { recursive: true, force: true });
      await run('node', [
        cliPath,
        'generate',
        '--config',
        configPath,
        '--url',
        page.url,
        '--output',
        page.output,
      ], { cwd: repoRoot });
      await validateGeneratedPlan(page.output);
    }

    step('Installing agent-generated Flutter _proto files...');
    const installedFiles = await installAgentProtoFiles();

    step('Checking installed Flutter _proto files...');
    validateAgentProtoFiles();

    step('Example output and agent-generated Flutter pages are ready.');
    console.log();
    console.log('Generated but git-ignored:');
    console.log(`  ${path.relative(repoRoot, path.join(exampleRoot, 'output'))}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/main_proto.dart'))}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/app/app_proto.dart'))}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'))}`);
    console.log(`  ${path.relative(repoRoot, protoModuleRoot)}`);
    console.log();
    console.log('Installed from committed agent workflow text package:');
    for (const file of installedFiles) {
      console.log(`  ${path.relative(repoRoot, file)}`);
    }
    console.log();
    console.log('Key review artifacts:');
    for (const page of pages) {
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-review.md`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-plan.json`);
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

async function validateGeneratedPlan(outputDir) {
  const planPath = path.join(outputDir, 'ui-build-plan.json');
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const targetModule = plan.target?.module;
  if (!targetModule) return;

  if (plan.routeMapping?.targetModule && plan.routeMapping.targetModule !== targetModule) {
    throw new Error(`routeMapping.targetModule=${plan.routeMapping.targetModule} does not match target.module=${targetModule}.`);
  }

  const invalidFiles = (plan.implementationContract?.fileTree ?? [])
    .map((file) => file.path)
    .filter((filePath) =>
      typeof filePath === 'string'
      && filePath.startsWith('lib/app/modules/')
      && !filePath.startsWith(`lib/app/modules/${targetModule}/`),
    );
  if (invalidFiles.length > 0) {
    throw new Error(`Generated fileTree module does not match target.module=${targetModule}:\n${invalidFiles.map((filePath) => `  - ${filePath}`).join('\n')}`);
  }

  const summary = plan.implementationContract?.sourceSemantics?.summary ?? [];
  if (summary.some((line) => /^Target module:/i.test(line) && line !== `Target module: ${targetModule}`)) {
    throw new Error(`sourceSemantics summary target module does not match target.module=${targetModule}.`);
  }

  const invalidRouteIntents = (plan.routeIntentMappings ?? [])
    .filter((mapping) => !mapping.unresolved && !mapping.targetRoute && !mapping.targetRouteSymbol);
  if (invalidRouteIntents.length > 0) {
    throw new Error(`Route intent mappings must resolve to a target route or route symbol:\n${invalidRouteIntents.map((mapping) => `  - ${mapping.sourceRoute ?? 'unknown'}`).join('\n')}`);
  }
}

async function installAgentProtoFiles() {
  const manifest = await readAgentManifest();
  await rm(path.join(targetRoot, 'lib/main_proto.dart'), { force: true });
  await rm(path.join(targetRoot, 'lib/app/app_proto.dart'), { force: true });
  await rm(path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'), { force: true });
  await rm(protoModuleRoot, { recursive: true, force: true });

  const installedFiles = [];
  for (const file of manifest.files) {
    const source = path.join(agentOutputRoot, file.source);
    const target = path.join(exampleRoot, file.target);
    if (!existsSync(source)) {
      throw new Error(`Missing committed agent workflow text file: ${path.relative(repoRoot, source)}`);
    }
    const content = await readFile(source, 'utf8');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
    installedFiles.push(target);
  }
  return installedFiles;
}

async function readAgentManifest() {
  const content = await readFile(agentManifestPath, 'utf8');
  const manifest = JSON.parse(content);
  if (manifest.kind !== 'proto-bridge-agent-output') {
    throw new Error(`Invalid agent output manifest kind in ${path.relative(repoRoot, agentManifestPath)}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error(`Agent output manifest must include a non-empty files array.`);
  }
  for (const file of manifest.files) {
    if (typeof file.source !== 'string' || typeof file.target !== 'string') {
      throw new Error('Each agent output manifest file entry must include source and target strings.');
    }
    if (path.isAbsolute(file.source) || path.isAbsolute(file.target)) {
      throw new Error('Agent output manifest paths must be relative.');
    }
    if (!file.source.endsWith('.dart.txt')) {
      throw new Error(`Agent output source must be a .dart.txt file: ${file.source}`);
    }
    if (!file.target.startsWith('target-flutter/')) {
      throw new Error(`Agent output target must stay inside target-flutter: ${file.target}`);
    }
  }
  return manifest;
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
